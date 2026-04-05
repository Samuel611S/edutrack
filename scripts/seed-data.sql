-- ADMIN
INSERT INTO admins (id, email, full_name, password_hash, university_id)
VALUES
('02511793', 'admin@aou.edu.eg', 'Dr. Ahmed Hassan', '12345678', 'aou_cairo');

-- TEACHERS
INSERT INTO teachers (id, email, full_name, password_hash, employee_id, department, university_id)
VALUES
('12511793', 'ali.egypt@aou.edu.eg', 'Dr. Ali Mohamed', '12345678', 'EMP001', 'Computer Science', 'aou_cairo'),
('12511794', 'fatima.mansour@aou.edu.eg', 'Prof. Fatima Mansour', '12345678', 'EMP002', 'Engineering', 'aou_cairo');

-- STUDENTS
INSERT INTO students (id, email, full_name, password_hash, student_id, major, gpa, university_id)
VALUES
('22511793', 'omar.ahmed@student.aou.edu.eg', 'Omar Ahmed', '12345678', 'STU001', 'Computer Science', 3.85, 'aou_cairo'),
('22511794', 'layla.hassan@student.aou.edu.eg', 'Layla Hassan', '12345678', 'STU002', 'Computer Science', 3.92, 'aou_cairo'),
('22511795', 'karim.salem@student.aou.edu.eg', 'Karim Salem', '12345678', 'STU003', 'Engineering', 3.65, 'aou_cairo');

-- COURSES
INSERT INTO courses (id, course_code, course_name, teacher_id, semester, credits, max_capacity, university_id)
VALUES
('course_001', 'CS301', 'Advanced Database Systems', '12511793', '2026-Spring', 3, 30, 'aou_cairo'),
('course_002', 'ENG201', 'Digital Systems Design', '12511794', '2026-Spring', 3, 35, 'aou_cairo');

-- ENROLLMENTS (grades editable by teacher)
INSERT INTO course_enrollments (id, course_id, student_id, grade)
VALUES
('enroll_001', 'course_001', '22511793', 'A'),
('enroll_002', 'course_001', '22511794', 'B+'),
('enroll_003', 'course_002', '22511794', 'A-'),
('enroll_004', 'course_002', '22511795', 'B');

-- LECTURES (dates relative to project timeline — upcoming sessions)
INSERT INTO lectures (id, course_id, lecture_date, start_time, end_time, location, latitude, longitude, allowed_radius_m)
VALUES
('lecture_001', 'course_001', '2026-04-06 00:00:00', '10:00', '11:30', 'Building A, Room 201', 30.05530000, 31.33990000, 100),
('lecture_002', 'course_001', '2026-04-13 00:00:00', '10:00', '11:30', 'Building A, Room 201', 30.05530000, 31.33990000, 100),
('lecture_003', 'course_002', '2026-04-07 00:00:00', '14:00', '15:30', 'Building B, Room 105', 30.05450000, 31.34050000, 100),
('lecture_004', 'course_001', '2026-04-20 00:00:00', '10:00', '11:30', 'Building A, Room 201', 30.05530000, 31.33990000, 50);

-- Sample materials (per lecture)
INSERT INTO lecture_materials (id, lecture_id, title, file_url, description, attendance_required)
VALUES
('mat_001', 'lecture_001', 'Lecture Slides Week 1', '/materials/cs301-w1.pdf', 'Introduction and ER models', 0),
('mat_002', 'lecture_001', 'SQL Query Examples', '/materials/sql-examples.zip', 'Practice scripts', 0),
('mat_003', 'lecture_003', 'Digital Logic Overview', '/materials/eng201-intro.pdf', 'Week 1 reading', 0);
