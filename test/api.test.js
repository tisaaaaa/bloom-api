import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import request from 'supertest';
import { createApp } from '../src/app.js';

// PGlite è PostgreSQL compilato in WebAssembly: i test usano SQL vero senza installare nulla
const pglite = new PGlite();
const db = {
  query: (text, params) => pglite.query(text, params),
  withTransaction: (fn) => pglite.transaction((tx) => fn({ query: (text, params) => tx.query(text, params) })),
};
const app = createApp(db);

const sql = (file) => readFile(new URL(`../db/${file}`, import.meta.url), 'utf8');

before(async () => {
  await pglite.waitReady;
});

beforeEach(async () => {
  await pglite.exec(await sql('schema.sql'));
  await pglite.exec(await sql('seed.sql'));
});

after(() => pglite.close());

describe('GET /products', () => {
  it('restituisce la prima pagina con la paginazione', async () => {
    const res = await request(app).get('/products?limit=5').expect(200);
    assert.equal(res.body.data.length, 5);
    assert.deepEqual(res.body.pagination, { page: 1, limit: 5, total: 12, totalPages: 3 });
  });

  it('filtra per categoria e ordina per prezzo', async () => {
    const res = await request(app).get('/products?category=piante&sort=price_asc').expect(200);
    const prices = res.body.data.map((p) => p.price);
    assert.deepEqual(prices, [12, 15.9, 45]);
    assert.ok(res.body.data.every((p) => p.category.slug === 'piante'));
  });

  it('cerca con la ricerca full-text in italiano', async () => {
    const res = await request(app).get('/products?q=peonie').expect(200);
    assert.deepEqual(res.body.data.map((p) => p.name), ['Bouquet Peonia']);
  });

  it('rifiuta parametri non validi', async () => {
    const res = await request(app).get('/products?minPrice=50&maxPrice=10').expect(400);
    assert.equal(res.body.details[0].field, 'minPrice');
  });

  it('restituisce 404 per un prodotto inesistente', async () => {
    await request(app).get('/products/999').expect(404);
  });
});

describe('GET /categories', () => {
  it('conta i prodotti per categoria', async () => {
    const res = await request(app).get('/categories').expect(200);
    assert.deepEqual(res.body.find((c) => c.slug === 'fiori'), { slug: 'fiori', name: 'Fiori', productCount: 4 });
  });
});

describe('POST /orders', () => {
  it('crea un ordine e scala le scorte', async () => {
    const res = await request(app)
      .post('/orders')
      .send({
        email: 'cliente@example.com',
        items: [
          { productId: 1, quantity: 2 },
          { productId: 4, quantity: 3 },
          { productId: 1, quantity: 1 },
        ],
      })
      .expect(201);

    assert.equal(res.body.total, 3 * 39.9 + 3 * 6.5);
    assert.deepEqual(res.body.items.map((i) => [i.productId, i.quantity]), [[1, 3], [4, 3]]);

    const product = await request(app).get('/products/1').expect(200);
    assert.equal(product.body.stock, 15 - 3);

    const stats = await request(app).get('/stats/top-products?limit=1').expect(200);
    assert.deepEqual(stats.body[0], { id: 1, name: 'Bouquet Peonia', emoji: '🌸', unitsSold: 3, revenue: 119.7 });
  });

  it('rifiuta un ordine con scorte insufficienti senza modificare nulla', async () => {
    const res = await request(app)
      .post('/orders')
      .send({ email: 'cliente@example.com', items: [{ productId: 5, quantity: 50 }] })
      .expect(409);

    assert.equal(res.body.details[0].available, 8);
    const product = await request(app).get('/products/5').expect(200);
    assert.equal(product.body.stock, 8);
  });

  it('restituisce 404 se un prodotto non esiste', async () => {
    const res = await request(app)
      .post('/orders')
      .send({ email: 'cliente@example.com', items: [{ productId: 999, quantity: 1 }] })
      .expect(404);
    assert.deepEqual(res.body.details, { productIds: [999] });
  });

  it("valida l'email e gli articoli", async () => {
    const res = await request(app).post('/orders').send({ email: 'non-una-email', items: [] }).expect(400);
    assert.deepEqual(res.body.details.map((d) => d.field).sort(), ['email', 'items']);
  });
});
