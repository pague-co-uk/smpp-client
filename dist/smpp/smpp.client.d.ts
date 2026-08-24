import { OnApplicationShutdown } from "@nestjs/common";
import smpp from "smpp";
import type { SmppConnectorConfiguration } from "./types/smpp-connector-configuration.js";
export type SmppConnectionState = "DISCONNECTED" | "CONNECTED" | "BOUND";
export type SmppSubmissionResult = {
    status: "SUBMITTED";
    providerMessageId?: string;
} | {
    status: "FAILED";
    errorCode?: string;
    errorMessage: string;
} | {
    status: "UNKNOWN";
    errorCode?: string;
    errorMessage: string;
} | {
    status: "DISCONNECTED";
    errorCode: "SMPP_DISCONNECTED";
    errorMessage: string;
};
export declare class SmppClient implements OnApplicationShutdown {
    private readonly logger;
    private readonly sessions;
    hasSession(connectorId: string): boolean;
    getConnectionState(connectorId: string): SmppConnectionState;
    getManagedConnectorIds(): string[];
    getConnectedConnectorIds(): string[];
    connect(connectorId: string, configuration: SmppConnectorConfiguration): Promise<void>;
    private waitForConnect;
    private bind;
    private registerHandlers;
    submitSm(connectorId: string, parameters: smpp.SubmitSmOptions): Promise<SmppSubmissionResult>;
    disconnect(connectorId: string): Promise<void>;
    private createConfigurationHash;
    onApplicationShutdown(): Promise<void>;
}
