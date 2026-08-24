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
var SmppConsumer_1;
import { Inject, Injectable, } from "@nestjs/common";
import { getComponentLogger, recordException, withSpan, } from "@pague-co-uk/sms-gateway-telemetry";
import { AppConfigService, } from "../config/config.service.js";
import { QUEUE_CLIENT, } from "../queue/constants/queue.constants.js";
import { ConnectorResultPublisher, } from "./publishers/connector-result.publisher.js";
import { SmppRepository, } from "./repositories/smpp.repository.js";
import { SmppClient, } from "./smpp.client.js";
let SmppConsumer = SmppConsumer_1 = class SmppConsumer {
    queue;
    config;
    smpp;
    repository;
    resultPublisher;
    logger = getComponentLogger(SmppConsumer_1.name);
    running = false;
    constructor(queue, config, smpp, repository, resultPublisher) {
        this.queue = queue;
        this.config = config;
        this.smpp = smpp;
        this.repository = repository;
        this.resultPublisher = resultPublisher;
    }
    async onModuleInit() {
        this.running = true;
        const connector = this.config.connector;
        this.logger.info({
            queue: connector.queue,
            prefetch: connector.consumerPrefetch,
        }, "SMPP consumer starting.");
        try {
            await this.queue.connect();
            this.logger.info({
                queue: connector.queue,
                queueClientState: this.queue.currentState,
            }, "SMPP consumer connected to RabbitMQ.");
        }
        catch (error) {
            recordException(error);
            this.logger.error({
                queue: connector.queue,
                err: error,
            }, "SMPP consumer failed to connect to RabbitMQ.");
            throw error;
        }
        try {
            await this.startConsumption();
        }
        catch (error) {
            recordException(error);
            this.logger.error({
                queue: connector.queue,
                err: error,
            }, "SMPP consumer failed to bind to RabbitMQ queue.");
            throw error;
        }
        this.logger.info({
            queue: connector.queue,
            prefetch: connector.consumerPrefetch,
        }, "SMPP consumer started successfully.");
    }
    async onModuleDestroy() {
        this.running = false;
        this.logger.info({
            queue: this.config.connector.queue,
        }, "SMPP consumer stopping.");
        this.logger.info("SMPP consumer stopped.");
    }
    async startConsumption() {
        const connector = this.config.connector;
        this.logger.info({
            queue: connector.queue,
            prefetch: connector.consumerPrefetch,
        }, "Binding SMPP consumer to RabbitMQ queue.");
        const consumer = await this.queue.subscribe(connector.queue, async (message) => {
            if (!this.running) {
                throw new Error("SMPP consumer is shutting down.");
            }
            await this.handleMessage(message);
        }, {
            noAck: false,
            prefetch: connector.consumerPrefetch,
        });
        this.logger.info({
            queue: connector.queue,
            consumerTag: consumer.consumerTag,
        }, "Successfully bound SMPP consumer to RabbitMQ queue.");
    }
    async handleMessage(message) {
        await withSpan("SmppConsumer.handleMessage", async (span) => {
            span.setAttributes({
                "message.id": message.messageId,
                "routing.attempt_id": message.attemptId,
                "routing.route_id": message.routeId,
                "routing.connector_id": message.connectorId,
            });
            this.logger.info({
                messageId: message.messageId,
                attemptId: message.attemptId,
                routeId: message.routeId,
                connectorId: message.connectorId,
            }, "SMPP connector message received.");
            const attempt = await this.repository.findAttempt(message.attemptId);
            if (!attempt) {
                const error = new Error(`Routing attempt '${message.attemptId}' was not found.`);
                recordException(error);
                this.logger.error({
                    messageId: message.messageId,
                    attemptId: message.attemptId,
                    connectorId: message.connectorId,
                }, "Routing attempt not found.");
                throw error;
            }
            if (attempt.messageId !==
                message.messageId) {
                throw new Error("Routing attempt does not belong to the dispatched message.");
            }
            if (attempt.routeId !==
                message.routeId) {
                throw new Error("Routing attempt does not belong to the dispatched route.");
            }
            if (attempt.connectorId !==
                message.connectorId) {
                throw new Error("Routing attempt does not belong to the dispatched connector.");
            }
            const sms = await this.repository
                .findMessageForSubmission(message.messageId);
            if (!sms) {
                throw new Error(`Message '${message.messageId}' was not found.`);
            }
            if (!sms.senderId) {
                throw new Error(`Message '${sms.id}' has no sender ID.`);
            }
            if (!sms.senderId.sender) {
                throw new Error(`Message '${sms.id}' has an empty sender address.`);
            }
            const hasSession = this.smpp.hasSession(message.connectorId);
            if (!hasSession) {
                this.logger.warn({
                    messageId: message.messageId,
                    attemptId: message.attemptId,
                    connectorId: message.connectorId,
                }, "No usable SMPP session exists for connector.");
            }
            this.logger.info({
                messageId: sms.id,
                attemptId: attempt.id,
                connectorId: message.connectorId,
                destination: sms.destination,
                sender: sms.senderId.sender,
                encoding: sms.encoding,
                segmentCount: sms.segmentCount,
            }, "Submitting SMS through SMPP.");
            const submission = await this.smpp.submitSm(message.connectorId, {
                source_addr: sms.senderId.sender,
                destination_addr: sms.destination,
                short_message: sms.body,
            });
            let resultStatus;
            let errorCode;
            let errorMessage;
            let providerMessageId;
            switch (submission.status) {
                case "SUBMITTED": {
                    resultStatus =
                        "SUBMITTED";
                    providerMessageId =
                        submission.providerMessageId;
                    span.setAttributes({
                        "smpp.result_status": "SUBMITTED",
                        "smpp.provider_message_id": providerMessageId ??
                            "",
                    });
                    this.logger.info({
                        messageId: sms.id,
                        attemptId: attempt.id,
                        connectorId: message.connectorId,
                        providerMessageId,
                    }, "SMS submitted successfully through SMPP.");
                    break;
                }
                case "FAILED": {
                    resultStatus =
                        "FAILED";
                    errorCode =
                        submission.errorCode;
                    errorMessage =
                        submission.errorMessage.slice(0, 255);
                    span.setAttributes({
                        "smpp.result_status": "FAILED",
                        "smpp.error_code": errorCode ??
                            "",
                    });
                    this.logger.error({
                        messageId: sms.id,
                        attemptId: attempt.id,
                        connectorId: message.connectorId,
                        errorCode,
                        errorMessage,
                    }, "SMPP provider definitively rejected the SMS submission.");
                    break;
                }
                case "UNKNOWN": {
                    resultStatus =
                        "UNKNOWN";
                    errorCode =
                        submission.errorCode;
                    errorMessage =
                        submission.errorMessage.slice(0, 255);
                    span.setAttributes({
                        "smpp.result_status": "UNKNOWN",
                        "smpp.error_code": errorCode ??
                            "",
                    });
                    this.logger.error({
                        messageId: sms.id,
                        attemptId: attempt.id,
                        connectorId: message.connectorId,
                        errorCode,
                        errorMessage,
                    }, "SMPP submission outcome is unknown.");
                    break;
                }
                case "DISCONNECTED": {
                    resultStatus =
                        "FAILED";
                    errorCode =
                        submission.errorCode ??
                            "SMPP_DISCONNECTED";
                    errorMessage =
                        submission.errorMessage.slice(0, 255);
                    span.setAttributes({
                        "smpp.result_status": "FAILED",
                        "smpp.error_code": errorCode,
                    });
                    this.logger.warn({
                        messageId: sms.id,
                        attemptId: attempt.id,
                        connectorId: message.connectorId,
                        errorCode,
                        errorMessage,
                    }, "SMPP connector is disconnected; reporting submission as failed.");
                    break;
                }
            }
            await this.resultPublisher.publish({
                messageId: message.messageId,
                attemptId: message.attemptId,
                routeId: message.routeId,
                connectorId: message.connectorId,
                status: resultStatus,
                providerMessageId,
                errorCode,
                errorMessage,
            });
            this.logger.info({
                messageId: message.messageId,
                attemptId: message.attemptId,
                connectorId: message.connectorId,
                status: resultStatus,
                providerMessageId,
            }, "SMPP submission result published.");
        });
    }
};
SmppConsumer = SmppConsumer_1 = __decorate([
    Injectable(),
    __param(0, Inject(QUEUE_CLIENT)),
    __metadata("design:paramtypes", [Function, AppConfigService,
        SmppClient,
        SmppRepository,
        ConnectorResultPublisher])
], SmppConsumer);
export { SmppConsumer };
//# sourceMappingURL=smpp.consumer.js.map