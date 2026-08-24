import {
  Inject,
  Injectable,
} from "@nestjs/common";

import {
  ConnectorStatus,
  ConnectorTransport,
} from "@prisma/client";

import {
  DATABASE,
} from "../../database/database.constants.js";

import type {
  Database,
} from "../../database/database.repository.js";

@Injectable()
export class ConnectorRepository {
  constructor(
    @Inject(DATABASE)
    private readonly db: Database,
  ) { }

  async findActiveSmppConnector(
    code: string,
  ) {
    return this.db.connector.findFirst({
      where: {
        code,
        status: ConnectorStatus.ACTIVE,
        transport: ConnectorTransport.SMPP,
      },
    });
  }
}