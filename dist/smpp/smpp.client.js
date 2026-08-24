var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var SmppClient_1;
import { Injectable, } from "@nestjs/common";
import smpp from "smpp";
import { getComponentLogger, recordException, withSpan, } from "@pague-co-uk/sms-gateway-telemetry";
let SmppClient = SmppClient_1 = class SmppClient {
    logger = getComponentLogger(SmppClient_1.name);
    sessions = new Map();
    hasSession(connectorId) {
        const state = this.sessions.get(connectorId);
        return !!(state &&
            state.connected &&
            state.bound &&
            !state.closing);
    }
    getConnectionState(connectorId) {
        const state = this.sessions.get(connectorId);
        if (!state ||
            state.closing ||
            !state.connected) {
            return "DISCONNECTED";
        }
        if (!state.bound) {
            return "CONNECTED";
        }
        return "BOUND";
    }
    getManagedConnectorIds() {
        return [
            ...this.sessions.keys(),
        ];
    }
    getConnectedConnectorIds() {
        return [
            ...this.sessions.entries(),
        ]
            .filter(([, state]) => state.connected &&
            state.bound &&
            !state.closing)
            .map(([connectorId]) => connectorId);
    }
    async connect(connectorId, configuration) {
        return withSpan("SmppClient.connect", async (span) => {
            span.setAttributes({
                "smpp.connector_id": connectorId,
                "smpp.host": configuration.host,
                "smpp.port": configuration.port,
                "smpp.system_id": configuration.systemId,
            });
            const existing = this.sessions.get(connectorId);
            const configurationHash = this.createConfigurationHash(configuration);
            if (existing &&
                existing.configurationHash ===
                    configurationHash &&
                existing.connected &&
                existing.bound &&
                !existing.closing) {
                this.logger.debug({
                    connectorId,
                    sessionId: existing.sessionId,
                }, "SMPP connector already connected.");
                return;
            }
            if (existing) {
                this.logger.info({
                    connectorId,
                    sessionId: existing.sessionId,
                    previousState: this.getConnectionState(connectorId),
                }, "Replacing existing SMPP connector session.");
                await this.disconnect(connectorId);
            }
            const sessionId = crypto.randomUUID();
            this.logger.info({
                connectorId,
                sessionId,
                host: configuration.host,
                port: configuration.port,
                systemId: configuration.systemId,
            }, "Opening SMPP connection.");
            const session = smpp.connect({
                host: configuration.host,
                port: configuration.port,
                connectTimeout: configuration.connectionTimeout,
                enquire_link: configuration.enquireLinkInterval,
                debug: false,
            });
            const state = {
                connectorId,
                sessionId,
                session,
                configuration,
                configurationHash,
                connected: false,
                bound: false,
                closing: false,
            };
            this.sessions.set(connectorId, state);
            this.registerHandlers(state);
            try {
                await this.waitForConnect(state);
                await this.bind(state);
                this.logger.info({
                    connectorId,
                    sessionId,
                }, "SMPP connector session established.");
            }
            catch (error) {
                recordException(error);
                try {
                    await this.disconnect(connectorId);
                }
                catch (closeError) {
                    recordException(closeError);
                }
                throw error;
            }
        });
    }
    async waitForConnect(state) {
        if (state.connected) {
            return;
        }
        await new Promise((resolve, reject) => {
            let settled = false;
            const cleanup = () => {
                clearTimeout(timer);
                state.session.removeListener("connect", onConnect);
                state.session.removeListener("error", onError);
                state.session.removeListener("close", onClose);
            };
            const finishResolve = () => {
                if (settled) {
                    return;
                }
                settled = true;
                cleanup();
                state.connected =
                    true;
                resolve();
            };
            const finishReject = (error) => {
                if (settled) {
                    return;
                }
                settled = true;
                cleanup();
                reject(error);
            };
            const onConnect = () => {
                finishResolve();
            };
            const onError = (error) => {
                finishReject(error);
            };
            const onClose = () => {
                finishReject(new Error("SMPP connection closed before connect completed."));
            };
            const timer = setTimeout(() => {
                finishReject(new Error("SMPP connection timed out."));
            }, state.configuration
                .connectionTimeout);
            state.session.once("connect", onConnect);
            state.session.once("error", onError);
            state.session.once("close", onClose);
        });
    }
    async bind(state) {
        if (state.bound) {
            return;
        }
        if (!state.connected ||
            state.closing) {
            throw new Error("Cannot bind an unavailable SMPP session.");
        }
        await new Promise((resolve, reject) => {
            try {
                state.session.bind_transceiver({
                    system_id: state.configuration
                        .systemId,
                    password: state.configuration
                        .password,
                    system_type: state.configuration
                        .systemType,
                }, (pdu) => {
                    if (pdu.command_status !==
                        0) {
                        const error = new Error(`SMPP bind failed with command status ${pdu.command_status}.`);
                        recordException(error);
                        this.logger.error({
                            connectorId: state.connectorId,
                            sessionId: state.sessionId,
                            commandStatus: pdu.command_status,
                        }, "SMPP bind failed.");
                        reject(error);
                        return;
                    }
                    state.bound =
                        true;
                    this.logger.info({
                        connectorId: state.connectorId,
                        sessionId: state.sessionId,
                        systemId: state.configuration
                            .systemId,
                    }, "SMPP session bound successfully.");
                    resolve();
                });
            }
            catch (error) {
                recordException(error);
                reject(error);
            }
        });
    }
    registerHandlers(state) {
        state.session.on("error", (error) => {
            recordException(error);
            this.logger.error({
                connectorId: state.connectorId,
                sessionId: state.sessionId,
                err: error,
            }, "SMPP session error.");
        });
        state.session.on("close", () => {
            state.connected =
                false;
            state.bound =
                false;
            this.logger.warn({
                connectorId: state.connectorId,
                sessionId: state.sessionId,
                closing: state.closing,
            }, "SMPP session disconnected.");
        });
        state.session.on("timeout", () => {
            this.logger.warn({
                connectorId: state.connectorId,
                sessionId: state.sessionId,
            }, "SMPP session timed out.");
        });
        state.session.on("enquire_link", (pdu) => {
            this.logger.debug({
                connectorId: state.connectorId,
                sessionId: state.sessionId,
                sequenceNumber: pdu.sequence_number,
            }, "SMPP enquire_link received.");
        });
        state.session.on("enquire_link_resp", (pdu) => {
            this.logger.debug({
                connectorId: state.connectorId,
                sessionId: state.sessionId,
                sequenceNumber: pdu.sequence_number,
                commandStatus: pdu.command_status,
            }, "SMPP enquire_link response received.");
        });
    }
    async submitSm(connectorId, parameters) {
        return withSpan("SmppClient.submitSm", async (span) => {
            span.setAttribute("smpp.connector_id", connectorId);
            const state = this.sessions.get(connectorId);
            if (!state ||
                !state.connected ||
                !state.bound ||
                state.closing) {
                this.logger.warn({
                    connectorId,
                    sessionId: state?.sessionId,
                    state: state
                        ? this.getConnectionState(connectorId)
                        : "DISCONNECTED",
                }, "SMPP submission rejected because connector is disconnected.");
                return {
                    status: "DISCONNECTED",
                    errorCode: "SMPP_DISCONNECTED",
                    errorMessage: "No usable SMPP session is available for the connector.",
                };
            }
            return new Promise((resolve) => {
                let settled = false;
                const finish = (result) => {
                    if (settled) {
                        return;
                    }
                    settled = true;
                    clearTimeout(timer);
                    resolve(result);
                };
                const timer = setTimeout(() => {
                    finish({
                        status: "UNKNOWN",
                        errorCode: "SMPP_SUBMIT_TIMEOUT",
                        errorMessage: "No submit_sm response was received within the configured timeout.",
                    });
                }, state.configuration
                    .requestTimeout);
                try {
                    state.session.submit_sm(parameters, (pdu) => {
                        if (pdu.command_status !==
                            0) {
                            finish({
                                status: "FAILED",
                                errorCode: `SMPP_${pdu.command_status}`,
                                errorMessage: `SMPP submit_sm was rejected with command status ${pdu.command_status}.`,
                            });
                            return;
                        }
                        finish({
                            status: "SUBMITTED",
                            providerMessageId: typeof pdu.message_id ===
                                "string"
                                ? pdu.message_id
                                : undefined,
                        });
                    });
                }
                catch (error) {
                    recordException(error);
                    finish({
                        status: "FAILED",
                        errorCode: "SMPP_SUBMIT_ERROR",
                        errorMessage: error instanceof Error
                            ? error.message
                            : "SMPP submit_sm failed.",
                    });
                }
            });
        });
    }
    async disconnect(connectorId) {
        const state = this.sessions.get(connectorId);
        if (!state) {
            return;
        }
        state.closing =
            true;
        try {
            if (state.bound) {
                await new Promise((resolve) => {
                    try {
                        state.session.unbind(() => {
                            state.bound =
                                false;
                            resolve();
                        });
                    }
                    catch (error) {
                        recordException(error);
                        resolve();
                    }
                });
            }
            try {
                state.session.close();
            }
            catch (error) {
                recordException(error);
            }
        }
        finally {
            state.connected =
                false;
            state.bound =
                false;
            this.sessions.delete(connectorId);
            this.logger.info({
                connectorId,
                sessionId: state.sessionId,
            }, "SMPP connector session closed.");
        }
    }
    createConfigurationHash(configuration) {
        return JSON.stringify({
            host: configuration.host,
            port: configuration.port,
            systemId: configuration.systemId,
            password: configuration.password,
            systemType: configuration.systemType,
            connectionTimeout: configuration.connectionTimeout,
            enquireLinkInterval: configuration.enquireLinkInterval,
            requestTimeout: configuration.requestTimeout,
        });
    }
    async onApplicationShutdown() {
        const connectorIds = [
            ...this.sessions.keys(),
        ];
        await Promise.all(connectorIds.map((connectorId) => this.disconnect(connectorId)));
    }
};
SmppClient = SmppClient_1 = __decorate([
    Injectable()
], SmppClient);
export { SmppClient };
//# sourceMappingURL=smpp.client.js.map