import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Nearo Realtime Service API')
    .setDescription(
      `
## Overview
Socket.IO fan-out for job status. Request-service emits Nest TCP \`job.status\`. This process pushes the event to connected apps and to registered device tokens.

There is no public send-notification API. Job writes stay in request-service.

## Ports
| | |
|--|--|
| HTTP + Socket.IO | **3004** |
| Nest TCP | **4004** |
| Health | \`GET /api/v1/health\` |
| Swagger | \`/docs\` |
      `.trim(),
    )
    .setVersion('1.0.0')
    .addServer('http://localhost:3004', 'Local development')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Same JWT as auth-service',
      },
      'JWT',
    )
    .addTag('health', 'Service liveness')
    .addTag('realtime', 'Socket presence for the signed-in user')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
    customSiteTitle: 'Nearo Realtime Service Docs',
    jsonDocumentUrl: 'docs-json',
  });
  return document;
}
