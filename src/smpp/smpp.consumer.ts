import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";

import type {
  QueueClient,
} from "@pague-co-uk/sms-gateway-queue-client";

import {
  getComponentLogger,
  recordException,
  withSpan,
} from "@pague-co-uk/sms-gateway-telemetry";

import {
  AppConfigService,
} from "../config/config.service.js";

import {
  QUEUE_CLIENT,
} from "../queue/constants/queue.constants.js";

import {
  ConnectorResultPublisher,
} from "./publishers/connector-result.publisher.js";

import {
  SmppRepository,
} from "./repositories/smpp.repository.js";

import {
  SmppClient,
} from "./smpp.client.js";

interface ConnectorMessage {
  messageId: string;
  attemptId: string;
  routeId: string;
  connectorId: string;
}

@Injectable()
export class SmppConsumer
  implements
  OnModuleInit,
  OnModuleDestroy {
  private readonly logger =
    getComponentLogger(
      SmppConsumer.name,
    );

  private running = false;

  constructor(
    @Inject(QUEUE_CLIENT)
    private readonly queue:
      QueueClient,

    private readonly config:
      AppConfigService,

    private readonly smpp:
      SmppClient,

    private readonly repository:
      SmppRepository,

    private readonly resultPublisher:
      ConnectorResultPublisher,
  ) { }

  // ===========================================================================
  // Lifecycle
  // ===========================================================================

  async onModuleInit(): Promise<void> {
    this.running = true;

    const connector =
      this.config.connector;

    this.logger.info(
      {
        queue:
          connector.queue,

        prefetch:
          connector.consumerPrefetch,
      },
      "SMPP consumer starting.",
    );

    // =========================================================================
    // RabbitMQ
    // =========================================================================

    try {
      await this.queue.connect();

      this.logger.info(
        {
          queue:
            connector.queue,

          queueClientState:
            this.queue.currentState,
        },
        "SMPP consumer connected to RabbitMQ.",
      );
    } catch (error) {
      recordException(error);

      this.logger.error(
        {
          queue:
            connector.queue,

          err:
            error,
        },
        "SMPP consumer failed to connect to RabbitMQ.",
      );

      throw error;
    }

    // =========================================================================
    // Consumption
    // =========================================================================

    try {
      await this.startConsumption();
    } catch (error) {
      recordException(error);

      this.logger.error(
        {
          queue:
            connector.queue,

          err:
            error,
        },
        "SMPP consumer failed to bind to RabbitMQ queue.",
      );

      throw error;
    }

    this.logger.info(
      {
        queue:
          connector.queue,

        prefetch:
          connector.consumerPrefetch,
      },
      "SMPP consumer started successfully.",
    );
  }

  async onModuleDestroy(): Promise<void> {
    this.running = false;

    this.logger.info(
      {
        queue:
          this.config.connector.queue,
      },
      "SMPP consumer stopping.",
    );

    /*
     * SmppClient owns all SMPP connections.
     *
     * The shared QueueClient is intentionally not closed here.
     */
    this.logger.info(
      "SMPP consumer stopped.",
    );
  }

  // ===========================================================================
  // RabbitMQ consumption
  // ===========================================================================

  private async startConsumption(): Promise<void> {
    const connector =
      this.config.connector;

    this.logger.info(
      {
        queue:
          connector.queue,

        prefetch:
          connector.consumerPrefetch,
      },
      "Binding SMPP consumer to RabbitMQ queue.",
    );

    const consumer =
      await this.queue.subscribe<ConnectorMessage>(
        connector.queue,

        async (message) => {
          /*
           * ManagedQueue ACKs the RabbitMQ message only when this handler
           * resolves.
           *
           * Therefore the handler must only resolve after:
           *
           * 1. The SMPP submission has produced an outcome.
           * 2. That outcome has been successfully published to the routing
           *    result queue.
           *
           * If either operation fails, the handler throws and the message
           * remains unacknowledged.
           */

          if (!this.running) {
            throw new Error(
              "SMPP consumer is shutting down.",
            );
          }

          await this.handleMessage(
            message,
          );
        },

        {
          noAck: false,

          prefetch:
            connector.consumerPrefetch,
        },
      );

    this.logger.info(
      {
        queue:
          connector.queue,

        consumerTag:
          consumer.consumerTag,
      },
      "Successfully bound SMPP consumer to RabbitMQ queue.",
    );
  }

  // ===========================================================================
  // Message handling
  // ===========================================================================

  private async handleMessage(
    message: ConnectorMessage,
  ): Promise<void> {
    await withSpan(
      "SmppConsumer.handleMessage",
      async (span) => {
        span.setAttributes({
          "message.id":
            message.messageId,

          "routing.attempt_id":
            message.attemptId,

          "routing.route_id":
            message.routeId,

          "routing.connector_id":
            message.connectorId,
        });

        this.logger.info(
          {
            messageId:
              message.messageId,

            attemptId:
              message.attemptId,

            routeId:
              message.routeId,

            connectorId:
              message.connectorId,
          },
          "SMPP connector message received.",
        );

        // =====================================================================
        // Validate routing attempt
        // =====================================================================

        const attempt =
          await this.repository.findAttempt(
            message.attemptId,
          );

        if (!attempt) {
          const error =
            new Error(
              `Routing attempt '${message.attemptId}' was not found.`,
            );

          recordException(error);

          this.logger.error(
            {
              messageId:
                message.messageId,

              attemptId:
                message.attemptId,

              connectorId:
                message.connectorId,
            },
            "Routing attempt not found.",
          );

          throw error;
        }

        // =====================================================================
        // Validate dispatch identity
        // =====================================================================

        if (
          attempt.messageId !==
          message.messageId
        ) {
          throw new Error(
            "Routing attempt does not belong to the dispatched message.",
          );
        }

        if (
          attempt.routeId !==
          message.routeId
        ) {
          throw new Error(
            "Routing attempt does not belong to the dispatched route.",
          );
        }

        if (
          attempt.connectorId !==
          message.connectorId
        ) {
          throw new Error(
            "Routing attempt does not belong to the dispatched connector.",
          );
        }

        // =====================================================================
        // Load message
        // =====================================================================

        const sms =
          await this.repository
            .findMessageForSubmission(
              message.messageId,
            );

        if (!sms) {
          throw new Error(
            `Message '${message.messageId}' was not found.`,
          );
        }

        // =====================================================================
        // Validate sender
        // =====================================================================

        if (!sms.senderId) {
          throw new Error(
            `Message '${sms.id}' has no sender ID.`,
          );
        }

        if (!sms.senderId.sender) {
          throw new Error(
            `Message '${sms.id}' has an empty sender address.`,
          );
        }

        // =====================================================================
        // Resolve connector session
        // =====================================================================

        /*
         * The connector is selected from the routing message.
         *
         * SmppClient maintains the actual persistent SMPP sessions and does
         * not create a connection here.
         */
        const hasSession =
          this.smpp.hasSession(
            message.connectorId,
          );

        if (!hasSession) {
          /*
           * This is an infrastructure-level failure.
           *
           * SmppClient itself will return DISCONNECTED if submitSm() is
           * called without a usable session. We can therefore let it produce
           * the canonical result rather than inventing a second result here.
           */
          this.logger.warn(
            {
              messageId:
                message.messageId,

              attemptId:
                message.attemptId,

              connectorId:
                message.connectorId,
            },
            "No usable SMPP session exists for connector.",
          );
        }

        // =====================================================================
        // Submit SMS
        // =====================================================================

        this.logger.info(
          {
            messageId:
              sms.id,

            attemptId:
              attempt.id,

            connectorId:
              message.connectorId,

            destination:
              sms.destination,

            sender:
              sms.senderId.sender,

            encoding:
              sms.encoding,

            segmentCount:
              sms.segmentCount,
          },
          "Submitting SMS through SMPP.",
        );

        const submission =
          await this.smpp.submitSm(
            message.connectorId,
            {
              source_addr:
                sms.senderId.sender,

              destination_addr:
                sms.destination,

              short_message:
                sms.body,
            },
          );

        // =====================================================================
        // Translate SMPP result
        // =====================================================================

        let resultStatus:
          | "SUBMITTED"
          | "FAILED"
          | "UNKNOWN";

        let errorCode:
          | string
          | undefined;

        let errorMessage:
          | string
          | undefined;

        let providerMessageId:
          | string
          | undefined;

        switch (
        submission.status
        ) {
          // ===================================================================
          // Submitted
          // ===================================================================

          case "SUBMITTED": {
            resultStatus =
              "SUBMITTED";

            providerMessageId =
              submission.providerMessageId;

            span.setAttributes({
              "smpp.result_status":
                "SUBMITTED",

              "smpp.provider_message_id":
                providerMessageId ??
                "",
            });

            this.logger.info(
              {
                messageId:
                  sms.id,

                attemptId:
                  attempt.id,

                connectorId:
                  message.connectorId,

                providerMessageId,
              },
              "SMS submitted successfully through SMPP.",
            );

            break;
          }

          // ===================================================================
          // Definitive failure
          // ===================================================================

          case "FAILED": {
            resultStatus =
              "FAILED";

            errorCode =
              submission.errorCode;

            errorMessage =
              submission.errorMessage.slice(
                0,
                255,
              );

            span.setAttributes({
              "smpp.result_status":
                "FAILED",

              "smpp.error_code":
                errorCode ??
                "",
            });

            this.logger.error(
              {
                messageId:
                  sms.id,

                attemptId:
                  attempt.id,

                connectorId:
                  message.connectorId,

                errorCode,

                errorMessage,
              },
              "SMPP provider definitively rejected the SMS submission.",
            );

            break;
          }

          // ===================================================================
          // Unknown outcome
          // ===================================================================

          case "UNKNOWN": {
            resultStatus =
              "UNKNOWN";

            errorCode =
              submission.errorCode;

            errorMessage =
              submission.errorMessage.slice(
                0,
                255,
              );

            span.setAttributes({
              "smpp.result_status":
                "UNKNOWN",

              "smpp.error_code":
                errorCode ??
                "",
            });

            this.logger.error(
              {
                messageId:
                  sms.id,

                attemptId:
                  attempt.id,

                connectorId:
                  message.connectorId,

                errorCode,

                errorMessage,
              },
              "SMPP submission outcome is unknown.",
            );

            break;
          }

          // ===================================================================
          // Connector unavailable
          // ===================================================================

          case "DISCONNECTED": {
            /*
             * DISCONNECTED is deliberately an SmppClient-level status.
             *
             * Routing does not need a separate DISCONNECTED attempt state.
             *
             * Since submit_sm could not be completed because the connector
             * session was unavailable, report this as FAILED so the routing
             * service can evaluate the next route.
             */
            resultStatus =
              "FAILED";

            errorCode =
              submission.errorCode ??
              "SMPP_DISCONNECTED";

            errorMessage =
              submission.errorMessage.slice(
                0,
                255,
              );

            span.setAttributes({
              "smpp.result_status":
                "FAILED",

              "smpp.error_code":
                errorCode,
            });

            this.logger.warn(
              {
                messageId:
                  sms.id,

                attemptId:
                  attempt.id,

                connectorId:
                  message.connectorId,

                errorCode,

                errorMessage,
              },
              "SMPP connector is disconnected; reporting submission as failed.",
            );

            break;
          }
        }

        // =====================================================================
        // Publish routing result
        // =====================================================================

        await this.resultPublisher.publish({
          messageId:
            message.messageId,

          attemptId:
            message.attemptId,

          routeId:
            message.routeId,

          connectorId:
            message.connectorId,

          status:
            resultStatus,

          providerMessageId,

          errorCode,

          errorMessage,
        });

        // =====================================================================
        // Result published
        // =====================================================================

        this.logger.info(
          {
            messageId:
              message.messageId,

            attemptId:
              message.attemptId,

            connectorId:
              message.connectorId,

            status:
              resultStatus,

            providerMessageId,
          },
          "SMPP submission result published.",
        );
      },
    );
  }
}