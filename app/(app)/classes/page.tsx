import Link from "next/link"
import { requireUser } from "@/lib/auth"
import { listClasses } from "@/lib/domain/classes"
import { formatDate } from "@/lib/date"
import { ActionForm, SubmitButton } from "@/components/form"
import { Capacity, Card, EmptyState } from "@/components/ui"
import { createClassAction } from "./actions"

export const dynamic = "force-dynamic"

export default async function ClassesPage() {
  const user = await requireUser()
  const classList = await listClasses(user.id)

  return (
    <div className="stack">
      <div className="page-head">
        <h1>Classes</h1>
        <p className="muted">Each class holds a maximum of 30 students.</p>
      </div>

      <div className="grid grid-2">
        <Card title="Create a class">
          <ActionForm action={createClassAction} resetOnSuccess>
            <div>
              <label htmlFor="name">Class name</label>
              <input id="name" name="name" placeholder="Computer Science A" required />
            </div>
            <div>
              <label htmlFor="description">Description (optional)</label>
              <textarea id="description" name="description" placeholder="Semester 1, room B2" />
            </div>
            <div>
              <SubmitButton>Create class</SubmitButton>
            </div>
          </ActionForm>
        </Card>

        <Card title="Capacity rule">
          <div className="stack-sm small muted">
            <p>
              A class accepts at most <strong>30</strong> students. When the limit is reached the
              enrollment form is disabled and the API rejects further requests.
            </p>
            <p>
              The limit is enforced inside a database transaction that locks the class row, and by
              a UNIQUE + CHECK constraint on the enrollment seat number — concurrent requests
              cannot push a class past 30.
            </p>
          </div>
        </Card>
      </div>

      <Card title={`All classes (${classList.length})`} bodyless>
        {classList.length === 0 ? (
          <EmptyState
            title="No classes yet"
            description="Create your first class using the form above."
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th className="wrap">Class</th>
                  <th>Capacity</th>
                  <th>Created</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {classList.map((item) => (
                  <tr key={item.id}>
                    <td className="wrap">
                      <Link href={`/classes/${item.id}`} style={{ fontWeight: 500 }}>
                        {item.name}
                      </Link>
                      {item.description && (
                        <div className="small muted">{item.description}</div>
                      )}
                    </td>
                    <td>
                      <Capacity count={item.studentCount} capacity={item.capacity} />
                    </td>
                    <td className="muted">{formatDate(item.createdAt)}</td>
                    <td>
                      <Link className="button button-sm" href={`/classes/${item.id}/attendance`}>
                        Take attendance
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
