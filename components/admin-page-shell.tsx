"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export function AdminPageShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <main className="min-h-screen edu-dashboard-bg-admin">
      <div className="border-b border-white/70 bg-white/85 backdrop-blur-md shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{title}</h1>
            {subtitle && <p className="text-sm text-slate-600 mt-0.5">{subtitle}</p>}
          </div>
          <Button variant="outline" size="sm" asChild className="border-slate-200 bg-white/80">
            <Link href="/admin/dashboard" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Dashboard
            </Link>
          </Button>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 py-8">{children}</div>
    </main>
  )
}
