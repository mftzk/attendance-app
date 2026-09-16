"use client"

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="card">
      <div className="card-body stack">
        <h1>Something went wrong</h1>
        <p className="muted">The request could not be completed. Please try again.</p>
        <div>
          <button className="primary" onClick={reset}>
            Retry
          </button>
        </div>
      </div>
    </div>
  )
}
