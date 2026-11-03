import express from 'express';
import { errorHandler, notFound } from './errors.js';
import { categoriesRouter, productsRouter } from './routes/products.js';
import { ordersRouter } from './routes/orders.js';
import { statsRouter } from './routes/stats.js';

export function createApp(db) {
  const app = express();

  app.use(express.json({ limit: '100kb' }));

  // CORS semplice, così il frontend (bloom-shop) può chiamare l'API
  app.use((req, res, next) => {
    res.set({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  app.get('/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/categories', categoriesRouter(db));
  app.use('/products', productsRouter(db));
  app.use('/orders', ordersRouter(db));
  app.use('/stats', statsRouter(db));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
