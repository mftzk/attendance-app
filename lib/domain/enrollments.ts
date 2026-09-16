import "server-only"
import { and, asc, eq, sql } from "drizzle-orm"
import { getDb } from "../db"
import { MAX_CLASS_CAPACITY, classes, enrollments, students } from "../db/schema"
import { capacityReached, conflict, notFound } from "../errors"
import { constraintName, isCheckViolation, isUniqueViolation } from "./classes"

export type ClassMember = {
  enrollmentId: number
  seatNo: number
  studentId: number
  studentIdentifier: string
  fullName: string
  email: string | null
  phone: string | null
  enrolledAt: Date
}

export async function listClassMembers(
  ownerId: number,
  classId: number,
): Promise<ClassMember[]> {
  return getDb()
    .select({
      enrollmentId: enrollments.id,
      seatNo: enrollments.seatNo,
      studentId: students.id,
      studentIdentifier: students.studentIdentifier,
      fullName: students.fullName,
      email: students.email,
      phone: students.phone,
      enrolledAt: enrollments.createdAt,
    })
    .from(enrollments)
    .innerJoin(students, eq(students.id, enrollments.studentId))
    .innerJoin(classes, eq(classes.id, enrollments.classId))
    .where(and(eq(enrollments.classId, classId), eq(classes.ownerId, ownerId)))
    .orderBy(asc(students.fullName))
}

/**
 * Adds a student to a class, enforcing the hard 30-student capacity.
 *
 * Concurrency: the transaction first takes a `FOR UPDATE` row lock on the
 * class. Two simultaneous requests for the same class therefore queue behind
 * each other — the second one only reads the member count after the first has
 * committed, so a class sitting at 29 can never be pushed to 31.
 *
 * The lock is the fast path, not the only guard. `enrollments.seat_no` carries
 * a CHECK (1..30) plus a UNIQUE (class_id, seat_no) index, so even a caller
 * that bypasses this function entirely — a direct INSERT, a second process, a
 * future bug — is rejected by PostgreSQL itself.
 */
export async function enrollStudent(
  ownerId: number,
  classId: number,
  studentId: number,
): Promise<{ seatNo: number; studentCount: number }> {
  const db = getDb()

  return db.transaction(async (tx) => {
    const [klass] = await tx
      .select({ id: classes.id })
      .from(classes)
      .where(and(eq(classes.id, classId), eq(classes.ownerId, ownerId)))
      .for("update")
      .limit(1)
    if (!klass) throw notFound("Class not found.")

    const [student] = await tx
      .select({ id: students.id })
      .from(students)
      .where(and(eq(students.id, studentId), eq(students.ownerId, ownerId)))
      .limit(1)
    if (!student) throw notFound("Student not found.")

    const [existing] = await tx
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(and(eq(enrollments.classId, classId), eq(enrollments.studentId, studentId)))
      .limit(1)
    if (existing) throw conflict("Student already belongs to this class.")

    const [{ count }] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(enrollments)
      .where(eq(enrollments.classId, classId))

    if (count >= MAX_CLASS_CAPACITY) throw capacityReached(MAX_CLASS_CAPACITY)

    // Reuse the lowest free seat so a class stays compact after removals.
    const [{ seatNo }] = await tx.execute<{ seatNo: number }>(sql`
      SELECT COALESCE(MIN(s.seat), 1) AS "seatNo"
      FROM generate_series(1, ${MAX_CLASS_CAPACITY}) AS s(seat)
      WHERE NOT EXISTS (
        SELECT 1 FROM ${enrollments}
        WHERE ${enrollments.classId} = ${classId} AND ${enrollments.seatNo} = s.seat
      )
    `)

    try {
      await tx.insert(enrollments).values({ classId, studentId, seatNo })
    } catch (error) {
      if (isCheckViolation(error)) throw capacityReached(MAX_CLASS_CAPACITY)
      if (isUniqueViolation(error)) {
        const name = constraintName(error)
        if (name === "enrollments_class_seat_key") throw capacityReached(MAX_CLASS_CAPACITY)
        throw conflict("Student already belongs to this class.")
      }
      throw error
    }

    return { seatNo, studentCount: count + 1 }
  })
}

export async function removeEnrollment(
  ownerId: number,
  classId: number,
  studentId: number,
): Promise<void> {
  const db = getDb()
  const [klass] = await db
    .select({ id: classes.id })
    .from(classes)
    .where(and(eq(classes.id, classId), eq(classes.ownerId, ownerId)))
    .limit(1)
  if (!klass) throw notFound("Class not found.")

  const [row] = await db
    .delete(enrollments)
    .where(and(eq(enrollments.classId, classId), eq(enrollments.studentId, studentId)))
    .returning({ id: enrollments.id })
  if (!row) throw notFound("This student is not enrolled in the class.")
}

/** Students owned by the account that are not yet in the class. */
export async function listEnrollableStudents(ownerId: number, classId: number) {
  return getDb()
    .select({
      id: students.id,
      studentIdentifier: students.studentIdentifier,
      fullName: students.fullName,
    })
    .from(students)
    .where(
      and(
        eq(students.ownerId, ownerId),
        sql`NOT EXISTS (
          SELECT 1 FROM ${enrollments}
          WHERE ${enrollments.studentId} = ${students.id} AND ${enrollments.classId} = ${classId}
        )`,
      ),
    )
    .orderBy(asc(students.fullName))
}
