import Database from "better-sqlite3"
import path from "node:path"
import { existsSync, mkdirSync, readFileSync } from "node:fs"

let _db: Database.Database | null = null

function getDbPath() {
  return process.env.DATABASE_PATH ?? path.join(process.cwd(), "scripts", "university.db")
}

function tableExists(db: Database.Database, name: string) {
  const row = db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(name)
  return !!row
}

function columnExists(db: Database.Database, table: string, col: string) {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]
  return rows.some((r) => r.name === col)
}

function bootstrapIfNeeded(db: Database.Database) {
  if (tableExists(db, "students")) return
  const initSql = readFileSync(path.join(process.cwd(), "scripts", "init-database.sql"), "utf8")
  const seedSql = readFileSync(path.join(process.cwd(), "scripts", "seed-data.sql"), "utf8")
  db.exec(initSql)
  db.exec(seedSql)
}

function migrate(db: Database.Database) {
  if (tableExists(db, "lectures") && !columnExists(db, "lectures", "allowed_radius_m")) {
    db.exec("ALTER TABLE lectures ADD COLUMN allowed_radius_m INTEGER DEFAULT 100")
  }
  if (tableExists(db, "attendance") && !columnExists(db, "attendance", "face_verified")) {
    db.exec("ALTER TABLE attendance ADD COLUMN face_verified INTEGER DEFAULT 0")
  }
  if (tableExists(db, "attendance") && !columnExists(db, "attendance", "time_in_section_sec")) {
    db.exec("ALTER TABLE attendance ADD COLUMN time_in_section_sec INTEGER")
  }
}

export function getDb(): Database.Database {
  if (_db) return _db
  const dbPath = getDbPath()
  const dir = path.dirname(dbPath)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  _db = new Database(dbPath)
  _db.pragma("journal_mode = WAL")
  _db.pragma("foreign_keys = ON")
  bootstrapIfNeeded(_db)
  migrate(_db)
  return _db
}
