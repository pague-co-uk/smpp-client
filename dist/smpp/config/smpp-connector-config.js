function isRecord(value) {
    return (typeof value === "object" &&
        value !== null &&
        !Array.isArray(value));
}
export function parseSmppConnectorConfiguration(configuration) {
    if (!isRecord(configuration)) {
        throw new Error("SMPP connector configuration is missing or invalid.");
    }
    const host = configuration.host;
    const port = configuration.port;
    const systemId = configuration.systemId;
    const password = configuration.password;
    const systemType = configuration.systemType;
    const connectionTimeout = configuration.connectionTimeout;
    const enquireLinkInterval = configuration.enquireLinkInterval;
    const requestTimeout = configuration.requestTimeout;
    const reconnectDelay = configuration.reconnectDelay;
    const maxReconnectDelay = configuration.maxReconnectDelay;
    if (typeof host !== "string" ||
        host.length === 0) {
        throw new Error("SMPP connector configuration requires a valid host.");
    }
    if (typeof port !== "number" ||
        !Number.isInteger(port) ||
        port < 1 ||
        port > 65535) {
        throw new Error("SMPP connector configuration requires a valid port.");
    }
    if (typeof systemId !== "string" ||
        systemId.length === 0) {
        throw new Error("SMPP connector configuration requires a systemId.");
    }
    if (typeof password !== "string") {
        throw new Error("SMPP connector configuration requires a password.");
    }
    if (systemType !== undefined &&
        typeof systemType !== "string") {
        throw new Error("SMPP connector systemType must be a string.");
    }
    if (typeof connectionTimeout !== "number" ||
        !Number.isInteger(connectionTimeout) ||
        connectionTimeout < 1000) {
        throw new Error("SMPP connector configuration requires a valid connectionTimeout.");
    }
    if (typeof enquireLinkInterval !== "number" ||
        !Number.isInteger(enquireLinkInterval) ||
        enquireLinkInterval < 1000) {
        throw new Error("SMPP connector configuration requires a valid enquireLinkInterval.");
    }
    if (typeof requestTimeout !== "number" ||
        !Number.isInteger(requestTimeout) ||
        requestTimeout < 1000) {
        throw new Error("SMPP connector configuration requires a valid requestTimeout.");
    }
    if (typeof reconnectDelay !== "number" ||
        !Number.isInteger(reconnectDelay) ||
        reconnectDelay < 100) {
        throw new Error("SMPP connector configuration requires a valid reconnectDelay.");
    }
    if (typeof maxReconnectDelay !== "number" ||
        !Number.isInteger(maxReconnectDelay) ||
        maxReconnectDelay < reconnectDelay) {
        throw new Error("SMPP connector configuration requires a valid maxReconnectDelay.");
    }
    return {
        host,
        port,
        systemId,
        password,
        systemType: systemType ?? "",
        connectionTimeout,
        enquireLinkInterval,
        requestTimeout,
        reconnectDelay,
        maxReconnectDelay,
    };
}
//# sourceMappingURL=smpp-connector-config.js.map