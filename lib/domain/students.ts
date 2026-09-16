import "server-only"
import { and, asc, desc, eq, sql } from "drizzle-orm"
import { getDb } from "../db"
import { attendanceRecords, classes, enrollments, students } from "../db/schema"
import { conflict, notFound } from "../errors"
import { parseOrThrow, studentInputSchema } from "../validation"
import { isUniqueViolation } from "./classes"

export type StudentRow = {
  id: number
  studentIdentifier: string
  fullName: string
  email: string | null
  phone: string | null
  createdAt: Date
  classCount: number
}

export async function listStudents(ownerId: number): Promise<StudentRow[]> {
  return getDb()
    .select({
      id: students.id,
      studentIdentifier: students.studentIdentifier,
      fullName: students.fullName,
      email: students.email,
      phone: students.phone,
      createdAt: students.createdAt,
      classCount: sql<number>`count(${enrollments.id})::int`,
    })
    .from(students)
    .leftJoin(enrollments, eq(enrollments.studentId, students.id))
    .where(eq(students.ownerId, ownerId))
    .groupBy(students.id)
    .orderBy(asc(students.fullName))
}

export async function getStudent(ownerId: number, studentId: number): Promise<StudentRow> {
  const [row] = await getDb()
    .select({
      id: students.id,
      studentIdentifier: students.studentIdentifier,
      fullName: students.fullName,
      email: students.email,
      phone: students.phone,
      createdAt: students.createdAt,
      classCount: sql<number>`count(${enrollments.id})::int`,
    })
    .from(students)
    .leftJoin(enrollments, eq(enrollments.studentId, students.id))
    .where(and(eq(students.id, studentId), eq(students.ownerId, ownerId)))
    .groupBy(students.id)
    .limit(1)
  if (!row) throw notFound("Student not found.")
  return row
}

export async function createStudent(ownerId: number, input: unknown): Promise<StudentRow> {
  const data = parseOrThrow(studentInputSchema, input)
  try {
    const [row] = await getDb().insert(students).values({ ownerId, ...data }).returning()
    return { ...row, classCount: 0 }
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw conflict(`Student identifier "${data.studentIdentifier}" is already used.`)
    }
    throw error
  }
}

export async function updateStudent(
  ownerId: number,
  studentId: number,
  input: unknown,
): Promise<StudentRow> {
  const data = parseOrThrow(studentInputSchema, input)
  try {
    const [row] = await getDb()
      .update(students)
      .set(data)
      .where(and(eq(students.id, studentId), eq(students.ownerId, ownerId)))
      .returning({ id: students.id })
    if (!row) throw notFound("Student not found.")
    return await getStudent(ownerId, row.id)
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw conflict(`Student identifier "${data.studentIdentifier}" is already used.`)
    }
    throw error
  }
}

export async function deleteStudent(ownerId: number, studentId: number): Promise<void> {
  const [row] = await getDb()
    .delete(students)
    .where(and(eq(students.id, studentId), eq(students.ownerId, ownerId)))
    .returning({ id: students.id })
  if (!row) throw notFound("Student not found.")
}

export async function listStudentClasses(ownerId: number, studentId: number) {
  return getDb()
    .select({
      id: classes.id,
      name: classes.name,
      enrolledAt: enrollments.createdAt,
    })
    .from(enrollments)
    .innerJoin(classes, eq(classes.id, enrollments.classId))
    .where(and(eq(enrollments.studentId, studentId), eq(classes.ownerId, ownerId)))
    .orderBy(asc(classes.name))
}

export async function listStudentAttendance(ownerId: number, studentId: number, limit = 50) {
  return getDb()
    .select({
      id: attendanceRecords.id,
      date: attendanceRecords.date,
      status: attendanceRecords.status,
      className: classes.name,
      classId: classes.id,
    })
    .from(attendanceRecords)
    .innerJoin(classes, eq(classes.id, attendanceRecords.classId))
    .where(and(eq(attendanceRecords.studentId, studentId), eq(classes.ownerId, ownerId)))
    .orderBy(desc(attendanceRecords.date))
    .limit(limit)
}
