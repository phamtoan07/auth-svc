import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as oracledb from 'oracledb';

@Injectable()
export class DbService implements OnModuleInit, OnModuleDestroy {
  private pool!: oracledb.Pool;
  async onModuleInit() {
    this.pool = await oracledb.createPool({
      user: process.env.ORACLE_USER!,
      password: process.env.ORACLE_PASSWORD!,
      connectString: process.env.ORACLE_CONNECT_STRING!,
      poolMin: 1,
      poolMax: 4,
      poolIncrement: 1,
    });
  }
  async onModuleDestroy() {
    await this.pool?.close(0);
  }

  async query<T = any>(
    sql: string,
    binds: any = {},
    opts: oracledb.ExecuteManyOptions & oracledb.ExecuteOptions = {},
  ) {
    const conn = await this.pool.getConnection();
    try {
      const res = await conn.execute<T>(sql, binds, {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        ...opts,
      });
      return res;
    } finally {
      await conn.close();
    }
  }
}
