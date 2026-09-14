import {
  Injectable,
  OnApplicationShutdown,
} from "@nestjs/common";

import smpp from "smpp";

import {
  getComponentLogger,
  recordException,
  withSpan,
} from "@pague-co-uk/sms-gateway-telemetry";

import type {
  SmppConnectorConfiguration,
} from "./types/smpp-connector-configuration.js";

import type {
  SmppDelivery,
} from "./types/smpp-delivery.js";

export type SmppConnectionState =
  | "DISCONNECTED"
  | "CONNECTED"
  | "BOUND";

export type SmppSubmissionResult =
  | {
    status: "SUBMITTED";

    providerMessageId?: string;
  }
  | {
    status: "FAILED";

    errorCode?: string;

    errorMessage: string;
  }
  | {
    status: "UNKNOWN";

    errorCode?: string;

    errorMessage: string;
  }
  | {
    status: "DISCONNECTED";

    errorCode: "SMPP_DISCONNECTED";

    errorMessage: string;
  };

interface SmppSession {
  connectorId: string;

  sessionId: string;

  session: smpp.Session;

  configuration:
  SmppConnectorConfiguration;

  configurationHash: string;

  connected: boolean;

  bound: boolean;

  closing: boolean;
}

@Injectable()
export class SmppClient
  implements OnApplicationShutdown {
  private readonly logger =
    getComponentLogger(
      SmppClient.name,
    );

  /**
   * Handler for inbound SMPP deliveries.
   *
   * SmppClient owns the SMPP session and receives the raw deliver_sm PDU.
   * The higher layer is responsible for interpreting the delivery and
   * routing it to the appropriate application workflow.
   */
  private deliveryHandler:
    | ((
      delivery: SmppDelivery,
    ) => Promise<void>)
    | undefined;

  /**
   * One managed session per connector.
   *
   * A session remains in this map even when the SMPP provider
   * disconnects unexpectedly.
   *
   * This is important because the connector is still managed and
   * should be reconnected by the connection manager/reconciliation
   * process.
   */
  private readonly sessions =
    new Map<
      string,
      SmppSession
    >();

  // ===========================================================================
  // Delivery handler
  // ===========================================================================

  public setDeliveryHandler(
    handler: (
      delivery: SmppDelivery,
    ) => Promise<void>,
  ): void {
    this.deliveryHandler =
      handler;
  }

  // ===========================================================================
  // Session inspection
  // ===========================================================================

  public hasSession(
    connectorId: string,
  ): boolean {
    const state =
      this.sessions.get(
        connectorId,
      );

    return !!(
      state &&
      state.connected &&
      state.bound &&
      !state.closing
    );
  }

  public getConnectionState(
    connectorId: string,
  ): SmppConnectionState {
    const state =
      this.sessions.get(
        connectorId,
      );

    if (
      !state ||
      state.closing ||
      !state.connected
    ) {
      return "DISCONNECTED";
    }

    if (!state.bound) {
      return "CONNECTED";
    }

    return "BOUND";
  }

  public getManagedConnectorIds(): string[] {
    return [
      ...this.sessions.keys(),
    ];
  }

  public getConnectedConnectorIds(): string[] {
    return [
      ...this.sessions.entries(),
    ]
      .filter(
        ([, state]) =>
          state.connected &&
          state.bound &&
          !state.closing,
      )
      .map(
        ([connectorId]) =>
          connectorId,
      );
  }

  // ===========================================================================
  // Connect
  // ===========================================================================

  public async connect(
    connectorId: string,
    configuration:
      SmppConnectorConfiguration,
  ): Promise<void> {
    return withSpan(
      "SmppClient.connect",
      async (span) => {
        span.setAttributes({
          "smpp.connector_id":
            connectorId,

          "smpp.host":
            configuration.host,

          "smpp.port":
            configuration.port,

          "smpp.system_id":
            configuration.systemId,
        });

        const existing =
          this.sessions.get(
            connectorId,
          );

        const configurationHash =
          this.createConfigurationHash(
            configuration,
          );

        /*
         * The connector already has a healthy session
         * using exactly the same configuration.
         *
         * Nothing needs to be done.
         */
        if (
          existing &&
          existing.configurationHash ===
          configurationHash &&
          existing.connected &&
          existing.bound &&
          !existing.closing
        ) {
          this.logger.debug(
            {
              connectorId,

              sessionId:
                existing.sessionId,
            },
            "SMPP connector already connected.",
          );

          return;
        }

        /*
         * There is an existing session but it is either:
         *
         * - disconnected
         * - only TCP connected
         * - not bound
         * - closing
         * - using different configuration
         *
         * Replace it with a fresh session.
         */
        if (existing) {
          this.logger.info(
            {
              connectorId,

              sessionId:
                existing.sessionId,

              previousState:
                this.getConnectionState(
                  connectorId,
                ),
            },
            "Replacing existing SMPP connector session.",
          );

          await this.disconnect(
            connectorId,
          );
        }

        const sessionId =
          crypto.randomUUID();

        this.logger.info(
          {
            connectorId,

            sessionId,

            host:
              configuration.host,

            port:
              configuration.port,

            systemId:
              configuration.systemId,
          },
          "Opening SMPP connection.",
        );

        const session =
          smpp.connect({
            host:
              configuration.host,

            port:
              configuration.port,

            connectTimeout:
              configuration.connectionTimeout,

            enquire_link:
              configuration.enquireLinkInterval,

            debug:
              false,
          });

        const state: SmppSession = {
          connectorId,

          sessionId,

          session,

          configuration,

          configurationHash,

          connected: false,

          bound: false,

          closing: false,
        };

        this.sessions.set(
          connectorId,
          state,
        );

        this.registerHandlers(
          state,
        );

        try {
          await this.waitForConnect(
            state,
          );

          await this.bind(
            state,
          );

          this.logger.info(
            {
              connectorId,

              sessionId,
            },
            "SMPP connector session established.",
          );
        } catch (error) {
          recordException(
            error,
          );

          /*
           * The connection attempt failed.
           *
           * Remove this failed session from the managed map.
           * The connection manager can subsequently create a new
           * attempt.
           */
          try {
            await this.disconnect(
              connectorId,
            );
          } catch (closeError) {
            recordException(
              closeError,
            );
          }

          throw error;
        }
      },
    );
  }

  // ===========================================================================
  // TCP connection
  // ===========================================================================

  private async waitForConnect(
    state: SmppSession,
  ): Promise<void> {
    if (
      state.connected
    ) {
      return;
    }

    await new Promise<void>(
      (
        resolve,
        reject,
      ) => {
        let settled =
          false;

        const cleanup =
          () => {
            clearTimeout(
              timer,
            );

            state.session.removeListener(
              "connect",
              onConnect,
            );

            state.session.removeListener(
              "error",
              onError,
            );

            state.session.removeListener(
              "close",
              onClose,
            );
          };

        const finishResolve =
          () => {
            if (settled) {
              return;
            }

            settled = true;

            cleanup();

            state.connected =
              true;

            resolve();
          };

        const finishReject =
          (
            error: Error,
          ) => {
            if (settled) {
              return;
            }

            settled = true;

            cleanup();

            reject(error);
          };

        const onConnect =
          () => {
            finishResolve();
          };

        const onError =
          (error: Error) => {
            finishReject(
              error,
            );
          };

        const onClose =
          () => {
            finishReject(
              new Error(
                "SMPP connection closed before connect completed.",
              ),
            );
          };

        const timer =
          setTimeout(
            () => {
              finishReject(
                new Error(
                  "SMPP connection timed out.",
                ),
              );
            },
            state.configuration
              .connectionTimeout,
          );

        state.session.once(
          "connect",
          onConnect,
        );

        state.session.once(
          "error",
          onError,
        );

        state.session.once(
          "close",
          onClose,
        );
      },
    );
  }

  // ===========================================================================
  // Bind
  // ===========================================================================

  private async bind(
    state: SmppSession,
  ): Promise<void> {
    if (
      state.bound
    ) {
      return;
    }

    if (
      !state.connected ||
      state.closing
    ) {
      throw new Error(
        "Cannot bind an unavailable SMPP session.",
      );
    }

    await new Promise<void>(
      (
        resolve,
        reject,
      ) => {
        try {
          state.session.bind_transceiver(
            {
              system_id:
                state.configuration
                  .systemId,

              password:
                state.configuration
                  .password,

              system_type:
                state.configuration
                  .systemType,
            },

            (pdu) => {
              if (
                pdu.command_status !==
                0
              ) {
                const error =
                  new Error(
                    `SMPP bind failed with command status ${pdu.command_status}.`,
                  );

                recordException(
                  error,
                );

                this.logger.error(
                  {
                    connectorId:
                      state.connectorId,

                    sessionId:
                      state.sessionId,

                    commandStatus:
                      pdu.command_status,
                  },
                  "SMPP bind failed.",
                );

                reject(
                  error,
                );

                return;
              }

              state.bound =
                true;

              this.logger.info(
                {
                  connectorId:
                    state.connectorId,

                  sessionId:
                    state.sessionId,

                  systemId:
                    state.configuration
                      .systemId,
                },
                "SMPP session bound successfully.",
              );

              resolve();
            },
          );
        } catch (error) {
          recordException(
            error,
          );

          reject(
            error,
          );
        }
      },
    );
  }

  // ===========================================================================
  // Session handlers
  // ===========================================================================

  private registerHandlers(
    state: SmppSession,
  ): void {
    state.session.on(
      "error",
      (error) => {
        recordException(
          error,
        );

        this.logger.error(
          {
            connectorId:
              state.connectorId,

            sessionId:
              state.sessionId,

            err:
              error,
          },
          "SMPP session error.",
        );
      },
    );

    state.session.on(
      "close",
      () => {
        state.connected =
          false;

        state.bound =
          false;

        /*
         * IMPORTANT:
         *
         * Do not remove the session from this.sessions here.
         *
         * The connector is still managed. The connection manager
         * will see the session as DISCONNECTED and reconnect it.
         */
        this.logger.warn(
          {
            connectorId:
              state.connectorId,

            sessionId:
              state.sessionId,

            closing:
              state.closing,
          },
          "SMPP session disconnected.",
        );
      },
    );

    state.session.on(
      "timeout",
      () => {
        this.logger.warn(
          {
            connectorId:
              state.connectorId,

            sessionId:
              state.sessionId,
          },
          "SMPP session timed out.",
        );
      },
    );

    state.session.on(
      "enquire_link",
      (pdu) => {
        this.logger.debug(
          {
            connectorId:
              state.connectorId,

            sessionId:
              state.sessionId,

            sequenceNumber:
              pdu.sequence_number,
          },
          "SMPP enquire_link received.",
        );
      },
    );

    state.session.on(
      "enquire_link_resp",
      (pdu) => {
        this.logger.debug(
          {
            connectorId:
              state.connectorId,

            sessionId:
              state.sessionId,

            sequenceNumber:
              pdu.sequence_number,

            commandStatus:
              pdu.command_status,
          },
          "SMPP enquire_link response received.",
        );
      },
    );

    // =========================================================================
    // Delivery receipts
    // =========================================================================

    state.session.on(
      "deliver_sm",
      (pdu) => {
        void this.handleDelivery(
          state,
          pdu,
        );
      },
    );
  }

  // ===========================================================================
  // Delivery receipt handling
  // ===========================================================================

  private async handleDelivery(
    state: SmppSession,
    pdu: smpp.PDU,
  ): Promise<void> {
    await withSpan(
      "SmppClient.handleDelivery",
      async (span) => {
        span.setAttributes({
          "smpp.connector_id":
            state.connectorId,

          "smpp.session_id":
            state.sessionId,

          "smpp.command":
            pdu.command,

          "smpp.sequence_number":
            pdu.sequence_number,
        });

        this.logger.info(
          {
            connectorId:
              state.connectorId,

            sessionId:
              state.sessionId,

            command:
              pdu.command,

            sequenceNumber:
              pdu.sequence_number,
          },
          "SMPP deliver_sm received.",
        );

        // -----------------------------------------------------------------------
        // Acknowledge deliver_sm
        // -----------------------------------------------------------------------

        try {
          state.session.send(
            pdu.response(),
          );

          this.logger.debug(
            {
              connectorId:
                state.connectorId,

              sessionId:
                state.sessionId,

              sequenceNumber:
                pdu.sequence_number,
            },
            "SMPP deliver_sm acknowledged.",
          );
        } catch (error) {
          recordException(
            error,
          );

          this.logger.error(
            {
              connectorId:
                state.connectorId,

              sessionId:
                state.sessionId,

              sequenceNumber:
                pdu.sequence_number,

              err:
                error,
            },
            "Failed to acknowledge SMPP deliver_sm.",
          );

          throw error;
        }

        // -----------------------------------------------------------------------
        // Create transport-level delivery
        // -----------------------------------------------------------------------

        /*
         * At this layer we preserve the complete PDU and expose
         * commonly useful fields.
         *
         * DLR-specific interpretation is handled outside SmppClient.
         */
        const delivery: SmppDelivery = {
          connectorId:
            state.connectorId,

          pdu,

          messageId:
            this.extractDeliveryMessageId(
              pdu,
            ),

          sourceAddress:
            this.extractAddress(
              pdu,
              "source_addr",
            ),

          destinationAddress:
            this.extractAddress(
              pdu,
              "destination_addr",
            ),

          shortMessage:
            this.extractShortMessage(
              pdu,
            ),
        };

        span.setAttributes({
          "smpp.has_message_id":
            !!delivery.messageId,

          "smpp.has_short_message":
            !!delivery.shortMessage,
        });

        // -----------------------------------------------------------------------
        // Hand delivery to application layer
        // -----------------------------------------------------------------------

        if (
          !this.deliveryHandler
        ) {
          this.logger.warn(
            {
              connectorId:
                state.connectorId,

              sessionId:
                state.sessionId,

              messageId:
                delivery.messageId,
            },
            "SMPP deliver_sm received but no delivery handler is registered.",
          );

          return;
        }

        try {
          await this.deliveryHandler(
            delivery,
          );

          this.logger.info(
            {
              connectorId:
                state.connectorId,

              sessionId:
                state.sessionId,

              messageId:
                delivery.messageId,
            },
            "SMPP delivery handed to delivery handler.",
          );
        } catch (error) {
          recordException(
            error,
          );

          this.logger.error(
            {
              connectorId:
                state.connectorId,

              sessionId:
                state.sessionId,

              messageId:
                delivery.messageId,

              err:
                error,
            },
            "SMPP delivery handler failed.",
          );
        }
      },
    );
  }

  private extractDeliveryMessageId(
    pdu: smpp.PDU,
  ): string | undefined {
    const value =
      (pdu as unknown as {
        receipted_message_id?: unknown;
      })
        .receipted_message_id;

    return typeof value ===
      "string" &&
      value.length > 0
      ? value
      : undefined;
  }

  private extractAddress(
    pdu: smpp.PDU,
    field:
      | "source_addr"
      | "destination_addr",
  ): string | undefined {
    const value =
      (pdu as unknown as Record<
        string,
        unknown
      >)[field];

    return typeof value ===
      "string" &&
      value.length > 0
      ? value
      : undefined;
  }

  private extractShortMessage(
    pdu: smpp.PDU,
  ): string | undefined {
    const value =
      (pdu as unknown as {
        short_message?: unknown;
      })
        .short_message;

    if (
      typeof value ===
      "string"
    ) {
      return value;
    }

    if (
      Buffer.isBuffer(value)
    ) {
      return value.toString();
    }

    return undefined;
  }

  // ===========================================================================
  // Submit SMS
  // ===========================================================================

  public async submitSm(
    connectorId: string,
    parameters: smpp.SubmitSmOptions,
  ): Promise<SmppSubmissionResult> {
    return withSpan(
      "SmppClient.submitSm",
      async (span) => {
        span.setAttribute(
          "smpp.connector_id",
          connectorId,
        );

        const state =
          this.sessions.get(
            connectorId,
          );

        if (
          !state ||
          !state.connected ||
          !state.bound ||
          state.closing
        ) {
          this.logger.warn(
            {
              connectorId,

              sessionId:
                state?.sessionId,

              state:
                state
                  ? this.getConnectionState(
                    connectorId,
                  )
                  : "DISCONNECTED",
            },
            "SMPP submission rejected because connector is disconnected.",
          );

          return {
            status:
              "DISCONNECTED",

            errorCode:
              "SMPP_DISCONNECTED",

            errorMessage:
              "No usable SMPP session is available for the connector.",
          };
        }

        return new Promise<SmppSubmissionResult>(
          (resolve) => {
            let settled =
              false;

            const finish =
              (
                result:
                  SmppSubmissionResult,
              ) => {
                if (settled) {
                  return;
                }

                settled = true;

                clearTimeout(
                  timer,
                );

                resolve(
                  result,
                );
              };

            const timer =
              setTimeout(
                () => {
                  finish({
                    status:
                      "UNKNOWN",

                    errorCode:
                      "SMPP_SUBMIT_TIMEOUT",

                    errorMessage:
                      "No submit_sm response was received within the configured timeout.",
                  });
                },
                state.configuration
                  .requestTimeout,
              );

            try {
              state.session.submit_sm(
                parameters,
                (pdu) => {
                  if (
                    pdu.command_status !==
                    0
                  ) {
                    finish({
                      status:
                        "FAILED",

                      errorCode:
                        `SMPP_${pdu.command_status}`,

                      errorMessage:
                        `SMPP submit_sm was rejected with command status ${pdu.command_status}.`,
                    });

                    return;
                  }

                  finish({
                    status:
                      "SUBMITTED",

                    providerMessageId:
                      typeof pdu.message_id ===
                        "string"
                        ? pdu.message_id
                        : undefined,
                  });
                },
              );
            } catch (error) {
              recordException(
                error,
              );

              finish({
                status:
                  "FAILED",

                errorCode:
                  "SMPP_SUBMIT_ERROR",

                errorMessage:
                  error instanceof Error
                    ? error.message
                    : "SMPP submit_sm failed.",
              });
            }
          },
        );
      },
    );
  }

  // ===========================================================================
  // Disconnect
  // ===========================================================================

  public async disconnect(
    connectorId: string,
  ): Promise<void> {
    const state =
      this.sessions.get(
        connectorId,
      );

    if (!state) {
      return;
    }

    state.closing =
      true;

    try {
      if (
        state.bound
      ) {
        await new Promise<void>(
          (resolve) => {
            try {
              state.session.unbind(
                () => {
                  state.bound =
                    false;

                  resolve();
                },
              );
            } catch (error) {
              recordException(
                error,
              );

              resolve();
            }
          },
        );
      }

      /*
       * close() may already have happened because the provider
       * disconnected. Calling it is still safe for our lifecycle.
       */
      try {
        state.session.close();
      } catch (error) {
        recordException(
          error,
        );
      }
    } finally {
      state.connected =
        false;

      state.bound =
        false;

      this.sessions.delete(
        connectorId,
      );

      this.logger.info(
        {
          connectorId,

          sessionId:
            state.sessionId,
        },
        "SMPP connector session closed.",
      );
    }
  }

  // ===========================================================================
  // Configuration fingerprint
  // ===========================================================================

  private createConfigurationHash(
    configuration:
      SmppConnectorConfiguration,
  ): string {
    return JSON.stringify({
      host:
        configuration.host,

      port:
        configuration.port,

      systemId:
        configuration.systemId,

      password:
        configuration.password,

      systemType:
        configuration.systemType,

      connectionTimeout:
        configuration.connectionTimeout,

      enquireLinkInterval:
        configuration.enquireLinkInterval,

      requestTimeout:
        configuration.requestTimeout,
    });
  }

  // ===========================================================================
  // Shutdown
  // ===========================================================================

  public async onApplicationShutdown(): Promise<void> {
    const connectorIds = [
      ...this.sessions.keys(),
    ];

    await Promise.all(
      connectorIds.map(
        (connectorId) =>
          this.disconnect(
            connectorId,
          ),
      ),
    );
  }
}