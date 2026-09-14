import type { QueueClient } from "@pague-co-uk/sms-gateway-queue-client";
import { AppConfigService } from "../../config/config.service.js";
import type { SmppDeliveryReceipt } from "../types/smpp-delivery-receipt.js";
export declare class DeliveryReceiptPublisher {
    private readonly queue;
    private readonly config;
    private readonly logger;
    constructor(queue: QueueClient, config: AppConfigService);
    publish(receipt: SmppDeliveryReceipt): Promise<void>;
}
