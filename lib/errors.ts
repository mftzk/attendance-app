/**
 * Domain errors. Each carries an HTTP-ish code so the API routes and the UI
 * can render the same message without re-deriving it from a string.
 */
export type AppErrorCode =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "validation"
  | "conflict"
  | "capacity"

export class AppError extends Error {
  readonly code: AppErrorCode
  readonly status: number
  readonly details?: Record<string, string>

  constructor(code: AppErrorCode, message: string, details?: Record<string, string>) {
    super(message)
    this.name = "AppError"
    this.code = code
    this.status = STATUS_BY_CODE[code]
    this.details = details
  }
}

const STATUS_BY_CODE: Record<AppErrorCode, number> = {
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  validation: 422,
  conflict: 409,
  capacity: 409,
}

export const unauthorized = (message = "You must sign in to continue.") =>
  new AppError("unauthorized", message)
export const notFound = (message = "The requested resource was not found.") =>
  new AppError("not_found", message)
export const conflict = (message: string) => new AppError("conflict", message)
export const capacityReached = (max: number) =>
  new AppError("capacity", `This class has reached the maximum capacity of ${max} students.`)
export const invalid = (message: string, details?: Record<string, string>) =>
  new AppError("validation", message, details)

export function toActionError(error: unknown): { ok: false; code: AppErrorCode | "unknown"; message: string } {
  if (error instanceof AppError) {
    return { ok: false, code: error.code, message: error.message }
  }
  console.error("Unhandled error", error)
  return { ok: false, code: "unknown", message: "Something went wrong. Please try again." }
}
