import { Prisma, PrismaClient } from "@prisma/client";
export type Database = PrismaClient | Prisma.TransactionClient;
export declare abstract class DatabaseRepository {
    protected readonly db: Database;
    protected constructor(db: Database);
    protected transaction<T>(callback: (db: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}
