import 'dotenv/config';
import { SwaggerService } from '@app/swagger';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const port = process.env.PORT ?? 3000;
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  const swaggerPath = app.get(SwaggerService).setup(app);

  await app.listen(port);
  logger.log(`Server is running on port: ${port}`);
  logger.log(`Swagger docs: http://localhost:${port}/${swaggerPath}`);
}
void bootstrap();
