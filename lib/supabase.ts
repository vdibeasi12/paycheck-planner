import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Singleton browser client (most components import this).
export const supabase = createSupabaseClient(supabaseUrl, supabaseKey)

// Some components call `createClient()`; return the shared singleton so we
// don't spin up a new client (and a new GoTrue instance) on every call.
export function createClient() {
  return supabase
}

export default supabase
