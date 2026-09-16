import Link from "next/link"
import { redirect } from "next/navigation"
import { DEMO_EMAIL, getSessionUser } from "@/lib/auth"
import { ActionForm, SubmitButton } from "@/components/form"
import { demoAction, signInAction, signUpAction } from "./actions"

export const dynamic = "force-dynamic"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>
}) {
  if (await getSessionUser()) redirect("/dashboard")
  const { mode } = await searchParams
  const isSignUp = mode === "register"

  return (
    <main className="auth-wrap">
      <div className="auth-card stack">
        <div className="brand" style={{ justifyContent: "center", fontSize: 16 }}>
          <span className="brand-mark">A</span> Attendance
        </div>

        <section className="card">
          <div className="card-body stack">
            <nav className="tabs">
              <Link href="/login" data-active={!isSignUp}>
                Sign in
              </Link>
              <Link href="/login?mode=register" data-active={isSignUp}>
                Create account
              </Link>
            </nav>

            {isSignUp ? (
              <ActionForm action={signUpAction}>
                <div>
                  <label htmlFor="name">Full name</label>
                  <input id="name" name="name" autoComplete="name" required />
                </div>
                <div>
                  <label htmlFor="email">Email</label>
                  <input id="email" name="email" type="email" autoComplete="email" required />
                </div>
                <div>
                  <label htmlFor="password">Password</label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                  <p className="small muted" style={{ marginTop: 4 }}>
                    At least 8 characters.
                  </p>
                </div>
                <SubmitButton>Create account</SubmitButton>
              </ActionForm>
            ) : (
              <ActionForm action={signInAction}>
                <div>
                  <label htmlFor="email">Email</label>
                  <input id="email" name="email" type="email" autoComplete="email" required />
                </div>
                <div>
                  <label htmlFor="password">Password</label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                  />
                </div>
                <SubmitButton>Sign in</SubmitButton>
              </ActionForm>
            )}
          </div>

          <div className="card-body stack-sm">
            <ActionForm action={demoAction} className="stack-sm">
              <SubmitButton variant="default">Try Demo</SubmitButton>
            </ActionForm>
            <p className="small muted">
              The demo account <strong>{DEMO_EMAIL}</strong> is shared by every visitor. Its
              classes, students and attendance records may be changed or reset at any time — do not
              store anything you need to keep.
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}
