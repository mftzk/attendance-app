import { fileURLToPath } from "node:url"

const projectRoot = fileURLToPath(new URL(".", import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  poweredByHeader: false,
  outputFileTracingRoot: projectRoot,
  // Nrapken Quick serves the `runnable_bundle` produced in `.next/standalone`.
  // The release command runs inside that bundle, so the migration/seed runner
  // and its SQL must be traced into it.
  outputFileTracingIncludes: {
    "/*": [
      "./drizzle/*.sql",
      "./scripts/*.mjs",
      "./node_modules/postgres/**/*",
    ],
  },
}

export default nextConfig
