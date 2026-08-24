import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module.js';
import { ConnectorsModule } from './connectors/connectors.module.js';
import { DatabaseModule } from './database/database.module.js';
import { QueueModule } from './queue/queue.module.js';
import { SmppModule } from './smpp/smpp.module.js';

@Module({
  imports: [ConfigModule, QueueModule, SmppModule, ConnectorsModule, DatabaseModule],
  controllers: [],
  providers: [],
})
export class AppModule { }
