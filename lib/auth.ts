import "server-only"
import { createHash, randomBytes } from "node:crypto"
import { cookies } from "next/headers"
import { and, eq, gt, lt } from "drizzle-orm"
import { getDb } from "./db"
import { sessions, users } from "./db/schema"
import { hashPassword, verifyPassword } from "./password"
import { conflict, invalid, unauthorized } from "./errors"

const COOKIE_NAME = "attendance_session"
const SESSION_TTL_DAYS = 14

export type SessionUser = {
  id: number
  name: string
  email: string
  isDemo: boolean
}

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex")

async function startSession(userId: number): Promise<void> {
  const db = getDb()
  const token = randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000)

  await db.insert(sessions).values({ tokenHash: hashToken(token), userId, expiresAt })
  // Opportunistic cleanup keeps the table from growing without a scheduler.
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()))

  const jar = await cookies()
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  })
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies()
  const token = jar.get(COOKIE_NAME)?.value
  if (!token) return null

  const db = getDb()
  const [row] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      isDemo: users.isDemo,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date())))
    .limit(1)

  return row ?? null
}

/**
 * The single authorization entry point. Every data access in `lib/domain`
 * takes the owner id produced here — identifiers coming from the client are
 * never treated as proof of ownership.
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser()
  if (!user) throw unauthorized()
  return user
}

export async function signIn(email: string, password: string): Promise<SessionUser> {
  const db = getDb()
  const normalized = email.trim().toLowerCase()
  const [user] = await db.select().from(users).where(eq(users.email, normalized)).limit(1)
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw invalid("Email or password is incorrect.")
  }
  await startSession(user.id)
  return { id: user.id, name: user.name, email: user.email, isDemo: user.isDemo }
}

export async function signUp(input: {
  name: string
  email: string
  password: string
}): Promise<SessionUser> {
  const db = getDb()
  const normalized = input.email.trim().toLowerCase()
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, normalized)).limit(1)
  if (existing) throw conflict("An account with this email already exists.")

  const [created] = await db
    .insert(users)
    .values({
      name: input.name.trim(),
      email: normalized,
      passwordHash: await hashPassword(input.password),
    })
    .returning()

  await startSession(created.id)
  return { id: created.id, name: created.name, email: created.email, isDemo: created.isDemo }
}

export const DEMO_EMAIL = process.env.DEMO_EMAIL?.trim().toLowerCase() || "demo@attendance.app"

/** Signs the visitor into the shared, pre-seeded demo account. */
export async function signInAsDemo(): Promise<SessionUser> {
  const db = getDb()
  const [user] = await db.select().from(users).where(eq(users.email, DEMO_EMAIL)).limit(1)
  if (!user) throw invalid("The demo account is not available yet. Run the seed script.")
  await startSession(user.id)
  return { id: user.id, name: user.name, email: user.email, isDemo: user.isDemo }
}

export async function signOut(): Promise<void> {
  const jar = await cookies()
  const token = jar.get(COOKIE_NAME)?.value
  if (token) {
    await getDb().delete(sessions).where(eq(sessions.tokenHash, hashToken(token)))
  }
  jar.delete(COOKIE_NAME)
}
