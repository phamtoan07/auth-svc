import { Body, Controller, Get, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private as: AuthService) {}

  @Post('authorize-url') async authorizeUrl(@Body() b:{state:string, challenge:string}) {
    return { url: await this.as.authorizeUrl(b.state, b.challenge) };
  }

  @Post('exchange') async exchange(@Body() b:{code:string, verifier:string}) {
    return await this.as.exchange(b.code, b.verifier);
  }

  @Post('userinfo') async userinfo(@Body() b:{sid:string}) {
    return await this.as.userinfo(b.sid);
  }

  @Post('token') async token(@Body() b:{sid:string, aud:string}) {
    return await this.as.token(b.sid, b.aud);
  }

  @Get('/.well-known/jwks.json') async jwks() {
    return await this.as.jwks();
  }
}
