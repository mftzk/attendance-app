import Link from "next/link"
import { requireUser } from "@/lib/auth"
import { listStudents } from "@/lib/domain/students"
import { statsForStudents } from "@/lib/domain/attendance"
import { ActionForm, SubmitButton } from "@/components/form"
import { Card, EmptyState } from "@/components/ui"
import { createStudentAction } from "./actions"

export const dynamic = "force-dynamic"

export default async function StudentsPage() {
  const user = await requireUser()
  const students = await listStudents(user.id)
  const stats = await statsForStudents(
    user.id,
    students.map((student) => student.id),
  )

  return (
    <div className="stack">
      <div className="page-head">
        <h1>Students</h1>
        <p className="muted">
          Student identifiers are unique within your account. A student can join many classes.
        </p>
      </div>

      <Card title="Register a student">
        <ActionForm action={createStudentAction} resetOnSuccess>
          <div className="field-row">
            <div>
              <label htmlFor="studentIdentifier">Student identifier</label>
              <input id="studentIdentifier" name="studentIdentifier" placeholder="S-1001" required />
            </div>
            <div>
              <label htmlFor="fullName">Full name</label>
              <input id="fullName" name="fullName" placeholder="Anita Rahmawati" required />
            </div>
          </div>
          <div className="field-row">
            <div>
              <label htmlFor="email">Email (optional)</label>
              <input id="email" name="email" type="email" placeholder="anita@example.com" />
            </div>
            <div>
              <label htmlFor="phone">Phone (optional)</label>
              <input id="phone" name="phone" placeholder="+62 812 0000 0000" />
            </div>
          </div>
          <div>
            <SubmitButton>Register student</SubmitButton>
          </div>
        </ActionForm>
      </Card>

      <Card title={`All students (${students.length})`} bodyless>
        {students.length === 0 ? (
          <EmptyState
            title="No students yet"
            description="Register your first student with the form above."
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Identifier</th>
                  <th className="wrap">Name</th>
                  <th>Contact</th>
                  <th>Classes</th>
                  <th>Attendance</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => {
                  const summary = stats.get(student.id)
                  return (
                    <tr key={student.id}>
                      <td className="mono">{student.studentIdentifier}</td>
                      <td className="wrap">
                        <Link href={`/students/${student.id}`} style={{ fontWeight: 500 }}>
                          {student.fullName}
                        </Link>
                      </td>
                      <td className="muted">
                        {student.email ?? "—"}
                        {student.phone ? ` · ${student.phone}` : ""}
                      </td>
                      <td className="mono">{student.classCount}</td>
                      <td className="mono">
                        {summary && summary.total > 0 ? `${summary.attendanceRate}%` : "—"}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
