var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module, } from "@nestjs/common";
import { ConnectorResultPublisher } from "./publishers/connector-result.publisher.js";
import { SmppRepository } from "./repositories/smpp.repository.js";
import { SmppConnectionManager } from "./smpp-connection-manager.js";
import { SmppClient } from "./smpp.client.js";
import { SmppConsumer } from "./smpp.consumer.js";
let SmppModule = class SmppModule {
};
SmppModule = __decorate([
    Module({
        imports: [],
        providers: [SmppClient, SmppConsumer, SmppRepository, ConnectorResultPublisher, SmppConnectionManager],
        exports: [],
    })
], SmppModule);
export { SmppModule };
//# sourceMappingURL=smpp.module.js.map