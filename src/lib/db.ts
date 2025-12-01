import "server-only";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./db/schema";

declare global {
  // eslint-disable-next-line no-var
  var _dbPool: Pool | undefined;
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn("DATABASE_URL is not set; Postgres pool will not be created.");
}

const pool =
  global._dbPool ??
  (connectionString
    ? new Pool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    })
    : undefined);

if (process.env.NODE_ENV !== "production" && pool) {
  global._dbPool = pool;
}

export function getDbPool() {
  if (!pool) {
    throw new Error("DATABASE_URL is not configured.");
  }
  return pool;
}

export const db = pool ? drizzle(pool, { schema }) : ({} as ReturnType<typeof drizzle>);

export async function pingDatabase() {
  const client = await getDbPool().connect();
  try {
    const res = await client.query<{ now: string }>("select now()");
    return res.rows[0]?.now;
  } finally {
    client.release();
  }
}
