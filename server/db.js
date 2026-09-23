import pg from 'pg';
import { config } from './config.js';

const { Pool } = pg;
let pool;

export function getPool() {
  if (pool) return pool;
  if (!config.databaseUrl) {
    const error = new Error('La conexión de base de datos no está configurada.');
    error.statusCode = 503;
    throw error;
  }

  pool = new Pool({
    connectionString: config.databaseUrl,
    ssl: config.databaseSsl ? { rejectUnauthorized: false } : undefined,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

  pool.on('error', (error) => {
    console.error('[db] Error inesperado del pool:', error.message);
  });

  return pool;
}

export function query(text, params = []) {
  return getPool().query(text, params);
}

export async function withTransaction(callback) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
