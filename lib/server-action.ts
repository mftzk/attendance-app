import "server-only"
import { AppError } from "./errors"
import type { ActionState } from "./action-state"

/**
 * Wraps a server action body so domain errors become UI state instead of an
 * unhandled exception. Keeps business rules in `lib/domain` and out of the
 * components.
 */
export async function runAction(fn: () => Promise<string>): Promise<ActionState> {
  try {
    return { status: "success", message: await fn() }
  } catch (error) {
    if (error instanceof AppError) {
      return { status: "error", message: error.message, code: error.code }
    }
    // Next's redirect()/notFound() signal through exceptions — never swallow them.
    if (typeof error === "object" && error !== null && "digest" in error) throw error
    console.error("Action failed", error)
    return { status: "error", message: "Something went wrong. Please try again.", code: "unknown" }
  }
}
