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
var ConnectorResultPublisher_1;
import { Inject, Injectable, } from "@nestjs/common";
import { getComponentLogger, recordException, withSpan, } from "@pague-co-uk/sms-gateway-telemetry";
import { QUEUE_CLIENT, } from "../../queue/constants/queue.constants.js";
import { AppConfigService } from "../../config/config.service.js";
let ConnectorResultPublisher = ConnectorResultPublisher_1 = class ConnectorResultPublisher {
    queue;
    config;
    logger = getComponentLogger(ConnectorResultPublisher_1.name);
    constructor(queue, config) {
        this.queue = queue;
        this.config = config;
    }
    async publish(result) {
        await withSpan("ConnectorResultPublisher.publish", async (span) => {
            span.setAttributes({
                "message.id": result.messageId,
                "routing.attempt_id": result.attemptId,
                "routing.route_id": result.routeId,
                "routing.connector_id": result.connectorId,
                "routing.result_status": result.status,
                "messaging.destination": this.config.routing.resultQueue,
            });
            this.logger.info({
                queue: this.config.routing.resultQueue,
                messageId: result.messageId,
                attemptId: result.attemptId,
                routeId: result.routeId,
                connectorId: result.connectorId,
                status: result.status,
                providerMessageId: result.providerMessageId,
            }, "Publishing connector result.");
            try {
                await this.queue.publish(this.config.routing.resultQueue, result);
                this.logger.info({
                    queue: this.config.routing.resultQueue,
                    messageId: result.messageId,
                    attemptId: result.attemptId,
                    status: result.status,
                }, "Connector result published.");
            }
            catch (error) {
                recordException(error);
                this.logger.error({
                    queue: this.config.routing.resultQueue,
                    messageId: result.messageId,
                    attemptId: result.attemptId,
                    status: result.status,
                    err: error,
                }, "Failed to publish connector result.");
                throw error;
            }
        });
    }
};
ConnectorResultPublisher = ConnectorResultPublisher_1 = __decorate([
    Injectable(),
    __param(0, Inject(QUEUE_CLIENT)),
    __metadata("design:paramtypes", [Function, AppConfigService])
], ConnectorResultPublisher);
export { ConnectorResultPublisher };
//# sourceMappingURL=connector-result.publisher.js.map