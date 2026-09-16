import { json, readJson } from "@/lib/api"
import { requireUser } from "@/lib/auth"
import { createStudent, listStudents } from "@/lib/domain/students"

export const dynamic = "force-dynamic"

export async function GET() {
  return json(async () => listStudents((await requireUser()).id))
}

export async function POST(request: Request) {
  return json(async () => createStudent((await requireUser()).id, await readJson(request)))
}
