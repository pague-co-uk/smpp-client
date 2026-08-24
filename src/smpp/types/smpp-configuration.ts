export interface SmppConfiguration {
  host: string;

  port: number;

  systemId: string;

  password: string;

  systemType?: string | null;

  connectionTimeout: number;

  enquireLinkInterval: number;

  requestTimeout: number;

  reconnectDelay: number;

  maxReconnectDelay: number;
}