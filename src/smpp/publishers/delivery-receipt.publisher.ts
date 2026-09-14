import {
  Inject,
  Injectable,
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
} from "../../config/config.service.js";

import {
  QUEUE_CLIENT,
} from "../../queue/constants/queue.constants.js";

import type {
  SmppDeliveryReceipt,
} from "../types/smpp-delivery-receipt.js";

@Injectable()
export class DeliveryReceiptPublisher {
  private readonly logger =
    getComponentLogger(
      DeliveryReceiptPublisher.name,
    );

  constructor(
    @Inject(QUEUE_CLIENT)
    private readonly queue:
      QueueClient,

    private readonly config:
      AppConfigService,
  ) { }

  async publish(
    receipt: SmppDeliveryReceipt,
  ): Promise<void> {
    await withSpan(
      "DeliveryReceiptPublisher.publish",
      async (span) => {
        span.setAttributes({
          "smpp.connector_id":
            receipt.connectorId,

          "smpp.provider_message_id":
            receipt.providerMessageId,

          "smpp.delivery_status":
            receipt.status,

          "messaging.destination":
            this.config.routing
              .deliveryReceiptQueue,
        });

        this.logger.info(
          {
            connectorId:
              receipt.connectorId,

            providerMessageId:
              receipt.providerMessageId,

            status:
              receipt.status,
          },
          "Publishing SMPP delivery receipt.",
        );

        try {
          await this.queue.publish(
            this.config.routing
              .deliveryReceiptQueue,

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
        } catch (error) {
          recordException(error);

          this.logger.error(
            {
              connectorId:
                receipt.connectorId,

              providerMessageId:
                receipt.providerMessageId,

              status:
                receipt.status,

              err:
                error,
            },
            "Failed to publish SMPP delivery receipt.",
          );

          throw error;
        }
      },
    );
  }
}