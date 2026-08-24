export interface SmppConnectorConfiguration {
    host: string;
    port: number;
    systemId: string;
    password: string;
    systemType: string;
    connectionTimeout: number;
    enquireLinkInterval: number;
    requestTimeout: number;
    reconnectDelay: number;
    maxReconnectDelay: number;
}
