export function parseSmppConnectorConfiguration(configuration) {
    if (!configuration ||
        typeof configuration !== "object" ||
        Array.isArray(configuration)) {
        throw new Error("SMPP connector configuration is missing or invalid.");
    }
    const value = configuration;
    if (typeof value.host !== "string" ||
        value.host.trim().length === 0) {
        throw new Error("SMPP connector configuration requires 'host'.");
    }
    if (typeof value.port !== "number" ||
        !Number.isInteger(value.port) ||
        value.port < 1 ||
        value.port > 65535) {
        throw new Error("SMPP connector configuration requires a valid numeric 'port'.");
    }
    if (typeof value.systemId !== "string" ||
        value.systemId.trim().length === 0) {
        throw new Error("SMPP connector configuration requires 'systemId'.");
    }
    if (typeof value.password !== "string") {
        throw new Error("SMPP connector configuration requires 'password'.");
    }
    const systemType = value.systemType === undefined
        ? ""
        : value.systemType;
    if (typeof systemType !== "string") {
        throw new Error("SMPP connector configuration 'systemType' must be a string.");
    }
    const connectionTimeout = value.connectionTimeout === undefined
        ? 10000
        : value.connectionTimeout;
    if (typeof connectionTimeout !== "number" ||
        !Number.isInteger(connectionTimeout) ||
        connectionTimeout < 1000) {
        throw new Error("SMPP connector configuration 'connectionTimeout' must be an integer of at least 1000 milliseconds.");
    }
    const enquireLinkInterval = value.enquireLinkInterval === undefined
        ? 30000
        : value.enquireLinkInterval;
    if (typeof enquireLinkInterval !== "number" ||
        !Number.isInteger(enquireLinkInterval) ||
        enquireLinkInterval < 1000) {
        throw new Error("SMPP connector configuration 'enquireLinkInterval' must be an integer of at least 1000 milliseconds.");
    }
    const requestTimeout = value.requestTimeout === undefined
        ? 30000
        : value.requestTimeout;
    if (typeof requestTimeout !== "number" ||
        !Number.isInteger(requestTimeout) ||
        requestTimeout < 1000) {
        throw new Error("SMPP connector configuration 'requestTimeout' must be an integer of at least 1000 milliseconds.");
    }
    const reconnectDelay = value.reconnectDelay === undefined
        ? 5000
        : value.reconnectDelay;
    if (typeof reconnectDelay !== "number" ||
        !Number.isInteger(reconnectDelay) ||
        reconnectDelay < 100) {
        throw new Error("SMPP connector configuration 'reconnectDelay' must be an integer of at least 100 milliseconds.");
    }
    const maxReconnectDelay = value.maxReconnectDelay === undefined
        ? 30000
        : value.maxReconnectDelay;
    if (typeof maxReconnectDelay !== "number" ||
        !Number.isInteger(maxReconnectDelay) ||
        maxReconnectDelay < 100) {
        throw new Error("SMPP connector configuration 'maxReconnectDelay' must be an integer of at least 100 milliseconds.");
    }
    if (maxReconnectDelay <
        reconnectDelay) {
        throw new Error("SMPP connector configuration 'maxReconnectDelay' cannot be less than 'reconnectDelay'.");
    }
    return {
        host: value.host,
        port: value.port,
        systemId: value.systemId,
        password: value.password,
        systemType,
        connectionTimeout,
        enquireLinkInterval,
        requestTimeout,
        reconnectDelay,
        maxReconnectDelay,
    };
}
//# sourceMappingURL=smpp-connector-config.js.map