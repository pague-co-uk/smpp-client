import {
  Provider,
} from "@nestjs/common";

import {
  createQueueClient,
  type QueueClient,
} from "@pague-co-uk/sms-gateway-queue-client";

import {
  AppConfigService,
} from "../config/config.service.js";

import {
  QUEUE_CLIENT,
} from "./constants/queue.constants.js";

export const queueProvider:
  Provider = {
  provide: QUEUE_CLIENT,

  inject: [
    AppConfigService,
  ],

  useFactory: (
    config: AppConfigService,
  ): QueueClient => {
    const rabbitmq =
      config.rabbitmq;

    return createQueueClient({
      url: rabbitmq.url,

      connectionName:
        rabbitmq.connectionName,

      heartbeat:
        rabbitmq.heartbeat,

      reconnectDelay:
        rabbitmq.reconnectDelay,

      maxReconnectDelay:
        rabbitmq.maxReconnectDelay,

      maxReconnectAttempts:
        rabbitmq.maxReconnectAttempts,

      autoRecover:
        rabbitmq.autoRecover,
    });
  },
};