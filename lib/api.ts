import "server-only"
import { NextResponse } from "next/server"
import { AppError } from "./errors"

/**
 * Every JSON route goes through this wrapper, so the REST surface enforces the
 * exact same ownership and capacity rules as the UI — calling the API directly
 * cannot bypass them.
 */
export async function json<T>(handler: () => Promise<T>): Promise<NextResponse> {
  try {
    return NextResponse.json({ ok: true, data: await handler() })
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { ok: false, code: error.code, message: error.message },
        { status: error.status },
      )
    }
    console.error("API error", error)
    return NextResponse.json(
      { ok: false, code: "internal", message: "Something went wrong." },
      { status: 500 },
    )
  }
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    return {}
  }
}
