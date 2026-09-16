import { json, readJson } from "@/lib/api"
import { requireUser } from "@/lib/auth"
import { listAttendanceHistory, saveAttendance } from "@/lib/domain/attendance"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  return json(async () => {
    const user = await requireUser()
    const params = Object.fromEntries(new URL(request.url).searchParams.entries())
    return listAttendanceHistory(user.id, params)
  })
}

export async function POST(request: Request) {
  return json(async () => saveAttendance((await requireUser()).id, await readJson(request)))
}
