import { OnApplicationShutdown } from "@nestjs/common";
import type { QueueClient } from "@pague-co-uk/sms-gateway-queue-client";
export declare class QueueService implements OnApplicationShutdown {
    private readonly client;
    private readonly logger;
    constructor(client: QueueClient);
    onApplicationShutdown(): Promise<void>;
}
