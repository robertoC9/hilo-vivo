import { Router } from 'express';
import { query } from '../db.js';
import { asyncHandler } from '../utils/async-handler.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (request, response) => {
    const category = typeof request.query.category === 'string' ? request.query.category.trim() : '';
    const search = typeof request.query.search === 'string' ? request.query.search.trim() : '';
    const limit = Math.min(Math.max(Number.parseInt(request.query.limit ?? '24', 10) || 24, 1), 60);
    const offset = Math.max(Number.parseInt(request.query.offset ?? '0', 10) || 0, 0);
    const values = [];
    const conditions = ['is_active = TRUE'];

    if (category) {
      values.push(category);
      conditions.push(`category = $${values.length}`);
    }

    if (search) {
      values.push(`%${search}%`);
      conditions.push(`(name ILIKE $${values.length} OR description ILIKE $${values.length} OR origin ILIKE $${values.length})`);
    }

    const where = conditions.join(' AND ');
    const totalResult = await query(`SELECT COUNT(*)::int AS total FROM products WHERE ${where}`, values);
    values.push(limit, offset);
    const result = await query(
      `SELECT id, sku, slug, name, description, category, origin, material, price_clp, image_url, stock, is_active, created_at, updated_at
       FROM products
       WHERE ${where}
       ORDER BY created_at DESC
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values,
    );

    response.json({ products: result.rows, total: totalResult.rows[0].total, limit, offset });
  }),
);

router.get(
  '/:slug',
  asyncHandler(async (request, response) => {
    const result = await query(
      `SELECT id, sku, slug, name, description, category, origin, material, price_clp, image_url, stock, is_active, created_at, updated_at
       FROM products
       WHERE slug = $1 AND is_active = TRUE
       LIMIT 1`,
      [request.params.slug],
    );

    if (!result.rowCount) {
      return response.status(404).json({ error: 'Producto no encontrado.' });
    }

    return response.json({ product: result.rows[0] });
  }),
);

export default router;
