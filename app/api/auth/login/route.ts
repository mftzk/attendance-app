import { json, readJson } from "@/lib/api"
import { signIn, signInAsDemo } from "@/lib/auth"
import { parseOrThrow, signInSchema } from "@/lib/validation"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  return json(async () => {
    const body = (await readJson(request)) as Record<string, unknown>
    if (body.demo === true) return signInAsDemo()
    const data = parseOrThrow(signInSchema, body)
    return signIn(data.email, data.password)
  })
}
