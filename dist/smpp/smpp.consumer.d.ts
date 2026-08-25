import { OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import type { QueueClient } from "@pague-co-uk/sms-gateway-queue-client";
import { AppConfigService } from "../config/config.service.js";
import { ConnectorResultPublisher } from "./publishers/connector-result.publisher.js";
import { SmppRepository } from "./repositories/smpp.repository.js";
import { SmppClient } from "./smpp.client.js";
export declare class SmppConsumer implements OnModuleInit, OnModuleDestroy {
    private readonly queue;
    private readonly config;
    private readonly smpp;
    private readonly repository;
    private readonly resultPublisher;
    private readonly logger;
    private running;
    constructor(queue: QueueClient, config: AppConfigService, smpp: SmppClient, repository: SmppRepository, resultPublisher: ConnectorResultPublisher);
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    private startConsumption;
    private handleMessage;
    private getConsumerPrefetch;
}
