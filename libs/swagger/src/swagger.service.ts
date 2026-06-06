import type { INestApplication } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import {
  DocumentBuilder,
  SwaggerModule as OpenApiModule,
} from '@nestjs/swagger';

@Injectable()
export class SwaggerService {
  setup(app: INestApplication): string {
    const path = process.env.SWAGGER_PATH ?? 'docs';
    const config = new DocumentBuilder()
      .setTitle('Basic Nest Auth API')
      .setDescription('Authentication API documentation')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = OpenApiModule.createDocument(app, config, {
      deepScanRoutes: true,
    });

    OpenApiModule.setup(path, app, document, {
      customSiteTitle: 'Basic Nest Auth API',
      swaggerOptions: {
        persistAuthorization: true,
      },
    });

    return path;
  }
}
