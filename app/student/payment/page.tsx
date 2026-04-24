"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ProtectedRoute } from "@/components/protected-route"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

type PaymentData = {
  semester: string
  totalCredits: number
  pricePerCredit: number
  amount: number
  paidAmount: number
  balance: number
  status: "paid" | "unpaid"
  canPay: boolean
  pendingRequests: number
}

export default function StudentPaymentPage() {
  const [data, setData] = useState<PaymentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState("")
  const [cardName, setCardName] = useState("")
  const [cardNumber, setCardNumber] = useState("")
  const [exp, setExp] = useState("")
  const [cvc, setCvc] = useState("")
  const [payAmount, setPayAmount] = useState("")
  const [processing, setProcessing] = useState(false)

  const load = async () => {
    const res = await fetch("/api/student/payment", { credentials: "include" })
    const json = await res.json()
    if (!res.ok) throw new Error(json.message || "Failed to load payment")
    setData(json)
  }

  useEffect(() => {
    ;(async () => {
      try {
        await load()
      } catch (e) {
        setMsg(e instanceof Error ? e.message : "Failed to load")
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const processPayment = async () => {
    if (!data) return
    setProcessing(true)
    try {
      const res = await fetch("/api/student/payment", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardName, cardNumber, exp, cvc, amount: Number(payAmount) }),
      })
      const json = await res.json()
      if (!res.ok) {
        setMsg(json.message || "Payment update failed")
        return
      }
      setMsg(`Payment successful. Reference: ${json.reference}`)
      setPayAmount("")
      setCardNumber("")
      setCvc("")
      await load()
    } catch {
      setMsg("Payment failed. Please try again.")
    } finally {
      setProcessing(false)
    }
  }

  return (
    <ProtectedRoute allowedRoles={["student"]}>
      <main className="min-h-screen edu-dashboard-bg">
        <div className="max-w-3xl mx-auto px-4 py-10">
          <Card>
            <CardHeader>
              <CardTitle>Tuition Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {msg && <p className="text-sm text-indigo-700">{msg}</p>}
              {loading && <p className="text-sm text-slate-600">Loading…</p>}
              {data && (
                <>
                  <p>Semester: <strong>{data.semester}</strong></p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded border bg-slate-50 px-3 py-2">
                      <p className="text-xs text-slate-500">Total Tuition</p>
                      <p className="text-lg font-semibold">{data.amount.toLocaleString()}</p>
                    </div>
                    <div className="rounded border bg-slate-50 px-3 py-2">
                      <p className="text-xs text-slate-500">Paid</p>
                      <p className="text-lg font-semibold text-emerald-700">{data.paidAmount.toLocaleString()}</p>
                    </div>
                    <div className="rounded border bg-slate-50 px-3 py-2">
                      <p className="text-xs text-slate-500">Balance</p>
                      <p className="text-lg font-semibold text-amber-700">{data.balance.toLocaleString()}</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600">{data.totalCredits} credits</p>
                  {data.pendingRequests > 0 && (
                    <p className="text-sm text-amber-700">Payment unavailable ({data.pendingRequests} pending).</p>
                  )}
                  <p>
                    Status:{" "}
                    <span className={data.status === "paid" ? "text-emerald-700 font-semibold" : "text-amber-700 font-semibold"}>
                      {data.status.toUpperCase()}
                    </span>
                  </p>
                  <div className="flex gap-2">
                    <Button asChild variant="outline">
                      <Link href="/student/registration">Back to registration</Link>
                    </Button>
                  </div>
                  {data.status !== "paid" && (
                    <div className="rounded border p-3 space-y-3 bg-white">
                      <p className="font-medium">Pay Tuition</p>
                      <input
                        type="number"
                        min={1}
                        max={Math.max(1, data.balance)}
                        className="w-full border rounded-md h-10 px-2"
                        placeholder="Amount"
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                      />
                      <input
                        className="w-full border rounded-md h-10 px-2"
                        placeholder="Card holder name"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                      />
                      <input
                        className="w-full border rounded-md h-10 px-2"
                        placeholder="Card number"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          className="w-full border rounded-md h-10 px-2"
                          placeholder="MM/YY"
                          value={exp}
                          onChange={(e) => setExp(e.target.value)}
                        />
                        <input
                          className="w-full border rounded-md h-10 px-2"
                          placeholder="CVC"
                          value={cvc}
                          onChange={(e) => setCvc(e.target.value)}
                        />
                      </div>
                      <Button
                        onClick={() => void processPayment()}
                        className="bg-emerald-600 hover:bg-emerald-700"
                        disabled={!data.canPay || processing}
                      >
                        {processing ? "Processing..." : "Pay now"}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </ProtectedRoute>
  )
}
