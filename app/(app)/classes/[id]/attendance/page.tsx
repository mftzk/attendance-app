import Link from "next/link"
import { requireUser } from "@/lib/auth"
import { orNotFound } from "@/lib/page"
import { todayIso } from "@/lib/date"
import { getClass } from "@/lib/domain/classes"
import { getAttendanceSheet } from "@/lib/domain/attendance"
import { AttendanceSheet } from "@/components/attendance-sheet"
import { Card, EmptyState } from "@/components/ui"
import { saveAttendanceAction } from "../../../attendance/actions"

export const dynamic = "force-dynamic"

export default async function TakeAttendancePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ date?: string }>
}) {
  const user = await requireUser()
  const classId = Number((await params).id)
  const requested = (await searchParams).date
  const date = requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) ? requested : todayIso()

  const klass = await orNotFound(getClass(user.id, classId))
  const rows = await orNotFound(getAttendanceSheet(user.id, classId, date))

  return (
    <div className="stack">
      <div className="page-head row-between">
        <div>
          <h1>Attendance — {klass.name}</h1>
          <p className="muted">
            <Link href={`/classes/${klass.id}`}>Back to class</Link> ·{" "}
            {klass.studentCount} / {klass.capacity} students
          </p>
        </div>
        <form className="row" method="get">
          <label htmlFor="date" style={{ margin: 0 }}>
            Date
          </label>
          <input id="date" name="date" type="date" defaultValue={date} />
          <button type="submit">Load</button>
        </form>
      </div>

      {rows.length === 0 ? (
        <Card bodyless>
          <EmptyState
            title="No students in this class"
            description="Add students to the class before taking attendance."
            action={
              <Link className="button button-primary" href={`/classes/${klass.id}`}>
                Manage students
              </Link>
            }
          />
        </Card>
      ) : (
        <AttendanceSheet
          key={date}
          classId={klass.id}
          date={date}
          rows={rows}
          action={saveAttendanceAction}
        />
      )}
    </div>
  )
}
