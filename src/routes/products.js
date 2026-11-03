import { Router } from 'express';
import { HttpError } from '../errors.js';
import { idParam, productQuery } from '../validation.js';

// Whitelist: il valore di `sort` non finisce mai direttamente nella query SQL
const ORDER_BY = {
  newest: 'p.created_at DESC, p.id DESC',
  price_asc: 'p.price_cents ASC, p.id',
  price_desc: 'p.price_cents DESC, p.id',
  name: 'p.name ASC',
};

const toProduct = (row) => ({
  id: row.id,
  name: row.name,
  description: row.description,
  emoji: row.emoji,
  price: row.price_cents / 100,
  stock: row.stock,
  category: { slug: row.category_slug, name: row.category_name },
});

export function productsRouter(db) {
  const router = Router();

  router.get('/', async (req, res) => {
    const filters = productQuery.parse(req.query);
    const where = ['p.is_active'];
    const params = [];
    const addParam = (value) => {
      params.push(value);
      return `$${params.length}`;
    };

    if (filters.category) where.push(`c.slug = ${addParam(filters.category)}`);
    if (filters.q) where.push(`p.search @@ websearch_to_tsquery('italian', ${addParam(filters.q)})`);
    if (filters.minPrice !== undefined) where.push(`p.price_cents >= ${addParam(Math.round(filters.minPrice * 100))}`);
    if (filters.maxPrice !== undefined) where.push(`p.price_cents <= ${addParam(Math.round(filters.maxPrice * 100))}`);

    const limit = addParam(filters.limit);
    const offset = addParam((filters.page - 1) * filters.limit);

    // COUNT(*) OVER() restituisce il totale insieme alla pagina: una sola query invece di due
    const { rows } = await db.query(
      `SELECT p.id, p.name, p.description, p.emoji, p.price_cents, p.stock,
              c.slug AS category_slug, c.name AS category_name,
              COUNT(*) OVER()::int AS total_count
         FROM products p
         JOIN categories c ON c.id = p.category_id
        WHERE ${where.join(' AND ')}
        ORDER BY ${ORDER_BY[filters.sort]}
        LIMIT ${limit} OFFSET ${offset}`,
      params,
    );

    const total = rows[0]?.total_count ?? 0;
    res.json({
      data: rows.map(toProduct),
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    });
  });

  router.get('/:id', async (req, res) => {
    const id = idParam.parse(req.params.id);
    const { rows } = await db.query(
      `SELECT p.id, p.name, p.description, p.emoji, p.price_cents, p.stock,
              c.slug AS category_slug, c.name AS category_name
         FROM products p
         JOIN categories c ON c.id = p.category_id
        WHERE p.id = $1 AND p.is_active`,
      [id],
    );
    if (rows.length === 0) throw new HttpError(404, 'Prodotto non trovato');
    res.json(toProduct(rows[0]));
  });

  return router;
}

export function categoriesRouter(db) {
  const router = Router();

  router.get('/', async (req, res) => {
    const { rows } = await db.query(
      `SELECT c.slug, c.name, COUNT(p.id)::int AS "productCount"
         FROM categories c
         LEFT JOIN products p ON p.category_id = c.id AND p.is_active
        GROUP BY c.id
        ORDER BY c.name`,
    );
    res.json(rows);
  });

  return router;
}
