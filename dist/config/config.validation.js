import Joi from "joi";
export const configValidationSchema = Joi.object({
    NODE_ENV: Joi.string()
        .valid("development", "test", "production")
        .default("development"),
    APP_NAME: Joi.string()
        .default("sms-gateway-smpp-client"),
    APP_VERSION: Joi.string()
        .default("1.0.0"),
    APP_HOST: Joi.string()
        .default("0.0.0.0"),
    APP_PORT: Joi.number()
        .integer()
        .min(1)
        .max(65535)
        .default(9004),
    DATABASE_URL: Joi.string()
        .required(),
    RABBITMQ_URL: Joi.string()
        .required(),
    RABBITMQ_CONNECTION_NAME: Joi.string()
        .default("sms-gateway-smpp-client"),
    RABBITMQ_HEARTBEAT: Joi.number()
        .integer()
        .min(1)
        .default(60),
    RABBITMQ_RECONNECT_DELAY: Joi.number()
        .integer()
        .min(100)
        .default(1000),
    RABBITMQ_MAX_RECONNECT_DELAY: Joi.number()
        .integer()
        .min(100)
        .default(30000),
    RABBITMQ_MAX_RECONNECT_ATTEMPTS: Joi.number()
        .integer()
        .min(1)
        .empty("")
        .optional(),
    RABBITMQ_AUTO_RECOVER: Joi.boolean()
        .truthy("true", "1")
        .falsy("false", "0")
        .default(true),
    RABBITMQ_CONSUMER_PREFETCH: Joi.number()
        .integer()
        .min(1)
        .max(1000)
        .default(10),
    ROUTING_CONSUMER_QUEUE: Joi.string()
        .default("sms.route.smpp"),
    ROUTING_RESULT_QUEUE: Joi.string()
        .default("sms.route.result"),
    LOG_LEVEL: Joi.string()
        .valid("trace", "debug", "info", "warn", "error", "fatal")
        .default("info"),
    LOG_STDOUT: Joi.boolean()
        .truthy("true", "1")
        .falsy("false", "0")
        .default(true),
    LOG_FILE_ENABLED: Joi.boolean()
        .truthy("true", "1")
        .falsy("false", "0")
        .default(false),
    LOG_FILE_PATH: Joi.string()
        .default("/var/log/pague/sms-gateway-smpp-client/application.log"),
    OTEL_ENABLED: Joi.boolean()
        .truthy("true", "1")
        .falsy("false", "0")
        .default(false),
    OTEL_SERVICE_NAME: Joi.string()
        .default("sms-gateway-smpp-client"),
    OTEL_SERVICE_VERSION: Joi.string()
        .default("1.0.0"),
    OTEL_TRACES_ENDPOINT: Joi.string()
        .allow("")
        .default(""),
    OTEL_METRICS_ENDPOINT: Joi.string()
        .allow("")
        .default(""),
    OTEL_LOGS_ENDPOINT: Joi.string()
        .allow("")
        .default(""),
    OTEL_EXPORT_INTERVAL_MILLIS: Joi.number()
        .integer()
        .min(100)
        .default(10000),
    OTEL_DISABLE_FS_INSTRUMENTATION: Joi.boolean()
        .truthy("true", "1")
        .falsy("false", "0")
        .default(false),
});
//# sourceMappingURL=config.validation.js.map