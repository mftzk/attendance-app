const TIME_ZONE = process.env.APP_TIMEZONE || "Asia/Jakarta"

/** Today's date as YYYY-MM-DD in the application's reporting time zone. */
export function todayIso(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date())
}

export function formatDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(`${value}T00:00:00Z`) : value
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: typeof value === "string" ? "UTC" : TIME_ZONE,
  }).format(date)
}
