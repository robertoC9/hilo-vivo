import { Router } from 'express';
import { query } from '../db.js';
import { asyncHandler } from '../utils/async-handler.js';
import { newsletterSchema, parseBody } from '../validation.js';

const router = Router();

router.post(
  '/',
  asyncHandler(async (request, response) => {
    const { email } = parseBody(newsletterSchema, request.body);
    const result = await query(
      `INSERT INTO newsletter_subscriptions (email, is_active)
       VALUES ($1, TRUE)
       ON CONFLICT (email)
       DO UPDATE SET is_active = TRUE
       RETURNING email, is_active`,
      [email.toLowerCase()],
    );

    response.status(201).json({ subscription: result.rows[0] });
  }),
);

export default router;
