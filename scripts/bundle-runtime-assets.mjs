// The deployment runs `release_command` from inside `.next/standalone`, and
// some build platforms rewrite next.config.* (dropping outputFileTracingIncludes).
// Copying the release assets explicitly keeps migrations working either way.
import { cp, mkdir } from "node:fs/promises"
import { existsSync } from "node:fs"
import { resolve } from "node:path"

const standalone = resolve(".next/standalone")
if (!existsSync(standalone)) {
  console.log("No standalone output; nothing to bundle.")
  process.exit(0)
}

for (const dir of ["scripts", "drizzle"]) {
  await mkdir(resolve(standalone, dir), { recursive: true })
  await cp(resolve(dir), resolve(standalone, dir), { recursive: true })
}

// `postgres` is the only runtime dependency the release script needs.
const target = resolve(standalone, "node_modules/postgres")
await mkdir(target, { recursive: true })
await cp(resolve("node_modules/postgres"), target, { recursive: true })

console.log("Bundled scripts/, drizzle/ and postgres into .next/standalone.")
