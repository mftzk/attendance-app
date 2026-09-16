import Link from "next/link"
import { requireUser } from "@/lib/auth"
import { todayIso } from "@/lib/date"
import { getDashboardStats } from "@/lib/domain/attendance"
import { listClasses } from "@/lib/domain/classes"
import { Capacity, Card, EmptyState, Stat } from "@/components/ui"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const user = await requireUser()
  const today = todayIso()
  const [summary, classList] = await Promise.all([
    getDashboardStats(user.id, today),
    listClasses(user.id),
  ])

  return (
    <div className="stack">
      <div className="page-head">
        <h1>Dashboard</h1>
        <p className="muted">Overview for {user.name}.</p>
      </div>

      <div className="grid grid-4">
        <Stat label="Classes" value={summary.classCount} />
        <Stat label="Students" value={summary.studentCount} />
        <Stat label="Recorded today" value={summary.recordedToday} hint={today} />
        <Stat
          label="Average attendance"
          value={`${summary.stats.attendanceRate}%`}
          hint={`${summary.stats.total} records`}
        />
      </div>

      <Card
        title="Your classes"
        action={
          <Link className="button button-sm" href="/classes">
            Manage classes
          </Link>
        }
        bodyless
      >
        {classList.length === 0 ? (
          <EmptyState
            title="No classes yet"
            description="Create your first class to start enrolling students and taking attendance."
            action={
              <Link className="button button-primary" href="/classes">
                Create a class
              </Link>
            }
          />
        ) : (
          <div className="list-divided">
            {classList.map((item) => (
              <div key={item.id} className="list-item">
                <div className="stack-sm">
                  <Link href={`/classes/${item.id}`} style={{ fontWeight: 500 }}>
                    {item.name}
                  </Link>
                  {item.description && <span className="small muted">{item.description}</span>}
                </div>
                <Capacity count={item.studentCount} capacity={item.capacity} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
