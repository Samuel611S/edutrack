-- Create Admins table
CREATE TABLE IF NOT EXISTS admins (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  university_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Teachers table
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

-- Create Students table
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

-- Create Courses table
CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  course_code TEXT UNIQUE NOT NULL,
  course_name TEXT NOT NULL,
  teacher_id TEXT NOT NULL,
  semester TEXT NOT NULL,
  credits INT DEFAULT 3,
  max_capacity INT,
  university_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE
);

-- Create Course Enrollment table
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

-- Create Lectures table
CREATE TABLE IF NOT EXISTS lectures (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  lecture_date TIMESTAMP NOT NULL,
  start_time TIME,
  end_time TIME,
  location TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- Create Attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id TEXT PRIMARY KEY,
  lecture_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  check_in_time TIMESTAMP,
  check_out_time TIMESTAMP,
  location_verified BOOLEAN DEFAULT FALSE,
  student_latitude DECIMAL(10, 8),
  student_longitude DECIMAL(11, 8),
  distance_from_lecture DECIMAL(10, 2),
  status TEXT DEFAULT 'absent',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(lecture_id, student_id),
  FOREIGN KEY (lecture_id) REFERENCES lectures(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- Create Lecture Materials table
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

-- Create indexes for performance
CREATE INDEX idx_teachers_university_id ON teachers(university_id);
CREATE INDEX idx_students_university_id ON students(university_id);
CREATE INDEX idx_courses_teacher_id ON courses(teacher_id);
CREATE INDEX idx_courses_university_id ON courses(university_id);
CREATE INDEX idx_enrollments_student_id ON course_enrollments(student_id);
CREATE INDEX idx_enrollments_course_id ON course_enrollments(course_id);
CREATE INDEX idx_lectures_course_id ON lectures(course_id);
CREATE INDEX idx_attendance_lecture_id ON attendance(lecture_id);
CREATE INDEX idx_attendance_student_id ON attendance(student_id);
