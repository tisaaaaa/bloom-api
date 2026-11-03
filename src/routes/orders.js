import { Router } from 'express';
import { HttpError } from '../errors.js';
import { createOrderBody, idParam } from '../validation.js';

async function findOrder(db, id) {
  const { rows } = await db.query(
    `SELECT o.id, o.customer_email, o.status, o.total_cents, o.created_at,
            json_agg(json_build_object(
              'productId', p.id,
              'name', p.name,
              'emoji', p.emoji,
              'quantity', oi.quantity,
              'unitPrice', oi.unit_price_cents / 100.0
            ) ORDER BY p.id) AS items
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       JOIN products p ON p.id = oi.product_id
      WHERE o.id = $1
      GROUP BY o.id`,
    [id],
  );
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    id: row.id,
    email: row.customer_email,
    status: row.status,
    total: row.total_cents / 100,
    createdAt: row.created_at,
    items: row.items,
  };
}

export function ordersRouter(db) {
  const router = Router();

  router.post('/', async (req, res) => {
    const { email, items } = createOrderBody.parse(req.body);

    // Se lo stesso prodotto compare più volte, sommo le quantità
    const quantities = new Map();
    for (const { productId, quantity } of items) {
      quantities.set(productId, (quantities.get(productId) ?? 0) + quantity);
    }
    const ids = [...quantities.keys()].sort((a, b) => a - b);

    const order = await db.withTransaction(async (tx) => {
      // FOR UPDATE blocca le righe: due ordini simultanei non possono vendere la stessa scorta.
      // L'ordinamento per id evita deadlock tra transazioni concorrenti.
      const { rows: products } = await tx.query(
        `SELECT id, name, price_cents, stock
           FROM products
          WHERE id = ANY($1::int[]) AND is_active
          ORDER BY id
            FOR UPDATE`,
        [ids],
      );

      const found = new Set(products.map((p) => p.id));
      const missing = ids.filter((id) => !found.has(id));
      if (missing.length > 0) {
        throw new HttpError(404, 'Alcuni prodotti non esistono', { productIds: missing });
      }

      const outOfStock = products
        .filter((p) => p.stock < quantities.get(p.id))
        .map((p) => ({ productId: p.id, name: p.name, available: p.stock, requested: quantities.get(p.id) }));
      if (outOfStock.length > 0) {
        throw new HttpError(409, 'Scorte insufficienti', outOfStock);
      }

      const totalCents = products.reduce((sum, p) => sum + p.price_cents * quantities.get(p.id), 0);
      const qty = products.map((p) => quantities.get(p.id));

      const { rows: [created] } = await tx.query(
        'INSERT INTO orders (customer_email, total_cents) VALUES ($1, $2) RETURNING id',
        [email, totalCents],
      );

      // unnest inserisce tutte le righe con una sola query
      await tx.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price_cents)
         SELECT $1::int, * FROM unnest($2::int[], $3::int[], $4::int[])`,
        [created.id, ids, qty, products.map((p) => p.price_cents)],
      );

      await tx.query(
        `UPDATE products p
            SET stock = p.stock - v.qty
           FROM unnest($1::int[], $2::int[]) AS v(id, qty)
          WHERE p.id = v.id`,
        [ids, qty],
      );

      return findOrder(tx, created.id);
    });

    res.status(201).location(`/orders/${order.id}`).json(order);
  });

  router.get('/:id', async (req, res) => {
    const order = await findOrder(db, idParam.parse(req.params.id));
    if (!order) throw new HttpError(404, 'Ordine non trovato');
    res.json(order);
  });

  return router;
}
