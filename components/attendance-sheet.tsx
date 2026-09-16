"use client"

import { useActionState, useEffect, useState } from "react"
import { useFormStatus } from "react-dom"
import { type ActionState, idleState } from "@/lib/action-state"
import type { AttendanceStatus } from "@/lib/db/schema"

const STATUSES: { value: AttendanceStatus; label: string }[] = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "late", label: "Late" },
  { value: "excused", label: "Excused" },
]

export type SheetRow = {
  studentId: number
  studentIdentifier: string
  fullName: string
  status: AttendanceStatus | null
}

function SaveButton({ count }: { count: number }) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className="primary" disabled={pending}>
      {pending ? "Saving…" : `Save attendance (${count})`}
    </button>
  )
}

/**
 * Presentation only: it collects one status per student and hands the whole
 * day to the server action, which owns validation and persistence.
 */
export function AttendanceSheet({
  classId,
  date,
  rows,
  action,
}: {
  classId: number
  date: string
  rows: SheetRow[]
  action: (state: ActionState, formData: FormData) => Promise<ActionState>
}) {
  const [state, formAction] = useActionState(action, idleState)
  const [statuses, setStatuses] = useState<Record<number, AttendanceStatus>>(() =>
    Object.fromEntries(rows.map((row) => [row.studentId, row.status ?? "present"])),
  )

  useEffect(() => {
    setStatuses(Object.fromEntries(rows.map((row) => [row.studentId, row.status ?? "present"])))
  }, [rows, date])

  const entries = rows.map((row) => ({
    studentId: row.studentId,
    status: statuses[row.studentId] ?? "present",
  }))
  const presentCount = entries.filter((entry) => entry.status === "present").length

  const setAll = (status: AttendanceStatus) =>
    setStatuses(Object.fromEntries(rows.map((row) => [row.studentId, status])))

  return (
    <form action={formAction} className="stack">
      <input type="hidden" name="classId" value={classId} />
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="entries" value={JSON.stringify(entries)} />

      {state.status !== "idle" && (
        <p className={state.status === "success" ? "alert alert-success" : "alert alert-error"}>
          {state.message}
        </p>
      )}

      <div className="row-between">
        <div className="row">
          <button type="button" onClick={() => setAll("present")}>
            Mark all present
          </button>
          <button type="button" onClick={() => setAll("absent")}>
            Mark all absent
          </button>
          <span className="small muted">
            {presentCount} of {rows.length} marked present
          </span>
        </div>
        <SaveButton count={rows.length} />
      </div>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Identifier</th>
              <th className="wrap">Student</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.studentId}>
                <td className="mono">{row.studentIdentifier}</td>
                <td className="wrap">{row.fullName}</td>
                <td>
                  <div className="segmented">
                    {STATUSES.map((option) => (
                      <label key={option.value}>
                        <input
                          type="radio"
                          name={`status-${row.studentId}`}
                          value={option.value}
                          checked={(statuses[row.studentId] ?? "present") === option.value}
                          onChange={() =>
                            setStatuses((current) => ({
                              ...current,
                              [row.studentId]: option.value,
                            }))
                          }
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="row-between">
        <span className="small muted">
          Saving again for the same date updates the existing records instead of creating
          duplicates.
        </span>
        <SaveButton count={rows.length} />
      </div>
    </form>
  )
}
