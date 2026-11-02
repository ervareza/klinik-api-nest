import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { buildOpenApi, configureApp } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  SwaggerModule.setup('docs', app, buildOpenApi(app));
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  console.log(`API: http://localhost:${port}/api/v1 | Swagger UI: http://localhost:${port}/docs`);
}

void bootstrap();
