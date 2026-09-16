import postgres, { type Sql } from "postgres"
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js"
import { schema } from "./schema"

export type Database = PostgresJsDatabase<typeof schema>

let client: Sql | undefined
let database: Database | undefined

export function getDb(): Database {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required")
  }

  if (!database) {
    client = postgres(process.env.DATABASE_URL, {
      max: Number(process.env.DB_POOL_MAX || 5),
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
    })
    database = drizzle(client, { schema })
  }

  return database
}

export async function closeDb(): Promise<void> {
  if (client) {
    await client.end({ timeout: 5 })
    client = undefined
    database = undefined
  }
}
