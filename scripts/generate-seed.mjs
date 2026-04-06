/**
 * Generates scripts/seed-data.sql — 4 admins, 60 teachers, 500 students, ~90 courses.
 * Arabic-origin names in English (romanization); emails stay ASCII. Run: node scripts/generate-seed.mjs
 */
import { readFileSync, writeFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, "seed-data.sql")

/** Lecture / GPS pins — keep in sync with lib/campus-gps.json (Arab Open University Egypt, El Shorouk). */
const campusGps = JSON.parse(readFileSync(join(__dirname, "../lib/campus-gps.json"), "utf8"))
const LOCATIONS = campusGps.lectureLocations

const ADMINS = 4
const TEACHERS = 60
const STUDENTS = 500
const COURSES = 90
const uni = "edutrack_main"
const pwd = "12345678"

const ADMIN_NAMES = [
  "Dr. Ahmed Hassan El-Mahallawi",
  "Dr. Fatima El-Sayed Ibrahim",
  "Mr. Khaled Abdel Rahman Awad",
  "Ms. Sarah Mahmoud El-Alfy",
]

const T_FIRST = [
  "Mohamed",
  "Fatima",
  "Ahmed",
  "Aisha",
  "Khaled",
  "Mariam",
  "Yusuf",
  "Noor",
  "Omar",
  "Layla",
  "Tarek",
  "Hend",
  "Sami",
  "Zeinab",
  "Karim",
  "Rana",
  "Bassel",
  "Dina",
  "Waleed",
  "Mona",
  "Amr",
  "Salma",
  "Hesham",
  "Iman",
  "Tamer",
  "Ghada",
  "Mahmoud",
  "Shaimaa",
  "Islam",
  "Asmaa",
]

const T_LAST = [
  "El-Hassan",
  "Mahmoud",
  "Ibrahim",
  "Osman",
  "El-Sayed",
  "Mostafa",
  "El-Najjar",
  "El-Feki",
  "Abdullah",
  "Hassanein",
  "El-Shinnawi",
  "El-Zahraa",
  "El-Antably",
  "Saleh",
  "El-Khatib",
  "Mousa",
  "Gerges",
  "Fahmy",
  "El-Bayoumi",
  "Adel",
  "El-Tantawy",
  "El-Gendy",
  "El-Saadani",
  "El-Kashif",
  "El-Damardash",
]

const S_FIRST = [
  "Adam",
  "Malak",
  "Yahya",
  "Jana",
  "Ibrahim",
  "Hiba",
  "Mostafa",
  "Lara",
  "Karim",
  "Nourhan",
  "Abdel Rahman",
  "Salma",
  "Yassin",
  "Mai",
  "Taha",
  "Rahma",
  "Hossam",
  "Shahd",
  "Anas",
  "Basma",
  "Malek",
  "Yara",
  "Seif",
  "Layan",
  "Omar",
  "Tasneem",
  "Ziad",
  "Judy",
  "Rami",
  "Nada",
]

const S_LAST = [
  "El-Ghamry",
  "El-Shazly",
  "Abdel Fattah",
  "El-Menoufi",
  "El-Behairy",
  "El-Skandary",
  "El-Qahiry",
  "El-Gizawi",
  "El-Fayoumi",
  "Alexandrian",
  "El-Damanhoury",
  "Tantawy",
  "El-Zagazigy",
  "El-Mansoury",
  "El-Zamaleky",
  "El-Maadi",
  "Madinet Nasr",
  "El-Abbasiya",
  "Shubra",
  "El-Matareya",
]

const DEPARTMENTS = [
  "Computer Science & Artificial Intelligence",
  "Civil Engineering",
  "Electrical Engineering",
  "Mechanical Engineering",
  "Faculty of Medicine",
  "Business Administration",
  "Pharmacy",
  "Mathematics & Physics",
  "Arabic Language",
  "Sciences",
]

const MAJORS = [
  "Computer Science",
  "Software Engineering",
  "Civil Engineering",
  "Electrical Engineering",
  "Medicine",
  "Business Administration",
  "Pharmacy",
  "Mathematics",
  "Physics",
  "Arabic Language",
  "Chemistry",
  "Biology",
  "Accounting",
  "Marketing",
]

const COURSE_CATALOG = [
  ["CS301", "Advanced Databases", "Relational design, SQL, transactions, and indexing."],
  ["CS205", "Algorithms & Data Structures", "Arrays, trees, graphs, and time complexity."],
  ["CS410", "Information Security", "Encryption, authentication, common attacks, and defenses."],
  ["CS120", "Introduction to Programming", "Algorithm basics in a high-level language."],
  ["EN201", "Digital Systems", "Binary logic, combinational and sequential circuits."],
  ["EN310", "Engineering Dynamics", "Rigid-body motion and vector analysis."],
  ["EN145", "Intro to Electric Circuits", "Ohm’s and Kirchhoff’s laws and applications."],
  ["MA220", "Calculus II", "Multivariable integration and series."],
  ["MA110", "Linear Algebra", "Matrices, subspaces, and eigenvalues."],
  ["PH215", "Modern Physics", "Quantum introduction and special relativity."],
  ["MD120", "Human Anatomy", "Foundations of human structure for pre-clinical year."],
  ["BA210", "Principles of Management", "Planning, organizing, leading, and control."],
  ["BA305", "Modern Marketing", "Consumer behavior and brand strategy."],
  ["PH240", "Pharmaceutical Chemistry", "Drug reactions and stability."],
  ["AR150", "Arabic Grammar & Morphology", "Sentence structure and word formation."],
  ["CS330", "Computer Networks", "OSI layers, TCP/IP, and routing."],
  ["CS355", "Software Engineering", "Project lifecycles and UML."],
  ["CS440", "Machine Learning", "Regression, classification, and model evaluation."],
  ["EN280", "Strength of Materials", "Stress and strain in structural members."],
  ["EN390", "Automatic Control", "Feedback systems and stability."],
]

const EXTRA_TITLES = [
  "Applied Programming Lab",
  "Web Fundamentals",
  "User Interface Design",
  "Operating Systems",
  "Computer Architecture",
  "Applied Artificial Intelligence",
  "Signal Processing",
  "Engineering Statistics",
  "Engineering Economics",
  "Fluid Mechanics",
  "Engineering Materials",
  "Geotechnical Engineering",
  "Environment & Sustainability",
  "Professional Ethics",
  "Academic Communication Skills",
  "English for STEM",
  "Operations Research",
  "Mathematical Modeling",
  "General Physics I",
  "General Chemistry",
  "General Biology",
  "History of Science",
  "Philosophy of Science",
  "Biostatistics",
  "Clinical Pharmacy",
  "Industrial Pharmacy",
  "Pharmacology",
  "Cost Accounting",
  "Corporate Finance",
  "Management Information Systems",
]

function esc(s) {
  return String(s).replace(/'/g, "''")
}

function pad(n, w) {
  return String(n).padStart(w, "0")
}

function teacherName(i) {
  const a = T_FIRST[(i - 1) % T_FIRST.length]
  const b = T_LAST[(Math.floor((i - 1) / T_FIRST.length) + (i - 1) * 3) % T_LAST.length]
  return `Dr. ${a} ${b}`
}

function studentName(i) {
  const a = S_FIRST[(i - 1) % S_FIRST.length]
  const b = S_LAST[(Math.floor((i - 1) / S_FIRST.length) + i * 5) % S_LAST.length]
  return `${a} ${b}`
}

function courseMeta(c) {
  const code = `EDU${pad(c, 3)}`
  const base = COURSE_CATALOG[(c - 1) % COURSE_CATALOG.length]
  const extra = EXTRA_TITLES[(c - 1) % EXTRA_TITLES.length]
  const variant = Math.floor((c - 1) / COURSE_CATALOG.length)
  if (variant === 0) {
    const [, title, desc] = base
    return [code, title, desc]
  }
  const [, baseTitle] = base
  const title = `${extra} — Section ${pad((c % 15) + 1, 2)}`
  const desc = `Course on ${extra}, linked to ${baseTitle}. Lectures and exercises for the term.`
  return [code, title, desc]
}

const lines = []

lines.push("-- Generated by scripts/generate-seed.mjs (romanized Arabic names in English, UTF-8)")
lines.push("")

lines.push("-- ADMINS")
const adminRows = []
for (let i = 0; i < ADMINS; i++) {
  const id = `025${pad(11793 + i, 5)}`
  const email = i === 0 ? "admin@edutrack.edu" : `admin${pad(i + 1, 2)}@edutrack.edu`
  const name = ADMIN_NAMES[i] ?? `Administrator ${i + 1}`
  adminRows.push(`('${id}', '${esc(email)}', '${esc(name)}', '${pwd}', '${uni}')`)
}
lines.push(`INSERT INTO admins (id, email, full_name, password_hash, university_id)\nVALUES\n${adminRows.join(",\n")};`)
lines.push("")

lines.push("-- TEACHERS")
const teacherIds = []
const teacherBatches = []
let batch = []
for (let i = 1; i <= TEACHERS; i++) {
  const id = `125${pad(20000 + i, 5)}`
  teacherIds.push(id)
  const email = `t${pad(i, 3)}@edutrack.edu`
  const name = teacherName(i)
  const emp = `EMP${pad(i, 4)}`
  const dept = DEPARTMENTS[(i - 1) % DEPARTMENTS.length]
  batch.push(`('${id}', '${esc(email)}', '${esc(name)}', '${pwd}', '${emp}', '${esc(dept)}', '${uni}')`)
  if (batch.length >= 40) {
    teacherBatches.push(batch)
    batch = []
  }
}
if (batch.length) teacherBatches.push(batch)
for (const b of teacherBatches) {
  lines.push(`INSERT INTO teachers (id, email, full_name, password_hash, employee_id, department, university_id)\nVALUES\n${b.join(",\n")};`)
  lines.push("")
}

lines.push("-- STUDENTS")
const studentIds = []
const studentBatches = []
batch = []
for (let i = 1; i <= STUDENTS; i++) {
  const id = `225${pad(30000 + i, 5)}`
  studentIds.push(id)
  const email = `s${pad(i, 3)}@student.edutrack.edu`
  const name = studentName(i)
  const stuId = `STU${pad(i, 4)}`
  const major = MAJORS[(i - 1) % MAJORS.length]
  const gpa = (2.5 + ((i * 17) % 150) / 100).toFixed(2)
  batch.push(`('${id}', '${esc(email)}', '${esc(name)}', '${pwd}', '${stuId}', '${esc(major)}', ${gpa}, '${uni}')`)
  if (batch.length >= 40) {
    studentBatches.push(batch)
    batch = []
  }
}
if (batch.length) studentBatches.push(batch)
for (const b of studentBatches) {
  lines.push(
    `INSERT INTO students (id, email, full_name, password_hash, student_id, major, gpa, university_id)\nVALUES\n${b.join(",\n")};`,
  )
  lines.push("")
}

lines.push("-- COURSES")
const courseIds = []
batch = []
for (let c = 1; c <= COURSES; c++) {
  const cid = `course_b${pad(c, 3)}`
  courseIds.push(cid)
  const tid = teacherIds[(c - 1) % TEACHERS]
  const [code, title, desc] = courseMeta(c)
  batch.push(`('${cid}', '${esc(code)}', '${esc(title)}', '${esc(desc)}', '${tid}', '2026-Spring', 3, 80, '${uni}')`)
  if (batch.length >= 30) {
    lines.push(
      `INSERT INTO courses (id, course_code, course_name, description, teacher_id, semester, credits, max_capacity, university_id)\nVALUES\n${batch.join(",\n")};`,
    )
    lines.push("")
    batch = []
  }
}
if (batch.length) {
  lines.push(
    `INSERT INTO courses (id, course_code, course_name, description, teacher_id, semester, credits, max_capacity, university_id)\nVALUES\n${batch.join(",\n")};`,
  )
  lines.push("")
}

lines.push("-- ENROLLMENTS")
const grades = ["A", "A-", "B+", "B", "B-", "C+", "C", "C-"]
let enrollNum = 0
const enrollBatches = []
batch = []

function courseIndicesForStudent(s) {
  const set = new Set()
  let x = s * 31 + 7
  while (set.size < 4) {
    set.add((x % COURSES) + 1)
    x += 91
  }
  return [...set]
}

for (let s = 1; s <= STUDENTS; s++) {
  const studentId = studentIds[s - 1]
  const indices = courseIndicesForStudent(s)
  for (let k = 0; k < indices.length; k++) {
    const ci = indices[k]
    const courseId = courseIds[ci - 1]
    enrollNum++
    const eid = `en_b${pad(enrollNum, 6)}`
    const g = grades[(s + k + ci) % grades.length]
    batch.push(`('${eid}', '${courseId}', '${studentId}', '${g}')`)
    if (batch.length >= 100) {
      enrollBatches.push(batch)
      batch = []
    }
  }
}
if (batch.length) enrollBatches.push(batch)
for (const b of enrollBatches) {
  lines.push(`INSERT INTO course_enrollments (id, course_id, student_id, grade)\nVALUES\n${b.join(",\n")};`)
  lines.push("")
}

lines.push("-- LECTURES")
batch = []
for (let c = 1; c <= COURSES; c++) {
  const lid = `lec_b${pad(c, 3)}`
  const courseId = courseIds[c - 1]
  const [place, lat, lng] = LOCATIONS[(c - 1) % LOCATIONS.length]
  const day = 1 + (c % 28)
  batch.push(
    `('${lid}', '${courseId}', '2026-04-${pad(day, 2)} 00:00:00', '10:00', '11:30', '${esc(place)}', ${lat}, ${lng}, 100)`,
  )
  if (batch.length >= 45) {
    lines.push(
      `INSERT INTO lectures (id, course_id, lecture_date, start_time, end_time, location, latitude, longitude, allowed_radius_m)\nVALUES\n${batch.join(",\n")};`,
    )
    lines.push("")
    batch = []
  }
}
if (batch.length) {
  lines.push(
    `INSERT INTO lectures (id, course_id, lecture_date, start_time, end_time, location, latitude, longitude, allowed_radius_m)\nVALUES\n${batch.join(",\n")};`,
  )
  lines.push("")
}

lines.push("-- LECTURE MATERIALS (sample)")
const matRows = []
for (let m = 1; m <= 15; m++) {
  const lid = `lec_b${pad(m, 3)}`
  matRows.push(`('mat_b${pad(m, 3)}', '${lid}', 'Week 1 materials', '/materials/w1.pdf', 'Readings and exercises', 0)`)
}
lines.push(`INSERT INTO lecture_materials (id, lecture_id, title, file_url, description, attendance_required)\nVALUES\n${matRows.join(",\n")};`)

writeFileSync(OUT, lines.join("\n"), "utf8")
console.log(`Wrote ${OUT}`)
