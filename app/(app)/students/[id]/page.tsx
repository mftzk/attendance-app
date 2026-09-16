import Link from "next/link"
import { requireUser } from "@/lib/auth"
import { orNotFound } from "@/lib/page"
import { formatDate } from "@/lib/date"
import { getStudent, listStudentAttendance, listStudentClasses } from "@/lib/domain/students"
import { getStudentStats } from "@/lib/domain/attendance"
import { ActionForm, SubmitButton } from "@/components/form"
import { Card, EmptyState, Stat, StatusBadge } from "@/components/ui"
import { deleteStudentAction, updateStudentAction } from "../actions"

export const dynamic = "force-dynamic"

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser()
  const studentId = Number((await params).id)
  const student = await orNotFound(getStudent(user.id, studentId))
  const [classList, records, stats] = await Promise.all([
    listStudentClasses(user.id, studentId),
    listStudentAttendance(user.id, studentId),
    getStudentStats(user.id, studentId),
  ])

  return (
    <div className="stack">
      <div className="page-head row-between">
        <div>
          <h1>{student.fullName}</h1>
          <p className="muted">
            {student.studentIdentifier} · {student.email ?? "no email"} ·{" "}
            {student.phone ?? "no phone"}
          </p>
        </div>
        <form action={deleteStudentAction}>
          <input type="hidden" name="studentId" value={student.id} />
          <SubmitButton variant="danger" size="sm">
            Delete student
          </SubmitButton>
        </form>
      </div>

      <div className="grid grid-4">
        <Stat
          label="Attendance rate"
          value={`${stats.attendanceRate}%`}
          hint={`${stats.total} records`}
        />
        <Stat label="Present" value={stats.present} />
        <Stat label="Absent" value={stats.absent} />
        <Stat label="Late / Excused" value={`${stats.late} / ${stats.excused}`} />
      </div>

      <div className="grid grid-2">
        <Card title="Details">
          <ActionForm action={updateStudentAction}>
            <input type="hidden" name="studentId" value={student.id} />
            <div className="field-row">
              <div>
                <label htmlFor="studentIdentifier">Student identifier</label>
                <input
                  id="studentIdentifier"
                  name="studentIdentifier"
                  defaultValue={student.studentIdentifier}
                  required
                />
              </div>
              <div>
                <label htmlFor="fullName">Full name</label>
                <input id="fullName" name="fullName" defaultValue={student.fullName} required />
              </div>
            </div>
            <div className="field-row">
              <div>
                <label htmlFor="email">Email</label>
                <input id="email" name="email" type="email" defaultValue={student.email ?? ""} />
              </div>
              <div>
                <label htmlFor="phone">Phone</label>
                <input id="phone" name="phone" defaultValue={student.phone ?? ""} />
              </div>
            </div>
            <div>
              <SubmitButton>Save changes</SubmitButton>
            </div>
          </ActionForm>
        </Card>

        <Card title={`Classes (${classList.length})`} bodyless>
          {classList.length === 0 ? (
            <EmptyState
              title="Not enrolled"
              description="This student has not been added to any class yet."
            />
          ) : (
            <div className="list-divided">
              {classList.map((item) => (
                <div key={item.id} className="list-item">
                  <Link href={`/classes/${item.id}`}>{item.name}</Link>
                  <span className="small muted">Joined {formatDate(item.enrolledAt)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card title="Attendance history" bodyless>
        {records.length === 0 ? (
          <EmptyState
            title="No attendance records"
            description="Records appear here once attendance is taken for a class this student belongs to."
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th className="wrap">Class</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id}>
                    <td>{formatDate(record.date)}</td>
                    <td className="wrap">
                      <Link href={`/classes/${record.classId}`}>{record.className}</Link>
                    </td>
                    <td>
                      <StatusBadge status={record.status} />
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
