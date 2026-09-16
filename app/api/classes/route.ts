import { json, readJson } from "@/lib/api"
import { requireUser } from "@/lib/auth"
import { createClass, listClasses } from "@/lib/domain/classes"

export const dynamic = "force-dynamic"

export async function GET() {
  return json(async () => listClasses((await requireUser()).id))
}

export async function POST(request: Request) {
  return json(async () => createClass((await requireUser()).id, await readJson(request)))
}
