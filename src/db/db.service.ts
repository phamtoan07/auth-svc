import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as oracledb from 'oracledb';

@Injectable()
export class DbService implements OnModuleInit, OnModuleDestroy {
  private pool!: oracledb.Pool;

  private resolveJdbcTemplate(tpl: string): string {
    const get = (k: string) => process.env[k] || '';
    return tpl.replace(/\$\{([^}]+)\}/g, (_, k) => {
      const v = get(k);
      if (!v) throw new Error(`Missing env for ${k}`);
      return v;
    }).replace(/^jdbc:oracle:thin:@/i, '').trim();
  }

  async onModuleInit() {
    const tpl = process.env['Oracle.JdbcUrl']!;
    const connectString = this.resolveJdbcTemplate(tpl);
    this.pool = await oracledb.createPool({
      user: process.env['Oracle.Uid']!,
      password: process.env['Oracle.Pwd']!,
      connectString, // (DESCRIPTION=...SERVICE_NAME=...)
      poolMin: +(process.env['Oracle.minpoolsize'] || 1),
      poolMax: +(process.env['Oracle.maxpoolsize'] || 4),
      poolIncrement: +(process.env['Oracle.initpoolsize'] || 1),
      queueTimeout: +(process.env['Oracle.connectionWaitTimeout'] || 0) * 1000 || 0,
      stmtCacheSize: 30,
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
