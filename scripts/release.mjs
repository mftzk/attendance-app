// Runs on every deployment (Nrapken Quick `release_command`):
// applies migrations, then refreshes the shared demo account.
import { connect, migrate } from "./migrate-runtime.mjs"
import { seed } from "./seed-runtime.mjs"

const sql = connect()
try {
  await migrate(sql)
  if (process.env.SEED_DEMO === "false") {
    console.log("Demo seeding skipped (SEED_DEMO=false).")
  } else {
    await seed(sql)
  }
} finally {
  await sql.end()
}
