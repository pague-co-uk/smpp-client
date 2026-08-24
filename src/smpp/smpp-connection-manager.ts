import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";

import {
  getComponentLogger,
  recordException,
} from "@pague-co-uk/sms-gateway-telemetry";

import {
  SmppRepository,
} from "./repositories/smpp.repository.js";

import {
  SmppClient,
} from "./smpp.client.js";

import {
  parseSmppConnectorConfiguration,
} from "./smpp-connector-config.js";

import type {
  SmppConnectorConfiguration,
} from "./types/smpp-connector-configuration.js";

interface ConnectorWorker {
  connectorId: string;

  connectorCode: string;

  configuration:
  SmppConnectorConfiguration;

  generation: number;

  reconnecting: boolean;

  timer:
  NodeJS.Timeout | null;

  currentDelay: number;
}

@Injectable()
export class SmppConnectionManager
  implements
  OnModuleInit,
  OnModuleDestroy {
  private readonly logger =
    getComponentLogger(
      SmppConnectionManager.name,
    );

  private running =
    false;

  private reconciliationTimer:
    NodeJS.Timeout | null =
    null;

  /*
   * Infrastructure reconciliation interval.
   *
   * This is NOT the SMPP reconnect delay.
   *
   * It is only used to discover:
   *
   * - newly created connectors
   * - removed connectors
   * - changed connector configuration
   * - connectors that have become disconnected
   */
  private readonly reconciliationInterval =
    5000;

  /*
   * Each connector gets its own worker.
   *
   * Connector A can therefore be retrying every 5 seconds while
   * Connector B is independently retrying every 30 seconds.
   */
  private readonly workers =
    new Map<
      string,
      ConnectorWorker
    >();

  constructor(
    private readonly repository:
      SmppRepository,

    private readonly client:
      SmppClient,
  ) { }

  // ===========================================================================
  // Lifecycle
  // ===========================================================================

  async onModuleInit(): Promise<void> {
    this.running =
      true;

    this.logger.info(
      "SMPP connection manager starting.",
    );

    await this.reconcile();

    this.scheduleReconciliation();
  }

  async onModuleDestroy(): Promise<void> {
    this.running =
      false;

    if (
      this.reconciliationTimer !==
      null
    ) {
      clearTimeout(
        this.reconciliationTimer,
      );

      this.reconciliationTimer =
        null;
    }

    /*
     * Stop all connector workers independently.
     */
    const workers = [
      ...this.workers.values(),
    ];

    for (
      const worker of workers
    ) {
      this.stopWorker(
        worker,
      );
    }

    this.workers.clear();

    this.logger.info(
      "SMPP connection manager stopped.",
    );
  }

  // ===========================================================================
  // Reconciliation
  // ===========================================================================

  private async reconcile(): Promise<void> {
    if (!this.running) {
      return;
    }

    const connectors =
      await this.repository
        .findActiveSmppConnectors();

    const activeIds =
      new Set(
        connectors.map(
          (connector) =>
            connector.id,
        ),
      );

    /*
     * Start or update workers for every active connector.
     *
     * IMPORTANT:
     *
     * We deliberately do NOT await connector connections here.
     *
     * This means 100 connectors can be reconciled without connector #1
     * blocking connector #2 through connector #100.
     */
    for (
      const connector of connectors
    ) {
      try {
        const configuration =
          parseSmppConnectorConfiguration(
            connector.configuration,
          );

        this.ensureWorker(
          connector.id,
          connector.code,
          configuration,
        );
      } catch (error) {
        recordException(
          error,
        );

        this.logger.error(
          {
            connectorId:
              connector.id,

            connectorCode:
              connector.code,

            provider:
              connector.provider,

            err:
              error,
          },
          "Invalid SMPP connector configuration.",
        );
      }
    }

    /*
     * Stop workers for connectors that are no longer active SMPP
     * connectors.
     */
    for (
      const [
        connectorId,
        worker,
      ] of this.workers
    ) {
      if (
        activeIds.has(
          connectorId,
        )
      ) {
        continue;
      }

      this.logger.info(
        {
          connectorId,

          connectorCode:
            worker.connectorCode,
        },
        "SMPP connector is no longer active; stopping connection worker.",
      );

      this.stopWorker(
        worker,
      );

      this.workers.delete(
        connectorId,
      );

      try {
        await this.client.disconnect(
          connectorId,
        );
      } catch (error) {
        recordException(
          error,
        );

        this.logger.error(
          {
            connectorId,

            err:
              error,
          },
          "Failed to disconnect inactive SMPP connector.",
        );
      }
    }
  }

  // ===========================================================================
  // Worker management
  // ===========================================================================

  private ensureWorker(
    connectorId: string,
    connectorCode: string,
    configuration:
      SmppConnectorConfiguration,
  ): void {
    const existing =
      this.workers.get(
        connectorId,
      );

    /*
     * No worker exists yet.
     */
    if (!existing) {
      const worker: ConnectorWorker = {
        connectorId,

        connectorCode,

        configuration,

        generation:
          0,

        reconnecting:
          false,

        timer:
          null,

        currentDelay:
          configuration.reconnectDelay,
      };

      this.workers.set(
        connectorId,
        worker,
      );

      void this.runWorker(
        worker,
      );

      return;
    }

    /*
     * Configuration may have changed in the database.
     *
     * Replace the worker configuration and restart its connection
     * lifecycle.
     */
    if (
      !this.configurationEquals(
        existing.configuration,
        configuration,
      )
    ) {
      this.logger.info(
        {
          connectorId,

          connectorCode,
        },
        "SMPP connector configuration changed; restarting connection.",
      );

      existing.configuration =
        configuration;

      existing.currentDelay =
        configuration.reconnectDelay;

      existing.generation++;

      this.cancelWorkerTimer(
        existing,
      );

      /*
       * If a worker is already running, its generation check will
       * cause the old lifecycle to terminate.
       *
       * A new worker lifecycle is then started.
       */
      if (
        !existing.reconnecting
      ) {
        void this.runWorker(
          existing,
        );
      }

      return;
    }

    /*
     * Configuration is unchanged.
     *
     * If there is no active SMPP session and the worker isn't already
     * trying to reconnect, start it.
     */
    if (
      !this.client.hasSession(
        connectorId,
      ) &&
      !existing.reconnecting &&
      existing.timer === null
    ) {
      void this.runWorker(
        existing,
      );
    }
  }

  // ===========================================================================
  // Per-connector connection worker
  // ===========================================================================

  private async runWorker(
    worker: ConnectorWorker,
  ): Promise<void> {
    if (
      !this.running ||
      worker.reconnecting
    ) {
      return;
    }

    worker.reconnecting =
      true;

    const generation =
      worker.generation;

    try {
      while (
        this.running &&
        worker.generation ===
        generation
      ) {
        /*
         * Another reconciliation may already have established the
         * session while this worker was waiting.
         */
        if (
          this.client.hasSession(
            worker.connectorId,
          )
        ) {
          worker.currentDelay =
            worker.configuration
              .reconnectDelay;

          return;
        }

        try {
          this.logger.info(
            {
              connectorId:
                worker.connectorId,

              connectorCode:
                worker.connectorCode,

              host:
                worker.configuration.host,

              port:
                worker.configuration.port,

              retryDelay:
                worker.currentDelay,
            },
            "Attempting SMPP connector connection.",
          );

          /*
           * SmppClient owns the actual persistent SMPP session.
           *
           * This call does NOT create a connection for every message.
           * It establishes the long-lived connector session.
           */
          await this.client.connect(
            worker.connectorId,
            worker.configuration,
          );

          if (
            !this.running ||
            worker.generation !==
            generation
          ) {
            return;
          }

          /*
           * Successful connection.
           *
           * Reset ONLY this connector's backoff.
           */
          worker.currentDelay =
            worker.configuration
              .reconnectDelay;

          this.logger.info(
            {
              connectorId:
                worker.connectorId,

              connectorCode:
                worker.connectorCode,
            },
            "SMPP connector connected successfully.",
          );

          return;
        } catch (error) {
          recordException(
            error,
          );

          if (
            !this.running ||
            worker.generation !==
            generation
          ) {
            return;
          }

          this.logger.error(
            {
              connectorId:
                worker.connectorId,

              connectorCode:
                worker.connectorCode,

              retryIn:
                worker.currentDelay,

              err:
                error,
            },
            "SMPP connector connection attempt failed.",
          );

          /*
           * Ensure a failed/partial session does not remain registered.
           */
          try {
            await this.client.disconnect(
              worker.connectorId,
            );
          } catch (disconnectError) {
            recordException(
              disconnectError,
            );

            this.logger.warn(
              {
                connectorId:
                  worker.connectorId,

                err:
                  disconnectError,
              },
              "Failed to clean up failed SMPP connector session.",
            );
          }

          if (
            !this.running ||
            worker.generation !==
            generation
          ) {
            return;
          }

          const delay =
            worker.currentDelay;

          this.logger.warn(
            {
              connectorId:
                worker.connectorId,

              connectorCode:
                worker.connectorCode,

              retryIn:
                delay,
            },
            "SMPP connector will be retried.",
          );

          await this.sleep(
            worker,
            delay,
            generation,
          );

          if (
            !this.running ||
            worker.generation !==
            generation
          ) {
            return;
          }

          /*
           * Exponential backoff for THIS connector only.
           *
           * Other connectors have their own currentDelay values.
           */
          worker.currentDelay =
            Math.min(
              worker.currentDelay * 2,
              worker.configuration
                .maxReconnectDelay,
            );
        }
      }
    } finally {
      worker.reconnecting =
        false;

      /*
       * If the connector is still active and no session exists,
       * reconciliation will start the worker again.
       */
    }
  }

  // ===========================================================================
  // Worker sleep
  // ===========================================================================

  private async sleep(
    worker: ConnectorWorker,
    delay: number,
    generation: number,
  ): Promise<void> {
    await new Promise<void>(
      (resolve) => {
        if (
          !this.running ||
          worker.generation !==
          generation
        ) {
          resolve();

          return;
        }

        worker.timer =
          setTimeout(
            () => {
              worker.timer =
                null;

              resolve();
            },
            delay,
          );
      },
    );
  }

  // ===========================================================================
  // Reconciliation scheduling
  // ===========================================================================

  private scheduleReconciliation(): void {
    if (!this.running) {
      return;
    }

    this.reconciliationTimer =
      setTimeout(
        async () => {
          this.reconciliationTimer =
            null;

          try {
            await this.reconcile();
          } catch (error) {
            recordException(
              error,
            );

            this.logger.error(
              {
                err:
                  error,
              },
              "SMPP connector reconciliation failed.",
            );
          }

          this.scheduleReconciliation();
        },
        this.reconciliationInterval,
      );
  }

  // ===========================================================================
  // Worker cancellation
  // ===========================================================================

  private stopWorker(
    worker: ConnectorWorker,
  ): void {
    worker.generation++;

    this.cancelWorkerTimer(
      worker,
    );
  }

  private cancelWorkerTimer(
    worker: ConnectorWorker,
  ): void {
    if (
      worker.timer !== null
    ) {
      clearTimeout(
        worker.timer,
      );

      worker.timer =
        null;
    }
  }

  // ===========================================================================
  // Configuration comparison
  // ===========================================================================

  private configurationEquals(
    a:
      SmppConnectorConfiguration,
    b:
      SmppConnectorConfiguration,
  ): boolean {
    return (
      a.host === b.host &&
      a.port === b.port &&
      a.systemId === b.systemId &&
      a.password === b.password &&
      a.systemType === b.systemType &&
      a.connectionTimeout ===
      b.connectionTimeout &&
      a.enquireLinkInterval ===
      b.enquireLinkInterval &&
      a.requestTimeout ===
      b.requestTimeout &&
      a.reconnectDelay ===
      b.reconnectDelay &&
      a.maxReconnectDelay ===
      b.maxReconnectDelay
    );
  }
}