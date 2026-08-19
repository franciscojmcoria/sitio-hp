import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient as sc } from '@supabase/supabase-js'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (s) => { try { s.forEach(({name,value,options}) => cookieStore.set(name,value,options)) } catch {} },
      },
    }
  )
}

export function createServiceClient() {
  return sc(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}
