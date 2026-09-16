import Link from "next/link"

export default function NotFound() {
  return (
    <div className="card">
      <div className="card-body stack">
        <h1>Not found</h1>
        <p className="muted">
          This resource does not exist, or it belongs to another account.
        </p>
        <div>
          <Link className="button button-primary" href="/dashboard">
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
