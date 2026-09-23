BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 160),
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL CHECK (char_length(category) BETWEEN 2 AND 80),
  origin TEXT NOT NULL DEFAULT 'Alhué, Chile',
  material TEXT NOT NULL DEFAULT '',
  price_clp INTEGER NOT NULL CHECK (price_clp >= 0),
  image_url TEXT,
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  public_token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL CHECK (char_length(customer_name) BETWEEN 2 AND 120),
  customer_email TEXT NOT NULL CHECK (char_length(customer_email) BETWEEN 5 AND 254),
  shipping_address JSONB NOT NULL CHECK (jsonb_typeof(shipping_address) = 'object'),
  notes TEXT NOT NULL DEFAULT '',
  total_clp INTEGER NOT NULL CHECK (total_clp >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'CLP',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled', 'failed', 'refunded')),
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  sku TEXT NOT NULL,
  product_name TEXT NOT NULL,
  unit_price_clp INTEGER NOT NULL CHECK (unit_price_clp >= 0),
  quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 20),
  line_total_clp INTEGER GENERATED ALWAYS AS (unit_price_clp * quantity) STORED
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'mercadopago',
  provider_preference_id TEXT,
  provider_payment_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'authorized', 'approved', 'rejected', 'cancelled', 'refunded', 'charged_back')),
  amount_clp INTEGER NOT NULL CHECK (amount_clp >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'CLP',
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_payment_id)
);

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS provider_preference_id TEXT;

CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE CHECK (char_length(email) BETWEEN 5 AND 254),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS products_category_idx ON products(category) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS products_active_idx ON products(is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items(order_id);
CREATE INDEX IF NOT EXISTS payments_order_idx ON payments(order_id);
CREATE INDEX IF NOT EXISTS payments_provider_id_idx ON payments(provider, provider_payment_id);
CREATE UNIQUE INDEX IF NOT EXISTS payments_order_provider_unique_idx ON payments(order_id, provider);
CREATE UNIQUE INDEX IF NOT EXISTS payments_provider_preference_unique_idx ON payments(provider, provider_preference_id) WHERE provider_preference_id IS NOT NULL;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS products_set_updated_at ON products;
CREATE TRIGGER products_set_updated_at
BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS orders_set_updated_at ON orders;
CREATE TRIGGER orders_set_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS payments_set_updated_at ON payments;
CREATE TRIGGER payments_set_updated_at
BEFORE UPDATE ON payments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS newsletter_set_updated_at ON newsletter_subscriptions;
CREATE TRIGGER newsletter_set_updated_at
BEFORE UPDATE ON newsletter_subscriptions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
