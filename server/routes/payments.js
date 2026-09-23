import { Router } from 'express';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { config, requireConfig } from '../config.js';
import { getPool, query, withTransaction } from '../db.js';
import { asyncHandler } from '../utils/async-handler.js';

const router = Router();
const orderIdSchema = z.string().uuid();

function parseSignature(header) {
  return Object.fromEntries(
    header.split(',').map((part) => {
      const [key, value] = part.split('=');
      return [key.trim(), value.trim()];
    }),
  );
}

function verifyWebhookSignature(request) {
  const signatureHeader = request.get('x-signature');
  const requestId = request.get('x-request-id');
  const dataId = request.body?.data?.id ?? request.query['data.id'] ?? request.query.id;
  if (!signatureHeader || !requestId || !dataId) return false;

  const signature = parseSignature(signatureHeader);
  if (!signature.ts || !signature.v1) return false;
  const manifest = `id:${dataId};request-id:${requestId};ts:${signature.ts};`;
  const expected = createHmac('sha256', config.mercadoPagoWebhookSecret)
    .update(manifest)
    .digest('hex');
  const received = Buffer.from(signature.v1, 'utf8');
  const calculated = Buffer.from(expected, 'utf8');
  return received.length === calculated.length && timingSafeEqual(received, calculated);
}

function mapOrderStatus(paymentStatus) {
  if (paymentStatus === 'approved') return 'paid';
  if (paymentStatus === 'cancelled') return 'cancelled';
  if (paymentStatus === 'rejected' || paymentStatus === 'charged_back') return 'failed';
  if (paymentStatus === 'refunded') return 'refunded';
  return 'pending';
}

async function getOrderWithToken(orderId, publicToken, client = getPool()) {
  const orderResult = await client.query(
    `SELECT id, order_number, public_token, customer_name, customer_email, status, total_clp, currency
     FROM orders
     WHERE id = $1 AND public_token = $2
     LIMIT 1`,
    [orderId, publicToken],
  );
  if (!orderResult.rowCount) return null;

  const itemsResult = await client.query(
    `SELECT sku, product_name, unit_price_clp, quantity
     FROM order_items
     WHERE order_id = $1
     ORDER BY id`,
    [orderId],
  );
  return { order: orderResult.rows[0], items: itemsResult.rows };
}

router.post(
  '/orders/:orderId/payment',
  asyncHandler(async (request, response) => {
    requireConfig('mercadoPagoAccessToken');
    const parsedId = orderIdSchema.safeParse(request.params.orderId);
    if (!parsedId.success) return response.status(400).json({ error: 'Identificador de pedido inválido.' });

    const publicToken = request.get('x-order-token')?.trim();
    if (!publicToken) return response.status(401).json({ error: 'Falta el token del pedido.' });

    const orderData = await getOrderWithToken(parsedId.data, publicToken);
    if (!orderData) return response.status(404).json({ error: 'Pedido no encontrado.' });
    if (orderData.order.status !== 'pending') {
      return response.status(409).json({ error: 'El pedido ya no está disponible para pagar.' });
    }

    const preferencePayload = {
      items: orderData.items.map((item) => ({
        title: item.product_name,
        unit_price: Number(item.unit_price_clp),
        quantity: item.quantity,
        currency_id: 'CLP',
      })),
      payer: {
        name: orderData.order.customer_name,
        email: orderData.order.customer_email,
      },
      external_reference: orderData.order.order_number,
      back_urls: {
        success: `${config.clientUrl}/?checkout=success&order=${orderData.order.order_number}`,
        pending: `${config.clientUrl}/?checkout=pending&order=${orderData.order.order_number}`,
        failure: `${config.clientUrl}/?checkout=failure&order=${orderData.order.order_number}`,
      },
      auto_return: 'approved',
      notification_url: `${config.publicUrl}/api/webhooks/mercadopago`,
      metadata: { order_id: orderData.order.id },
    };

    const mercadoPagoResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.mercadoPagoAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preferencePayload),
    });
    const preference = await mercadoPagoResponse.json();
    if (!mercadoPagoResponse.ok) {
      const error = new Error('Mercado Pago no pudo crear la preferencia de pago.');
      error.statusCode = 502;
      error.details = preference;
      throw error;
    }

    await query(
      `INSERT INTO payments
        (order_id, provider, provider_preference_id, status, amount_clp, currency, raw_payload)
       VALUES ($1, 'mercadopago', $2, 'pending', $3, 'CLP', $4::jsonb)
       ON CONFLICT (order_id, provider) DO UPDATE
         SET provider_preference_id = EXCLUDED.provider_preference_id,
             raw_payload = EXCLUDED.raw_payload,
             updated_at = now()`,
      [orderData.order.id, preference.id, orderData.order.total_clp, JSON.stringify(preference)],
    );

    return response.status(201).json({
      preference: {
        id: preference.id,
        initPoint: preference.init_point,
        sandboxInitPoint: preference.sandbox_init_point,
      },
    });
  }),
);

router.post(
  '/webhooks/mercadopago',
  asyncHandler(async (request, response) => {
    requireConfig('mercadoPagoWebhookSecret', 'mercadoPagoAccessToken');
    if (!verifyWebhookSignature(request)) {
      return response.status(401).json({ error: 'Firma de webhook inválida.' });
    }

    const paymentId = request.body?.data?.id ?? request.query['data.id'] ?? request.query.id;
    const mercadoPagoResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${config.mercadoPagoAccessToken}` },
    });
    const payment = await mercadoPagoResponse.json();
    if (!mercadoPagoResponse.ok) return response.status(502).json({ error: 'No se pudo consultar el pago.' });
    if (!payment.external_reference) return response.status(202).json({ received: true });

    const orderStatus = mapOrderStatus(payment.status);
    await withTransaction(async (client) => {
      const orderResult = await client.query(
        `SELECT id FROM orders WHERE order_number = $1 FOR UPDATE`,
        [payment.external_reference],
      );
      if (!orderResult.rowCount) return;
      const orderId = orderResult.rows[0].id;

      await client.query(
        `UPDATE payments
         SET provider_payment_id = $1,
             status = $2,
             amount_clp = $3,
             raw_payload = $4::jsonb,
             updated_at = now()
         WHERE order_id = $5 AND provider = 'mercadopago'`,
        [payment.id, payment.status, payment.transaction_amount, JSON.stringify(payment), orderId],
      );
      await client.query('UPDATE orders SET status = $1 WHERE id = $2', [orderStatus, orderId]);
    });

    return response.json({ received: true });
  }),
);

export default router;
