import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class SessionStore {
  private r = new Redis(process.env.REDIS_URL);
  async get<T=any>(k:string){ const v = await this.r.get(k); return v? JSON.parse(v) as T : null; }
  async set(k:string, v:any, ttlSec=3600){ await this.r.set(k, JSON.stringify(v), 'EX', ttlSec); }
  async del(k:string){ await this.r.del(k); }
}
