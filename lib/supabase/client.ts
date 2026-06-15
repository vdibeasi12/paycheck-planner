import { createBrowserClient } from '@supabase/ssr'

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Some components import { createClient } from "@/lib/supabase/client".
// Return the shared browser singleton to avoid duplicate auth instances.
export function createClient() {
  return supabase
}

export default supabase
