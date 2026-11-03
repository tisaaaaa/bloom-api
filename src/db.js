import pg from 'pg';

/**
 * Crea l'accesso al database a partire da un pool `pg`.
 * Le route ricevono solo { query, withTransaction }: così nei test
 * si può passare un database diverso (PGlite) senza cambiare codice.
 */
export function createPgDatabase(connectionString) {
  const pool = new pg.Pool({ connectionString });

  return {
    query: (text, params) => pool.query(text, params),

    async withTransaction(fn) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await fn({ query: (text, params) => client.query(text, params) });
        await client.query('COMMIT');
        return result;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    },

    close: () => pool.end(),
  };
}
