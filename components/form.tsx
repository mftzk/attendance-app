"use client"

import { useActionState, useEffect, useRef } from "react"
import { useFormStatus } from "react-dom"
import { type ActionState, idleState } from "@/lib/action-state"

export function SubmitButton({
  children,
  variant = "primary",
  size,
  title,
}: {
  children: React.ReactNode
  variant?: "primary" | "default" | "danger" | "ghost"
  size?: "sm"
  title?: string
}) {
  const { pending } = useFormStatus()
  const className = [variant === "default" ? "" : variant, size === "sm" ? "sm" : ""]
    .filter(Boolean)
    .join(" ")
  return (
    <button type="submit" className={className} disabled={pending} title={title}>
      {pending ? "Working…" : children}
    </button>
  )
}

export function FormMessage({ state }: { state: ActionState }) {
  if (state.status === "idle") return null
  return (
    <p className={state.status === "success" ? "alert alert-success" : "alert alert-error"}>
      {state.message}
    </p>
  )
}

/**
 * Small wrapper around useActionState so every form gets consistent
 * loading / error / success feedback without duplicating the plumbing.
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>
  children: React.ReactNode
  className?: string
  resetOnSuccess?: boolean
}) {
  const [state, formAction] = useActionState(action, idleState)
  const ref = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (resetOnSuccess && state.status === "success") ref.current?.reset()
  }, [state, resetOnSuccess])

  return (
    <form ref={ref} action={formAction} className={className ?? "stack"}>
      <FormMessage state={state} />
      {children}
    </form>
  )
}
