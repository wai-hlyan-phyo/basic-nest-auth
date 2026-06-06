import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from '@app/prisma';
import { SwaggerModule } from '@app/swagger';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [PrismaModule, SwaggerModule, AuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
