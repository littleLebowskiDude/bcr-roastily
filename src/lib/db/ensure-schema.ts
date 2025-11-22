import { readFile } from "node:fs/promises";
import path from "node:path";
import { query } from "./queries";

let initialized = false;

export async function ensureSchema() {
  if (initialized) return;
  const schemaPath = path.join(process.cwd(), "src", "lib", "db", "schema.sql");
  const sql = await readFile(schemaPath, "utf8");
  await query(sql);
  initialized = true;
}
