var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Inject, Injectable, } from "@nestjs/common";
import { DATABASE, } from "../../database/database.constants.js";
import { DatabaseRepository, } from "../../database/database.repository.js";
import { ConnectorStatus, ConnectorTransport } from "@prisma/client";
let SmppRepository = class SmppRepository extends DatabaseRepository {
    constructor(db) {
        super(db);
    }
    async findMessageForSubmission(messageId) {
        return this.db.message.findUnique({
            where: {
                id: messageId,
            },
            include: {
                senderId: true,
            },
        });
    }
    async findAttempt(attemptId) {
        return this.db.messageRouteAttempt.findUnique({
            where: {
                id: attemptId,
            },
        });
    }
    async findActiveSmppConnectors() {
        return this.db.connector.findMany({
            where: {
                status: ConnectorStatus.ACTIVE,
                transport: ConnectorTransport.SMPP,
            },
            orderBy: {
                code: "asc",
            },
        });
    }
    async findConnector(connectorId) {
        return this.db.connector.findUnique({
            where: {
                id: connectorId,
            },
        });
    }
};
SmppRepository = __decorate([
    Injectable(),
    __param(0, Inject(DATABASE)),
    __metadata("design:paramtypes", [Object])
], SmppRepository);
export { SmppRepository };
//# sourceMappingURL=smpp.repository.js.map