import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ✅ Global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // ✅ Robust CORS: Explicitly allow the 127.0.0.1 origin
  app.enableCors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // ❗ Raw body for Paystack webhook
  app.use(
    '/payments/paystack/webhook',
    bodyParser.raw({ type: 'application/json' }),
  );

  const port = process.env.PORT || 3001;
  // Listening on 0.0.0.0 makes it accessible on the local network/IP
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Backend running on http://127.0.0.1:${port}`);
}

bootstrap();