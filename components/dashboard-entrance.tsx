"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * Wraps dashboard main content for a consistent entrance animation.
 */
export function DashboardEntrance({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn("edu-dashboard-enter", className)}>{children}</div>
}
