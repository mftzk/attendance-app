// Seeds the shared demo account with realistic sample data.
// Safe to re-run: existing demo data is replaced, other accounts are untouched.
import { randomBytes, scrypt as scryptCb } from "node:crypto"
import { promisify } from "node:util"
import { connect } from "./migrate-runtime.mjs"

const scrypt = promisify(scryptCb)

const DEMO_EMAIL = (process.env.DEMO_EMAIL || "demo@attendance.app").toLowerCase()
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "demo12345"
const DEMO_NAME = process.env.DEMO_NAME || "Demo Teacher"

async function hashPassword(password) {
  const salt = randomBytes(16)
  const derived = await scrypt(password, salt, 64)
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`
}

const FIRST = [
  "Anita", "Budi", "Citra", "Dimas", "Eka", "Fajar", "Gita", "Hendra", "Intan", "Joko",
  "Kirana", "Lukman", "Maya", "Nanda", "Oktavia", "Putra", "Qori", "Rizky", "Sinta", "Tono",
  "Utami", "Vino", "Wulan", "Yusuf", "Zahra", "Aldi", "Bella", "Cahya", "Dewi", "Erik",
  "Farah", "Galih", "Hana", "Irfan", "Jihan", "Kevin", "Lia", "Miko", "Nadia", "Omar",
  "Prita", "Rangga", "Sari", "Tirta", "Vera", "Wahyu", "Yoga", "Zaki",
]
const LAST = [
  "Wijaya", "Santoso", "Pratama", "Lestari", "Nugroho", "Hakim", "Maulana", "Kusuma",
  "Rahmawati", "Siregar", "Halim", "Permata", "Saputra", "Anggraini", "Hidayat", "Puspita",
]

const pick = (list, index) => list[index % list.length]

/** Weekday dates counting back from today, newest last. */
function recentWeekdays(count) {
  const dates = []
  const cursor = new Date()
  while (dates.length < count) {
    const day = cursor.getUTCDay()
    if (day !== 0 && day !== 6) dates.push(cursor.toISOString().slice(0, 10))
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }
  return dates.reverse()
}

// Deterministic status mix so the demo statistics look realistic but stable.
function statusFor(seed) {
  const bucket = seed % 20
  if (bucket < 15) return "present"
  if (bucket < 17) return "absent"
  if (bucket === 17 || bucket === 18) return "late"
  return "excused"
}

const CLASSES = [
  { name: "Computer Science A", description: "Semester 1 — Lab B2, Mon/Wed 08:00", size: 24 },
  { name: "Mathematics B", description: "Semester 1 — Room 204, Tue/Thu 10:00", size: 30 },
  { name: "Physics C", description: "Semester 2 — Lab A1, Fri 13:00", size: 14 },
]

export async function seed(sql) {
  const passwordHash = await hashPassword(DEMO_PASSWORD)

  const [user] = await sql`
    INSERT INTO users (name, email, password_hash, is_demo)
    VALUES (${DEMO_NAME}, ${DEMO_EMAIL}, ${passwordHash}, true)
    ON CONFLICT (lower(email)) DO UPDATE
      SET password_hash = EXCLUDED.password_hash, is_demo = true, name = EXCLUDED.name
    RETURNING id
  `
  const ownerId = user.id

  // Reset only the demo account's data; cascades clear enrollments + attendance.
  await sql`DELETE FROM classes WHERE owner_id = ${ownerId}`
  await sql`DELETE FROM students WHERE owner_id = ${ownerId}`

  const totalStudents = 48
  const students = []
  for (let i = 0; i < totalStudents; i += 1) {
    const fullName = `${pick(FIRST, i)} ${pick(LAST, i * 3 + 1)}`
    const identifier = `S-${1001 + i}`
    const [row] = await sql`
      INSERT INTO students (owner_id, student_identifier, full_name, email, phone)
      VALUES (
        ${ownerId},
        ${identifier},
        ${fullName},
        ${i % 4 === 0 ? null : `${fullName.split(" ")[0].toLowerCase()}.${identifier.toLowerCase()}@example.edu`},
        ${i % 3 === 0 ? null : `+62 812 ${String(1000 + i).padStart(4, "0")} ${String(2000 + i * 7).slice(0, 4)}`}
      )
      RETURNING id
    `
    students.push(row.id)
  }

  const dates = recentWeekdays(10)
  let cursor = 0

  for (const definition of CLASSES) {
    const [klass] = await sql`
      INSERT INTO classes (owner_id, name, description)
      VALUES (${ownerId}, ${definition.name}, ${definition.description})
      RETURNING id
    `

    // Overlapping slices so some students belong to more than one class.
    const members = []
    for (let seat = 1; seat <= definition.size; seat += 1) {
      const studentId = students[(cursor + seat - 1) % students.length]
      members.push({ studentId, seat })
      await sql`
        INSERT INTO enrollments (class_id, student_id, seat_no)
        VALUES (${klass.id}, ${studentId}, ${seat})
        ON CONFLICT DO NOTHING
      `
    }
    cursor += Math.max(1, definition.size - 6)

    for (const [dayIndex, date] of dates.entries()) {
      // The most recent day is left unrecorded for two classes so the demo has
      // something to take attendance for.
      if (dayIndex === dates.length - 1 && definition.name !== "Computer Science A") continue
      for (const member of members) {
        await sql`
          INSERT INTO attendance_records (class_id, student_id, date, status)
          VALUES (${klass.id}, ${member.studentId}, ${date}, ${statusFor(member.seat * 7 + dayIndex * 3)})
          ON CONFLICT (class_id, student_id, date) DO UPDATE SET status = EXCLUDED.status
        `
      }
    }

    console.log(`Seeded ${definition.name} with ${definition.size} students.`)
  }

  console.log(`Demo account ready: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const sql = connect()
  try {
    await seed(sql)
  } finally {
    await sql.end()
  }
}
