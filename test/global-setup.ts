import { DataSource } from 'typeorm';

/** Menyiapkan schema database test lewat migration, sama seperti produksi. */
export default async function globalSetup() {
  process.env.NODE_ENV = 'test';
  const { databaseOptions } = await import('../src/database/data-source');
  const ds = new DataSource(databaseOptions());
  await ds.initialize();
  await ds.runMigrations();
  await ds.destroy();
}
