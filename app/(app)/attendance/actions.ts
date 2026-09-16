"use server"

import { revalidatePath } from "next/cache"
import { requireUser } from "@/lib/auth"
import { saveAttendance } from "@/lib/domain/attendance"
import { runAction } from "@/lib/server-action"
import type { ActionState } from "@/lib/action-state"

export async function saveAttendanceAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const user = await requireUser()
    const classId = Number(formData.get("classId"))
    const date = String(formData.get("date") ?? "")
    const entries = JSON.parse(String(formData.get("entries") ?? "[]"))

    const result = await saveAttendance(user.id, { classId, date, entries })
    revalidatePath(`/classes/${classId}`)
    revalidatePath(`/classes/${classId}/attendance`)
    revalidatePath("/attendance")
    revalidatePath("/dashboard")
    return `Attendance saved for ${result.date} (${result.saved} students).`
  })
}
