import Link from "next/link"
import { requireUser } from "@/lib/auth"
import { orNotFound } from "@/lib/page"
import { formatDate, todayIso } from "@/lib/date"
import { getClass } from "@/lib/domain/classes"
import { listClassMembers, listEnrollableStudents } from "@/lib/domain/enrollments"
import { getClassStats, listRecordedDates } from "@/lib/domain/attendance"
import { ActionForm, SubmitButton } from "@/components/form"
import { Capacity, Card, EmptyState, Stat } from "@/components/ui"
import { enrollStudentAction, removeEnrollmentAction, updateClassAction } from "../actions"

export const dynamic = "force-dynamic"

export default async function ClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser()
  const classId = Number((await params).id)
  if (!Number.isInteger(classId) || classId <= 0) return <EmptyState title="Not found" description="Invalid class id." />

  const klass = await orNotFound(getClass(user.id, classId))
  const [members, candidates, stats, dates] = await Promise.all([
    listClassMembers(user.id, classId),
    listEnrollableStudents(user.id, classId),
    getClassStats(user.id, classId),
    listRecordedDates(user.id, classId, 10),
  ])

  return (
    <div className="stack">
      <div className="page-head row-between">
        <div>
          <h1>{klass.name}</h1>
          <p className="muted">
            {klass.description || "No description"} · Created {formatDate(klass.createdAt)}
          </p>
        </div>
        <div className="row">
          <Capacity count={klass.studentCount} capacity={klass.capacity} />
          <Link className="button button-primary" href={`/classes/${klass.id}/attendance`}>
            Take attendance
          </Link>
        </div>
      </div>

      {klass.isFull && (
        <p className="alert alert-error">
          Class capacity reached. This class has {klass.capacity} / {klass.capacity} students and
          cannot accept more.
        </p>
      )}

      <div className="grid grid-4">
        <Stat label="Attendance rate" value={`${stats.attendanceRate}%`} hint={`${stats.total} records`} />
        <Stat label="Present" value={stats.present} />
        <Stat label="Absent" value={stats.absent} />
        <Stat label="Late / Excused" value={`${stats.late} / ${stats.excused}`} />
      </div>

      <div className="grid grid-2">
        <Card title="Add a student">
          {klass.isFull ? (
            <p className="alert alert-error">
              This class has reached the maximum capacity of {klass.capacity} students.
            </p>
          ) : candidates.length === 0 ? (
            <EmptyState
              title="No students available"
              description="Every student in your account is already enrolled in this class."
              action={
                <Link className="button" href="/students">
                  Register a student
                </Link>
              }
            />
          ) : (
            <ActionForm action={enrollStudentAction}>
              <input type="hidden" name="classId" value={klass.id} />
              <div>
                <label htmlFor="studentId">Student</label>
                <select id="studentId" name="studentId" required defaultValue="">
                  <option value="" disabled>
                    Select a student…
                  </option>
                  {candidates.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.fullName} ({student.studentIdentifier})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <SubmitButton>Add to class</SubmitButton>
              </div>
            </ActionForm>
          )}
        </Card>

        <Card title="Class settings">
          <ActionForm action={updateClassAction}>
            <input type="hidden" name="classId" value={klass.id} />
            <div>
              <label htmlFor="class-name">Name</label>
              <input id="class-name" name="name" defaultValue={klass.name} required />
            </div>
            <div>
              <label htmlFor="class-description">Description</label>
              <textarea
                id="class-description"
                name="description"
                defaultValue={klass.description ?? ""}
              />
            </div>
            <div>
              <SubmitButton>Save changes</SubmitButton>
            </div>
          </ActionForm>
        </Card>
      </div>

      <Card
        title={`Students (${klass.studentCount} / ${klass.capacity})`}
        bodyless
      >
        {members.length === 0 ? (
          <EmptyState
            title="No students in this class"
            description="Add students from your roster using the form above."
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Seat</th>
                  <th>Identifier</th>
                  <th className="wrap">Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.enrollmentId}>
                    <td className="mono muted">{member.seatNo}</td>
                    <td className="mono">{member.studentIdentifier}</td>
                    <td className="wrap">
                      <Link href={`/students/${member.studentId}`}>{member.fullName}</Link>
                    </td>
                    <td className="muted">{member.email ?? "—"}</td>
                    <td className="muted">{member.phone ?? "—"}</td>
                    <td>
                      <ActionForm action={removeEnrollmentAction} className="row">
                        <input type="hidden" name="classId" value={klass.id} />
                        <input type="hidden" name="studentId" value={member.studentId} />
                        <SubmitButton variant="ghost" size="sm">
                          Remove
                        </SubmitButton>
                      </ActionForm>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Recent attendance dates" bodyless>
        {dates.length === 0 ? (
          <EmptyState
            title="No attendance recorded"
            description={`Record attendance for ${todayIso()} to see it here.`}
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Records</th>
                  <th>Present</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {dates.map((row) => (
                  <tr key={row.date}>
                    <td>{formatDate(row.date)}</td>
                    <td className="mono">{row.recorded}</td>
                    <td className="mono">{row.present}</td>
                    <td>
                      <Link
                        className="button button-sm"
                        href={`/classes/${klass.id}/attendance?date=${row.date}`}
                      >
                        Edit
                      </Link>
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
