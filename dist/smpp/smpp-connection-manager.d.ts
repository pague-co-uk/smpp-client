import { OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { SmppRepository } from "./repositories/smpp.repository.js";
import { SmppClient } from "./smpp.client.js";
export declare class SmppConnectionManager implements OnModuleInit, OnModuleDestroy {
    private readonly repository;
    private readonly client;
    private readonly logger;
    private running;
    private reconciliationTimer;
    private readonly reconciliationInterval;
    private readonly workers;
    constructor(repository: SmppRepository, client: SmppClient);
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    private reconcile;
    private ensureWorker;
    private runWorker;
    private sleep;
    private scheduleReconciliation;
    private stopWorker;
    private cancelWorkerTimer;
    private configurationEquals;
}
