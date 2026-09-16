import { redirect } from "next/navigation"
import { getSessionUser } from "@/lib/auth"
import { NavLink } from "@/components/nav-link"
import { SignOutButton } from "@/components/sign-out-button"

export const dynamic = "force-dynamic"

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/classes", label: "Classes" },
  { href: "/students", label: "Students" },
  { href: "/attendance", label: "Attendance" },
  { href: "/settings", label: "Settings" },
]

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser()
  if (!user) redirect("/login")

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">A</span> Attendance
        </div>
        <nav className="nav">
          {NAV.map((item) => (
            <NavLink key={item.href} href={item.href}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="spacer" />
        <div className="row" style={{ gap: 8 }}>
          <span className="small muted">{user.email}</span>
          <SignOutButton />
        </div>
      </header>

      {user.isDemo && (
        <div
          className="alert alert-warning small"
          style={{ borderRadius: 0, borderLeft: "none", borderRight: "none", padding: "8px 20px" }}
        >
          You are signed in to the shared demo account. Everyone sees the same data and it may
          change or be reset at any time.
        </div>
      )}

      <main className="content">{children}</main>
    </div>
  )
}
