declare const _default: () => {
    app: {
        name: string;
        version: string;
        environment: string;
        host: string;
        port: number;
    };
    database: {
        url: string;
    };
    rabbitmq: {
        url: string;
        connectionName: string;
        heartbeat: number;
        reconnectDelay: number;
        maxReconnectDelay: number;
        maxReconnectAttempts: number | undefined;
        autoRecover: boolean;
        consumerPrefetch: number;
    };
    routing: {
        consumerQueue: string;
        resultQueue: string;
    };
    log: {
        level: string;
        stdout: boolean;
        file: {
            enabled: boolean;
            path: string;
        };
    };
    telemetry: {
        enabled: boolean;
        serviceName: string;
        serviceVersion: string;
        tracesEndpoint: string;
        metricsEndpoint: string;
        logsEndpoint: string;
        exportIntervalMillis: number;
        disableFsInstrumentation: boolean;
    };
};
export default _default;
