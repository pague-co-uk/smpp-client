import {
  Global,
  Module,
} from "@nestjs/common";

import {
  DATABASE,
} from "./database.constants.js";

import { QueueModule } from "../queue/queue.module.js";
import {
  databaseProvider,
} from "./database.provider.js";

@Global()
@Module({
  providers: [
    databaseProvider,
  ],

  exports: [
    DATABASE,
  ],
  imports: [QueueModule]
})
export class DatabaseModule { }