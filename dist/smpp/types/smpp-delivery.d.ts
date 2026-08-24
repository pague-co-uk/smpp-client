import type { PDU } from "smpp";
export interface SmppDelivery {
    pdu: PDU;
    messageId?: string;
    sourceAddress?: string;
    destinationAddress?: string;
    shortMessage?: string;
}
