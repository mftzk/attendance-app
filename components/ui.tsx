import type { AttendanceStatus } from "@/lib/db/schema"
import { STATUS_LABELS } from "@/lib/domain/attendance"

export function Card({
  title,
  action,
  children,
  bodyless,
}: {
  title?: React.ReactNode
  action?: React.ReactNode
  children: React.ReactNode
  bodyless?: boolean
}) {
  return (
    <section className="card">
      {(title || action) && (
        <header className="card-head">
          {typeof title === "string" ? <h2>{title}</h2> : title}
          {action}
        </header>
      )}
      {bodyless ? children : <div className="card-body">{children}</div>}
    </section>
  )
}

export function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="card stat">
      <div className="label">{label}</div>
      <div className="value mono">{value}</div>
      {hint && <div className="small muted">{hint}</div>}
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="empty stack-sm">
      <h3>{title}</h3>
      <p className="muted">{description}</p>
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  )
}

export function StatusBadge({ status }: { status: AttendanceStatus }) {
  return <span className={`badge badge-${status}`}>{STATUS_LABELS[status]}</span>
}

export function Capacity({ count, capacity }: { count: number; capacity: number }) {
  const full = count >= capacity
  const pct = Math.min(100, Math.round((count / capacity) * 100))
  return (
    <div className="stack-sm" style={{ minWidth: 140 }}>
      <div className="row" style={{ gap: 8 }}>
        <span className="capacity mono">
          {count} / {capacity} students
        </span>
        {full && <span className="badge badge-full">Full</span>}
      </div>
      <div className={full ? "meter full" : "meter"}>
        <span style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
