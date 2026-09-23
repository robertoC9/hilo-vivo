import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { query } from './db.js';
import { asyncHandler } from './utils/async-handler.js';
import { errorHandler, notFound } from './middleware/error-handler.js';
import productsRouter from './routes/products.js';
import ordersRouter from './routes/orders.js';
import paymentsRouter from './routes/payments.js';
import newsletterRouter from './routes/newsletter.js';

const app = express();
const allowedOrigins = new Set(
  [config.clientUrl, config.publicUrl]
    .filter(Boolean)
    .map((origin) => origin.replace(/\/$/, '')),
);

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin.replace(/\/$/, ''))) return callback(null, true);
      return callback(new Error('Origen no permitido por CORS.'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
  }),
);
app.use(express.json({ limit: '64kb' }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: (request) => request.path.includes('/webhooks/'),
});
app.use('/api', apiLimiter);

app.get(
  '/health',
  asyncHandler(async (request, response) => {
    await query('SELECT 1');
    response.json({ status: 'ok', service: 'hilo-vivo-api' });
  }),
);

app.get('/api/health', (request, response) => {
  response.json({ status: 'ok', service: 'hilo-vivo-api' });
});

app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api', paymentsRouter);
app.use('/api/newsletter', newsletterRouter);

app.use(notFound);
app.use(errorHandler);

export default app;
