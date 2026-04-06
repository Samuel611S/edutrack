import Database from "better-sqlite3"
import path from "node:path"
import os from "node:os"
import { existsSync, mkdirSync, readFileSync } from "node:fs"

let _db: Database.Database | null = null

function getDbPath() {
  if (process.env.DATABASE_PATH) return process.env.DATABASE_PATH
  // Vercel serverless: only / tmp is writable; bundled dirs are read-only (SQLite + WAL fails there).
  if (process.env.VERCEL) {
    return path.join(os.tmpdir(), "edutrack-university.db")
  }
  return path.join(process.cwd(), "scripts", "university.db")
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
  if (tableExists(db, "courses") && !columnExists(db, "courses", "description")) {
    db.exec("ALTER TABLE courses ADD COLUMN description TEXT")
  }
  if (tableExists(db, "attendance") && !columnExists(db, "attendance", "outside_radius_sec")) {
    db.exec("ALTER TABLE attendance ADD COLUMN outside_radius_sec INTEGER DEFAULT 0")
  }
  if (!tableExists(db, "course_materials")) {
    db.exec(`
      CREATE TABLE course_materials (
        id TEXT PRIMARY KEY,
        course_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        material_type TEXT NOT NULL,
        url TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_course_materials_course_id ON course_materials(course_id);
    `)
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
