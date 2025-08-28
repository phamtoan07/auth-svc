import { Injectable } from '@nestjs/common';
import { Issuer, generators, Client } from 'openid-client';
import { SessionStore } from './session.store';
import { createRemoteJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';

type OidcTokens = { refresh_token?: string, access_token?: string, id_token?: string, expires_in?: number };

@Injectable()
export class AuthService {
  private client: Client;
  private issuer: Issuer<Client>;
  private jwk: any; private kid = 'runtime-kid';

  constructor(private store: SessionStore) {}

  async onModuleInit(){
    this.issuer = await Issuer.discover(process.env.OIDC_ISSUER);
    this.client = new this.issuer.Client({
      client_id: process.env.OIDC_CLIENT_ID,
      client_secret: process.env.OIDC_CLIENT_SECRET,
      redirect_uris: [process.env.OIDC_REDIRECT_URI],
      response_types: ['code']
    });
    // ephemeral signing key for demo
    const { privateKey, publicKey } = await generateKeyPair('RS256');
    this.jwk = { privateKey, publicJwk: await exportJWK(publicKey) };
  }

  async authorizeUrl(state: string, challenge: string) {
    const url = this.client.authorizationUrl({
      scope: 'openid profile email',
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256'
    });
    return url;
  }

  async exchange(code: string, verifier: string){
    const tok = await this.client.callback(process.env.OIDC_REDIRECT_URI, { code }, { code_verifier: verifier }) as any as OidcTokens;
    const sid = generators.state();
    await this.store.set(`oidc:${sid}`, tok, 60*60*8);
    const user = await this.client.userinfo(tok.access_token);
    await this.store.set(`user:${sid}`, user, 60*60*8);
    return { sid, user };
  }

  async userinfo(sid: string){
    const tok = await this.store.get<OidcTokens>(`oidc:${sid}`);
    if(!tok) return {};
    try {
      return (await this.store.get(`user:${sid}`)) || await this.client.userinfo(tok.access_token);
    } catch { return {}; }
  }

  async token(sid: string, aud: string){
    // (Optional) refresh here if needed: tok = await this.client.refresh(...)
    const claims = await this.userinfo(sid);
    if(!claims || !claims.sub) throw new Error('invalid sid');
    const now = Math.floor(Date.now()/1000);
    const ttl = parseInt(process.env.JWT_TTL_SEC || '300', 10);
    const jwt = await new SignJWT({ sub: claims.sub, scope: claims['scope'] || '', roles: claims['roles'] || [] })
      .setProtectedHeader({ alg: 'RS256', kid: this.kid })
      .setIssuedAt(now)
      .setIssuer(process.env.JWT_ISS)
      .setAudience(aud)
      .setExpirationTime(now + ttl)
      .sign(this.jwk.privateKey as any);
    return { access_token: jwt, token_type: 'Bearer', expires_in: ttl };
  }

  async jwks(){
    return { keys: [{ ...this.jwk.publicJwk, use: 'sig', kid: this.kid, alg: 'RS256', kty: 'RSA' }] };
  }
}
