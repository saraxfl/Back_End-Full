/* eslint-disable prettier/prettier */


/*
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useStaticAssets(
    join(__dirname, "..", "public"),{
      prefix: "/public/"
    }
  ).useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));;
  const config = new DocumentBuilder().setTitle("Nuestra API")
  .setDescription("Ejemplo de documentación de un REST API en Swagger")
  .setVersion("1.0").build();
  const doc = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("docs", app, doc);
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();*/


/* eslint-disable prettier/prettier */

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { ValidationPipe } from '@nestjs/common';


async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
    app.enableCors({
    origin: 'http://localhost:3001',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Authorization',
    credentials: true,
  });

  

  app.useStaticAssets(
    join(__dirname, "..", "public"),{
      prefix: "/public/"
    }
  ).useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));;
  const config = new DocumentBuilder().setTitle("Nuestra API")
  .setDescription("Ejemplo de documentación de un REST API en Swagger")
  .setVersion("1.0").build();
  const doc = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("docs", app, doc);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();