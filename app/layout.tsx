import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Attendance",
  description: "Student attendance tracking for classes, rosters and daily records.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
