import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

/** The tiny slice of a Postgres client we use. Satisfied by both pg.Pool and PGlite. */
export interface Db {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
  exec(sql: string): Promise<void>;
  close(): Promise<void>;
}

/**
 * Real Postgres when a URL is given; otherwise an embedded PGlite instance
 * (a WASM build of Postgres) so `pnpm dev` works with zero setup.
 * Pass `pgliteDir: null` for a throwaway in-memory database (tests).
 */
export async function openDb(opts: { databaseUrl: string | null; pgliteDir: string | null }): Promise<Db> {
  if (opts.databaseUrl) {
    const { default: pg } = await import("pg");
    const pool = new pg.Pool({ connectionString: opts.databaseUrl });
    return {
      query: async (sql, params) => pool.query(sql, params as unknown[]) as never,
      exec: async (sql) => void (await pool.query(sql)),
      close: () => pool.end(),
    };
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const lite = opts.pgliteDir ? new PGlite(opts.pgliteDir) : new PGlite();
  return {
    query: (sql, params) => lite.query(sql, params) as never,
    exec: async (sql) => void (await lite.exec(sql)),
    close: () => lite.close(),
  };
}

const MIGRATIONS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../migrations");

/** Applies migrations/*.sql in filename order, once each. */
export async function migrate(db: Db): Promise<void> {
  await db.exec("CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())");
  const applied = new Set((await db.query<{ name: string }>("SELECT name FROM _migrations")).rows.map((r) => r.name));
  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    if (applied.has(file)) continue;
    await db.exec(await readFile(path.join(MIGRATIONS_DIR, file), "utf8"));
    await db.query("INSERT INTO _migrations (name) VALUES ($1)", [file]);
  }
}
