-- Schema del negozio Bloom
-- I prezzi sono salvati in centesimi (INTEGER) per evitare errori di arrotondamento.

DROP TABLE IF EXISTS order_items, orders, products, categories CASCADE;

CREATE TABLE categories (
  id   SERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL
);

CREATE TABLE products (
  id          SERIAL PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  emoji       TEXT,
  price_cents INTEGER NOT NULL CHECK (price_cents > 0),
  stock       INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Colonna calcolata per la ricerca full-text in italiano
  search      TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('italian', name || ' ' || description)
  ) STORED
);

-- Indice parziale: il catalogo legge solo i prodotti attivi
CREATE INDEX idx_products_active_category ON products (category_id, price_cents) WHERE is_active;
CREATE INDEX idx_products_search ON products USING GIN (search);

CREATE TABLE orders (
  id             SERIAL PRIMARY KEY,
  customer_email TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'paid', 'shipped', 'cancelled')),
  total_cents    INTEGER NOT NULL CHECK (total_cents >= 0),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE order_items (
  order_id         INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id       INTEGER NOT NULL REFERENCES products(id),
  quantity         INTEGER NOT NULL CHECK (quantity > 0),
  -- Il prezzo viene "congelato" al momento dell'ordine
  unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents > 0),
  PRIMARY KEY (order_id, product_id)
);

-- Serve alle statistiche sui prodotti più venduti
CREATE INDEX idx_order_items_product ON order_items (product_id);
