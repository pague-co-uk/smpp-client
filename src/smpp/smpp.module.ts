import {
  Module,
} from "@nestjs/common";
import { ConnectorResultPublisher } from "./publishers/connector-result.publisher.js";
import { SmppRepository } from "./repositories/smpp.repository.js";
import { SmppConnectionManager } from "./smpp-connection-manager.js";
import { SmppClient } from "./smpp.client.js";
import { SmppConsumer } from "./smpp.consumer.js";

@Module({
  imports: [],
  providers: [SmppClient, SmppConsumer, SmppRepository, ConnectorResultPublisher, SmppConnectionManager],
  exports: [],
})
export class SmppModule { }