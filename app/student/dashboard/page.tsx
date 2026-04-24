"use client"

import { useAuth } from "@/lib/auth-context"
import { ProtectedRoute } from "@/components/protected-route"
import { DashboardEntrance } from "@/components/dashboard-entrance"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BookOpen,
  Calendar,
  BarChart3,
  LogOut,
  CheckCircle,
  AlertCircle,
  MapPin,
  Award,
  Download,
  FileText,
  Video,
  ExternalLink,
  Play,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import {
  youtubeEmbedUrlForActivatedPlayer,
  youtubeVideoIdFromEmbedUrl,
  youtubeWatchOrShareToEmbed,
} from "@/lib/youtube-embed"

type Overview = {
  stats: { enrolledCourses: number; avgAttendance: number; gpa: number; upcomingCount: number }
  attendanceSummary: { attended: number; missed: number }
  courses: {
    id: string
    code: string
    name: string
    teacher: string
    grade: string
    attendance: number
    progress: number
  }[]
  upcomingLectures: { id: string; course: string; date: string; time: string; location: string; attended: boolean }[]
  materialsByCourse: {
    code: string
    name: string
    items: { id: string; title: string; kind: "video" | "pdf" | "file"; href: string | null; description: string | null }[]
  }[]
  finance: {
    semester: string
    tuitionAmount: number
    paidAmount: number
    balance: number
    paymentStatus: "paid" | "unpaid"
  }
}

function isPdfLink(href: string | null) {
  if (!href) return false
  const path = href.split("?")[0].toLowerCase()
  return path.endsWith(".pdf")
}

const YT_IFRAME_ALLOW =
  "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"

function MaterialBlock({
  item,
}: {
  item: { id: string; title: string; kind: "video" | "pdf" | "file"; href: string | null; description: string | null }
}) {
  const href = item.href
  const safeHref = href ? encodeURI(href) : null
  const showPdf = item.kind === "pdf" || (item.kind === "file" && isPdfLink(href))
  const yt = item.kind === "video" && safeHref ? youtubeWatchOrShareToEmbed(safeHref) : null
  const ytIframeRef = useRef<HTMLIFrameElement>(null)
  const [ytRevealed, setYtRevealed] = useState(false)
  const ytThumbId = yt ? youtubeVideoIdFromEmbedUrl(yt) : null

  const activateYoutube = () => {
    if (!yt || !ytIframeRef.current) return
    ytIframeRef.current.src = youtubeEmbedUrlForActivatedPlayer(yt)
    setYtRevealed(true)
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden shadow-sm">
      <div className="flex items-start gap-3 p-3 border-b border-gray-100 bg-gray-50/80">
        {item.kind === "video" ? (
          <Video className="w-5 h-5 text-violet-600 shrink-0 mt-0.5" />
        ) : showPdf ? (
          <FileText className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        ) : (
          <BookOpen className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-gray-900 text-sm font-semibold">{item.title}</p>
          {item.description && <p className="text-gray-600 text-xs mt-1 leading-relaxed">{item.description}</p>}
        </div>
        {safeHref && (
          <a
            href={safeHref}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open
          </a>
        )}
      </div>
      <div className="p-3 bg-white">
        {!safeHref && <p className="text-xs text-gray-500">No link available.</p>}
        {safeHref && item.kind === "video" && yt && (
          <div className="space-y-2">
            <div className="relative aspect-video w-full max-w-3xl mx-auto rounded-md overflow-hidden bg-black">
              <iframe
                ref={ytIframeRef}
                title={item.title}
                className="absolute inset-0 h-full w-full border-0"
                allowFullScreen
                allow={YT_IFRAME_ALLOW}
                referrerPolicy="strict-origin-when-cross-origin"
              />
              {!ytRevealed && (
                <button
                  type="button"
                  onClick={activateYoutube}
                  className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/45 text-white hover:bg-black/55 transition-colors"
                  aria-label={`Play video: ${item.title}`}
                >
                  {ytThumbId && (
                    <Image
                      src={`https://i.ytimg.com/vi/${ytThumbId}/hqdefault.jpg`}
                      alt=""
                      fill
                      className="object-cover opacity-90"
                      sizes="(max-width: 768px) 100vw, 896px"
                    />
                  )}
                  <span className="relative z-20 inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-600 shadow-lg ring-4 ring-white/30">
                    <Play className="h-8 w-8 ml-1 fill-white text-white" />
                  </span>
                  <span className="relative z-20 text-sm font-semibold drop-shadow-md">Play video (enables sound)</span>
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500 max-w-3xl mx-auto">
              Click play above first so your browser allows audio. If it is still silent, the upload may have no audio or{" "}
              <a href={safeHref} target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline">
                open on YouTube
              </a>
              .
            </p>
          </div>
        )}
        {safeHref && item.kind === "video" && !yt && (
          <p className="text-xs text-gray-600">
            This video uses a link that is not embedded here. Use <strong>Open</strong> to watch in a new tab.
          </p>
        )}
        {safeHref && showPdf && (
          <div className="space-y-2">
            <div className="w-full h-[min(70vh,520px)] rounded-md border border-gray-200 bg-slate-50 overflow-hidden">
              <iframe title={item.title} src={safeHref} className="w-full h-full border-0" />
            </div>
            <p className="text-xs text-gray-500">
              If the document does not load inside the page, use Open to view it in a new tab.
            </p>
          </div>
        )}
        {safeHref && item.kind === "file" && !showPdf && (
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs text-gray-600">Lecture attachment</span>
            <a
              href={safeHref}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="inline-flex items-center gap-1.5 text-sm text-indigo-600 font-medium hover:underline"
            >
              <Download className="w-4 h-4" />
              Download / view
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

export default function StudentDashboard() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("courses")
  const [data, setData] = useState<Overview | null>(null)
  const [loadError, setLoadError] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/student/overview", { credentials: "include" })
        const json = await res.json()
        if (cancelled) return
        if (!res.ok) {
          setLoadError(json.message || "Failed to load dashboard")
          return
        }
        setData(json)
      } catch {
        if (!cancelled) setLoadError("Network error")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const handleLogout = async () => {
    await logout()
    router.push("/login")
  }

  return (
    <ProtectedRoute allowedRoles={["student"]}>
      <DashboardEntrance>
        <main className="min-h-screen edu-dashboard-bg">
          <header className="edu-dashboard-header sticky top-0 z-50 border-b border-white/70 bg-white/80 backdrop-blur-md shadow-sm shadow-indigo-950/5">
          <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Student Portal</h1>
              <Link href="/student/attendance" className="mt-1 inline-block text-sm text-blue-600 hover:underline">
                Quick check-in
              </Link>
            </div>
            <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
              <Button asChild size="sm" variant="outline" className="border-gray-300">
                <Link href="/student/assessments">Assessments</Link>
              </Button>
              <Button asChild size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                <Link href="/student/registration">Course selection</Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="border-gray-300">
                <Link href="/student/payment">Payment</Link>
              </Button>
              <div className="text-right">
                <p className="text-gray-900 font-medium">{user?.name}</p>
                <p className="text-gray-500 text-xs">Student</p>
              </div>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="border-gray-300 text-gray-700 hover:bg-gray-100 bg-transparent"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 py-8 edu-tabs-enter">
          {loading && (
            <p className="text-slate-600 text-sm animate-pulse">Loading your dashboard…</p>
          )}
          {loadError && <p className="text-red-600">{loadError}</p>}

          {data && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 edu-stat-stagger">
                <Card className="bg-white/90 border-white/80 shadow-md shadow-indigo-950/5 hover:shadow-lg transition-shadow duration-300">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-600 text-sm">Enrolled Courses</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">{data.stats.enrolledCourses}</p>
                      </div>
                      <div className="bg-blue-100 p-3 rounded-lg">
                        <BookOpen className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/90 border-white/80 shadow-md shadow-indigo-950/5 hover:shadow-lg transition-shadow duration-300">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-600 text-sm">Avg Attendance</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">{data.stats.avgAttendance}%</p>
                      </div>
                      <div className="bg-emerald-100 p-3 rounded-lg">
                        <BarChart3 className="w-6 h-6 text-emerald-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/90 border-white/80 shadow-md shadow-indigo-950/5 hover:shadow-lg transition-shadow duration-300">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-600 text-sm">GPA</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">{data.stats.gpa}</p>
                      </div>
                      <div className="bg-purple-100 p-3 rounded-lg">
                        <Award className="w-6 h-6 text-purple-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/90 border-white/80 shadow-md shadow-indigo-950/5 hover:shadow-lg transition-shadow duration-300">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-600 text-sm">Upcoming Lectures</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">{data.stats.upcomingCount}</p>
                      </div>
                      <div className="bg-amber-100 p-3 rounded-lg">
                        <Calendar className="w-6 h-6 text-amber-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-white border-gray-200 shadow-sm mb-8">
                <CardHeader>
                  <CardTitle className="text-gray-900 text-base">Financial Summary</CardTitle>
                  <CardDescription className="text-gray-600">{data.finance.semester}</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="rounded border bg-slate-50 px-3 py-2">
                    <p className="text-xs text-slate-500">Tuition</p>
                    <p className="font-semibold">{data.finance.tuitionAmount.toLocaleString()}</p>
                  </div>
                  <div className="rounded border bg-slate-50 px-3 py-2">
                    <p className="text-xs text-slate-500">Paid</p>
                    <p className="font-semibold text-emerald-700">{data.finance.paidAmount.toLocaleString()}</p>
                  </div>
                  <div className="rounded border bg-slate-50 px-3 py-2">
                    <p className="text-xs text-slate-500">Balance</p>
                    <p className="font-semibold text-amber-700">{data.finance.balance.toLocaleString()}</p>
                  </div>
                </CardContent>
              </Card>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="mb-6 inline-flex h-auto flex-wrap gap-1 rounded-xl border border-white/80 bg-white/70 p-1.5 shadow-sm backdrop-blur-sm">
                  <TabsTrigger
                    value="courses"
                    className="rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=inactive]:text-slate-600"
                  >
                    My Courses
                  </TabsTrigger>
                  <TabsTrigger
                    value="attendance"
                    className="rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=inactive]:text-slate-600"
                  >
                    My Attendance
                  </TabsTrigger>
                  <TabsTrigger
                    value="upcoming"
                    className="rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=inactive]:text-slate-600"
                  >
                    Upcoming Lectures
                  </TabsTrigger>
                  <TabsTrigger
                    value="materials"
                    className="rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=inactive]:text-slate-600"
                  >
                    Course Materials
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="courses" className="space-y-4">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Enrolled Courses</h2>
                  <div className="space-y-4">
                    {data.courses.map((course) => (
                      <Card key={course.id} className="bg-white border-gray-200 shadow-sm hover:shadow-md transition">
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <p className="text-gray-600 text-sm">{course.code}</p>
                              <h3 className="text-xl font-bold text-gray-900 mt-1">{course.name}</h3>
                              <p className="text-gray-600 text-sm mt-2">Instructor: {course.teacher}</p>
                            </div>
                            <div className="text-right">
                              <div className="bg-emerald-100 px-3 py-2 rounded">
                                <p className="text-emerald-600 font-bold text-lg">{course.grade}</p>
                                <p className="text-gray-600 text-xs">Current Grade</p>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div>
                              <div className="flex justify-between items-center mb-2">
                                <p className="text-gray-600 text-sm">Course Progress</p>
                                <span className="text-gray-900 font-semibold">{course.progress}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full"
                                  style={{ width: `${course.progress}%` }}
                                />
                              </div>
                            </div>

                            <div>
                              <div className="flex justify-between items-center mb-2">
                                <p className="text-gray-600 text-sm">Attendance Rate</p>
                                <span className="text-emerald-600 font-semibold">{course.attendance}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-emerald-600 h-2 rounded-full"
                                  style={{ width: `${Math.min(100, course.attendance)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="attendance" className="space-y-4">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Attendance Summary</h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <Card className="bg-white border-gray-200 shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-gray-900 text-sm">Sessions marked present</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <p className="text-4xl font-bold text-emerald-600">{data.attendanceSummary.attended}</p>
                          <CheckCircle className="w-12 h-12 text-emerald-600" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-white border-gray-200 shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-gray-900 text-sm">Sessions not marked</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <p className="text-4xl font-bold text-amber-600">{data.attendanceSummary.missed}</p>
                          <AlertCircle className="w-12 h-12 text-amber-600" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="bg-white border-gray-200 shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-gray-900">Course-wise Attendance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {data.courses.map((course) => (
                          <div key={course.id} className="pb-4 border-b border-gray-200 last:border-0">
                            <div className="flex justify-between items-center mb-2">
                              <p className="text-gray-900 font-medium">
                                {course.code} - {course.name}
                              </p>
                              <span className="text-emerald-600">{course.attendance}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-emerald-600 h-2 rounded-full"
                                style={{ width: `${Math.min(100, course.attendance)}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                </TabsContent>

                <TabsContent value="upcoming" className="space-y-4">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Upcoming Lectures</h2>
                  <div className="space-y-4">
                    {data.upcomingLectures.length === 0 && (
                      <p className="text-gray-600 text-sm">No upcoming lectures in the database.</p>
                    )}
                    {data.upcomingLectures.map((lecture) => (
                      <Card
                        key={lecture.id}
                        className={`border transition ${
                          lecture.attended ? "bg-emerald-50 border-emerald-200" : "bg-white border-gray-200"
                        } shadow-sm`}
                      >
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                <Calendar className="w-5 h-5 text-purple-600" />
                                <div>
                                  <p className="text-gray-900 font-semibold">{lecture.course}</p>
                                  <p className="text-gray-600 text-sm">
                                    {lecture.date} at {lecture.time}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <MapPin className="w-5 h-5 text-pink-600" />
                                <p className="text-gray-700">{lecture.location}</p>
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-2">
                              {lecture.attended ? (
                                <div className="bg-emerald-100 px-3 py-1 rounded-full flex items-center gap-2">
                                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                                  <span className="text-emerald-600 text-sm font-semibold">Attended</span>
                                </div>
                              ) : (
                                <Button
                                  type="button"
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
                                  onClick={() => router.push("/student/attendance")}
                                >
                                  Mark Attendance
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="materials" className="space-y-4">
                  <h2 className="text-xl font-bold text-gray-900 mb-1">Course Materials</h2>
                  <div className="space-y-4">
                    {data.materialsByCourse.length === 0 && (
                      <p className="text-gray-600 text-sm">No course materials yet.</p>
                    )}
                    {data.materialsByCourse.map((group) => (
                      <Card key={group.code} className="bg-white border-gray-200 shadow-sm">
                        <CardHeader>
                          <CardTitle className="text-gray-900">{group.name}</CardTitle>
                          <CardDescription className="text-gray-600">{group.code}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {group.items.length === 0 && (
                            <p className="text-gray-500 text-sm">Nothing listed for this course yet.</p>
                          )}
                          {group.items.map((material) => (
                            <MaterialBlock key={material.id} item={material} />
                          ))}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
        </main>
      </DashboardEntrance>
    </ProtectedRoute>
  )
}
