import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
const compression = require('compression');
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('RetailOS-API');

  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: '*',
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      credentials: true,
    },
  });

  // Security & Performance Middlewares
  app.use(helmet());
  app.use(compression());

  // Global Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Global Prefix (exclui /health e /internal/jobs para compatibilidade com Render & Crons)
  app.setGlobalPrefix('api/v1', {
    exclude: ['health', 'health/(.*)', 'internal/(.*)'],
  });

  // Swagger Documentation
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Retail OS API')
      .setDescription('Documentação da API Modular Monolith para Gestão de Lojas de Conveniência e Varejo')
      .setVersion('1.0.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
    logger.log('📄 Swagger docs disponível em: /docs');
  }

  // Graceful Shutdown para o Render
  app.enableShutdownHooks();

  const port = process.env.PORT || 4000;
  const host = process.env.HOST || '0.0.0.0';

  await app.listen(port, host);
  logger.log(`🚀 Retail OS API em execução em http://${host}:${port}`);
}

bootstrap();
