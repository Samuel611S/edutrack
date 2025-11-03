-- Insert sample university data for Arab Open University Cairo
-- Sample Admins
INSERT INTO admins (id, email, full_name, password_hash, university_id) VALUES
('admin_001', 'admin@aou.edu.eg', 'Dr. Ahmed Hassan', 'hashed_password_001', 'aou_cairo');

-- Sample Teachers
INSERT INTO teachers (id, email, full_name, password_hash, employee_id, department, university_id) VALUES
('teacher_001', 'ali.egypt@aou.edu.eg', 'Dr. Ali Mohamed', 'hashed_password_002', 'EMP001', 'Computer Science', 'aou_cairo'),
('teacher_002', 'fatima.mansour@aou.edu.eg', 'Prof. Fatima Mansour', 'hashed_password_003', 'EMP002', 'Engineering', 'aou_cairo');

-- Sample Students
INSERT INTO students (id, email, full_name, password_hash, student_id, major, gpa, university_id) VALUES
('student_001', 'omar.ahmed@student.aou.edu.eg', 'Omar Ahmed', 'hashed_password_004', 'STU001', 'Computer Science', 3.85, 'aou_cairo'),
('student_002', 'layla.hassan@student.aou.edu.eg', 'Layla Hassan', 'hashed_password_005', 'STU002', 'Computer Science', 3.92, 'aou_cairo'),
('student_003', 'karim.salem@student.aou.edu.eg', 'Karim Salem', 'hashed_password_006', 'STU003', 'Engineering', 3.65, 'aou_cairo');

-- Sample Courses
INSERT INTO courses (id, course_code, course_name, teacher_id, semester, credits, max_capacity, university_id) VALUES
('course_001', 'CS301', 'Advanced Database Systems', 'teacher_001', '2025-Spring', 3, 30, 'aou_cairo'),
('course_002', 'ENG201', 'Digital Systems Design', 'teacher_002', '2025-Spring', 3, 35, 'aou_cairo');

-- Sample Course Enrollments
INSERT INTO course_enrollments (id, course_id, student_id, enrollment_date) VALUES
('enroll_001', 'course_001', 'student_001', CURRENT_TIMESTAMP),
('enroll_002', 'course_001', 'student_002', CURRENT_TIMESTAMP),
('enroll_003', 'course_002', 'student_002', CURRENT_TIMESTAMP),
('enroll_004', 'course_002', 'student_003', CURRENT_TIMESTAMP);

-- Sample Lectures (at Arab Open University Cairo location)
INSERT INTO lectures (id, course_id, lecture_date, start_time, end_time, location, latitude, longitude) VALUES
('lecture_001', 'course_001', '2025-01-15 10:00:00', '10:00', '11:30', 'Building A, Room 201', 30.0553, 31.3399),
('lecture_002', 'course_001', '2025-01-22 10:00:00', '10:00', '11:30', 'Building A, Room 201', 30.0553, 31.3399),
('lecture_003', 'course_002', '2025-01-16 14:00:00', '14:00', '15:30', 'Building B, Room 105', 30.0553, 31.3399);
