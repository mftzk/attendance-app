"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { requireUser } from "@/lib/auth"
import { createStudent, deleteStudent, updateStudent } from "@/lib/domain/students"
import { runAction } from "@/lib/server-action"
import type { ActionState } from "@/lib/action-state"

const formToStudent = (formData: FormData) => ({
  studentIdentifier: formData.get("studentIdentifier"),
  fullName: formData.get("fullName"),
  email: formData.get("email"),
  phone: formData.get("phone"),
})

export async function createStudentAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const user = await requireUser()
    const student = await createStudent(user.id, formToStudent(formData))
    revalidatePath("/students")
    revalidatePath("/dashboard")
    return `Student ${student.fullName} registered successfully.`
  })
}

export async function updateStudentAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return runAction(async () => {
    const user = await requireUser()
    const studentId = Number(formData.get("studentId"))
    const student = await updateStudent(user.id, studentId, formToStudent(formData))
    revalidatePath(`/students/${studentId}`)
    revalidatePath("/students")
    return `${student.fullName} updated.`
  })
}

export async function deleteStudentAction(formData: FormData): Promise<void> {
  const user = await requireUser()
  await deleteStudent(user.id, Number(formData.get("studentId")))
  revalidatePath("/students")
  revalidatePath("/dashboard")
  redirect("/students")
}
