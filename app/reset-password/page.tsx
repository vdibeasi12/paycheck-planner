import { redirect } from "next/navigation"

// Canonical password-reset completion lives at /update-password.
// This route just forwards there so password-recovery links resolve correctly.
export default function ResetPasswordPage() {
  redirect("/update-password")
}
