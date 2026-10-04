import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

function getDbPath(): string {
  if (process.env.DATABASE_URL) {
    if (process.env.DATABASE_URL.startsWith("file:")) {
      return process.env.DATABASE_URL.replace(/^file:\/\/?/, "");
    }
    if (process.env.DATABASE_URL.startsWith("sqlite:")) {
      return process.env.DATABASE_URL.replace(/^sqlite:\/\/?/, "");
    }
    if (!process.env.DATABASE_URL.startsWith("postgres")) {
      return process.env.DATABASE_URL;
    }
  }
  return path.resolve(".data/chapters.sqlite");
}

export function createDatabase(filePath?: string) {
  const target = filePath || getDbPath();
  if (target !== ":memory:") {
    fs.mkdirSync(path.dirname(target), { recursive: true });
  }
  const sqlite = new Database(target);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 10000");

  sqlite.function("now", () => new Date().toISOString());
  sqlite.function("greatest", (a: number, b: number) => Math.max(a, b));
  sqlite.function("least", (a: number, b: number) => Math.min(a, b));
  sqlite.function("pg_advisory_xact_lock", () => 1);

  return sqlite;
}

const globalSqlite = globalThis as unknown as { sqlite?: Database.Database };
export const rawSqlite = globalSqlite.sqlite ?? createDatabase();
if (process.env.NODE_ENV !== "production") globalSqlite.sqlite = rawSqlite;

export type QueryResult<T = any> = {
  rows: T[];
  rowCount: number;
};

export interface SQL {
  query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>;
}

function normalizeSql(sql: string, params?: any[]): { text: string; values: any[] } {
  let text = sql;

  // Handle id=ANY($1::uuid[]) or id=ANY($1)
  const anyRegex = /\b([a-zA-Z0-9_."]+)\s*=\s*ANY\s*\(\s*\$(\d+)(?:::uuid\[\])?\s*\)/gi;
  text = text.replace(anyRegex, (_, col, numStr) => {
    const idx = Number(numStr);
    const arr = Array.isArray(params?.[idx - 1]) ? params![idx - 1] : [];
    if (arr.length === 0) return "1=0";
    const placeholders = arr.map((_: any, i: number) => `$ARR_${idx}_${i}`).join(",");
    return `${col} IN (${placeholders})`;
  });

  // Convert $N and $ARR_N_I to ? in order
  const values: any[] = [];
  text = text.replace(/\$([a-zA-Z0-9_]+)/g, (fullMatch, token) => {
    if (token.startsWith("ARR_")) {
      const parts = token.split("_");
      const idx = Number(parts[1]);
      const itemIdx = Number(parts[2]);
      const arr = params?.[idx - 1];
      let val = arr?.[itemIdx];
      if (typeof val === "boolean") val = val ? 1 : 0;
      else if (val && typeof val === "object" && !(val instanceof Buffer)) {
        val = JSON.stringify(val);
      }
      values.push(val);
      return "?";
    }
    if (/^\d+$/.test(token)) {
      const idx = Number(token);
      let val = params?.[idx - 1];
      if (typeof val === "boolean") val = val ? 1 : 0;
      else if (val && typeof val === "object" && !(val instanceof Buffer)) {
        val = JSON.stringify(val);
      }
      values.push(val);
      return "?";
    }
    return fullMatch;
  });

  // Remove postgres locking clauses
  text = text.replace(/\s+FOR\s+UPDATE\s+SKIP\s+LOCKED/gi, "");
  text = text.replace(/\s+FOR\s+UPDATE/gi, "");

  // Convert now() + $N * interval '1 hour' or now() + interval '24 hours'
  text = text.replace(/\bnow\(\)\s*\+\s*interval\s*'(\d+)\s*hour(?:s)?'/gi, "datetime('now', '+$1 hour')");
  text = text.replace(/\bnow\(\)\s*\+\s*interval\s*'(\d+)\s*second(?:s)?'/gi, "datetime('now', '+$1 second')");
  text = text.replace(/\bnow\(\)\s*\+\s*interval\s*'(\d+)\s*day(?:s)?'/gi, "datetime('now', '+$1 day')");
  text = text.replace(/\bnow\(\)\s*-\s*interval\s*'(\d+)\s*second(?:s)?'/gi, "datetime('now', '-$1 second')");
  text = text.replace(/\bnow\(\)\s*-\s*interval\s*'(\d+)\s*minute(?:s)?'/gi, "datetime('now', '-$1 minute')");

  // Convert JSON operators: payload->>'key' => json_extract(payload, '$.key')
  text = text.replace(/([a-zA-Z0-9_]+)->>'([a-zA-Z0-9_]+)'/g, "json_extract($1, '$.$2')");

  // Convert jsonb cast / types
  text = text.replace(/::(?:bigint|int|integer|boolean|text|jsonb|uuid)/gi, "");

  return { text, values };
}

function parseJsonColumn(val: any) {
  if (typeof val === "string" && (val.startsWith("{") || val.startsWith("["))) {
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  }
  return val;
}

const JSON_COLUMNS = new Set(["content", "data", "settings", "snapshot", "payload", "reserved"]);

export class SqliteClient implements SQL {
  sqlite: Database.Database;

  constructor(sqlite: Database.Database) {
    this.sqlite = sqlite;
  }

  async query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
    const { text, values } = normalizeSql(sql, params);
    const trimmed = text.trim();

    if (!trimmed) {
      return { rows: [], rowCount: 0 };
    }

    try {
      const stmt = this.sqlite.prepare(trimmed);
      if (stmt.reader) {
        const rawRows = stmt.all(...values) as any[];
        const rows = rawRows.map((row) => {
          const mapped: any = { ...row };
          if (row && typeof row === "object") {
            if ("count(*)" in row && !("count" in row)) {
              mapped.count = String(row["count(*)"]);
            } else if ("count" in row) {
              mapped.count = String(row.count);
            }
            for (const col of JSON_COLUMNS) {
              if (col in mapped) {
                mapped[col] = parseJsonColumn(mapped[col]);
              }
            }
          }
          return mapped;
        }) as T[];

        return {
          rows,
          rowCount: rows.length,
        };
      } else {
        const result = stmt.run(...values);
        return {
          rows: [],
          rowCount: result.changes,
        };
      }
    } catch (err: any) {
      // Re-map SQLite trigger errors or exclusion codes so workflow assertions match
      if (err.message && err.message.includes("23P01")) {
        const e = new Error(err.message) as any;
        e.code = "23P01";
        throw e;
      }
      throw err;
    }
  }

  async end(): Promise<void> {
    // No-op for persistent pool, or close if owned
  }
}

export const db = new SqliteClient(rawSqlite);

export async function transaction<T>(
  fn: (c: SqliteClient) => Promise<T>,
): Promise<T> {
  const client = new SqliteClient(rawSqlite);
  client.sqlite.exec("BEGIN");
  try {
    const result = await fn(client);
    client.sqlite.exec("COMMIT");
    return result;
  } catch (e) {
    try {
      client.sqlite.exec("ROLLBACK");
    } catch {}
    throw e;
  }
}

export async function lock(c: SQL, key: number) {
  // SQLite WAL uses file-level locking for transactions; advisory lock is a safe no-op.
  await c.query("SELECT 1");
}

export async function audit(
  c: SQL,
  actor: string,
  action: string,
  target = "",
) {
  await c.query(
    "INSERT INTO audit_events(actor,action,target) VALUES($1,$2,$3)",
    [actor, action, target],
  );
}
