export function parseSmppConnectorConfiguration(configuration) {
    if (!configuration ||
        typeof configuration !== "object") {
        throw new Error("SMPP connector configuration is missing.");
    }
    const value = configuration;
    if (typeof value.host !== "string" ||
        value.host.length === 0) {
        throw new Error("SMPP connector configuration requires 'host'.");
    }
    if (typeof value.port !== "number" ||
        !Number.isInteger(value.port) ||
        value.port < 1 ||
        value.port > 65535) {
        throw new Error("SMPP connector configuration requires a valid numeric 'port'.");
    }
    if (typeof value.systemId !== "string" ||
        value.systemId.length === 0) {
        throw new Error("SMPP connector configuration requires 'systemId'.");
    }
    if (typeof value.password !== "string") {
        throw new Error("SMPP connector configuration requires 'password'.");
    }
    return {
        host: value.host,
        port: value.port,
        systemId: value.systemId,
        password: value.password,
        systemType: typeof value.systemType === "string"
            ? value.systemType
            : "",
        connectionTimeout: typeof value.connectionTimeout === "number"
            ? value.connectionTimeout
            : 10000,
        enquireLinkInterval: typeof value.enquireLinkInterval === "number"
            ? value.enquireLinkInterval
            : 30000,
        requestTimeout: typeof value.requestTimeout === "number"
            ? value.requestTimeout
            : 30000,
        reconnectDelay: typeof value.reconnectDelay === "number"
            ? value.reconnectDelay
            : 5000,
        maxReconnectDelay: typeof value.maxReconnectDelay === "number"
            ? value.maxReconnectDelay
            : 30000,
    };
}
//# sourceMappingURL=smpp-connector-configuration.js.map