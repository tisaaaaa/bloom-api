import { Router } from 'express';
import { topProductsQuery } from '../validation.js';

export function statsRouter(db) {
  const router = Router();

  // Prodotti più venduti (esclusi gli ordini annullati)
  router.get('/top-products', async (req, res) => {
    const { limit } = topProductsQuery.parse(req.query);
    const { rows } = await db.query(
      `SELECT p.id, p.name, p.emoji,
              SUM(oi.quantity)::int AS "unitsSold",
              (SUM(oi.quantity * oi.unit_price_cents) / 100.0)::float AS revenue
         FROM order_items oi
         JOIN orders o   ON o.id = oi.order_id AND o.status <> 'cancelled'
         JOIN products p ON p.id = oi.product_id
        GROUP BY p.id
        ORDER BY "unitsSold" DESC, revenue DESC
        LIMIT $1`,
      [limit],
    );
    res.json(rows);
  });

  return router;
}
