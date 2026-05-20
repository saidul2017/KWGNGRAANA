import { createClient, type Client } from "@libsql/client";
import path from "node:path";
import fs from "node:fs";

let _client: Client | null = null;

function resolveDbUrl(): string {
  const raw = process.env.DATABASE_PATH || "./data/kwgn.db";
  // libsql url format: file:/absolute/path or file:relative
  const abs = path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
  const dir = path.dirname(abs);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return `file:${abs}`;
}

export function db(): Client {
  if (!_client) {
    _client = createClient({ url: resolveDbUrl() });
  }
  return _client;
}

/** Helper: parameterized query returning rows. */
export async function all<T = Record<string, unknown>>(
  sql: string,
  args: unknown[] = []
): Promise<T[]> {
  const res = await db().execute({ sql, args: args as never });
  return res.rows as unknown as T[];
}

/** Helper: parameterized query returning a single row or null. */
export async function get<T = Record<string, unknown>>(
  sql: string,
  args: unknown[] = []
): Promise<T | null> {
  const rows = await all<T>(sql, args);
  return rows[0] ?? null;
}

/** Helper: parameterized exec, returns lastInsertRowid as number. */
export async function run(
  sql: string,
  args: unknown[] = []
): Promise<{ lastInsertRowid: number; rowsAffected: number }> {
  const res = await db().execute({ sql, args: args as never });
  return {
    lastInsertRowid: Number(res.lastInsertRowid ?? 0),
    rowsAffected: res.rowsAffected ?? 0,
  };
}
