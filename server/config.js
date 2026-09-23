import 'dotenv/config';

const asBoolean = (value, fallback = false) => {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

export const config = Object.freeze({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3001),
  databaseUrl: process.env.DATABASE_URL ?? '',
  databaseSsl: asBoolean(process.env.DATABASE_SSL, false),
  clientUrl: process.env.CLIENT_URL ?? 'http://localhost:5173',
  publicUrl: process.env.PUBLIC_URL ?? 'http://localhost:3001',
  mercadoPagoAccessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN ?? '',
  mercadoPagoWebhookSecret: process.env.MERCADO_PAGO_WEBHOOK_SECRET ?? '',
});

export function requireConfig(...names) {
  const missing = names.filter((name) => !config[name]);
  if (missing.length) {
    const error = new Error(`Faltan variables de entorno: ${missing.join(', ')}`);
    error.statusCode = 503;
    throw error;
  }
}
