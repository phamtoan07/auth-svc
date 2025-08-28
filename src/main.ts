import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as fs from 'fs';

async function bootstrap() {
  const httpsOptions = {
    key: fs.readFileSync(process.env.MTLS_KEY),
    cert: fs.readFileSync(process.env.MTLS_CERT),
    ca: fs.readFileSync(process.env.MTLS_CA),
    requestCert: true,
    rejectUnauthorized: true,
  };
  const app = await NestFactory.create(AppModule, { httpsOptions });
  await app.listen(process.env.PORT || 8443);
}
bootstrap();
