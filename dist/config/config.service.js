var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Injectable, } from "@nestjs/common";
import { ConfigService, } from "@nestjs/config";
let AppConfigService = class AppConfigService {
    config;
    constructor(config) {
        this.config = config;
    }
    get app() {
        return {
            name: this.config.getOrThrow("app.name"),
            version: this.config.getOrThrow("app.version"),
            environment: this.config.getOrThrow("app.environment"),
        };
    }
    get databaseUrl() {
        return this.config.getOrThrow("database.url");
    }
    get rabbitmq() {
        return {
            url: this.config.getOrThrow("rabbitmq.url"),
            connectionName: this.config.getOrThrow("rabbitmq.connectionName"),
            heartbeat: this.config.getOrThrow("rabbitmq.heartbeat"),
            reconnectDelay: this.config.getOrThrow("rabbitmq.reconnectDelay"),
            maxReconnectDelay: this.config.getOrThrow("rabbitmq.maxReconnectDelay"),
            maxReconnectAttempts: this.config.get("rabbitmq.maxReconnectAttempts"),
            autoCreateQueues: this.config.getOrThrow("rabbitmq.autoCreateQueues"),
            autoRecover: this.config.getOrThrow("rabbitmq.autoRecover"),
            consumerPrefetch: this.config.getOrThrow("rabbitmq.consumerPrefetch"),
        };
    }
    get routing() {
        return {
            consumerQueue: this.config.getOrThrow("routing.consumerQueue"),
            resultQueue: this.config.getOrThrow("routing.resultQueue"),
        };
    }
    get log() {
        return {
            level: this.config.getOrThrow("log.level"),
            stdout: this.config.getOrThrow("log.stdout"),
            file: {
                enabled: this.config.getOrThrow("log.file.enabled"),
                path: this.config.getOrThrow("log.file.path"),
            },
        };
    }
    get telemetry() {
        return {
            enabled: this.config.getOrThrow("telemetry.enabled"),
            serviceName: this.config.getOrThrow("telemetry.serviceName"),
            serviceVersion: this.config.getOrThrow("telemetry.serviceVersion"),
            tracesEndpoint: this.config.getOrThrow("telemetry.tracesEndpoint"),
            metricsEndpoint: this.config.getOrThrow("telemetry.metricsEndpoint"),
            logsEndpoint: this.config.getOrThrow("telemetry.logsEndpoint"),
            exportIntervalMillis: this.config.getOrThrow("telemetry.exportIntervalMillis"),
            disableFsInstrumentation: this.config.getOrThrow("telemetry.disableFsInstrumentation"),
        };
    }
};
AppConfigService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [ConfigService])
], AppConfigService);
export { AppConfigService };
//# sourceMappingURL=config.service.js.map