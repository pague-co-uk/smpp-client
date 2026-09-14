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
  DeliveryReceiptPublisher,
} from "./publishers/delivery-receipt.publisher.js";

import {
  SmppRepository,
} from "./repositories/smpp.repository.js";

import {
  SmppDeliveryReceiptParser,
} from "./services/smpp-delivery-receipt-parser.js";

import {
  SmppClient,
} from "./smpp.client.js";

import type {
  SmppDelivery,
} from "./types/smpp-delivery.js";

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

    private readonly deliveryReceiptParser:
      SmppDeliveryReceiptParser,

    private readonly deliveryReceiptPublisher:
      DeliveryReceiptPublisher,
  ) { }

  // ===========================================================================
  // Lifecycle
  // ===========================================================================

  async onModuleInit(): Promise<void> {
    this.running = true;

    /*
     * SmppClient owns the SMPP sessions and receives raw deliver_sm PDUs.
     *
     * SmppConsumer owns the application-level handling of those deliveries.
     */
    this.smpp.setDeliveryHandler(
      async (delivery) => {
        await this.handleDelivery(
          delivery,
        );
      },
    );

    const routing =
      this.config.routing;

    this.logger.info(
      {
        queue:
          routing.consumerQueue,

        prefetch:
          this.getConsumerPrefetch(),
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
            routing.consumerQueue,

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
            routing.consumerQueue,

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
            routing.consumerQueue,

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
          routing.consumerQueue,

        prefetch:
          this.getConsumerPrefetch(),
      },
      "SMPP consumer started successfully.",
    );
  }

  async onModuleDestroy(): Promise<void> {
    this.running = false;

    this.logger.info(
      {
        queue:
          this.config.routing.consumerQueue,
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
    const queue =
      this.config.routing.consumerQueue;

    const prefetch =
      this.getConsumerPrefetch();

    this.logger.info(
      {
        queue,

        prefetch,
      },
      "Binding SMPP consumer to RabbitMQ queue.",
    );

    const consumer =
      await this.queue.subscribe<ConnectorMessage>(
        queue,

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
      );

    this.logger.info(
      {
        queue,

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
        // Resolve SMPP session
        // =====================================================================

        /*
         * The connector is selected by connectorId carried in the routing
         * dispatch message.
         *
         * SmppClient maintains persistent sessions for all active SMPP
         * connectors. No connection is created during message processing.
         */
        const hasSession =
          this.smpp.hasSession(
            message.connectorId,
          );

        if (!hasSession) {
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
                  sms.id,

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
             * DISCONNECTED is an SmppClient-level status.
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
                  message.attemptId,

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

  // ===========================================================================
  // SMPP delivery receipts
  // ===========================================================================

  private async handleDelivery(
    delivery: SmppDelivery,
  ): Promise<void> {
    await withSpan(
      "SmppConsumer.handleDelivery",
      async (span) => {
        span.setAttributes({
          "smpp.connector_id":
            delivery.connectorId,

          "smpp.provider_message_id":
            delivery.messageId ??
            "",

          "smpp.source_address":
            delivery.sourceAddress ??
            "",

          "smpp.destination_address":
            delivery.destinationAddress ??
            "",
        });

        this.logger.info(
          {
            connectorId:
              delivery.connectorId,

            providerMessageId:
              delivery.messageId,

            sourceAddress:
              delivery.sourceAddress,

            destinationAddress:
              delivery.destinationAddress,
          },
          "SMPP delivery received.",
        );

        if (!this.running) {
          this.logger.warn(
            {
              connectorId:
                delivery.connectorId,
            },
            "Ignoring SMPP delivery while consumer is shutting down.",
          );

          return;
        }

        // =====================================================================
        // Parse delivery receipt
        // =====================================================================

        const receipt =
          this.deliveryReceiptParser.parse(
            delivery,
            delivery.connectorId,
          );

        /*
         * Not every deliver_sm is a delivery receipt.
         *
         * A provider may also use deliver_sm for mobile-originated messages.
         * The parser returns null when the PDU does not represent a DLR.
         */
        if (!receipt) {
          this.logger.debug(
            {
              connectorId:
                delivery.connectorId,

              providerMessageId:
                delivery.messageId,

              sourceAddress:
                delivery.sourceAddress,

              destinationAddress:
                delivery.destinationAddress,
            },
            "SMPP deliver_sm is not a recognized delivery receipt.",
          );

          return;
        }

        // =====================================================================
        // Delivery receipt parsed
        // =====================================================================

        span.setAttributes({
          "smpp.delivery_status":
            receipt.status,

          "smpp.provider_message_id":
            receipt.providerMessageId,
        });

        this.logger.info(
          {
            connectorId:
              receipt.connectorId,

            providerMessageId:
              receipt.providerMessageId,

            status:
              receipt.status,

            errorCode:
              receipt.errorCode,
          },
          "SMPP delivery receipt parsed.",
        );

        // =====================================================================
        // Publish delivery receipt
        // =====================================================================

        await this.deliveryReceiptPublisher.publish(
          receipt,
        );

        this.logger.info(
          {
            connectorId:
              receipt.connectorId,

            providerMessageId:
              receipt.providerMessageId,

            status:
              receipt.status,
          },
          "SMPP delivery receipt published.",
        );
      },
    );
  }

  // ===========================================================================
  // Configuration helpers
  // ===========================================================================

  private getConsumerPrefetch(): number {
    /*
     * Prefetch is a service-level setting, not a connector-level setting.
     *
     * We keep it in the RabbitMQ configuration because this consumer handles
     * messages for many SMPP connectors.
     */
    return this.config.rabbitmq.consumerPrefetch;
  }
}