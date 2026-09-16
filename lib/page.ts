import "server-only"
import { notFound } from "next/navigation"
import { AppError } from "./errors"

/** Renders the 404 page when a domain lookup fails ownership scoping. */
export async function orNotFound<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise
  } catch (error) {
    if (error instanceof AppError && (error.code === "not_found" || error.code === "forbidden")) {
      notFound()
    }
    throw error
  }
}
