import { createQueueClient, } from "@pague-co-uk/sms-gateway-queue-client";
import { AppConfigService, } from "../config/config.service.js";
import { QUEUE_CLIENT, } from "./constants/queue.constants.js";
export const queueProvider = {
    provide: QUEUE_CLIENT,
    inject: [
        AppConfigService,
    ],
    useFactory: (config) => {
        const rabbitmq = config.rabbitmq;
        return createQueueClient({
            url: rabbitmq.url,
            connectionName: rabbitmq.connectionName,
            heartbeat: rabbitmq.heartbeat,
            reconnectDelay: rabbitmq.reconnectDelay,
            maxReconnectDelay: rabbitmq.maxReconnectDelay,
            maxReconnectAttempts: rabbitmq.maxReconnectAttempts,
            autoRecover: rabbitmq.autoRecover,
        });
    },
};
//# sourceMappingURL=queue.provider.js.map