import { z } from "zod"
import { invalid } from "./errors"

export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address.")

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required."),
})

export const signUpSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters."),
  email: emailSchema,
  password: z.string().min(8, "Password must be at least 8 characters."),
})

export const classInputSchema = z.object({
  name: z.string().trim().min(2, "Class name must be at least 2 characters.").max(120),
  description: z
    .string()
    .trim()
    .max(500, "Description must be at most 500 characters.")
    .optional()
    .transform((value) => (value ? value : null)),
})

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : null))

export const studentInputSchema = z.object({
  studentIdentifier: z
    .string()
    .trim()
    .min(1, "Student identifier is required.")
    .max(64, "Student identifier must be at most 64 characters."),
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters.").max(160),
  email: z
    .union([z.literal(""), emailSchema])
    .optional()
    .transform((value) => (value ? value : null)),
  phone: optionalText(40),
})

export const attendanceStatusSchema = z.enum(["present", "absent", "late", "excused"])

export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the YYYY-MM-DD date format.")

export const attendanceSaveSchema = z.object({
  classId: z.coerce.number().int().positive(),
  date: isoDateSchema,
  entries: z
    .array(
      z.object({
        studentId: z.coerce.number().int().positive(),
        status: attendanceStatusSchema,
      }),
    )
    .min(1, "Select at least one student."),
})

export const historyFilterSchema = z.object({
  classId: z.coerce.number().int().positive().optional(),
  studentId: z.coerce.number().int().positive().optional(),
  date: isoDateSchema.optional(),
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
  status: attendanceStatusSchema.optional(),
})

/** Parses with zod and rethrows as the app's validation error. */
export function parseOrThrow<T extends z.ZodTypeAny>(schema: T, value: unknown): z.infer<T> {
  const result = schema.safeParse(value)
  if (!result.success) {
    const issue = result.error.issues[0]
    throw invalid(issue?.message ?? "The submitted data is invalid.", {
      field: issue?.path.join(".") ?? "",
    })
  }
  return result.data
}
