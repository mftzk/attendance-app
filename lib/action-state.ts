import type { AppErrorCode } from "./errors"

export type ActionState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string; code: AppErrorCode | "unknown" }

export const idleState: ActionState = { status: "idle" }

export const successState = (message: string): ActionState => ({ status: "success", message })
