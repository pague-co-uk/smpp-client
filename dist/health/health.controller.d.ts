import { HealthService } from "./health.service.js";
export declare class HealthController {
    private readonly healthService;
    constructor(healthService: HealthService);
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
