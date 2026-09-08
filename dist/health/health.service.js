var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Injectable, } from "@nestjs/common";
import { AppConfigService, } from "../config/config.service.js";
let HealthService = class HealthService {
    config;
    constructor(config) {
        this.config = config;
    }
    check() {
        const start = performance.now();
        const latency = Math.round(performance.now() - start);
        return {
            status: "healthy",
            service: this.config.app.name,
            version: this.config.app.version,
            environment: this.config.app.environment,
            uptime: Math.round(process.uptime()),
            timestamp: new Date().toISOString(),
            latency,
        };
    }
};
HealthService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [AppConfigService])
], HealthService);
export { HealthService };
//# sourceMappingURL=health.service.js.map