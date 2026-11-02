import { NestFactory } from '@nestjs/core';
import { writeFileSync } from 'node:fs';
import * as yaml from 'js-yaml';
import { AppModule } from './app.module';
import { buildOpenApi, configureApp } from './app.setup';

async function main() {
  const app = await NestFactory.create(AppModule, { logger: false });
  configureApp(app);
  writeFileSync('openapi.yaml', yaml.dump(buildOpenApi(app), { noRefs: true, lineWidth: 120 }));
  await app.close();
  console.log('openapi.yaml ditulis');
}

void main();
