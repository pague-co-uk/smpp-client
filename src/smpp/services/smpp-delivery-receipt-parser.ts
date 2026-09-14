import { Injectable } from "@nestjs/common";
import type { SmppDeliveryReceipt } from "../types/smpp-delivery-receipt.js";
import type { SmppDelivery } from "../types/smpp-delivery.js";

@Injectable()
export class SmppDeliveryReceiptParser {
  parse(
    delivery: SmppDelivery,
    connectorId: string,
  ): SmppDeliveryReceipt | null {
    const shortMessage =
      delivery.shortMessage?.trim();

    if (!shortMessage) {
      return null;
    }

    const fields =
      this.parseReceiptFields(shortMessage);

    /*
     * A normal mobile-originated deliver_sm may also contain
     * arbitrary text. We only treat it as a DLR when it contains
     * the fields that identify an SMPP delivery receipt.
     */
    if (!fields.id || !fields.stat) {
      return null;
    }

    const status =
      this.normalizeStatus(fields.stat);

    if (!status) {
      return null;
    }

    return {
      connectorId,
      providerMessageId: fields.id,
      status,

      errorCode:
        fields.err && fields.err !== "000"
          ? fields.err
          : undefined,

      errorMessage:
        fields.err && fields.err !== "000"
          ? `SMPP delivery error: ${fields.err}`
          : undefined,

      rawData: {
        sourceAddress: delivery.sourceAddress,
        destinationAddress: delivery.destinationAddress,
        shortMessage,
      },
    };
  }

  private parseReceiptFields(
    value: string,
  ): Record<string, string> {
    const fields: Record<string, string> = {};

    const pattern =
      /(\w+):([^\s]*)/g;

    let match: RegExpExecArray | null;

    while (
      (match = pattern.exec(value)) !== null
    ) {
      const [, key, fieldValue] =
        match;

      if (!key) {
        continue;
      }

      fields[key.toLowerCase()] =
        fieldValue ?? "";
    }

    return fields;
  }

  private normalizeStatus(
    status: string,
  ): SmppDeliveryReceipt["status"] | null {
    switch (
    status.trim().toUpperCase()
    ) {
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
}