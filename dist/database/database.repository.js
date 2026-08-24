import { PrismaClient, } from "@prisma/client";
export class DatabaseRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    async transaction(callback) {
        if (this.db instanceof PrismaClient) {
            return this.db.$transaction(callback);
        }
        return callback(this.db);
    }
}
//# sourceMappingURL=database.repository.js.map