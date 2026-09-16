import Link from "next/link"
import { requireUser } from "@/lib/auth"
import { formatDate } from "@/lib/date"
import { listAttendanceHistory, summarize } from "@/lib/domain/attendance"
import { listClasses } from "@/lib/domain/classes"
import { listStudents } from "@/lib/domain/students"
import { Card, EmptyState, Stat, StatusBadge } from "@/components/ui"

export const dynamic = "force-dynamic"

type Search = {
  classId?: string
  studentId?: string
  date?: string
  from?: string
  to?: string
  status?: string
}

const clean = (search: Search) =>
  Object.fromEntries(
    Object.entries(search).filter(([, value]) => value !== undefined && value !== ""),
  )

export default async function AttendanceHistoryPage({
  searchParams,
}: {
  searchParams: Promise<Search>
}) {
  const user = await requireUser()
  const search = await searchParams
  const filters = clean(search)

  const [classList, students, rows] = await Promise.all([
    listClasses(user.id),
    listStudents(user.id),
    listAttendanceHistory(user.id, filters),
  ])

  const stats = summarize(
    (["present", "absent", "late", "excused"] as const).map((status) => ({
      status,
      count: rows.filter((row) => row.status === status).length,
    })),
  )

  return (
    <div className="stack">
      <div className="page-head row-between">
        <div>
          <h1>Attendance history</h1>
          <p className="muted">Filter saved attendance by class, student, date or status.</p>
        </div>
        {classList.length > 0 && (
          <Link className="button button-primary" href={`/classes/${classList[0].id}/attendance`}>
            Take attendance
          </Link>
        )}
      </div>

      <Card title="Filters">
        <form className="stack" method="get">
          <div className="field-row">
            <div>
              <label htmlFor="classId">Class</label>
              <select id="classId" name="classId" defaultValue={search.classId ?? ""}>
                <option value="">All classes</option>
                {classList.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="studentId">Student</label>
              <select id="studentId" name="studentId" defaultValue={search.studentId ?? ""}>
                <option value="">All students</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.fullName} ({student.studentIdentifier})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="field-row">
            <div>
              <label htmlFor="date">Exact date</label>
              <input id="date" name="date" type="date" defaultValue={search.date ?? ""} />
            </div>
            <div>
              <label htmlFor="status">Status</label>
              <select id="status" name="status" defaultValue={search.status ?? ""}>
                <option value="">All statuses</option>
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="late">Late</option>
                <option value="excused">Excused</option>
              </select>
            </div>
          </div>
          <div className="field-row">
            <div>
              <label htmlFor="from">From</label>
              <input id="from" name="from" type="date" defaultValue={search.from ?? ""} />
            </div>
            <div>
              <label htmlFor="to">To</label>
              <input id="to" name="to" type="date" defaultValue={search.to ?? ""} />
            </div>
          </div>
          <div className="row">
            <button type="submit" className="primary">
              Apply filters
            </button>
            <Link className="button" href="/attendance">
              Reset
            </Link>
          </div>
        </form>
      </Card>

      <div className="grid grid-4">
        <Stat label="Records" value={stats.total} hint="Newest 200" />
        <Stat label="Present" value={stats.present} />
        <Stat label="Absent" value={stats.absent} />
        <Stat label="Attendance rate" value={`${stats.attendanceRate}%`} />
      </div>

      <Card title="Records" bodyless>
        {rows.length === 0 ? (
          <EmptyState
            title="No attendance records"
            description="No records match these filters. Try widening the date range or clearing the filters."
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th className="wrap">Class</th>
                  <th className="wrap">Student</th>
                  <th>Identifier</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{formatDate(row.date)}</td>
                    <td className="wrap">
                      <Link href={`/classes/${row.classId}`}>{row.className}</Link>
                    </td>
                    <td className="wrap">
                      <Link href={`/students/${row.studentId}`}>{row.studentName}</Link>
                    </td>
                    <td className="mono">{row.studentIdentifier}</td>
                    <td>
                      <StatusBadge status={row.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
