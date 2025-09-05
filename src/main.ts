import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

async function bootstrap() {
  const envPath = fs.existsSync(path.resolve(process.cwd(), '.env')) ? path.resolve(process.cwd(), '.env') : path.resolve(__dirname, '..', '.env');
  dotenv.config({ path: envPath });

  const httpsOptions = {
    // key: fs.readFileSync(process.env.MTLS_KEY),
    // cert: fs.readFileSync(process.env.MTLS_CERT),
    // ca: fs.readFileSync(process.env.MTLS_CA),
    // requestCert: true,
    // rejectUnauthorized: true,
  };
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT || 8443);
}
bootstrap();
