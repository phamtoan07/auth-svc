import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';

export interface UserRow {
  ID: number;
  USERNAME: string;
  PASSWORD_HASH: string;
  STATUS: string;
}

@Injectable()
export class UsersService {
  constructor(private readonly db: DbService) {}

  async findByUsername(
    username: string,
    password: string,
  ): Promise<UserRow | null> {
    const sql = `SELECT USERNAME, STATUS FROM USERLOGIN WHERE USERNAME = :u AND genencryptpassword(:p) = LOGINPWD AND STATUS = 'A'`;
    const r = await this.db.query<UserRow>(sql, { u: username, p: password });
    console.log(r);
    return ((r.rows && r.rows[0]) as any) || null;
  }

  async markLastLogin(id: number) {
    await this.db.query(
      `UPDATE USERS SET LAST_LOGIN_AT = SYSTIMESTAMP, UPDATED_AT = SYSTIMESTAMP WHERE ID = :id`,
      { id },
    );
  }
}
