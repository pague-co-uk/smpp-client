import { DatabaseRepository } from "../../database/database.repository.js";
import type { Database } from "../../database/database.repository.js";
export declare class SmppRepository extends DatabaseRepository {
    constructor(db: Database);
    findMessageForSubmission(messageId: string): Promise<({
        senderId: {
            id: string;
            publicId: string;
            status: import("@prisma/client").$Enums.SenderIdStatus;
            createdAt: Date;
            updatedAt: Date;
            clientId: string;
            sender: string;
            isDefault: boolean;
        } | null;
    } & {
        id: string;
        publicId: string;
        createdAt: Date;
        updatedAt: Date;
        clientId: string;
        senderIdId: string | null;
        destination: string;
        body: string;
        encoding: import("@prisma/client").$Enums.MessageEncoding;
        segmentCount: number;
        currentStatus: import("@prisma/client").$Enums.MessageStatus;
        routingStatus: import("@prisma/client").$Enums.MessageRoutingStatus;
        currentAttemptNumber: number;
        submittedAt: Date | null;
    }) | null>;
    findAttempt(attemptId: string): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.MessageRouteAttemptStatus;
        createdAt: Date;
        updatedAt: Date;
        submittedAt: Date | null;
        connectorId: string;
        priority: number;
        messageId: string;
        routeId: string;
        attemptNumber: number;
        providerMessageId: string | null;
        errorCode: string | null;
        errorMessage: string | null;
        dispatchedAt: Date | null;
        startedAt: Date | null;
        failedAt: Date | null;
        completedAt: Date | null;
    } | null>;
    findActiveSmppConnectors(): Promise<{
        id: string;
        publicId: string;
        name: string;
        code: string;
        provider: string;
        transport: import("@prisma/client").$Enums.ConnectorTransport;
        status: import("@prisma/client").$Enums.ConnectorStatus;
        configuration: import("@prisma/client/runtime/library").JsonValue | null;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    findConnector(connectorId: string): Promise<{
        id: string;
        publicId: string;
        name: string;
        code: string;
        provider: string;
        transport: import("@prisma/client").$Enums.ConnectorTransport;
        status: import("@prisma/client").$Enums.ConnectorStatus;
        configuration: import("@prisma/client/runtime/library").JsonValue | null;
        createdAt: Date;
        updatedAt: Date;
    } | null>;
}
