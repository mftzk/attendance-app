import { json, readJson } from "@/lib/api"
import { requireUser } from "@/lib/auth"
import { getClass } from "@/lib/domain/classes"
import { enrollStudent, listClassMembers, removeEnrollment } from "@/lib/domain/enrollments"
import { invalid } from "@/lib/errors"

export const dynamic = "force-dynamic"

const studentIdFrom = (body: unknown): number => {
  const value = Number((body as { studentId?: unknown })?.studentId)
  if (!Number.isInteger(value) || value <= 0) throw invalid("A valid studentId is required.")
  return value
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  return json(async () => {
    const user = await requireUser()
    return listClassMembers(user.id, Number((await context.params).id))
  })
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return json(async () => {
    const user = await requireUser()
    const classId = Number((await context.params).id)
    const result = await enrollStudent(user.id, classId, studentIdFrom(await readJson(request)))
    const klass = await getClass(user.id, classId)
    return { ...result, class: klass }
  })
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  return json(async () => {
    const user = await requireUser()
    const classId = Number((await context.params).id)
    await removeEnrollment(user.id, classId, studentIdFrom(await readJson(request)))
    return { removed: true }
  })
}
