import { PGlite } from '@electric-sql/pglite';
import { Pool, QueryResult, QueryResultRow } from 'pg';
import path from 'path';
import fs from 'fs';

import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

let pgPool: Pool | null = null;
let pgliteInstance: PGlite | null = null;

export async function getDb() {
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl && dbUrl.trim() !== '') {
    if (!pgPool) {
      pgPool = new Pool({
        connectionString: dbUrl,
      });
    }
    return {
      type: 'postgres' as const,
      exec: async (sql: string): Promise<void> => {
        await pgPool!.query(sql);
      },
      query: async <R extends QueryResultRow = any>(text: string, params: any[] = []): Promise<QueryResult<R>> => {
        return pgPool!.query<R>(text, params);
      },
    };
  }

  // PGlite fallback
  if (!pgliteInstance) {
    const dataDir = path.resolve(process.cwd(), 'data/pglite-db');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    pgliteInstance = new PGlite(dataDir);
  }

  return {
    type: 'pglite' as const,
    exec: async (sql: string): Promise<void> => {
      await pgliteInstance!.exec(sql);
    },
    query: async <R extends QueryResultRow = any>(text: string, params: any[] = []): Promise<QueryResult<R>> => {
      const res = await pgliteInstance!.query<R>(text, params);
      return {
        rows: res.rows,
        rowCount: res.rows.length,
        command: '',
        oid: 0,
        fields: res.fields as any,
      };
    },
  };
}

export async function exec(sql: string): Promise<void> {
  const db = await getDb();
  await db.exec(sql);
}

export async function query<R extends QueryResultRow = any>(text: string, params: any[] = []): Promise<QueryResult<R>> {
  const db = await getDb();
  return db.query<R>(text, params);
}

export async function withTransaction<T>(callback: (clientQuery: (sql: string, params?: any[]) => Promise<any>) => Promise<T>): Promise<T> {
  const db = await getDb();
  if (db.type === 'postgres' && pgPool) {
    const client = await pgPool.connect();
    try {
      await client.query('BEGIN');
      const res = await callback((sql, params = []) => client.query(sql, params));
      await client.query('COMMIT');
      return res;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } else {
    const pg = pgliteInstance!;
    return await pg.transaction(async (tx) => {
      return await callback((sql, params = []) => tx.query(sql, params));
    });
  }
}
