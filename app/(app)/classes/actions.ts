"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { requireUser } from "@/lib/auth"
import { createClass, deleteClass, updateClass } from "@/lib/domain/classes"
import { enrollStudent, removeEnrollment } from "@/lib/domain/enrollments"
import { runAction } from "@/lib/server-action"
import type { ActionState } from "@/lib/action-state"

export async function createClassAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const user = await requireUser()
    const created = await createClass(user.id, {
      name: formData.get("name"),
      description: formData.get("description"),
    })
    revalidatePath("/classes")
    revalidatePath("/dashboard")
    return `Class "${created.name}" created.`
  })
}

export async function updateClassAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const user = await requireUser()
    const classId = Number(formData.get("classId"))
    const updated = await updateClass(user.id, classId, {
      name: formData.get("name"),
      description: formData.get("description"),
    })
    revalidatePath(`/classes/${classId}`)
    revalidatePath("/classes")
    return `Class "${updated.name}" updated.`
  })
}

export async function deleteClassAction(formData: FormData): Promise<void> {
  const user = await requireUser()
  await deleteClass(user.id, Number(formData.get("classId")))
  revalidatePath("/classes")
  revalidatePath("/dashboard")
  redirect("/classes")
}

export async function enrollStudentAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const user = await requireUser()
    const classId = Number(formData.get("classId"))
    const studentId = Number(formData.get("studentId"))
    const { studentCount } = await enrollStudent(user.id, classId, studentId)
    revalidatePath(`/classes/${classId}`)
    revalidatePath("/classes")
    revalidatePath("/dashboard")
    return `Student added successfully. The class now has ${studentCount} students.`
  })
}

export async function removeEnrollmentAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const user = await requireUser()
    const classId = Number(formData.get("classId"))
    await removeEnrollment(user.id, classId, Number(formData.get("studentId")))
    revalidatePath(`/classes/${classId}`)
    revalidatePath("/classes")
    revalidatePath("/dashboard")
    return "Student removed from the class."
  })
}
