import { redirect } from "next/navigation"
import { signOut } from "@/lib/auth"
import { SubmitButton } from "./form"

export function SignOutButton() {
  async function action() {
    "use server"
    await signOut()
    redirect("/login")
  }
  return (
    <form action={action}>
      <SubmitButton variant="default" size="sm">
        Sign out
      </SubmitButton>
    </form>
  )
}
