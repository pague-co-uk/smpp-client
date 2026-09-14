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
import { DeliveryReceiptPublisher, } from "./publishers/delivery-receipt.publisher.js";
import { SmppRepository, } from "./repositories/smpp.repository.js";
import { SmppDeliveryReceiptParser, } from "./services/smpp-delivery-receipt-parser.js";
import { SmppClient, } from "./smpp.client.js";
let SmppConsumer = SmppConsumer_1 = class SmppConsumer {
    queue;
    config;
    smpp;
    repository;
    resultPublisher;
    deliveryReceiptParser;
    deliveryReceiptPublisher;
    logger = getComponentLogger(SmppConsumer_1.name);
    running = false;
    constructor(queue, config, smpp, repository, resultPublisher, deliveryReceiptParser, deliveryReceiptPublisher) {
        this.queue = queue;
        this.config = config;
        this.smpp = smpp;
        this.repository = repository;
        this.resultPublisher = resultPublisher;
        this.deliveryReceiptParser = deliveryReceiptParser;
        this.deliveryReceiptPublisher = deliveryReceiptPublisher;
    }
    async onModuleInit() {
        this.running = true;
        this.smpp.setDeliveryHandler(async (delivery) => {
            await this.handleDelivery(delivery);
        });
        const routing = this.config.routing;
        this.logger.info({
            queue: routing.consumerQueue,
            prefetch: this.getConsumerPrefetch(),
        }, "SMPP consumer starting.");
        try {
            await this.queue.connect();
            this.logger.info({
                queue: routing.consumerQueue,
                queueClientState: this.queue.currentState,
            }, "SMPP consumer connected to RabbitMQ.");
        }
        catch (error) {
            recordException(error);
            this.logger.error({
                queue: routing.consumerQueue,
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
                queue: routing.consumerQueue,
                err: error,
            }, "SMPP consumer failed to bind to RabbitMQ queue.");
            throw error;
        }
        this.logger.info({
            queue: routing.consumerQueue,
            prefetch: this.getConsumerPrefetch(),
        }, "SMPP consumer started successfully.");
    }
    async onModuleDestroy() {
        this.running = false;
        this.logger.info({
            queue: this.config.routing.consumerQueue,
        }, "SMPP consumer stopping.");
        this.logger.info("SMPP consumer stopped.");
    }
    async startConsumption() {
        const queue = this.config.routing.consumerQueue;
        const prefetch = this.getConsumerPrefetch();
        this.logger.info({
            queue,
            prefetch,
        }, "Binding SMPP consumer to RabbitMQ queue.");
        const consumer = await this.queue.subscribe(queue, async (message) => {
            if (!this.running) {
                throw new Error("SMPP consumer is shutting down.");
            }
            await this.handleMessage(message);
        });
        this.logger.info({
            queue,
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
                        attemptId: sms.id,
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
                        attemptId: message.attemptId,
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
    async handleDelivery(delivery) {
        await withSpan("SmppConsumer.handleDelivery", async (span) => {
            span.setAttributes({
                "smpp.connector_id": delivery.connectorId,
                "smpp.provider_message_id": delivery.messageId ??
                    "",
                "smpp.source_address": delivery.sourceAddress ??
                    "",
                "smpp.destination_address": delivery.destinationAddress ??
                    "",
            });
            this.logger.info({
                connectorId: delivery.connectorId,
                providerMessageId: delivery.messageId,
                sourceAddress: delivery.sourceAddress,
                destinationAddress: delivery.destinationAddress,
            }, "SMPP delivery received.");
            if (!this.running) {
                this.logger.warn({
                    connectorId: delivery.connectorId,
                }, "Ignoring SMPP delivery while consumer is shutting down.");
                return;
            }
            const receipt = this.deliveryReceiptParser.parse(delivery, delivery.connectorId);
            if (!receipt) {
                this.logger.debug({
                    connectorId: delivery.connectorId,
                    providerMessageId: delivery.messageId,
                    sourceAddress: delivery.sourceAddress,
                    destinationAddress: delivery.destinationAddress,
                }, "SMPP deliver_sm is not a recognized delivery receipt.");
                return;
            }
            span.setAttributes({
                "smpp.delivery_status": receipt.status,
                "smpp.provider_message_id": receipt.providerMessageId,
            });
            this.logger.info({
                connectorId: receipt.connectorId,
                providerMessageId: receipt.providerMessageId,
                status: receipt.status,
                errorCode: receipt.errorCode,
            }, "SMPP delivery receipt parsed.");
            await this.deliveryReceiptPublisher.publish(receipt);
            this.logger.info({
                connectorId: receipt.connectorId,
                providerMessageId: receipt.providerMessageId,
                status: receipt.status,
            }, "SMPP delivery receipt published.");
        });
    }
    getConsumerPrefetch() {
        return this.config.rabbitmq.consumerPrefetch;
    }
};
SmppConsumer = SmppConsumer_1 = __decorate([
    Injectable(),
    __param(0, Inject(QUEUE_CLIENT)),
    __metadata("design:paramtypes", [Function, AppConfigService,
        SmppClient,
        SmppRepository,
        ConnectorResultPublisher,
        SmppDeliveryReceiptParser,
        DeliveryReceiptPublisher])
], SmppConsumer);
export { SmppConsumer };
//# sourceMappingURL=smpp.consumer.js.map