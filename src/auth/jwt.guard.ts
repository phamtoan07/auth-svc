import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const h = req.headers['authorization'];
    if (!h || !h.startsWith('Bearer '))
      throw new UnauthorizedException('No token');
    try {
      const payload = this.jwt.verify(h.slice(7));
      req.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Bad token');
    }
  }
}
