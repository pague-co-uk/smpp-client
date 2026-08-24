import {
  Inject,
  Injectable,
  OnApplicationShutdown,
} from "@nestjs/common";

import type {
  QueueClient,
} from "@pague-co-uk/sms-gateway-queue-client";

import {
  getComponentLogger,
} from "@pague-co-uk/sms-gateway-telemetry";

import {
  QUEUE_CLIENT,
} from "./constants/queue.constants.js";

@Injectable()
export class QueueService
  implements OnApplicationShutdown {
  private readonly logger =
    getComponentLogger(
      QueueService.name,
    );

  constructor(
    @Inject(QUEUE_CLIENT)
    private readonly client:
      QueueClient,
  ) { }

  async onApplicationShutdown(): Promise<void> {
    this.logger.info(
      "Shutting down RabbitMQ client.",
    );

    try {
      await this.client.close();

      this.logger.info(
        "RabbitMQ client shut down successfully.",
      );
    } catch (error) {
      this.logger.error(
        {
          err: error,
        },
        "Failed to shut down RabbitMQ client.",
      );
    }
  }
}