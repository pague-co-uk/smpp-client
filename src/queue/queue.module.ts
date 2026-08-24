import {
  Global,
  Module,
} from "@nestjs/common";

import {
  QUEUE_CLIENT,
} from "./constants/queue.constants.js";

import {
  queueProvider,
} from "./queue.provider.js";

import {
  QueueService,
} from "./queue.service.js";

@Global()
@Module({
  providers: [
    queueProvider,
    QueueService,
  ],

  exports: [
    QUEUE_CLIENT,
  ],
  imports: []
})
export class QueueModule { }