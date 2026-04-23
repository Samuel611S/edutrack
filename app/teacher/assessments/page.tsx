"use client"

import { useEffect, useMemo, useState } from "react"
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
  course_code: string
  course_name: string
}

type DraftQuestion = { prompt: string; optionsText: string; correctIndex: string }

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
  const [question, setQuestion] = useState<DraftQuestion>({
    prompt: "",
    optionsText: "Option A\nOption B\nOption C\nOption D",
    correctIndex: "0",
  })

  const [asgTitle, setAsgTitle] = useState("")
  const [asgDesc, setAsgDesc] = useState("")
  const [asgDue, setAsgDue] = useState("")

  const options = useMemo(
    () =>
      question.optionsText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    [question.optionsText],
  )

  const load = async () => {
    setError("")
    setLoading(true)
    try {
      const ov = await fetch("/api/teacher/overview", { credentials: "include" }).then((r) => r.json())
      const cs = (ov?.courses || []) as any[]
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
    try {
      const res = await fetch("/api/teacher/assessments/quizzes", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          title: quizTitle,
          description: quizDesc,
          questions: [
            {
              prompt: question.prompt,
              options,
              correctIndex: Number(question.correctIndex || 0),
            },
          ],
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.message || "Could not create quiz")
        return
      }
      setQuizTitle("")
      setQuizDesc("")
      setQuestion((q) => ({ ...q, prompt: "" }))
      await load()
    } catch {
      setError("Network error creating quiz")
    }
  }

  const createAssignment = async () => {
    setError("")
    try {
      const res = await fetch("/api/teacher/assessments/assignments", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          title: asgTitle,
          description: asgDesc,
          dueAt: asgDue || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.message || "Could not create assignment")
        return
      }
      setAsgTitle("")
      setAsgDesc("")
      setAsgDue("")
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
                    <CardDescription>For now: quick 1-question quiz (you can extend later).</CardDescription>
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
                      <Label>Question</Label>
                      <Input value={question.prompt} onChange={(e) => setQuestion((q) => ({ ...q, prompt: e.target.value }))} placeholder="Question prompt" />
                    </div>
                    <div>
                      <Label>Options (one per line)</Label>
                      <textarea
                        value={question.optionsText}
                        onChange={(e) => setQuestion((q) => ({ ...q, optionsText: e.target.value }))}
                        className="w-full min-h-28 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <Label>Correct option index (0-based)</Label>
                      <Input value={question.correctIndex} onChange={(e) => setQuestion((q) => ({ ...q, correctIndex: e.target.value }))} />
                      <p className="text-xs text-slate-500 mt-1">Example: 0 means the first option is correct.</p>
                    </div>
                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={createQuiz} disabled={!quizTitle || !question.prompt || options.length < 2}>
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
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="assignments" className="space-y-4">
                <Card className="bg-white/90 border-white/80 shadow-md shadow-indigo-950/5">
                  <CardHeader>
                    <CardTitle>Create assignment</CardTitle>
                    <CardDescription>Students will upload a file submission online.</CardDescription>
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

