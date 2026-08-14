// lib/withTimeout.ts
//
// Bounds a promise that might hang indefinitely instead of rejecting. Seen
// in practice with supabase-js auth calls (getUser/getSession/mfa.*) inside
// the Android/iOS WebView: several account-page components each call these
// independently on mount, and supabase-js serializes them behind an
// internal navigator-lock-style mutex. If that lock request itself never
// settles in a given WebView, a plain `await` on it hangs forever with no
// error to catch -- a try/catch alone can't help, because nothing ever
// rejects.
//
// This races the real promise against a timer so callers always get an
// answer within `ms`, falling back to `fallback` on either an outright
// rejection or a timeout. Treating both the same keeps call sites simple:
// one straight-line `await withTimeout(...)` instead of a try/catch plus a
// separate timeout mechanism.
//
// Takes PromiseLike<T> rather than Promise<T> on purpose: supabase-js's
// query builders (the objects returned by .select()/.eq()/etc. before you
// await them) are thenable but not real Promise instances -- they don't
// have .catch/.finally/[Symbol.toStringTag]. Promise<T> would reject them
// at the type level even though `await` and `.then()` both work fine.
export function withTimeout<T>(promise: PromiseLike<T>, ms: number, fallback: T): Promise<T> {
  return new Promise<T>((resolve) => {
    let done = false
    const timer = setTimeout(() => {
      if (!done) {
        done = true
        resolve(fallback)
      }
    }, ms)
    promise.then(
      (value) => {
        if (!done) {
          done = true
          clearTimeout(timer)
          resolve(value)
        }
      },
      () => {
        if (!done) {
          done = true
          clearTimeout(timer)
          resolve(fallback)
        }
      }
    )
  })
}
