import { createApp } from './app.js';
import { createPgDatabase } from './db.js';

const { DATABASE_URL, PORT = 3000 } = process.env;

if (!DATABASE_URL) {
  console.error('Manca DATABASE_URL: copia .env.example in .env');
  process.exit(1);
}

const db = createPgDatabase(DATABASE_URL);
const server = createApp(db).listen(PORT, () => {
  console.log(`🌸 bloom-api in ascolto su http://localhost:${PORT}`);
});

const shutdown = () => server.close(() => db.close());
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
