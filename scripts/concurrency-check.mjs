/**
 * Demonstrates that the 30-student capacity cannot be exceeded, even when the
 * API is called directly and concurrently.
 *
 *   BASE_URL=http://localhost:3000 node scripts/concurrency-check.mjs
 *
 * It signs into the demo account, builds a scratch class with 29 students,
 * then fires several simultaneous enrollment requests for different students.
 * Exactly one may succeed; the rest must be rejected with HTTP 409.
 */
const BASE_URL = process.env.BASE_URL || "http://localhost:3000"
const PARALLEL = Number(process.env.PARALLEL || 5)

let cookie = ""

async function api(path, { method = "GET", body } = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const setCookie = response.headers.get("set-cookie")
  if (setCookie) cookie = setCookie.split(";")[0]
  const payload = await response.json().catch(() => ({}))
  return { status: response.status, payload }
}

const fail = (message) => {
  console.error(`FAIL: ${message}`)
  process.exit(1)
}

const login = await api("/api/auth/login", { method: "POST", body: { demo: true } })
if (login.status !== 200) fail(`demo login failed (${login.status})`)

const students = (await api("/api/students")).payload.data
if (!students || students.length < 30 + PARALLEL) {
  fail(`need at least ${30 + PARALLEL} demo students, found ${students?.length ?? 0}`)
}

const created = await api("/api/classes", {
  method: "POST",
  body: { name: `Concurrency Check ${Date.now()}`, description: "temporary" },
})
if (created.status !== 200) fail(`class creation failed: ${JSON.stringify(created.payload)}`)
const classId = created.payload.data.id

try {
  for (const student of students.slice(0, 29)) {
    const result = await api(`/api/classes/${classId}/enrollments`, {
      method: "POST",
      body: { studentId: student.id },
    })
    if (result.status !== 200) fail(`seed enrollment failed: ${JSON.stringify(result.payload)}`)
  }
  console.log("Class filled to 29 / 30.")

  const contenders = students.slice(29, 29 + PARALLEL)
  const results = await Promise.all(
    contenders.map((student) =>
      api(`/api/classes/${classId}/enrollments`, {
        method: "POST",
        body: { studentId: student.id },
      }),
    ),
  )

  const accepted = results.filter((result) => result.status === 200)
  const rejected = results.filter((result) => result.status === 409)

  console.log(`Fired ${PARALLEL} simultaneous enrollments.`)
  console.log(`  accepted: ${accepted.length}`)
  console.log(`  rejected with 409: ${rejected.length}`)
  for (const result of rejected) console.log(`  → ${result.payload.message}`)

  const final = (await api(`/api/classes/${classId}`)).payload.data
  console.log(`Final class size: ${final.studentCount} / ${final.capacity}`)

  if (accepted.length !== 1) fail(`expected exactly 1 accepted request, got ${accepted.length}`)
  if (final.studentCount !== 30) fail(`expected 30 students, got ${final.studentCount}`)
  if (rejected.length !== PARALLEL - 1) fail("some requests failed for the wrong reason")

  console.log("PASS: capacity held at 30 under concurrent enrollment.")
} finally {
  await api(`/api/classes/${classId}`, { method: "DELETE" })
  console.log("Scratch class removed.")
}
