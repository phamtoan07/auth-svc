import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';


export interface UserRow { ID: number; USERNAME: string; PASSWORD_HASH: string; STATUS: string; }


@Injectable()
export class UsersService {
constructor(private readonly db: DbService) {}


async findByUsername(username: string): Promise<UserRow | null> {
const sql = `SELECT ID, USERNAME, PASSWORD_HASH, STATUS FROM USERS WHERE USERNAME = :u`;
const r = await this.db.query<UserRow>(sql, { u: username });
return (r.rows && r.rows[0]) as any || null;
}


async markLastLogin(id: number) {
await this.db.query(`UPDATE USERS SET LAST_LOGIN_AT = SYSTIMESTAMP, UPDATED_AT = SYSTIMESTAMP WHERE ID = :id`, { id });
}
}