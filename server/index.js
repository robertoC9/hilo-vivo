import 'dotenv/config';
import app from './app.js';
import { config } from './config.js';
import { closePool } from './db.js';

const server = app.listen(config.port, '0.0.0.0', () => {
  console.log(`Hilo Vivo API escuchando en http://0.0.0.0:${config.port}`);
});

async function shutdown(signal) {
  console.log(`${signal}: cerrando servidor...`);
  server.close(async () => {
    await closePool();
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
