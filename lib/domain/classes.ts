import "server-only"
import { and, asc, eq, sql } from "drizzle-orm"
import { getDb } from "../db"
import { MAX_CLASS_CAPACITY, classes, enrollments } from "../db/schema"
import { conflict, notFound } from "../errors"
import { classInputSchema, parseOrThrow } from "../validation"

export { MAX_CLASS_CAPACITY }

export type ClassSummary = {
  id: number
  name: string
  description: string | null
  createdAt: Date
  studentCount: number
  capacity: number
  isFull: boolean
}

// Member counts come from a LEFT JOIN + GROUP BY so a class with no
// enrollments still appears, with a count of zero.
const selectClasses = () =>
  getDb()
    .select({
      id: classes.id,
      name: classes.name,
      description: classes.description,
      createdAt: classes.createdAt,
      studentCount: sql<number>`count(${enrollments.id})::int`,
    })
    .from(classes)
    .leftJoin(enrollments, eq(enrollments.classId, classes.id))
    .$dynamic()

const decorate = (row: {
  id: number
  name: string
  description: string | null
  createdAt: Date
  studentCount: number
}): ClassSummary => ({
  ...row,
  capacity: MAX_CLASS_CAPACITY,
  isFull: row.studentCount >= MAX_CLASS_CAPACITY,
})

export async function listClasses(ownerId: number): Promise<ClassSummary[]> {
  const rows = await selectClasses()
    .where(eq(classes.ownerId, ownerId))
    .groupBy(classes.id)
    .orderBy(asc(classes.name))
  return rows.map(decorate)
}

/** Ownership is part of the predicate, so another account's class reads as missing. */
export async function getClass(ownerId: number, classId: number): Promise<ClassSummary> {
  const [row] = await selectClasses()
    .where(and(eq(classes.ownerId, ownerId), eq(classes.id, classId)))
    .groupBy(classes.id)
    .limit(1)
  if (!row) throw notFound("Class not found.")
  return decorate(row)
}

export async function createClass(ownerId: number, input: unknown): Promise<ClassSummary> {
  const data = parseOrThrow(classInputSchema, input)
  try {
    const [row] = await getDb()
      .insert(classes)
      .values({ ownerId, name: data.name, description: data.description })
      .returning()
    return decorate({ ...row, studentCount: 0 })
  } catch (error) {
    if (isUniqueViolation(error)) throw conflict("You already have a class with this name.")
    throw error
  }
}

export async function updateClass(
  ownerId: number,
  classId: number,
  input: unknown,
): Promise<ClassSummary> {
  const data = parseOrThrow(classInputSchema, input)
  try {
    const [row] = await getDb()
      .update(classes)
      .set({ name: data.name, description: data.description })
      .where(and(eq(classes.id, classId), eq(classes.ownerId, ownerId)))
      .returning()
    if (!row) throw notFound("Class not found.")
    return await getClass(ownerId, row.id)
  } catch (error) {
    if (isUniqueViolation(error)) throw conflict("You already have a class with this name.")
    throw error
  }
}

export async function deleteClass(ownerId: number, classId: number): Promise<void> {
  const [row] = await getDb()
    .delete(classes)
    .where(and(eq(classes.id, classId), eq(classes.ownerId, ownerId)))
    .returning({ id: classes.id })
  if (!row) throw notFound("Class not found.")
}

export function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === "23505"
}

export function constraintName(error: unknown): string | undefined {
  return typeof error === "object" && error !== null
    ? (error as { constraint_name?: string; constraint?: string }).constraint_name ??
        (error as { constraint?: string }).constraint
    : undefined
}

export function isCheckViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === "23514"
}
