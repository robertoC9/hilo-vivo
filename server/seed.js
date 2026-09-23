import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { closePool, query } from './db.js';

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const seedPath = join(currentDirectory, '..', 'db', 'seed.sql');

try {
  const seed = await readFile(seedPath, 'utf8');
  await query(seed);
  console.log('Datos iniciales de Hilo Vivo cargados correctamente.');
} finally {
  await closePool();
}
