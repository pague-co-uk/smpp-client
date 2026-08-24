export default () => ({
    app: {
        name: process.env.APP_NAME ??
            "sms-gateway-smpp-service",
        version: process.env.APP_VERSION ??
            "1.0.0",
        environment: process.env.NODE_ENV ??
            "development",
    },
    database: {
        url: process.env.DATABASE_URL,
    },
    rabbitmq: {
        url: process.env.RABBITMQ_URL,
        connectionName: process.env.RABBITMQ_CONNECTION_NAME ??
            "sms-gateway-smpp-service",
        heartbeat: Number.parseInt(process.env.RABBITMQ_HEARTBEAT ??
            "60", 10),
        reconnectDelay: Number.parseInt(process.env.RABBITMQ_RECONNECT_DELAY ??
            "1000", 10),
        maxReconnectDelay: Number.parseInt(process.env.RABBITMQ_MAX_RECONNECT_DELAY ??
            "30000", 10),
        maxReconnectAttempts: process.env.RABBITMQ_MAX_RECONNECT_ATTEMPTS
            ? Number.parseInt(process.env.RABBITMQ_MAX_RECONNECT_ATTEMPTS, 10)
            : undefined,
        autoCreateQueues: process.env.RABBITMQ_AUTO_CREATE_QUEUES !==
            "false",
        autoRecover: process.env.RABBITMQ_AUTO_RECOVER !==
            "false",
    },
    connector: {
        code: process.env.CONNECTOR_CODE,
        queue: process.env.CONNECTOR_QUEUE,
        consumerPrefetch: Number.parseInt(process.env.CONNECTOR_CONSUMER_PREFETCH ??
            "10", 10),
    },
    routing: {
        resultQueue: process.env.ROUTING_RESULT_QUEUE ??
            "sms.route.result",
    },
    smpp: {
        host: process.env.SMPP_HOST,
        port: Number.parseInt(process.env.SMPP_PORT ??
            "2775", 10),
        systemId: process.env.SMPP_SYSTEM_ID,
        password: process.env.SMPP_PASSWORD,
        systemType: process.env.SMPP_SYSTEM_TYPE ??
            "",
        connectionTimeout: Number.parseInt(process.env.SMPP_CONNECTION_TIMEOUT ??
            "10000", 10),
        enquireLinkInterval: Number.parseInt(process.env.SMPP_ENQUIRE_LINK_INTERVAL ??
            "30000", 10),
        requestTimeout: Number.parseInt(process.env.SMPP_REQUEST_TIMEOUT ??
            "30000", 10),
        reconnectDelay: Number.parseInt(process.env.SMPP_RECONNECT_DELAY ??
            "5000", 10),
        maxReconnectDelay: Number.parseInt(process.env.SMPP_MAX_RECONNECT_DELAY ??
            "30000", 10),
    },
    log: {
        level: process.env.LOG_LEVEL ??
            "info",
        stdout: process.env.LOG_STDOUT !==
            "false",
        file: {
            enabled: process.env.LOG_FILE_ENABLED ===
                "true",
            path: process.env.LOG_FILE_PATH ??
                "/var/log/smpp-service/application.log",
        },
    },
    telemetry: {
        enabled: process.env.OTEL_ENABLED !==
            "false",
        serviceName: process.env.OTEL_SERVICE_NAME ??
            "sms-gateway-smpp-service",
        serviceVersion: process.env.OTEL_SERVICE_VERSION ??
            "1.0.0",
        tracesEndpoint: process.env.OTEL_TRACES_ENDPOINT ??
            "",
        metricsEndpoint: process.env.OTEL_METRICS_ENDPOINT ??
            "",
        logsEndpoint: process.env.OTEL_LOGS_ENDPOINT ??
            "",
        exportIntervalMillis: Number.parseInt(process.env.OTEL_EXPORT_INTERVAL_MILLIS ??
            "10000", 10),
        disableFsInstrumentation: process.env.OTEL_DISABLE_FS_INSTRUMENTATION ===
            "true",
    },
});
//# sourceMappingURL=configuration.js.map