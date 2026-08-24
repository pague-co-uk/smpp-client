import type { Database } from "../../database/database.repository.js";
export declare class ConnectorRepository {
    private readonly db;
    constructor(db: Database);
    findActiveSmppConnector(code: string): Promise<{
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
