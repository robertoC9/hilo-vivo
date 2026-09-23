import { z } from 'zod';

const cleanText = (value) => String(value ?? '').trim();

export const orderItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().int().min(1).max(20),
});

export const shippingAddressSchema = z.object({
  line1: z.string().trim().min(3).max(160),
  line2: z.string().trim().max(160).optional().default(''),
  city: z.string().trim().min(2).max(80),
  region: z.string().trim().min(2).max(80),
  postalCode: z.string().trim().min(3).max(20),
  country: z.string().trim().length(2).default('CL'),
  phone: z.string().trim().max(30).optional().default(''),
}).strict();

export const createOrderSchema = z.object({
  customerName: z.string().trim().min(2).max(120),
  customerEmail: z.string().trim().email().max(254),
  shippingAddress: shippingAddressSchema,
  items: z.array(orderItemSchema).min(1).max(50),
  notes: z.string().trim().max(500).optional().default(''),
}).strict();

export const newsletterSchema = z.object({
  email: z.string().trim().email().max(254),
}).strict();

export function parseBody(schema, body) {
  const result = schema.safeParse(body);
  if (result.success) return result.data;

  const error = new Error('Los datos enviados no son válidos.');
  error.statusCode = 400;
  error.details = result.error.issues.map((issue) => ({ path: issue.path, message: issue.message }));
  throw error;
}

export { cleanText };
