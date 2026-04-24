"use client"

import { useEffect, useMemo, useState } from "react"
import { parseQuizDraft } from "@/lib/quiz-draft-parser"
import { formatDateTimeAmPm } from "@/lib/time-format"
import { ProtectedRoute } from "@/components/protected-route"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useRouter } from "next/navigation"

type Course = { id: string; course_code: string; course_name: string }

type Quiz = {
  id: string
  course_id: string
  title: string
  description: string | null
  open_at: string | null
  due_at: string | null
  created_at: string
  course_code: string
  course_name: string
}

type Assignment = {
  id: string
  course_id: string
  title: string
  description: string | null
  due_at: string | null
  created_at: string
  submissions: number
  handout_file_id: string | null
  course_code: string
  course_name: string
}

export default function TeacherAssessmentsPage() {
  const router = useRouter()
  const [tab, setTab] = useState("quizzes")
  const [courses, setCourses] = useState<Course[]>([])
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [courseId, setCourseId] = useState("")

  const [quizTitle, setQuizTitle] = useState("")
  const [quizDesc, setQuizDesc] = useState("")
  const [quizDraft, setQuizDraft] = useState(
    "1. Sample question?\nA) Wrong\nB) Correct\nC) Wrong\n\n2. Second question?\nA) Yes\nB) No",
  )
  const [answerKey, setAnswerKey] = useState("1=b 2=a")
  const [quizDueAt, setQuizDueAt] = useState("")

  const [asgTitle, setAsgTitle] = useState("")
  const [asgDesc, setAsgDesc] = useState("")
  const [asgDue, setAsgDue] = useState("")
  const [asgPdf, setAsgPdf] = useState<File | null>(null)

  const preview = useMemo(() => {
    try {
      const qs = parseQuizDraft(quizDraft, answerKey)
      return { ok: true as const, count: qs.length, error: "" }
    } catch (e) {
      return { ok: false as const, count: 0, error: e instanceof Error ? e.message : "Invalid draft" }
    }
  }, [quizDraft, answerKey])

  const load = async () => {
    setError("")
    setLoading(true)
    try {
      const ov = await fetch("/api/teacher/overview", { credentials: "include" }).then((r) => r.json())
      const cs = (ov?.courses || []) as Course[]
      const mapped = cs.map((c) => ({ id: c.id, course_code: c.course_code, course_name: c.course_name }))
      setCourses(mapped)
      if (!courseId && mapped[0]) setCourseId(mapped[0].id)

      const q = await fetch("/api/teacher/assessments/quizzes", { credentials: "include" }).then((r) => r.json())
      setQuizzes(q?.quizzes || [])

      const a = await fetch("/api/teacher/assessments/assignments", { credentials: "include" }).then((r) => r.json())
      setAssignments(a?.assignments || [])
    } catch {
      setError("Could not load assessments")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const createQuiz = async () => {
    setError("")
    if (!preview.ok) {
      setError(preview.error)
      return
    }
    try {
      const res = await fetch("/api/teacher/assessments/quizzes", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          title: quizTitle,
          description: quizDesc,
          dueAt: quizDueAt,
          quizDraft,
          answerKey,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.message || "Could not create quiz")
        return
      }
      setQuizTitle("")
      setQuizDesc("")
      setQuizDueAt("")
      await load()
    } catch {
      setError("Network error creating quiz")
    }
  }

  const createAssignment = async () => {
    setError("")
    try {
      const fd = new FormData()
      fd.set("courseId", courseId)
      fd.set("title", asgTitle)
      fd.set("description", asgDesc)
      if (asgDue) fd.set("dueAt", asgDue)
      if (asgPdf) fd.set("file", asgPdf)

      const res = await fetch("/api/teacher/assessments/assignments", {
        method: "POST",
        credentials: "include",
        body: fd,
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.message || "Could not create assignment")
        return
      }
      setAsgTitle("")
      setAsgDesc("")
      setAsgDue("")
      setAsgPdf(null)
      await load()
    } catch {
      setError("Network error creating assignment")
    }
  }

  return (
    <ProtectedRoute allowedRoles={["teacher", "admin"]}>
      <main className="min-h-screen edu-dashboard-bg">
        <header className="edu-dashboard-header sticky top-0 z-50 border-b border-white/70 bg-white/80 backdrop-blur-md shadow-sm shadow-indigo-950/5">
          <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Assessments</h1>
              <p className="text-sm text-slate-600">Create online quizzes and assignments for your students.</p>
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

              <div className="mb-6">
                <Label>Course</Label>
                <select
                  className="w-full border rounded-md h-10 px-2 bg-white"
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.course_code} — {c.course_name}
                    </option>
                  ))}
                </select>
              </div>

              <TabsContent value="quizzes" className="space-y-4">
                <Card className="bg-white/90 border-white/80 shadow-md shadow-indigo-950/5">
                  <CardHeader>
                    <CardTitle>Create quiz</CardTitle>
                    <CardDescription>
                      Type all questions and choices. Start each question with a number (e.g. <code className="text-xs">1.</code> or{" "}
                      <code className="text-xs">2)</code>). Each choice on its own line as <code className="text-xs">A) ...</code>,{" "}
                      <code className="text-xs">B) ...</code>. Then set the answer key like <code className="text-xs">1=a 2=c 3=b</code>.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label>Title</Label>
                      <Input value={quizTitle} onChange={(e) => setQuizTitle(e.target.value)} placeholder="Quiz title" />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Input value={quizDesc} onChange={(e) => setQuizDesc(e.target.value)} placeholder="Optional" />
                    </div>
                    <div>
                      <Label>Answer by (date and time)</Label>
                      <Input
                        type="datetime-local"
                        value={quizDueAt}
                        onChange={(e) => setQuizDueAt(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label>Questions and choices</Label>
                      <textarea
                        value={quizDraft}
                        onChange={(e) => setQuizDraft(e.target.value)}
                        className="w-full min-h-56 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-mono"
                        spellCheck={false}
                      />
                    </div>
                    <div>
                      <Label>Answer key</Label>
                      <Input value={answerKey} onChange={(e) => setAnswerKey(e.target.value)} placeholder="1=a 2=c 3=b 4=d" />
                    </div>
                    <p className={`text-sm ${preview.ok ? "text-emerald-700" : "text-amber-700"}`}>
                      {preview.ok ? `Preview: ${preview.count} question(s) ready to save.` : `Preview: ${preview.error}`}
                    </p>
                    <Button
                      className="bg-indigo-600 hover:bg-indigo-700 text-white"
                      onClick={createQuiz}
                      disabled={!quizTitle || !quizDueAt || !preview.ok}
                    >
                      Create quiz
                    </Button>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {quizzes.map((q) => (
                    <Card key={q.id} className="bg-white border-gray-200 shadow-sm">
                      <CardContent className="pt-6">
                        <p className="text-sm text-slate-500">{q.course_code}</p>
                        <p className="text-lg font-semibold text-gray-900">{q.title}</p>
                        {q.description && <p className="text-sm text-slate-600 mt-1">{q.description}</p>}
                        {q.due_at ? (
                          <p className="text-xs text-slate-500 mt-2">Answer by: {formatDateTimeAmPm(q.due_at)}</p>
                        ) : null}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="assignments" className="space-y-4">
                <Card className="bg-white/90 border-white/80 shadow-md shadow-indigo-950/5">
                  <CardHeader>
                    <CardTitle>Create assignment</CardTitle>
                    <CardDescription>
                      Optional: attach the assignment brief as a <strong>PDF</strong> (max 5MB). Students submit answers as a <strong>PDF</strong> too.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label>Title</Label>
                      <Input value={asgTitle} onChange={(e) => setAsgTitle(e.target.value)} placeholder="Assignment title" />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Input value={asgDesc} onChange={(e) => setAsgDesc(e.target.value)} placeholder="Optional instructions" />
                    </div>
                    <div>
                      <Label>Due date/time (optional)</Label>
                      <Input value={asgDue} onChange={(e) => setAsgDue(e.target.value)} placeholder="2026-05-01 23:59" />
                    </div>
                    <div>
                      <Label>Assignment PDF (optional)</Label>
                      <Input
                        type="file"
                        accept=".pdf,application/pdf"
                        onChange={(e) => setAsgPdf(e.target.files?.[0] || null)}
                        className="cursor-pointer"
                      />
                    </div>
                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={createAssignment} disabled={!asgTitle}>
                      Create assignment
                    </Button>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {assignments.map((a) => (
                    <Card key={a.id} className="bg-white border-gray-200 shadow-sm">
                      <CardContent className="pt-6">
                        <p className="text-sm text-slate-500">{a.course_code}</p>
                        <p className="text-lg font-semibold text-gray-900">{a.title}</p>
                        {a.description && <p className="text-sm text-slate-600 mt-1">{a.description}</p>}
                        <p className="text-xs text-slate-500 mt-2">Submissions: {a.submissions}</p>
                        {a.handout_file_id && (
                          <a
                            className="mt-2 inline-block text-sm text-indigo-600 hover:underline"
                            href={`/api/files/${encodeURIComponent(a.handout_file_id)}`}
                          >
                            Download assignment PDF
                          </a>
                        )}
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

