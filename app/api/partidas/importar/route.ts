import { supabase } from '@/lib/supabase'

type Row = { equipe_a: string; equipe_b: string }

export async function POST(request: Request) {
  const { campeonato_id, rows } = (await request.json()) as { campeonato_id: string; rows: Row[] }

  if (!campeonato_id || !rows?.length) {
    return Response.json({ error: 'campeonato_id e rows são obrigatórios' }, { status: 400 })
  }

  const [eqRes, partRes] = await Promise.all([
    supabase.from('equipes').select('id, nome').eq('campeonato_id', campeonato_id),
    supabase.from('partidas').select('equipe_a_id, equipe_b_id').eq('campeonato_id', campeonato_id),
  ])

  const equipeMap = new Map((eqRes.data ?? []).map((e) => [e.nome.toLowerCase(), e.id]))
  const existentes = new Set((partRes.data ?? []).map((p) => [p.equipe_a_id, p.equipe_b_id].sort().join('|')))

  const erros: string[] = []
  const toInsert: { campeonato_id: string; equipe_a_id: string; equipe_b_id: string; status: 'pendente' }[] = []

  for (const [i, row] of rows.entries()) {
    const nomeA = row.equipe_a?.trim()
    const nomeB = row.equipe_b?.trim()

    if (!nomeA || !nomeB) { erros.push(`Linha ${i + 1}: equipe_a e equipe_b são obrigatórias`); continue }
    if (nomeA.toLowerCase() === nomeB.toLowerCase()) { erros.push(`Linha ${i + 1}: equipe A e B são iguais`); continue }

    const idA = equipeMap.get(nomeA.toLowerCase())
    const idB = equipeMap.get(nomeB.toLowerCase())

    if (!idA) { erros.push(`Linha ${i + 1}: "${nomeA}" não encontrada no campeonato`); continue }
    if (!idB) { erros.push(`Linha ${i + 1}: "${nomeB}" não encontrada no campeonato`); continue }

    const key = [idA, idB].sort().join('|')
    if (existentes.has(key)) { erros.push(`Linha ${i + 1}: confronto "${nomeA}" × "${nomeB}" já existe`); continue }
    existentes.add(key)

    toInsert.push({ campeonato_id, equipe_a_id: idA, equipe_b_id: idB, status: 'pendente' })
  }

  if (toInsert.length > 0) {
    const { error } = await supabase.from('partidas').insert(toInsert)
    if (error) return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ importados: toInsert.length, erros }, { status: 201 })
}
