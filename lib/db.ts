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
  if (!tableExists(db, "enrollment_requests")) {
    db.exec(`
      CREATE TABLE enrollment_requests (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        course_id TEXT NOT NULL,
        request_type TEXT NOT NULL CHECK(request_type IN ('add', 'drop')),
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
        is_overload INTEGER DEFAULT 0,
        reason TEXT,
        reviewed_by TEXT,
        reviewed_by_role TEXT,
        reviewed_by_name TEXT,
        reviewed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
        FOREIGN KEY (reviewed_by) REFERENCES teachers(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_enrollment_requests_student_id ON enrollment_requests(student_id);
      CREATE INDEX IF NOT EXISTS idx_enrollment_requests_course_id ON enrollment_requests(course_id);
      CREATE INDEX IF NOT EXISTS idx_enrollment_requests_status ON enrollment_requests(status);
    `)
  }
  if (!tableExists(db, "student_payments")) {
    db.exec(`
      CREATE TABLE student_payments (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        semester TEXT NOT NULL,
        total_credits INTEGER NOT NULL,
        amount INTEGER NOT NULL,
        amount_per_credit INTEGER NOT NULL DEFAULT 4000,
        payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK(payment_status IN ('unpaid', 'paid')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(student_id, semester),
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
      );
    `)
  }
  if (tableExists(db, "enrollment_requests") && !columnExists(db, "enrollment_requests", "reviewed_by_role")) {
    db.exec("ALTER TABLE enrollment_requests ADD COLUMN reviewed_by_role TEXT")
  }
  if (tableExists(db, "enrollment_requests") && !columnExists(db, "enrollment_requests", "reviewed_by_name")) {
    db.exec("ALTER TABLE enrollment_requests ADD COLUMN reviewed_by_name TEXT")
  }
  if (tableExists(db, "enrollment_requests") && !columnExists(db, "enrollment_requests", "batch_id")) {
    db.exec("ALTER TABLE enrollment_requests ADD COLUMN batch_id TEXT")
    db.exec("CREATE INDEX IF NOT EXISTS idx_enrollment_requests_batch_id ON enrollment_requests(batch_id)")
  }
  if (tableExists(db, "student_payments") && !columnExists(db, "student_payments", "payment_reference")) {
    db.exec("ALTER TABLE student_payments ADD COLUMN payment_reference TEXT")
  }
  if (tableExists(db, "student_payments") && !columnExists(db, "student_payments", "payment_provider")) {
    db.exec("ALTER TABLE student_payments ADD COLUMN payment_provider TEXT")
  }
  if (tableExists(db, "student_payments") && !columnExists(db, "student_payments", "paid_at")) {
    db.exec("ALTER TABLE student_payments ADD COLUMN paid_at TIMESTAMP")
  }
  if (tableExists(db, "student_payments") && !columnExists(db, "student_payments", "paid_amount")) {
    db.exec("ALTER TABLE student_payments ADD COLUMN paid_amount INTEGER NOT NULL DEFAULT 0")
    db.exec(`
      UPDATE student_payments
      SET paid_amount = CASE
        WHEN payment_status = 'paid' THEN amount
        ELSE COALESCE(paid_amount, 0)
      END
      WHERE paid_amount IS NULL OR paid_amount = 0
    `)
  }
  if (!tableExists(db, "registration_reset_v1")) {
    db.exec(`
      CREATE TABLE registration_reset_v1 (id INTEGER PRIMARY KEY CHECK(id = 1));
      INSERT INTO registration_reset_v1 (id) VALUES (1);
      DELETE FROM course_enrollments;
      DELETE FROM enrollment_requests;
      DELETE FROM student_payments;
    `)
  }
  if (!tableExists(db, "demo_content_v1")) {
    db.exec(`
      CREATE TABLE demo_content_v1 (id INTEGER PRIMARY KEY CHECK(id = 1));
      INSERT INTO demo_content_v1 (id) VALUES (1);

      INSERT OR IGNORE INTO course_materials (id, course_id, title, description, material_type, url, sort_order) VALUES
      ('cm_demo_001', 'course_b001', 'Database Indexing Handout (PDF)', 'Virtual PDF material for practice.', 'pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 1),
      ('cm_demo_002', 'course_b002', 'Algorithms Week 2 Slides (PDF)', 'Complexity and recursion examples.', 'pdf', 'https://www.orimi.com/pdf-test.pdf', 1),
      ('cm_demo_003', 'course_b003', 'Security Intro Video', 'Virtual recorded lecture.', 'video', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 1),
      ('cm_demo_004', 'course_b004', 'Programming Basics Notes (PDF)', 'Sample downloadable notes.', 'pdf', 'https://unec.edu.az/application/uploads/2014/12/pdf-sample.pdf', 1),
      ('cm_demo_005', 'course_b005', 'Digital Systems Tutorial Video', 'Boolean algebra walkthrough.', 'video', 'https://www.youtube.com/watch?v=aqz-KE-bpKQ', 1);

      INSERT OR IGNORE INTO course_enrollments (id, course_id, student_id, enrollment_date, grade) VALUES
      ('enr_demo_001', 'course_b001', '22530001', CURRENT_TIMESTAMP, NULL),
      ('enr_demo_002', 'course_b002', '22530001', CURRENT_TIMESTAMP, NULL),
      ('enr_demo_003', 'course_b003', '22530002', CURRENT_TIMESTAMP, NULL),
      ('enr_demo_004', 'course_b004', '22530003', CURRENT_TIMESTAMP, NULL),
      ('enr_demo_005', 'course_b005', '22530004', CURRENT_TIMESTAMP, NULL);

      INSERT OR IGNORE INTO lectures (id, course_id, lecture_date, start_time, end_time, location, latitude, longitude, allowed_radius_m) VALUES
      ('lec_demo_001', 'course_b001', date('now', '+1 day'), '10:00', '11:30', 'Section A', 30.155911312816503, 31.614183819504508, 100),
      ('lec_demo_002', 'course_b002', date('now', '+2 day'), '10:00', '11:30', 'Section B', 30.155903511977797, 31.61467099883365, 100),
      ('lec_demo_003', 'course_b003', date('now', '+3 day'), '10:00', '11:30', 'Section C', 30.15551151903733, 31.61437778905222, 100),
      ('lec_demo_004', 'course_b004', date('now', '+4 day'), '10:00', '11:30', 'Section D', 30.15573189336974, 31.614339446234645, 100),
      ('lec_demo_005', 'course_b005', date('now', '+5 day'), '10:00', '11:30', 'Section E', 30.1559132630261, 31.61443417554865, 100);
    `)
  }
  if (!tableExists(db, "credits_mix_v1")) {
    db.exec(`
      CREATE TABLE credits_mix_v1 (id INTEGER PRIMARY KEY CHECK(id = 1));
      INSERT INTO credits_mix_v1 (id) VALUES (1);
      UPDATE courses
      SET credits = CASE
        WHEN (CAST(SUBSTR(course_code, 4) AS INTEGER) % 10) = 0 THEN 8
        WHEN (CAST(SUBSTR(course_code, 4) AS INTEGER) % 3) = 0 THEN 4
        ELSE 3
      END
      WHERE course_code LIKE 'EDU%';
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
