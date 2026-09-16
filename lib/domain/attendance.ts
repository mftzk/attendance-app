import "server-only"
import { and, asc, desc, eq, gte, inArray, lte, sql } from "drizzle-orm"
import { getDb } from "../db"
import {
  type AttendanceStatus,
  attendanceRecords,
  classes,
  enrollments,
  students,
} from "../db/schema"
import { invalid, notFound } from "../errors"
import { attendanceSaveSchema, historyFilterSchema, parseOrThrow } from "../validation"

export const ATTENDANCE_STATUSES: AttendanceStatus[] = ["present", "absent", "late", "excused"]

export const STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: "Present",
  absent: "Absent",
  late: "Late",
  excused: "Excused",
}

export type AttendanceSheetRow = {
  studentId: number
  studentIdentifier: string
  fullName: string
  status: AttendanceStatus | null
}

async function assertOwnedClass(ownerId: number, classId: number) {
  const [klass] = await getDb()
    .select({ id: classes.id, name: classes.name })
    .from(classes)
    .where(and(eq(classes.id, classId), eq(classes.ownerId, ownerId)))
    .limit(1)
  if (!klass) throw notFound("Class not found.")
  return klass
}

/** The roster for a class on one date, pre-filled with any saved statuses. */
export async function getAttendanceSheet(
  ownerId: number,
  classId: number,
  date: string,
): Promise<AttendanceSheetRow[]> {
  await assertOwnedClass(ownerId, classId)
  return getDb()
    .select({
      studentId: students.id,
      studentIdentifier: students.studentIdentifier,
      fullName: students.fullName,
      status: attendanceRecords.status,
    })
    .from(enrollments)
    .innerJoin(students, eq(students.id, enrollments.studentId))
    .leftJoin(
      attendanceRecords,
      and(
        eq(attendanceRecords.classId, classId),
        eq(attendanceRecords.studentId, enrollments.studentId),
        eq(attendanceRecords.date, date),
      ),
    )
    .where(eq(enrollments.classId, classId))
    .orderBy(asc(students.fullName))
}

/**
 * Saves a full day of attendance. One record per (class, student, date) is
 * guaranteed by a unique index; re-saving the same date updates in place
 * instead of inserting duplicates.
 */
export async function saveAttendance(
  ownerId: number,
  input: unknown,
): Promise<{ saved: number; date: string }> {
  const data = parseOrThrow(attendanceSaveSchema, input)
  await assertOwnedClass(ownerId, data.classId)

  const db = getDb()
  const enrolled = await db
    .select({ studentId: enrollments.studentId })
    .from(enrollments)
    .where(eq(enrollments.classId, data.classId))
  const enrolledIds = new Set(enrolled.map((row) => row.studentId))

  const unknownStudent = data.entries.find((entry) => !enrolledIds.has(entry.studentId))
  if (unknownStudent) throw invalid("One of the students is not enrolled in this class.")

  const now = new Date()
  await db
    .insert(attendanceRecords)
    .values(
      data.entries.map((entry) => ({
        classId: data.classId,
        studentId: entry.studentId,
        date: data.date,
        status: entry.status,
      })),
    )
    .onConflictDoUpdate({
      target: [attendanceRecords.classId, attendanceRecords.studentId, attendanceRecords.date],
      set: {
        status: sql`excluded.status`,
        updatedAt: now,
      },
    })

  return { saved: data.entries.length, date: data.date }
}

export type HistoryRow = {
  id: number
  date: string
  status: AttendanceStatus
  classId: number
  className: string
  studentId: number
  studentName: string
  studentIdentifier: string
}

export async function listAttendanceHistory(
  ownerId: number,
  filters: unknown,
  limit = 200,
): Promise<HistoryRow[]> {
  const parsed = parseOrThrow(historyFilterSchema, filters)
  const conditions = [eq(classes.ownerId, ownerId)]
  if (parsed.classId) conditions.push(eq(attendanceRecords.classId, parsed.classId))
  if (parsed.studentId) conditions.push(eq(attendanceRecords.studentId, parsed.studentId))
  if (parsed.status) conditions.push(eq(attendanceRecords.status, parsed.status))
  if (parsed.date) conditions.push(eq(attendanceRecords.date, parsed.date))
  if (parsed.from) conditions.push(gte(attendanceRecords.date, parsed.from))
  if (parsed.to) conditions.push(lte(attendanceRecords.date, parsed.to))

  return getDb()
    .select({
      id: attendanceRecords.id,
      date: attendanceRecords.date,
      status: attendanceRecords.status,
      classId: classes.id,
      className: classes.name,
      studentId: students.id,
      studentName: students.fullName,
      studentIdentifier: students.studentIdentifier,
    })
    .from(attendanceRecords)
    .innerJoin(classes, eq(classes.id, attendanceRecords.classId))
    .innerJoin(students, eq(students.id, attendanceRecords.studentId))
    .where(and(...conditions))
    .orderBy(desc(attendanceRecords.date), asc(students.fullName))
    .limit(limit)
}

export type StatusTotals = Record<AttendanceStatus, number>

export type AttendanceStats = StatusTotals & {
  total: number
  /** Present + late + excused, as a share of all records. */
  attendanceRate: number
}

const emptyTotals = (): StatusTotals => ({ present: 0, absent: 0, late: 0, excused: 0 })

export function summarize(rows: { status: AttendanceStatus; count: number }[]): AttendanceStats {
  const totals = emptyTotals()
  for (const row of rows) totals[row.status] = row.count
  const total = totals.present + totals.absent + totals.late + totals.excused
  const attended = totals.present + totals.late + totals.excused
  return {
    ...totals,
    total,
    attendanceRate: total === 0 ? 0 : Math.round((attended / total) * 1000) / 10,
  }
}

export async function getStudentStats(ownerId: number, studentId: number): Promise<AttendanceStats> {
  const rows = await getDb()
    .select({ status: attendanceRecords.status, count: sql<number>`count(*)::int` })
    .from(attendanceRecords)
    .innerJoin(classes, eq(classes.id, attendanceRecords.classId))
    .where(and(eq(attendanceRecords.studentId, studentId), eq(classes.ownerId, ownerId)))
    .groupBy(attendanceRecords.status)
  return summarize(rows)
}

export async function getClassStats(ownerId: number, classId: number): Promise<AttendanceStats> {
  await assertOwnedClass(ownerId, classId)
  const rows = await getDb()
    .select({ status: attendanceRecords.status, count: sql<number>`count(*)::int` })
    .from(attendanceRecords)
    .where(eq(attendanceRecords.classId, classId))
    .groupBy(attendanceRecords.status)
  return summarize(rows)
}

export async function listRecordedDates(ownerId: number, classId: number, limit = 30) {
  await assertOwnedClass(ownerId, classId)
  return getDb()
    .select({
      date: attendanceRecords.date,
      recorded: sql<number>`count(*)::int`,
      present: sql<number>`count(*) FILTER (WHERE ${attendanceRecords.status} = 'present')::int`,
    })
    .from(attendanceRecords)
    .where(eq(attendanceRecords.classId, classId))
    .groupBy(attendanceRecords.date)
    .orderBy(desc(attendanceRecords.date))
    .limit(limit)
}

/** Dashboard counters for one account. */
export async function getDashboardStats(ownerId: number, today: string) {
  const db = getDb()

  const [[counts], statusRows, [todayRow]] = await Promise.all([
    db
      .select({
        classCount: sql<number>`(SELECT count(*)::int FROM ${classes} WHERE ${classes.ownerId} = ${ownerId})`,
        studentCount: sql<number>`(SELECT count(*)::int FROM ${students} WHERE ${students.ownerId} = ${ownerId})`,
      })
      .from(sql`(SELECT 1) AS one`),
    db
      .select({ status: attendanceRecords.status, count: sql<number>`count(*)::int` })
      .from(attendanceRecords)
      .innerJoin(classes, eq(classes.id, attendanceRecords.classId))
      .where(eq(classes.ownerId, ownerId))
      .groupBy(attendanceRecords.status),
    db
      .select({ recordedToday: sql<number>`count(*)::int` })
      .from(attendanceRecords)
      .innerJoin(classes, eq(classes.id, attendanceRecords.classId))
      .where(and(eq(classes.ownerId, ownerId), eq(attendanceRecords.date, today))),
  ])

  return {
    classCount: counts?.classCount ?? 0,
    studentCount: counts?.studentCount ?? 0,
    recordedToday: todayRow?.recordedToday ?? 0,
    stats: summarize(statusRows),
  }
}

export async function statsForStudents(ownerId: number, studentIds: number[]) {
  if (studentIds.length === 0) return new Map<number, AttendanceStats>()
  const rows = await getDb()
    .select({
      studentId: attendanceRecords.studentId,
      status: attendanceRecords.status,
      count: sql<number>`count(*)::int`,
    })
    .from(attendanceRecords)
    .innerJoin(classes, eq(classes.id, attendanceRecords.classId))
    .where(and(eq(classes.ownerId, ownerId), inArray(attendanceRecords.studentId, studentIds)))
    .groupBy(attendanceRecords.studentId, attendanceRecords.status)

  const grouped = new Map<number, { status: AttendanceStatus; count: number }[]>()
  for (const row of rows) {
    const bucket = grouped.get(row.studentId) ?? []
    bucket.push({ status: row.status, count: row.count })
    grouped.set(row.studentId, bucket)
  }
  return new Map([...grouped].map(([id, bucket]) => [id, summarize(bucket)]))
}
