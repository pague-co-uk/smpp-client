import {
  Module,
} from "@nestjs/common";

import { ConnectorResultPublisher } from "./publishers/connector-result.publisher.js";
import { DeliveryReceiptPublisher } from "./publishers/delivery-receipt.publisher.js";
import { SmppRepository } from "./repositories/smpp.repository.js";
import { SmppDeliveryReceiptParser } from "./services/smpp-delivery-receipt-parser.js";
import { SmppConnectionManager } from "./smpp-connection-manager.js";
import { SmppClient } from "./smpp.client.js";
import { SmppConsumer } from "./smpp.consumer.js";

@Module({
  imports: [],
  providers: [
    SmppClient,
    SmppConsumer,
    SmppRepository,
    ConnectorResultPublisher,
    SmppConnectionManager,
    SmppDeliveryReceiptParser,
    DeliveryReceiptPublisher,
  ],
  exports: [
    SmppConsumer,
  ],
})
export class SmppModule { }