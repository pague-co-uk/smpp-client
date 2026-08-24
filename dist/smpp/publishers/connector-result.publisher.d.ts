import type { QueueClient } from "@pague-co-uk/sms-gateway-queue-client";
import { AppConfigService } from "../../config/config.service.js";
import type { RoutingResult } from "../types/routing-result.js";
export declare class ConnectorResultPublisher {
    private readonly queue;
    private readonly config;
    private readonly logger;
    constructor(queue: QueueClient, config: AppConfigService);
    publish(result: RoutingResult): Promise<void>;
}
