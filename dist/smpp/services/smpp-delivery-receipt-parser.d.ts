import type { SmppDeliveryReceipt } from "../types/smpp-delivery-receipt.js";
import type { SmppDelivery } from "../types/smpp-delivery.js";
export declare class SmppDeliveryReceiptParser {
    parse(delivery: SmppDelivery, connectorId: string): SmppDeliveryReceipt | null;
    private parseReceiptFields;
    private normalizeStatus;
}
