import { getDbPool } from "../db";
import type { QueryResult, QueryResultRow } from "pg";

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<QueryResult<T>> {
  const pool = getDbPool();
  return pool.query<T>(text, params);
}

export async function withTransaction<T>(callback: (client: { query: typeof query }) => Promise<T>): Promise<T> {
  const pool = getDbPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback({
      query: <U extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []) =>
        client.query<U>(text, params) as Promise<QueryResult<U>>,
    });
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
