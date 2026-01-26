import Database from "better-sqlite3"
import path from "node:path"

let _db: Database.Database | null = null

function getDbPath() {
  // Allow override, but default to the bundled SQLite DB in /scripts
  return process.env.DATABASE_PATH ?? path.join(process.cwd(), "scripts", "university.db")
}

export function getDb() {
  if (_db) return _db
  _db = new Database(getDbPath(), { readonly: true })
  _db.pragma("foreign_keys = ON")
  return _db
}


