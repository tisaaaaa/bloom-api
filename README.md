<h1 align="center">🌿 bloom-api</h1>

<p align="center">
  API REST per il negozio di fiori <a href="https://github.com/tisaaaaa/bloom-shop">bloom-shop</a>,<br/>
  costruita con <b>Node.js, Express e PostgreSQL</b>.
</p>

<p align="center">
  <img src="https://github.com/tisaaaaa/bloom-api/actions/workflows/test.yml/badge.svg" alt="Test"/>
  <img src="https://img.shields.io/badge/Node.js-20+-E7A1B0?style=flat-square&logo=nodedotjs&logoColor=white"/>
  <img src="https://img.shields.io/badge/PostgreSQL-16-6F9A80?style=flat-square&logo=postgresql&logoColor=white"/>
  <img src="https://img.shields.io/badge/Express-5-213B38?style=flat-square&logo=express&logoColor=white"/>
</p>

---

## 📚 Endpoint

| Metodo | Percorso | Descrizione |
|---|---|---|
| `GET` | `/products` | Catalogo con filtri, ricerca e paginazione |
| `GET` | `/products/:id` | Dettaglio di un prodotto |
| `GET` | `/categories` | Categorie con il numero di prodotti |
| `POST` | `/orders` | Crea un ordine (controlla e scala le scorte) |
| `GET` | `/orders/:id` | Dettaglio di un ordine con i suoi articoli |
| `GET` | `/stats/top-products` | Prodotti più venduti |

**Parametri di `/products`:** `category`, `q` (ricerca), `minPrice`, `maxPrice`, `sort` (`newest` · `price_asc` · `price_desc` · `name`), `page`, `limit`

```bash
curl "localhost:3000/products?category=fiori&sort=price_asc&limit=3"
```

```bash
curl -X POST localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{"email":"cliente@example.com","items":[{"productId":1,"quantity":2}]}'
```

## 🗄️ Il database

Lo schema completo è in [`db/schema.sql`](db/schema.sql). Alcune scelte:

- **Prezzi in centesimi** (`INTEGER`): niente errori di arrotondamento con i decimali
- **Vincoli `CHECK`** (prezzo > 0, scorte ≥ 0, stati ammessi): i dati sbagliati non entrano proprio nel database
- **Ricerca full-text in italiano**: una colonna `tsvector` calcolata con indice `GIN` (cercando "peonie" trova "Peonia")
- **Indice parziale** sui soli prodotti attivi, che sono quelli letti dal catalogo
- **`COUNT(*) OVER()`**: pagina e totale dei risultati arrivano con una sola query
- Il prezzo viene **"congelato" in `order_items`**: se il prezzo cambia, gli ordini vecchi restano corretti

### Ordini sicuri anche con tanti clienti insieme

La creazione di un ordine ([`src/routes/orders.js`](src/routes/orders.js)) avviene in **una transazione**:

1. `SELECT … FOR UPDATE` blocca le righe dei prodotti (in ordine di id, per evitare deadlock)
2. controlla che i prodotti esistano (`404`) e che le scorte bastino (`409`)
3. inserisce ordine e articoli con `unnest` (una sola query per tutte le righe)
4. scala le scorte

Se qualcosa va storto, il `ROLLBACK` annulla tutto: non si vende mai più di quello che c'è.

## 🧪 Test

```bash
npm test
```

I test usano [PGlite](https://pglite.dev), cioè **PostgreSQL vero** compilato in WebAssembly: niente mock, e non serve installare nulla. Girano anche su GitHub Actions a ogni push.

## 🚀 Avvio in locale

```bash
docker compose up -d       # avvia PostgreSQL
cp .env.example .env
npm install
npm run db:setup           # crea le tabelle e inserisce i prodotti di esempio
npm run dev                # http://localhost:3000
```

## 📁 Struttura

```
src/
├── app.js          # crea l'app Express (riceve il database: comodo per i test)
├── server.js       # avvio del server
├── db.js           # pool PostgreSQL + helper per le transazioni
├── validation.js   # validazione degli input con Zod
├── errors.js       # gestione centralizzata degli errori
└── routes/         # products, orders, stats
db/                 # schema.sql e seed.sql
test/               # test di integrazione
```

---

<p align="center"><sub>Fatto con 💚 da <a href="https://github.com/tisaaaaa">Anna Tiso</a></sub></p>
