// Crea le tabelle e inserisce i dati di esempio: npm run db:setup
import { readFile } from 'node:fs/promises';
import pg from 'pg';

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

for (const file of ['schema.sql', 'seed.sql']) {
  const sql = await readFile(new URL(`../db/${file}`, import.meta.url), 'utf8');
  await client.query(sql);
  console.log(`✔ ${file}`);
}

await client.end();
