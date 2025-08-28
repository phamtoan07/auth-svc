import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { SessionStore } from './session.store';

@Module({
  providers: [AuthService, SessionStore],
  controllers: [AuthController],
})
export class AuthModule {}
