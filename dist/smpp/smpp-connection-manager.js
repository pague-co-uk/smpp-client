var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var SmppConnectionManager_1;
import { Injectable, } from "@nestjs/common";
import { getComponentLogger, recordException, } from "@pague-co-uk/sms-gateway-telemetry";
import { SmppRepository, } from "./repositories/smpp.repository.js";
import { SmppClient, } from "./smpp.client.js";
import { parseSmppConnectorConfiguration, } from "./smpp-connector-config.js";
let SmppConnectionManager = SmppConnectionManager_1 = class SmppConnectionManager {
    repository;
    client;
    logger = getComponentLogger(SmppConnectionManager_1.name);
    running = false;
    reconciliationTimer = null;
    reconciliationInterval = 5000;
    workers = new Map();
    constructor(repository, client) {
        this.repository = repository;
        this.client = client;
    }
    async onModuleInit() {
        this.running =
            true;
        this.logger.info("SMPP connection manager starting.");
        await this.reconcile();
        this.scheduleReconciliation();
    }
    async onModuleDestroy() {
        this.running =
            false;
        if (this.reconciliationTimer !==
            null) {
            clearTimeout(this.reconciliationTimer);
            this.reconciliationTimer =
                null;
        }
        const workers = [
            ...this.workers.values(),
        ];
        for (const worker of workers) {
            this.stopWorker(worker);
        }
        this.workers.clear();
        this.logger.info("SMPP connection manager stopped.");
    }
    async reconcile() {
        if (!this.running) {
            return;
        }
        const connectors = await this.repository
            .findActiveSmppConnectors();
        const activeIds = new Set(connectors.map((connector) => connector.id));
        for (const connector of connectors) {
            try {
                const configuration = parseSmppConnectorConfiguration(connector.configuration);
                this.ensureWorker(connector.id, connector.code, configuration);
            }
            catch (error) {
                recordException(error);
                this.logger.error({
                    connectorId: connector.id,
                    connectorCode: connector.code,
                    provider: connector.provider,
                    err: error,
                }, "Invalid SMPP connector configuration.");
            }
        }
        for (const [connectorId, worker,] of this.workers) {
            if (activeIds.has(connectorId)) {
                continue;
            }
            this.logger.info({
                connectorId,
                connectorCode: worker.connectorCode,
            }, "SMPP connector is no longer active; stopping connection worker.");
            this.stopWorker(worker);
            this.workers.delete(connectorId);
            try {
                await this.client.disconnect(connectorId);
            }
            catch (error) {
                recordException(error);
                this.logger.error({
                    connectorId,
                    err: error,
                }, "Failed to disconnect inactive SMPP connector.");
            }
        }
    }
    ensureWorker(connectorId, connectorCode, configuration) {
        const existing = this.workers.get(connectorId);
        if (!existing) {
            const worker = {
                connectorId,
                connectorCode,
                configuration,
                generation: 0,
                reconnecting: false,
                timer: null,
                currentDelay: configuration.reconnectDelay,
            };
            this.workers.set(connectorId, worker);
            void this.runWorker(worker);
            return;
        }
        if (!this.configurationEquals(existing.configuration, configuration)) {
            this.logger.info({
                connectorId,
                connectorCode,
            }, "SMPP connector configuration changed; restarting connection.");
            existing.configuration =
                configuration;
            existing.currentDelay =
                configuration.reconnectDelay;
            existing.generation++;
            this.cancelWorkerTimer(existing);
            if (!existing.reconnecting) {
                void this.runWorker(existing);
            }
            return;
        }
        if (!this.client.hasSession(connectorId) &&
            !existing.reconnecting &&
            existing.timer === null) {
            void this.runWorker(existing);
        }
    }
    async runWorker(worker) {
        if (!this.running ||
            worker.reconnecting) {
            return;
        }
        worker.reconnecting =
            true;
        const generation = worker.generation;
        try {
            while (this.running &&
                worker.generation ===
                    generation) {
                if (this.client.hasSession(worker.connectorId)) {
                    worker.currentDelay =
                        worker.configuration
                            .reconnectDelay;
                    return;
                }
                try {
                    this.logger.info({
                        connectorId: worker.connectorId,
                        connectorCode: worker.connectorCode,
                        host: worker.configuration.host,
                        port: worker.configuration.port,
                        retryDelay: worker.currentDelay,
                    }, "Attempting SMPP connector connection.");
                    await this.client.connect(worker.connectorId, worker.configuration);
                    if (!this.running ||
                        worker.generation !==
                            generation) {
                        return;
                    }
                    worker.currentDelay =
                        worker.configuration
                            .reconnectDelay;
                    this.logger.info({
                        connectorId: worker.connectorId,
                        connectorCode: worker.connectorCode,
                    }, "SMPP connector connected successfully.");
                    return;
                }
                catch (error) {
                    recordException(error);
                    if (!this.running ||
                        worker.generation !==
                            generation) {
                        return;
                    }
                    this.logger.error({
                        connectorId: worker.connectorId,
                        connectorCode: worker.connectorCode,
                        retryIn: worker.currentDelay,
                        err: error,
                    }, "SMPP connector connection attempt failed.");
                    try {
                        await this.client.disconnect(worker.connectorId);
                    }
                    catch (disconnectError) {
                        recordException(disconnectError);
                        this.logger.warn({
                            connectorId: worker.connectorId,
                            err: disconnectError,
                        }, "Failed to clean up failed SMPP connector session.");
                    }
                    if (!this.running ||
                        worker.generation !==
                            generation) {
                        return;
                    }
                    const delay = worker.currentDelay;
                    this.logger.warn({
                        connectorId: worker.connectorId,
                        connectorCode: worker.connectorCode,
                        retryIn: delay,
                    }, "SMPP connector will be retried.");
                    await this.sleep(worker, delay, generation);
                    if (!this.running ||
                        worker.generation !==
                            generation) {
                        return;
                    }
                    worker.currentDelay =
                        Math.min(worker.currentDelay * 2, worker.configuration
                            .maxReconnectDelay);
                }
            }
        }
        finally {
            worker.reconnecting =
                false;
        }
    }
    async sleep(worker, delay, generation) {
        await new Promise((resolve) => {
            if (!this.running ||
                worker.generation !==
                    generation) {
                resolve();
                return;
            }
            worker.timer =
                setTimeout(() => {
                    worker.timer =
                        null;
                    resolve();
                }, delay);
        });
    }
    scheduleReconciliation() {
        if (!this.running) {
            return;
        }
        this.reconciliationTimer =
            setTimeout(async () => {
                this.reconciliationTimer =
                    null;
                try {
                    await this.reconcile();
                }
                catch (error) {
                    recordException(error);
                    this.logger.error({
                        err: error,
                    }, "SMPP connector reconciliation failed.");
                }
                this.scheduleReconciliation();
            }, this.reconciliationInterval);
    }
    stopWorker(worker) {
        worker.generation++;
        this.cancelWorkerTimer(worker);
    }
    cancelWorkerTimer(worker) {
        if (worker.timer !== null) {
            clearTimeout(worker.timer);
            worker.timer =
                null;
        }
    }
    configurationEquals(a, b) {
        return (a.host === b.host &&
            a.port === b.port &&
            a.systemId === b.systemId &&
            a.password === b.password &&
            a.systemType === b.systemType &&
            a.connectionTimeout ===
                b.connectionTimeout &&
            a.enquireLinkInterval ===
                b.enquireLinkInterval &&
            a.requestTimeout ===
                b.requestTimeout &&
            a.reconnectDelay ===
                b.reconnectDelay &&
            a.maxReconnectDelay ===
                b.maxReconnectDelay);
    }
};
SmppConnectionManager = SmppConnectionManager_1 = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [SmppRepository,
        SmppClient])
], SmppConnectionManager);
export { SmppConnectionManager };
//# sourceMappingURL=smpp-connection-manager.js.map