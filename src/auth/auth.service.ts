import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { DbService } from '../db/db.service';

const sha256 = (s: string) =>
  crypto.createHash('sha256').update(s).digest('hex');
const now = () => new Date();

@Injectable()
export class AuthService {
  private accessTtl = process.env.ACCESS_TTL || '600s';
  private refreshTtlMs = (() => {
    const v = process.env.REFRESH_TTL || '30d';
    const m = /^(\d+)([smhd])$/.exec(v)!;
    const n = Number(m[1]);
    const unit = m[2];
    return (
      n *
      (unit === 's' ? 1e3 : unit === 'm' ? 6e4 : unit === 'h' ? 3.6e6 : 8.64e7)
    );
  })();

  constructor(
    private users: UsersService,
    private jwt: JwtService,
    private db: DbService,
  ) {}

  async login(username: string, password: string, ua?: string, ip?: string) {
    const u = await this.users.findByUsername(username);
    if (!u || u.STATUS !== 'A') throw new UnauthorizedException('Invalid');
    const ok = await bcrypt.compare(password, u.PASSWORD_HASH);
    if (!ok) throw new UnauthorizedException('Invalid');
    await this.users.markLastLogin(u.ID);
    return this.issue(u.ID, u.USERNAME, ua, ip);
  }

  private async issue(uid: number, uname: string, ua?: string, ip?: string) {
    const accessToken = await this.jwt.signAsync({ sub: uid, username: uname });
    const refreshToken = crypto.randomBytes(32).toString('hex');
    const expires = new Date(now().getTime() + this.refreshTtlMs);
    await this.db.query(
      `INSERT INTO SESSIONS(USER_ID, RT_HASH, EXPIRES_AT, USER_AGENT, IP) VALUES (:uid, :h, :exp, :ua, :ip)`,
      { uid, h: sha256(refreshToken), exp: expires, ua, ip },
    );
    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.accessTtl,
    };
  }

  async refresh(refreshToken: string, ua?: string, ip?: string) {
    const h = sha256(refreshToken);
    const row = await this.db.query<any>(
      `SELECT S.ID, S.USER_ID, U.USERNAME, S.EXPIRES_AT, S.REVOKED_AT FROM SESSIONS S JOIN USERS U ON U.ID=S.USER_ID WHERE S.RT_HASH=:h`,
      { h },
    );
    const s = row.rows?.[0] as any;
    if (!s || s.REVOKED_AT || new Date(s.EXPIRES_AT) < now())
      throw new UnauthorizedException('Expired');
    // rotate
    await this.db.query(
      `UPDATE SESSIONS SET REVOKED_AT=SYSTIMESTAMP WHERE ID=:id`,
      { id: s.ID },
    );
    return this.issue(s.USER_ID, s.USERNAME, ua, ip);
  }

  async logout(refreshToken: string) {
    await this.db.query(
      `UPDATE SESSIONS SET REVOKED_AT=SYSTIMESTAMP WHERE RT_HASH=:h`,
      { h: sha256(refreshToken) },
    );
  }

  async introspect(token: string) {
    try {
      const p = this.jwt.verify(token);
      return {
        active: true,
        sub: p.sub,
        username: p.username,
        iat: p.iat,
        exp: p.exp,
      };
    } catch {
      return { active: false };
    }
  }
}
