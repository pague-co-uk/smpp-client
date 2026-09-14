var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Injectable } from "@nestjs/common";
let SmppDeliveryReceiptParser = class SmppDeliveryReceiptParser {
    parse(delivery, connectorId) {
        const shortMessage = delivery.shortMessage?.trim();
        if (!shortMessage) {
            return null;
        }
        const fields = this.parseReceiptFields(shortMessage);
        if (!fields.id || !fields.stat) {
            return null;
        }
        const status = this.normalizeStatus(fields.stat);
        if (!status) {
            return null;
        }
        return {
            connectorId,
            providerMessageId: fields.id,
            status,
            errorCode: fields.err && fields.err !== "000"
                ? fields.err
                : undefined,
            errorMessage: fields.err && fields.err !== "000"
                ? `SMPP delivery error: ${fields.err}`
                : undefined,
            rawData: {
                sourceAddress: delivery.sourceAddress,
                destinationAddress: delivery.destinationAddress,
                shortMessage,
            },
        };
    }
    parseReceiptFields(value) {
        const fields = {};
        const pattern = /(\w+):([^\s]*)/g;
        let match;
        while ((match = pattern.exec(value)) !== null) {
            const [, key, fieldValue] = match;
            if (!key) {
                continue;
            }
            fields[key.toLowerCase()] =
                fieldValue ?? "";
        }
        return fields;
    }
    normalizeStatus(status) {
        switch (status.trim().toUpperCase()) {
            case "DELIVRD":
            case "DELIVERED":
                return "DELIVERED";
            case "UNDELIV":
            case "UNDELIVERABLE":
            case "REJECTD":
            case "REJECTED":
            case "EXPIRED":
            case "DELETED":
                return "FAILED";
            default:
                return null;
        }
    }
};
SmppDeliveryReceiptParser = __decorate([
    Injectable()
], SmppDeliveryReceiptParser);
export { SmppDeliveryReceiptParser };
//# sourceMappingURL=smpp-delivery-receipt-parser.js.map