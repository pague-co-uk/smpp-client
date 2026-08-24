import {
  Module,
} from "@nestjs/common";

import {
  ConnectorRepository,
} from "./repositories/connector.repository.js";

@Module({
  providers: [
    ConnectorRepository,
  ],

  exports: [
    ConnectorRepository,
  ],
})
export class ConnectorsModule { }