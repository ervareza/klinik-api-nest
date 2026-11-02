import { INestApplication, ValidationError, ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { ProblemDetailsFilter } from './common/problem-details.filter';
import { FieldError, ProblemException } from './common/problem.exception';

function flatten(errors: ValidationError[], parent = ''): FieldError[] {
  return errors.flatMap((e) => {
    const field = parent ? `${parent}.${e.property}` : e.property;
    const own = Object.values(e.constraints ?? {}).map((message) => ({ field, message }));
    return [...own, ...flatten(e.children ?? [], field)];
  });
}

/** Konfigurasi global yang dipakai bersama oleh aplikasi, test, dan ekspor OpenAPI. */
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) =>
        new ProblemException(400, 'VALIDATION_ERROR', 'Validasi gagal', 'Satu atau lebih field tidak valid.', flatten(errors)),
    }),
  );
  app.useGlobalFilters(new ProblemDetailsFilter());
}

export function buildOpenApi(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('Klinik REST API')
    .setDescription(
      'REST API sistem klinik: pasien, dokter, dan janji temu. Error memakai RFC 9457 Problem Details.',
    )
    .setVersion('1.0.0')
    .setContact('Ervareza Naurian Novantila', '', '')
    .addServer('http://localhost:3000', 'Lokal')
    .build();
  return SwaggerModule.createDocument(app, config);
}
