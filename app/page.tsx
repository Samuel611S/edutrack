import { redirect } from "next/navigation"

export default function RootPage() {
  // Always require login when someone visits the site root.
  redirect("/login")
}

