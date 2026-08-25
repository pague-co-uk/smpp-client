import { ConfigService } from "@nestjs/config";
export declare class AppConfigService {
    private readonly config;
    constructor(config: ConfigService);
    get app(): {
        name: string;
        version: string;
        environment: string;
    };
    get databaseUrl(): string;
    get rabbitmq(): {
        url: string;
        connectionName: string;
        heartbeat: number;
        reconnectDelay: number;
        maxReconnectDelay: number;
        maxReconnectAttempts: number | undefined;
        autoCreateQueues: boolean;
        autoRecover: boolean;
        consumerPrefetch: number;
    };
    get routing(): {
        consumerQueue: string;
        resultQueue: string;
    };
    get log(): {
        level: string;
        stdout: boolean;
        file: {
            enabled: boolean;
            path: string;
        };
    };
    get telemetry(): {
        enabled: boolean;
        serviceName: string;
        serviceVersion: string;
        tracesEndpoint: string;
        metricsEndpoint: string;
        logsEndpoint: string;
        exportIntervalMillis: number;
        disableFsInstrumentation: boolean;
    };
}
