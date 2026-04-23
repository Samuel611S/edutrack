"use client"

import { useEffect, useMemo, useState } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useRouter } from "next/navigation"

type QuizListItem = {
  id: string
  course_code: string
  course_name: string
  title: string
  description: string | null
  question_count: number
  my_score: number | null
  my_max: number | null
}

type AssignmentListItem = {
  id: string
  course_code: string
  course_name: string
  title: string
  description: string | null
  due_at: string | null
  submitted_at: string | null
}

export default function StudentAssessmentsPage() {
  const router = useRouter()
  const [tab, setTab] = useState("quizzes")
  const [quizzes, setQuizzes] = useState<QuizListItem[]>([])
  const [assignments, setAssignments] = useState<AssignmentListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [activeQuizId, setActiveQuizId] = useState<string | null>(null)
  const [quiz, setQuiz] = useState<any>(null)
  const [questions, setQuestions] = useState<{ id: string; prompt: string; options: string[] }[]>([])
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [quizResult, setQuizResult] = useState<{ score: number; max: number } | null>(null)

  const load = async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/student/assessments", { credentials: "include" })
      const json = await res.json()
      if (!res.ok) {
        setError(json.message || "Could not load")
      } else {
        setQuizzes(json.quizzes || [])
        setAssignments(json.assignments || [])
      }
    } catch {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const openQuiz = async (id: string) => {
    setActiveQuizId(id)
    setQuizResult(null)
    setAnswers({})
    const res = await fetch(`/api/student/quizzes/${encodeURIComponent(id)}`, { credentials: "include" })
    const json = await res.json()
    if (!res.ok) {
      setError(json.message || "Could not open quiz")
      return
    }
    setQuiz(json.quiz)
    setQuestions(json.questions || [])
  }

  const canSubmitQuiz = useMemo(() => {
    if (!activeQuizId) return false
    if (!questions.length) return false
    return questions.every((q) => typeof answers[q.id] === "number")
  }, [activeQuizId, questions, answers])

  const submitQuiz = async () => {
    if (!activeQuizId) return
    const res = await fetch(`/api/student/quizzes/${encodeURIComponent(activeQuizId)}/attempt`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.message || "Could not submit")
      return
    }
    setQuizResult({ score: json.score, max: json.max })
    await load()
  }

  const submitAssignment = async (assignmentId: string, file: File, note: string) => {
    setError("")
    const fd = new FormData()
    fd.set("file", file)
    fd.set("note", note || "")
    const res = await fetch(`/api/student/assignments/${encodeURIComponent(assignmentId)}/submit`, {
      method: "POST",
      credentials: "include",
      body: fd,
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.message || "Could not submit assignment")
      return
    }
    await load()
  }

  return (
    <ProtectedRoute allowedRoles={["student"]}>
      <main className="min-h-screen edu-dashboard-bg">
        <header className="edu-dashboard-header sticky top-0 z-50 border-b border-white/70 bg-white/80 backdrop-blur-md shadow-sm shadow-indigo-950/5">
          <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Assessments</h1>
              <p className="text-sm text-slate-600">Take quizzes online and upload assignment submissions.</p>
            </div>
            <Button variant="outline" className="w-full sm:w-auto border-gray-300" onClick={() => router.back()}>
              Back
            </Button>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 py-8">
          {loading && <p className="text-slate-600 text-sm animate-pulse">Loading…</p>}
          {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

          {!loading && (
            <Tabs value={tab} onValueChange={setTab} className="w-full">
              <TabsList className="mb-6 inline-flex h-auto flex-wrap gap-1 rounded-xl border border-white/80 bg-white/70 p-1.5 shadow-sm backdrop-blur-sm">
                <TabsTrigger value="quizzes" className="rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                  Quizzes
                </TabsTrigger>
                <TabsTrigger value="assignments" className="rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                  Assignments
                </TabsTrigger>
              </TabsList>

              <TabsContent value="quizzes" className="space-y-4">
                {activeQuizId && quiz && (
                  <Card className="bg-white/90 border-white/80 shadow-md shadow-indigo-950/5">
                    <CardHeader>
                      <CardTitle>{quiz.title}</CardTitle>
                      <CardDescription>{quiz.course_code} — {quiz.course_name}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {questions.map((q, idx) => (
                        <div key={q.id} className="rounded-md border border-gray-200 p-3">
                          <p className="font-medium text-gray-900">
                            {idx + 1}. {q.prompt}
                          </p>
                          <div className="mt-2 space-y-2">
                            {q.options.map((opt, oi) => (
                              <label key={oi} className="flex items-center gap-2 text-sm text-slate-700">
                                <input
                                  type="radio"
                                  name={q.id}
                                  checked={answers[q.id] === oi}
                                  onChange={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
                                />
                                {opt}
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}

                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={submitQuiz} disabled={!canSubmitQuiz}>
                          Submit quiz
                        </Button>
                        <Button variant="outline" className="border-gray-300" onClick={() => { setActiveQuizId(null); setQuiz(null); setQuestions([]); setAnswers({}); }}>
                          Close
                        </Button>
                      </div>

                      {quizResult && (
                        <p className="text-sm font-semibold text-emerald-700">
                          Score: {quizResult.score} / {quizResult.max}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {quizzes.map((q) => (
                    <Card key={q.id} className="bg-white border-gray-200 shadow-sm">
                      <CardContent className="pt-6">
                        <p className="text-sm text-slate-500">{q.course_code}</p>
                        <p className="text-lg font-semibold text-gray-900">{q.title}</p>
                        {q.description && <p className="text-sm text-slate-600 mt-1">{q.description}</p>}
                        <p className="text-xs text-slate-500 mt-2">
                          Questions: {q.question_count}{" "}
                          {q.my_score != null && q.my_max != null ? `— Your score: ${q.my_score}/${q.my_max}` : ""}
                        </p>
                        <Button className="mt-3 bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => openQuiz(q.id)}>
                          Take quiz
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="assignments" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {assignments.map((a) => (
                    <Card key={a.id} className="bg-white border-gray-200 shadow-sm">
                      <CardContent className="pt-6">
                        <p className="text-sm text-slate-500">{a.course_code}</p>
                        <p className="text-lg font-semibold text-gray-900">{a.title}</p>
                        {a.description && <p className="text-sm text-slate-600 mt-1">{a.description}</p>}
                        <p className="text-xs text-slate-500 mt-2">
                          {a.submitted_at ? `Submitted: ${String(a.submitted_at)}` : "Not submitted yet"}
                        </p>
                        <AssignmentUploader assignmentId={a.id} onSubmit={submitAssignment} />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </main>
    </ProtectedRoute>
  )
}

function AssignmentUploader({
  assignmentId,
  onSubmit,
}: {
  assignmentId: string
  onSubmit: (assignmentId: string, file: File, note: string) => Promise<void>
}) {
  const [note, setNote] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    if (!file) return
    setSubmitting(true)
    try {
      await onSubmit(assignmentId, file, note)
      setNote("")
      setFile(null)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mt-3 space-y-2">
      <input
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="block w-full text-sm"
      />
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Optional note"
        className="w-full min-h-16 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
      />
      <Button
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
        disabled={!file || submitting}
        onClick={submit}
      >
        {submitting ? "Submitting…" : "Upload submission"}
      </Button>
    </div>
  )
}

