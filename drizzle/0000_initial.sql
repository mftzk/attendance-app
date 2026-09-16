-- Student Attendance Application — initial schema.
-- Every tenant-owned row carries an owner_id so authorization can be enforced
-- with a WHERE clause instead of trusting identifiers supplied by the client.

CREATE TABLE IF NOT EXISTS users (
  id            bigserial PRIMARY KEY,
  name          text        NOT NULL,
  email         text        NOT NULL,
  password_hash text        NOT NULL,
  is_demo       boolean     NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON users (lower(email));

CREATE TABLE IF NOT EXISTS sessions (
  token_hash text        PRIMARY KEY,
  user_id    bigint      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions (expires_at);

CREATE TABLE IF NOT EXISTS classes (
  id          bigserial PRIMARY KEY,
  owner_id    bigint      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name        text        NOT NULL,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS classes_owner_id_idx ON classes (owner_id);
CREATE UNIQUE INDEX IF NOT EXISTS classes_owner_name_key ON classes (owner_id, lower(name));

CREATE TABLE IF NOT EXISTS students (
  id                 bigserial PRIMARY KEY,
  owner_id           bigint      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  student_identifier text        NOT NULL,
  full_name          text        NOT NULL,
  email              text,
  phone              text,
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS students_owner_id_idx ON students (owner_id);
-- Student identifiers are unique per account, not globally.
CREATE UNIQUE INDEX IF NOT EXISTS students_owner_identifier_key
  ON students (owner_id, lower(student_identifier));

-- Class membership.
--
-- `seat_no` is the database-level guarantee of the 30-student capacity rule:
-- the CHECK constraint bounds it to 1..30 and the unique index makes each seat
-- exclusive, so even a buggy caller or a direct SQL INSERT cannot push a class
-- past 30 members. The application additionally takes a row lock on the class
-- (SELECT ... FOR UPDATE) so concurrent enrollments are serialized and the
-- seat number is computed from a stable count.
CREATE TABLE IF NOT EXISTS enrollments (
  id         bigserial PRIMARY KEY,
  class_id   bigint      NOT NULL REFERENCES classes (id) ON DELETE CASCADE,
  student_id bigint      NOT NULL REFERENCES students (id) ON DELETE CASCADE,
  seat_no    integer     NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT enrollments_seat_within_capacity CHECK (seat_no BETWEEN 1 AND 30)
);
CREATE UNIQUE INDEX IF NOT EXISTS enrollments_class_student_key
  ON enrollments (class_id, student_id);
CREATE UNIQUE INDEX IF NOT EXISTS enrollments_class_seat_key
  ON enrollments (class_id, seat_no);
CREATE INDEX IF NOT EXISTS enrollments_student_id_idx ON enrollments (student_id);

DO $$ BEGIN
  CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'excused');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS attendance_records (
  id         bigserial PRIMARY KEY,
  class_id   bigint            NOT NULL REFERENCES classes (id) ON DELETE CASCADE,
  student_id bigint            NOT NULL REFERENCES students (id) ON DELETE CASCADE,
  date       date              NOT NULL,
  status     attendance_status NOT NULL,
  note       text,
  created_at timestamptz       NOT NULL DEFAULT now(),
  updated_at timestamptz       NOT NULL DEFAULT now()
);
-- One record per student per class per day; re-saving updates in place.
CREATE UNIQUE INDEX IF NOT EXISTS attendance_class_student_date_key
  ON attendance_records (class_id, student_id, date);
CREATE INDEX IF NOT EXISTS attendance_class_date_idx ON attendance_records (class_id, date);
CREATE INDEX IF NOT EXISTS attendance_student_idx ON attendance_records (student_id);
CREATE INDEX IF NOT EXISTS attendance_date_idx ON attendance_records (date);
