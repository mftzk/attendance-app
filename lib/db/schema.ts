import { relations } from "drizzle-orm"
import {
  bigint,
  bigserial,
  boolean,
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const MAX_CLASS_CAPACITY = 30

export const attendanceStatus = pgEnum("attendance_status", [
  "present",
  "absent",
  "late",
  "excused",
])

export const users = pgTable(
  "users",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("users_email_key").on(sql`lower(${table.email})`)],
)

export const sessions = pgTable(
  "sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    userId: bigint("user_id", { mode: "number" })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [index("sessions_user_id_idx").on(table.userId)],
)

export const classes = pgTable(
  "classes",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    ownerId: bigint("owner_id", { mode: "number" })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("classes_owner_id_idx").on(table.ownerId),
    uniqueIndex("classes_owner_name_key").on(table.ownerId, sql`lower(${table.name})`),
  ],
)

export const students = pgTable(
  "students",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    ownerId: bigint("owner_id", { mode: "number" })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    studentIdentifier: text("student_identifier").notNull(),
    fullName: text("full_name").notNull(),
    email: text("email"),
    phone: text("phone"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("students_owner_id_idx").on(table.ownerId),
    uniqueIndex("students_owner_identifier_key").on(
      table.ownerId,
      sql`lower(${table.studentIdentifier})`,
    ),
  ],
)

export const enrollments = pgTable(
  "enrollments",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    classId: bigint("class_id", { mode: "number" })
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    studentId: bigint("student_id", { mode: "number" })
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    seatNo: integer("seat_no").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("enrollments_class_student_key").on(table.classId, table.studentId),
    uniqueIndex("enrollments_class_seat_key").on(table.classId, table.seatNo),
    index("enrollments_student_id_idx").on(table.studentId),
    check(
      "enrollments_seat_within_capacity",
      sql`${table.seatNo} BETWEEN 1 AND ${sql.raw(String(MAX_CLASS_CAPACITY))}`,
    ),
  ],
)

export const attendanceRecords = pgTable(
  "attendance_records",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    classId: bigint("class_id", { mode: "number" })
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    studentId: bigint("student_id", { mode: "number" })
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    status: attendanceStatus("status").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("attendance_class_student_date_key").on(
      table.classId,
      table.studentId,
      table.date,
    ),
    index("attendance_class_date_idx").on(table.classId, table.date),
    index("attendance_student_idx").on(table.studentId),
  ],
)

export const usersRelations = relations(users, ({ many }) => ({
  classes: many(classes),
  students: many(students),
}))

export const classesRelations = relations(classes, ({ one, many }) => ({
  owner: one(users, { fields: [classes.ownerId], references: [users.id] }),
  enrollments: many(enrollments),
  attendanceRecords: many(attendanceRecords),
}))

export const studentsRelations = relations(students, ({ one, many }) => ({
  owner: one(users, { fields: [students.ownerId], references: [users.id] }),
  enrollments: many(enrollments),
  attendanceRecords: many(attendanceRecords),
}))

export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
  class: one(classes, { fields: [enrollments.classId], references: [classes.id] }),
  student: one(students, { fields: [enrollments.studentId], references: [students.id] }),
}))

export const attendanceRecordsRelations = relations(attendanceRecords, ({ one }) => ({
  class: one(classes, { fields: [attendanceRecords.classId], references: [classes.id] }),
  student: one(students, { fields: [attendanceRecords.studentId], references: [students.id] }),
}))

export const schema = {
  users,
  sessions,
  classes,
  students,
  enrollments,
  attendanceRecords,
  usersRelations,
  classesRelations,
  studentsRelations,
  enrollmentsRelations,
  attendanceRecordsRelations,
}

export type AttendanceStatus = (typeof attendanceStatus.enumValues)[number]
