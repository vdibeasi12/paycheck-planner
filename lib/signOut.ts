// Shared "sign out via a real top-level POST navigation" helper. Every
// sign-out button in the app (Sidebar, AppNav, the Account page, the MFA
// challenge/setup pages, DeleteAccount) now calls this instead of running
// its own `supabase.auth.signOut()` + client-side redirect. See
// app/auth/signout/route.ts for the full writeup of why: a soft
// router.push() never re-runs the root layout (leaving a stale, still
// "logged in" Sidebar mounted), and even a hard `window.location.href`
// after a client-side signOut() call is racy if that call's network
// request is slow or fails. Submitting a real <form> guarantees a genuine
// browser navigation -- the POST /auth/signout -> redirect chain, and the
// cookie-clearing Set-Cookie headers that come with it, are handled
// natively by the browser with no client-side JS timing involved at all.
export function hardSignOut(next?: string) {
  const form = document.createElement("form")
  form.method = "POST"
  form.action = "/auth/signout"
  form.style.display = "none"

  if (next) {
    const input = document.createElement("input")
    input.type = "hidden"
    input.name = "next"
    input.value = next
    form.appendChild(input)
  }

  document.body.appendChild(form)
  form.submit()
}
