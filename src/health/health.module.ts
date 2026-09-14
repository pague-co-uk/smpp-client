import {
  Module,
} from "@nestjs/common";

import {
  HealthController,
} from "./health.controller.js";

import { SmppModule } from "../smpp/smpp.module.js";
import {
  HealthService,
} from "./health.service.js";

@Module({
  controllers: [
    HealthController,
  ],
  imports: [SmppModule],

  providers: [
    HealthService,
  ],
})
export class HealthModule { }