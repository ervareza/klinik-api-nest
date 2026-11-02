# Klinik REST API

REST API sistem klinik untuk mengelola **pasien**, **dokter**, dan **janji temu**.
Dibangun dengan NestJS, TypeORM, dan PostgreSQL. Tugas mata kuliah API Development dan Microservices.

- **Nama:** Ervareza Naurian Novantila
- **NIM:** 24.01.53.0018
- **Prodi:** Teknik Informatika

## Fitur

- CRUD modular: Controller, Service, Repository, DTO, Module, dengan dependency injection.
- Validasi input lewat DTO dan `ValidationPipe`.
- Filtering, sorting stabil (tie-breaker `id`), dan offset pagination.
- `ETag` dan `If-Match` untuk mencegah lost update pada data pasien.
- Error konsisten dengan RFC 9457 Problem Details lewat Exception Filter.
- Migration, constraint database, dan transaksi commit/rollback saat memesan janji temu.
- Dokumentasi OpenAPI, Swagger UI, serta unit, integration, E2E, dan Newman test.

Autentikasi tidak termasuk cakupan tugas ini, sehingga endpoint belum dilindungi login.

## Menjalankan

Butuh Node.js 22 dan PostgreSQL.

```bash
npm install
cp .env.example .env            # sesuaikan user dan password database
createdb klinik_api
npm run migration:run
npm run seed
npm run start:dev
```

- API: <http://localhost:3000/api/v1>
- Swagger UI: <http://localhost:3000/docs>
- Spesifikasi: [`openapi.yaml`](openapi.yaml)

## Pengujian

Buat `.env.test` dengan isi seperti `.env`, tetapi `DB_NAME=klinik_api_test`, lalu buat databasenya.

```bash
createdb klinik_api_test
npm test                  # unit test
npm run test:integration  # repository + PostgreSQL
npm run test:e2e          # HTTP sampai database
npm run seed && npm run test:newman   # Postman Collection, server harus aktif
```

## Endpoint

| Method | URI | Keterangan |
| --- | --- | --- |
| GET, POST | `/api/v1/patients` | Daftar dan tambah pasien |
| GET, PUT, PATCH, DELETE | `/api/v1/patients/{id}` | Detail, ganti, ubah sebagian, hapus pasien |
| GET, POST | `/api/v1/doctors` | Daftar dan tambah dokter |
| GET, PUT, DELETE | `/api/v1/doctors/{id}` | Detail, ganti, hapus dokter |
| GET, POST | `/api/v1/appointments` | Daftar dan pesan janji temu |
| GET, PATCH, DELETE | `/api/v1/appointments/{id}` | Detail, ubah status, hapus janji temu |

## Struktur

```text
src/
  common/        Problem Details, ETag, pagination, pipe ID
  database/      data source, migration, seed
  patients/      controller, service, repository, DTO, entity, module
  doctors/       idem
  appointments/  idem, termasuk transaksi pemesanan
test/
  integration/   repository dan constraint pada PostgreSQL
  e2e/           skenario HTTP lengkap
postman/         Postman Collection
evidence/        hasil nyata cURL, log transaksi, screenshot
reports/         hasil test dalam JSON
```
