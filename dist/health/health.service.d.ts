import { AppConfigService } from "../config/config.service.js";
export declare class HealthService {
    private readonly config;
    constructor(config: AppConfigService);
    check(): {
        status: string;
        service: string;
        version: string;
        environment: string;
        uptime: number;
        timestamp: string;
        latency: number;
    };
}
