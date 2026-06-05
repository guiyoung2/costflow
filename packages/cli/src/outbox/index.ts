import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export interface OutboxRow {
  id: number;
  payload: string;
  created_at: string;
}

let db: Database.Database | null = null;

function getOutboxDb(): Database.Database {
  if (db) return db;

  const dir = path.join(os.homedir(), '.costflow');
  fs.mkdirSync(dir, { recursive: true });

  const dbPath = path.join(dir, 'outbox.sqlite');
  db = new Database(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS outbox (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  return db;
}

export function enqueue(payload: object): void {
  const db = getOutboxDb();
  db.prepare('INSERT INTO outbox (payload) VALUES (?)').run(JSON.stringify(payload));
}

export function drain(limit = 50): OutboxRow[] {
  const db = getOutboxDb();
  return db.prepare('SELECT id, payload, created_at FROM outbox ORDER BY id ASC LIMIT ?').all(limit) as OutboxRow[];
}

export function remove(ids: number[]): void {
  if (ids.length === 0) return;
  const db = getOutboxDb();
  const placeholders = ids.map(() => '?').join(',');
  db.prepare(`DELETE FROM outbox WHERE id IN (${placeholders})`).run(...ids);
}
