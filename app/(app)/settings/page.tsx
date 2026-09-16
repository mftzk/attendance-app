import { requireUser } from "@/lib/auth"
import { MAX_CLASS_CAPACITY } from "@/lib/domain/classes"
import { getDashboardStats } from "@/lib/domain/attendance"
import { todayIso } from "@/lib/date"
import { Card } from "@/components/ui"
import { SignOutButton } from "@/components/sign-out-button"

export const dynamic = "force-dynamic"

export default async function SettingsPage() {
  const user = await requireUser()
  const summary = await getDashboardStats(user.id, todayIso())

  return (
    <div className="stack">
      <div className="page-head">
        <h1>Settings</h1>
        <p className="muted">Account information and application rules.</p>
      </div>

      <div className="grid grid-2">
        <Card title="Account">
          <div className="stack-sm">
            <div className="row-between">
              <span className="muted">Name</span>
              <span>{user.name}</span>
            </div>
            <div className="row-between">
              <span className="muted">Email</span>
              <span>{user.email}</span>
            </div>
            <div className="row-between">
              <span className="muted">Account type</span>
              <span>{user.isDemo ? "Shared demo account" : "Personal account"}</span>
            </div>
            <div className="row-between">
              <span className="muted">Classes / Students</span>
              <span className="mono">
                {summary.classCount} / {summary.studentCount}
              </span>
            </div>
            <div style={{ marginTop: 8 }}>
              <SignOutButton />
            </div>
          </div>
        </Card>

        <Card title="Application rules">
          <ul className="stack-sm muted" style={{ paddingLeft: 18, margin: 0 }}>
            <li>Each class holds at most {MAX_CLASS_CAPACITY} students.</li>
            <li>A student can belong to many classes, but only once per class.</li>
            <li>Student identifiers are unique within your account.</li>
            <li>One attendance record per student, per class, per date.</li>
            <li>All data is scoped to your account and cannot be read by other users.</li>
          </ul>
        </Card>
      </div>

      {user.isDemo && (
        <p className="alert alert-warning">
          This is the shared demo account. Changes are visible to every visitor and the data may be
          reset at any time.
        </p>
      )}
    </div>
  )
}
