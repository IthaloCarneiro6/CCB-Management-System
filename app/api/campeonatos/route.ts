import { supabase } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-server'

export async function GET() {
  const unauthorized = await requireAuth()
  if (unauthorized) return unauthorized

  const { data, error } = await supabase
    .from('campeonatos')
    .select('id, nome')
    .order('nome')

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json(data)
}
