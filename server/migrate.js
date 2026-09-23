import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { closePool, query } from './db.js';

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(currentDirectory, '..', 'db', 'schema.sql');

try {
  const schema = await readFile(schemaPath, 'utf8');
  await query(schema);
  console.log('Base de datos hilo_vivo actualizada correctamente.');
} finally {
  await closePool();
}
