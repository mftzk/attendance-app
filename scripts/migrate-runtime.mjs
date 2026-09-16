// Idempotent migration runner. Plain Node + SQL so it can run inside the
// deployed Next.js standalone bundle where TypeScript is not available.
import { readdir, readFile } from "node:fs/promises"
import { existsSync } from "node:fs"
import { resolve } from "node:path"
import postgres from "postgres"

const MIGRATION_DIRS = ["drizzle", "../drizzle", "../../drizzle"]

export function migrationsDir() {
  const found = MIGRATION_DIRS.map((dir) => resolve(process.cwd(), dir)).find((dir) =>
    existsSync(dir),
  )
  if (!found) throw new Error("Migration directory not found")
  return found
}

export async function migrate(sql) {
  await sql`CREATE TABLE IF NOT EXISTS schema_migrations (
    name text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`

  const dir = migrationsDir()
  const files = (await readdir(dir)).filter((name) => name.endsWith(".sql")).sort()

  for (const name of files) {
    const [done] = await sql`SELECT name FROM schema_migrations WHERE name = ${name}`
    if (done) {
      console.log(`Skipped ${name} (already applied)`)
      continue
    }
    const body = await readFile(resolve(dir, name), "utf8")
    await sql.begin(async (tx) => {
      await tx.unsafe(body)
      await tx`INSERT INTO schema_migrations (name) VALUES (${name})`
    })
    console.log(`Applied ${name}`)
  }
}

export function connect() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required")
  return postgres(process.env.DATABASE_URL, { max: 1, prepare: false })
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const sql = connect()
  try {
    await migrate(sql)
    console.log("Migrations up to date.")
  } finally {
    await sql.end()
  }
}
