import { PrismaClient, } from "@prisma/client";
import { DATABASE, } from "./database.constants.js";
import { AppConfigService, } from "../config/config.service.js";
export const databaseProvider = {
    provide: DATABASE,
    inject: [
        AppConfigService,
    ],
    useFactory: async (config) => {
        const client = new PrismaClient({
            datasources: {
                db: {
                    url: config.databaseUrl,
                },
            },
        });
        await client.$connect();
        return client;
    },
};
//# sourceMappingURL=database.provider.js.map