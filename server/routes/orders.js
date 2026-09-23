import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import { getPool, query, withTransaction } from '../db.js';
import { asyncHandler } from '../utils/async-handler.js';
import { createOrderSchema, parseBody } from '../validation.js';

const router = Router();

function createOrderNumber() {
  const date = new Date().toISOString().slice(2, 10).replaceAll('-', '');
  return `HV-${date}-${randomBytes(3).toString('hex').toUpperCase()}`;
}

function serializeOrder(row, items = []) {
  return {
    id: row.id,
    orderNumber: row.order_number,
    publicToken: row.public_token,
    status: row.status,
    totalClp: Number(row.total_clp),
    currency: row.currency,
    createdAt: row.created_at,
    items: items.map((item) => ({
      id: item.id,
      productId: item.product_id,
      sku: item.sku,
      name: item.product_name,
      quantity: item.quantity,
      unitPriceClp: Number(item.unit_price_clp),
      lineTotalClp: Number(item.line_total_clp),
    })),
  };
}

async function loadOrder(client, orderId, publicToken) {
  const orderResult = await client.query(
    `SELECT id, order_number, public_token, status, total_clp, currency, created_at
     FROM orders
     WHERE id = $1 AND public_token = $2
     LIMIT 1`,
    [orderId, publicToken],
  );
  if (!orderResult.rowCount) return null;

  const itemsResult = await client.query(
    `SELECT id, product_id, sku, product_name, unit_price_clp, quantity, line_total_clp
     FROM order_items
     WHERE order_id = $1
     ORDER BY id`,
    [orderId],
  );
  return serializeOrder(orderResult.rows[0], itemsResult.rows);
}

router.post(
  '/',
  asyncHandler(async (request, response) => {
    const payload = parseBody(createOrderSchema, request.body);
    const idempotencyKey = request.get('idempotency-key')?.trim() || null;
    const quantities = new Map();
    payload.items.forEach((item) => {
      quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
    });
    const productIds = [...quantities.keys()];

    const result = await withTransaction(async (client) => {
      if (idempotencyKey) {
        const existing = await client.query(
          `SELECT id, order_number, public_token, status, total_clp, currency, created_at
           FROM orders
           WHERE idempotency_key = $1
           LIMIT 1`,
          [idempotencyKey],
        );
        if (existing.rowCount) {
          const items = await client.query(
            `SELECT id, product_id, sku, product_name, unit_price_clp, quantity, line_total_clp
             FROM order_items WHERE order_id = $1 ORDER BY id`,
            [existing.rows[0].id],
          );
          return { order: serializeOrder(existing.rows[0], items.rows), created: false };
        }
      }

      const productsResult = await client.query(
        `SELECT id, sku, name, price_clp, stock, is_active
         FROM products
         WHERE id = ANY($1::uuid[])
         FOR UPDATE`,
        [productIds],
      );
      const products = new Map(productsResult.rows.map((product) => [product.id, product]));

      if (products.size !== productIds.length) {
        const error = new Error('Uno o más productos no existen.');
        error.statusCode = 400;
        throw error;
      }

      let totalClp = 0;
      for (const [productId, quantity] of quantities) {
        const product = products.get(productId);
        if (!product.is_active || product.stock < quantity) {
          const error = new Error(`No hay stock suficiente para ${product.name}.`);
          error.statusCode = 409;
          throw error;
        }
        totalClp += product.price_clp * quantity;
      }

      const orderResult = await client.query(
        `INSERT INTO orders
          (order_number, customer_name, customer_email, shipping_address, notes, total_clp, idempotency_key)
         VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7)
         RETURNING id, order_number, public_token, status, total_clp, currency, created_at`,
        [
          createOrderNumber(),
          payload.customerName,
          payload.customerEmail.toLowerCase(),
          JSON.stringify(payload.shippingAddress),
          payload.notes,
          totalClp,
          idempotencyKey,
        ],
      );
      const order = orderResult.rows[0];
      const orderItems = [];

      for (const [productId, quantity] of quantities) {
        const product = products.get(productId);
        const itemResult = await client.query(
          `INSERT INTO order_items
            (order_id, product_id, sku, product_name, unit_price_clp, quantity)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id, product_id, sku, product_name, unit_price_clp, quantity, line_total_clp`,
          [order.id, product.id, product.sku, product.name, product.price_clp, quantity],
        );
        await client.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [quantity, product.id]);
        orderItems.push(itemResult.rows[0]);
      }

      return { order: serializeOrder(order, orderItems), created: true };
    });

    response.status(result.created ? 201 : 200).json(result.order);
  }),
);

router.get(
  '/:orderId',
  asyncHandler(async (request, response) => {
    const publicToken = request.get('x-order-token')?.trim();
    if (!publicToken) return response.status(401).json({ error: 'Falta el token del pedido.' });

    const order = await loadOrder(getPool(), request.params.orderId, publicToken);
    if (!order) return response.status(404).json({ error: 'Pedido no encontrado.' });
    return response.json({ order });
  }),
);

export { loadOrder };
export default router;
