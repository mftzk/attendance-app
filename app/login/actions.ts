"use server"

import { redirect } from "next/navigation"
import { DEMO_EMAIL, signIn, signInAsDemo, signUp } from "@/lib/auth"
import { parseOrThrow, signInSchema, signUpSchema } from "@/lib/validation"
import { runAction } from "@/lib/server-action"
import type { ActionState } from "@/lib/action-state"

export async function signInAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const result = await runAction(async () => {
    const data = parseOrThrow(signInSchema, {
      email: formData.get("email"),
      password: formData.get("password"),
    })
    await signIn(data.email, data.password)
    return "Signed in."
  })
  if (result.status === "success") redirect("/dashboard")
  return result
}

export async function signUpAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const result = await runAction(async () => {
    const data = parseOrThrow(signUpSchema, {
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
    })
    await signUp(data)
    return "Account created."
  })
  if (result.status === "success") redirect("/dashboard")
  return result
}

export async function demoAction(_state: ActionState, _formData: FormData): Promise<ActionState> {
  const result = await runAction(async () => {
    await signInAsDemo()
    return `Signed in as ${DEMO_EMAIL}.`
  })
  if (result.status === "success") redirect("/dashboard")
  return result
}
