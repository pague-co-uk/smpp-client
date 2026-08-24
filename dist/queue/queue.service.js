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
var QueueService_1;
import { Inject, Injectable, } from "@nestjs/common";
import { getComponentLogger, } from "@pague-co-uk/sms-gateway-telemetry";
import { QUEUE_CLIENT, } from "./constants/queue.constants.js";
let QueueService = QueueService_1 = class QueueService {
    client;
    logger = getComponentLogger(QueueService_1.name);
    constructor(client) {
        this.client = client;
    }
    async onApplicationShutdown() {
        this.logger.info("Shutting down RabbitMQ client.");
        try {
            await this.client.close();
            this.logger.info("RabbitMQ client shut down successfully.");
        }
        catch (error) {
            this.logger.error({
                err: error,
            }, "Failed to shut down RabbitMQ client.");
        }
    }
};
QueueService = QueueService_1 = __decorate([
    Injectable(),
    __param(0, Inject(QUEUE_CLIENT)),
    __metadata("design:paramtypes", [Function])
], QueueService);
export { QueueService };
//# sourceMappingURL=queue.service.js.map