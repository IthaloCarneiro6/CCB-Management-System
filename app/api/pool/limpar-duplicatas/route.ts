import { supabase } from '@/lib/supabase'

export async function POST() {
  const { data: partidas, error } = await supabase
    .from('partidas')
    .select('id, campeonato_id, equipe_a_id, equipe_b_id')
    .eq('status', 'pendente')

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const seen = new Map<string, string>()
  const toDelete: string[] = []

  for (const p of partidas ?? []) {
    const key = `${p.campeonato_id}|${[p.equipe_a_id, p.equipe_b_id].sort().join('|')}`
    if (seen.has(key)) {
      toDelete.push(p.id)
    } else {
      seen.set(key, p.id)
    }
  }

  if (toDelete.length === 0) {
    return Response.json({ removidas: 0 })
  }

  const { error: delError } = await supabase
    .from('partidas')
    .delete()
    .in('id', toDelete)

  if (delError) return Response.json({ error: delError.message }, { status: 500 })

  return Response.json({ removidas: toDelete.length })
}
