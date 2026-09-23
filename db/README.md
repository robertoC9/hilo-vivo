# Base de datos Hilo Vivo

La base utiliza PostgreSQL 18 y el esquema `public`.

## Estructura

- `products`: catálogo y control de stock.
- `orders`: pedidos y estado de la orden.
- `order_items`: productos y precios congelados por pedido.
- `payments`: preferencias y estados de Mercado Pago.
- `newsletter_subscriptions`: suscripciones al boletín.

## Comandos

Configura `DATABASE_URL` en `.env` y ejecuta:

```bash
npm run db:migrate
npm run db:seed
```

`db/schema.sql` es idempotente: puede ejecutarse nuevamente para crear índices o funciones faltantes. `db/seed.sql` actualiza el catálogo sin reiniciar el stock existente.
