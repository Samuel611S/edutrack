PRAGMA foreign_keys = ON;

-- =====================
-- ADMINS
-- =====================
CREATE TABLE IF NOT EXISTS admins (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  university_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================
-- TEACHERS
-- =====================
CREATE TABLE IF NOT EXISTS teachers (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  employee_id TEXT UNIQUE NOT NULL,
  department TEXT,
  university_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================
-- STUDENTS
-- =====================
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  student_id TEXT UNIQUE NOT NULL,
  major TEXT,
  gpa DECIMAL(3,2),
  university_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================
-- COURSES
-- =====================
CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  course_code TEXT UNIQUE NOT NULL,
  course_name TEXT NOT NULL,
  description TEXT,
  teacher_id TEXT NOT NULL,
  semester TEXT NOT NULL,
  credits INT DEFAULT 3,
  max_capacity INT,
  university_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE
);

-- =====================
-- COURSE ENROLLMENTS
-- =====================
CREATE TABLE IF NOT EXISTS course_enrollments (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  grade TEXT,
  UNIQUE(course_id, student_id),
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- =====================
-- ENROLLMENT REQUESTS (student add/drop workflow)
-- =====================
CREATE TABLE IF NOT EXISTS enrollment_requests (
  id TEXT PRIMARY KEY,
  batch_id TEXT,
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

-- =====================
-- STUDENT PAYMENTS
-- =====================
CREATE TABLE IF NOT EXISTS student_payments (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  semester TEXT NOT NULL,
  total_credits INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  paid_amount INTEGER NOT NULL DEFAULT 0,
  amount_per_credit INTEGER NOT NULL DEFAULT 4000,
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK(payment_status IN ('unpaid', 'paid')),
  payment_reference TEXT,
  payment_provider TEXT,
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, semester),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- =====================
-- LECTURES
-- =====================
CREATE TABLE IF NOT EXISTS lectures (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  lecture_date TIMESTAMP NOT NULL,
  start_time TIME,
  end_time TIME,
  location TEXT,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  allowed_radius_m INTEGER DEFAULT 100,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- =====================
-- ATTENDANCE
-- =====================
CREATE TABLE IF NOT EXISTS attendance (
  id TEXT PRIMARY KEY,
  lecture_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  check_in_time TIMESTAMP,
  check_out_time TIMESTAMP,
  location_verified BOOLEAN DEFAULT FALSE,
  student_latitude DECIMAL(10,8),
  student_longitude DECIMAL(11,8),
  distance_from_lecture DECIMAL(10,2),
  face_verified INTEGER DEFAULT 0,
  time_in_section_sec INTEGER,
  outside_radius_sec INTEGER DEFAULT 0,
  status TEXT DEFAULT 'absent',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(lecture_id, student_id),
  FOREIGN KEY (lecture_id) REFERENCES lectures(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- =====================
-- LECTURE MATERIALS
-- =====================
CREATE TABLE IF NOT EXISTS lecture_materials (
  id TEXT PRIMARY KEY,
  lecture_id TEXT NOT NULL,
  title TEXT NOT NULL,
  file_url TEXT,
  description TEXT,
  attendance_required BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lecture_id) REFERENCES lectures(id) ON DELETE CASCADE
);

-- =====================
-- COURSE MATERIALS (videos, PDFs — visible to enrolled students)
-- =====================
CREATE TABLE IF NOT EXISTS course_materials (
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

-- =====================
-- INDEXES
-- =====================
CREATE INDEX IF NOT EXISTS idx_teachers_university_id ON teachers(university_id);
CREATE INDEX IF NOT EXISTS idx_students_university_id ON students(university_id);
CREATE INDEX IF NOT EXISTS idx_courses_teacher_id ON courses(teacher_id);
CREATE INDEX IF NOT EXISTS idx_courses_university_id ON courses(university_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON course_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_requests_student_id ON enrollment_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_requests_batch_id ON enrollment_requests(batch_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_requests_course_id ON enrollment_requests(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_requests_status ON enrollment_requests(status);
CREATE INDEX IF NOT EXISTS idx_lectures_course_id ON lectures(course_id);
CREATE INDEX IF NOT EXISTS idx_course_materials_course_id ON course_materials(course_id);
CREATE INDEX IF NOT EXISTS idx_attendance_lecture_id ON attendance(lecture_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance(student_id);
