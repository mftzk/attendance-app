import { json } from "@/lib/api"
import { requireUser } from "@/lib/auth"
import { deleteClass, getClass } from "@/lib/domain/classes"
import { listClassMembers } from "@/lib/domain/enrollments"

export const dynamic = "force-dynamic"

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  return json(async () => {
    const user = await requireUser()
    const classId = Number((await context.params).id)
    const klass = await getClass(user.id, classId)
    return { ...klass, members: await listClassMembers(user.id, classId) }
  })
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  return json(async () => {
    const user = await requireUser()
    await deleteClass(user.id, Number((await context.params).id))
    return { deleted: true }
  })
}
