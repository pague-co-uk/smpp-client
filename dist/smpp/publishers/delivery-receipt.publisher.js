var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var DeliveryReceiptPublisher_1;
import { Inject, Injectable, } from "@nestjs/common";
import { getComponentLogger, recordException, withSpan, } from "@pague-co-uk/sms-gateway-telemetry";
import { AppConfigService, } from "../../config/config.service.js";
import { QUEUE_CLIENT, } from "../../queue/constants/queue.constants.js";
let DeliveryReceiptPublisher = DeliveryReceiptPublisher_1 = class DeliveryReceiptPublisher {
    queue;
    config;
    logger = getComponentLogger(DeliveryReceiptPublisher_1.name);
    constructor(queue, config) {
        this.queue = queue;
        this.config = config;
    }
    async publish(receipt) {
        await withSpan("DeliveryReceiptPublisher.publish", async (span) => {
            span.setAttributes({
                "smpp.connector_id": receipt.connectorId,
                "smpp.provider_message_id": receipt.providerMessageId,
                "smpp.delivery_status": receipt.status,
                "messaging.destination": this.config.routing
                    .deliveryReceiptQueue,
            });
            this.logger.info({
                connectorId: receipt.connectorId,
                providerMessageId: receipt.providerMessageId,
                status: receipt.status,
            }, "Publishing SMPP delivery receipt.");
            try {
                await this.queue.publish(this.config.routing
                    .deliveryReceiptQueue, receipt);
                this.logger.info({
                    connectorId: receipt.connectorId,
                    providerMessageId: receipt.providerMessageId,
                    status: receipt.status,
                }, "SMPP delivery receipt published.");
            }
            catch (error) {
                recordException(error);
                this.logger.error({
                    connectorId: receipt.connectorId,
                    providerMessageId: receipt.providerMessageId,
                    status: receipt.status,
                    err: error,
                }, "Failed to publish SMPP delivery receipt.");
                throw error;
            }
        });
    }
};
DeliveryReceiptPublisher = DeliveryReceiptPublisher_1 = __decorate([
    Injectable(),
    __param(0, Inject(QUEUE_CLIENT)),
    __metadata("design:paramtypes", [Function, AppConfigService])
], DeliveryReceiptPublisher);
export { DeliveryReceiptPublisher };
//# sourceMappingURL=delivery-receipt.publisher.js.map