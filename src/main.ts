import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { setupSwagger } from './config/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  const config = app.get(ConfigService);
  const prefix = config.get<string>('apiPrefix', 'api/v1');

  app.use(
    helmet({
      contentSecurityPolicy: config.get('nodeEnv') === 'production',
      crossOriginEmbedderPolicy: false,
    }),
  );

  const corsOrigins = config.get<string[]>('corsOrigins', ['*']);
  const allowAllOrigins = corsOrigins.includes('*');
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (allowAllOrigins || !origin || corsOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  });

  app.setGlobalPrefix(prefix);
  app.enableShutdownHooks();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  setupSwagger(app);

  const tcpHost = config.get<string>('tcp.host', '0.0.0.0');
  const tcpPort = config.get<number>('tcp.port', 4004);
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: { host: tcpHost, port: tcpPort },
  });

  await app.startAllMicroservices();
  const port = config.get<number>('port', 3004);
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`realtime-service listening on http://localhost:${port}/${prefix}`);
  // eslint-disable-next-line no-console
  console.log(`Socket.IO:         http://localhost:${port}/socket.io`);
  // eslint-disable-next-line no-console
  console.log(`Nest TCP:          ${tcpHost}:${tcpPort}`);
  // eslint-disable-next-line no-console
  console.log(`Swagger UI:        http://localhost:${port}/docs`);
}

bootstrap();
