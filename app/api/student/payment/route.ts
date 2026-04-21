import { type NextRequest, NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { getDb } from "@/lib/db"
import { forbidden, getSessionUser, unauthorized } from "@/lib/api-auth"

const PRICE_PER_CREDIT = 4000

function luhnOk(value: string) {
  const digits = value.replace(/\s+/g, "")
  if (!/^\d{13,19}$/.test(digits)) return false
  let sum = 0
  let alt = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = Number(digits[i])
    if (alt) {
      n *= 2
      if (n > 9) n -= 9
    }
    sum += n
    alt = !alt
  }
  return sum % 10 === 0
}

export async function GET() {
  const session = await getSessionUser()
  if (!session) return unauthorized()
  if (session.role !== "student") return forbidden()

  const db = getDb()
  const studentId = session.sub
  const semesterRow = db
    .prepare(
      `SELECT c.semester
       FROM course_enrollments e
       JOIN courses c ON c.id = e.course_id
       WHERE e.student_id = ?
       ORDER BY c.semester DESC
       LIMIT 1`,
    )
    .get(studentId) as { semester: string } | undefined

  const semester = semesterRow?.semester ?? "2026-Spring"
  const pendingInSemester = (
    db
      .prepare(
        `SELECT COUNT(*) AS n
         FROM enrollment_requests r
         JOIN courses c ON c.id = r.course_id
         WHERE r.student_id = ? AND r.status = 'pending' AND c.semester = ?`,
      )
      .get(studentId, semester) as { n: number }
  ).n
  const creditsRow = db
    .prepare(
      `SELECT COALESCE(SUM(c.credits), 0) AS total
       FROM course_enrollments e
       JOIN courses c ON c.id = e.course_id
       WHERE e.student_id = ? AND c.semester = ?`,
    )
    .get(studentId, semester) as { total: number }

  const totalCredits = Number(creditsRow.total || 0)
  const amount = totalCredits * PRICE_PER_CREDIT
  const existing = db
    .prepare("SELECT id, payment_status, paid_amount FROM student_payments WHERE student_id = ? AND semester = ?")
    .get(studentId, semester) as { id: string; payment_status: "unpaid" | "paid"; paid_amount: number | null } | undefined

  const paidAmount = Math.min(amount, Math.max(0, Number(existing?.paid_amount || 0)))
  const balance = Math.max(0, amount - paidAmount)

  return NextResponse.json({
    semester,
    totalCredits,
    pricePerCredit: PRICE_PER_CREDIT,
    amount,
    paidAmount,
    balance,
    status: balance <= 0 ? "paid" : "unpaid",
    canPay: pendingInSemester === 0 && amount > 0,
    pendingRequests: pendingInSemester,
  })
}

export async function PATCH(request: NextRequest) {
  const session = await getSessionUser()
  if (!session) return unauthorized()
  if (session.role !== "student") return forbidden()

  const body = await request.json()
  const cardName = String(body.cardName || "").trim()
  const cardNumber = String(body.cardNumber || "").trim()
  const exp = String(body.exp || "").trim()
  const cvc = String(body.cvc || "").trim()
  const amountInput = Number(body.amount || 0)
  if (!cardName || !cardNumber || !exp || !cvc) {
    return NextResponse.json({ message: "Card holder, card number, expiry and CVC are required" }, { status: 400 })
  }
  if (!luhnOk(cardNumber)) {
    return NextResponse.json({ message: "Invalid card number" }, { status: 400 })
  }
  if (!/^\d{2}\/\d{2}$/.test(exp)) {
    return NextResponse.json({ message: "Expiry must be MM/YY" }, { status: 400 })
  }
  if (!/^\d{3,4}$/.test(cvc)) {
    return NextResponse.json({ message: "Invalid CVC" }, { status: 400 })
  }

  const db = getDb()
  const studentId = session.sub
  const semesterRow = db
    .prepare(
      `SELECT c.semester
       FROM course_enrollments e
       JOIN courses c ON c.id = e.course_id
       WHERE e.student_id = ?
       ORDER BY c.semester DESC
       LIMIT 1`,
    )
    .get(studentId) as { semester: string } | undefined
  const semester = semesterRow?.semester ?? "2026-Spring"
  const pendingInSemester = (
    db
      .prepare(
        `SELECT COUNT(*) AS n
         FROM enrollment_requests r
         JOIN courses c ON c.id = r.course_id
         WHERE r.student_id = ? AND r.status = 'pending' AND c.semester = ?`,
      )
      .get(studentId, semester) as { n: number }
  ).n

  const creditsRow = db
    .prepare(
      `SELECT COALESCE(SUM(c.credits), 0) AS total
       FROM course_enrollments e
       JOIN courses c ON c.id = e.course_id
       WHERE e.student_id = ? AND c.semester = ?`,
    )
    .get(studentId, semester) as { total: number }
  const totalCredits = Number(creditsRow.total || 0)
  const amount = totalCredits * PRICE_PER_CREDIT
  if (pendingInSemester > 0) {
    return NextResponse.json({ message: "Payment is blocked until all course requests are reviewed" }, { status: 400 })
  }
  if (amount <= 0) {
    return NextResponse.json({ message: "No approved course balance to pay" }, { status: 400 })
  }

  const existing = db
    .prepare("SELECT id, paid_amount FROM student_payments WHERE student_id = ? AND semester = ?")
    .get(studentId, semester) as { id: string; paid_amount: number | null } | undefined
  const currentPaid = Math.min(amount, Math.max(0, Number(existing?.paid_amount || 0)))
  const balance = Math.max(0, amount - currentPaid)
  if (balance <= 0) {
    return NextResponse.json({ message: "Your semester balance is already fully paid." }, { status: 400 })
  }

  const payAmount = Math.floor(amountInput)
  if (!Number.isFinite(payAmount) || payAmount <= 0) {
    return NextResponse.json({ message: "Enter a valid payment amount." }, { status: 400 })
  }
  if (payAmount > balance) {
    return NextResponse.json({ message: "Payment amount cannot be greater than current balance." }, { status: 400 })
  }

  const ref = `TXN-${Date.now()}-${randomUUID().slice(0, 6).toUpperCase()}`
  const nextPaid = Math.min(amount, currentPaid + payAmount)
  const nextStatus = nextPaid >= amount ? "paid" : "unpaid"

  if (existing) {
    db.prepare(
      `UPDATE student_payments
       SET total_credits = ?, amount = ?, paid_amount = ?, payment_status = ?, payment_reference = ?, payment_provider = 'card',
           paid_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
    ).run(totalCredits, amount, nextPaid, nextStatus, ref, existing.id)
  } else {
    db.prepare(
      `INSERT INTO student_payments
       (id, student_id, semester, total_credits, amount, paid_amount, amount_per_credit, payment_status, payment_reference, payment_provider, paid_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'card', CURRENT_TIMESTAMP)`,
    ).run(
      `pay_${randomUUID().slice(0, 10)}`,
      studentId,
      semester,
      totalCredits,
      amount,
      nextPaid,
      PRICE_PER_CREDIT,
      nextStatus,
      ref,
    )
  }

  return NextResponse.json({ success: true, reference: ref, paidAmount: nextPaid, balance: Math.max(0, amount - nextPaid) })
}
