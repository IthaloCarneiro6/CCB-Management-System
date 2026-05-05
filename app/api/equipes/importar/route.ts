import { supabase } from '@/lib/supabase'

type Row = { nome: string; chave?: string; eh_interior?: string | boolean }

export async function POST(request: Request) {
  const { campeonato_id, rows } = (await request.json()) as { campeonato_id: string; rows: Row[] }

  if (!campeonato_id || !rows?.length) {
    return Response.json({ error: 'campeonato_id e rows são obrigatórios' }, { status: 400 })
  }

  // ── Inserir equipes ──
  const { data: existentes } = await supabase
    .from('equipes').select('nome').eq('campeonato_id', campeonato_id)

  const nomesExistentes = new Set((existentes ?? []).map((e) => e.nome.toLowerCase()))
  const erros: string[] = []
  const toInsert: { campeonato_id: string; nome: string; chave: string; eh_interior: boolean }[] = []

  for (const [i, row] of rows.entries()) {
    const nome = row.nome?.trim()
    if (!nome) { erros.push(`Linha ${i + 1}: nome vazio`); continue }
    if (nomesExistentes.has(nome.toLowerCase())) { erros.push(`Linha ${i + 1}: "${nome}" já existe`); continue }
    nomesExistentes.add(nome.toLowerCase())
    toInsert.push({
      campeonato_id,
      nome,
      chave: (typeof row.chave === 'string' ? row.chave.trim() : '') || 'Unica',
      eh_interior: ['true', '1', 'sim', 'yes'].includes(String(row.eh_interior ?? '').toLowerCase()),
    })
  }

  if (toInsert.length > 0) {
    const { error } = await supabase.from('equipes').insert(toInsert)
    if (error) return Response.json({ error: error.message }, { status: 500 })
  }

  // ── Gerar confrontos Round Robin para as equipes novas ──
  const [campRes, allEqRes, partidasRes] = await Promise.all([
    supabase.from('campeonatos').select('formato_chaves').eq('id', campeonato_id).single(),
    supabase.from('equipes').select('id, chave').eq('campeonato_id', campeonato_id),
    supabase.from('partidas').select('equipe_a_id, equipe_b_id').eq('campeonato_id', campeonato_id),
  ])

  const formato_chaves = campRes.data?.formato_chaves ?? false
  const allEquipes = allEqRes.data ?? []
  const existingSet = new Set(
    (partidasRes.data ?? []).map((p) => [p.equipe_a_id, p.equipe_b_id].sort().join('|'))
  )

  const novasPartidas: { campeonato_id: string; equipe_a_id: string; equipe_b_id: string; status: 'pendente' }[] = []

  const addPair = (a: string, b: string) => {
    const key = [a, b].sort().join('|')
    if (!existingSet.has(key)) { existingSet.add(key); novasPartidas.push({ campeonato_id, equipe_a_id: a, equipe_b_id: b, status: 'pendente' }) }
  }

  if (formato_chaves) {
    const grupos: Record<string, string[]> = {}
    for (const e of allEquipes) {
      const ch = e.chave ?? 'Unica'
      if (!grupos[ch]) grupos[ch] = []
      grupos[ch].push(e.id)
    }
    for (const ids of Object.values(grupos))
      for (let i = 0; i < ids.length; i++)
        for (let j = i + 1; j < ids.length; j++)
          addPair(ids[i], ids[j])
  } else {
    for (let i = 0; i < allEquipes.length; i++)
      for (let j = i + 1; j < allEquipes.length; j++)
        addPair(allEquipes[i].id, allEquipes[j].id)
  }

  if (novasPartidas.length > 0)
    await supabase.from('partidas').insert(novasPartidas)

  return Response.json({ importados: toInsert.length, partidas_geradas: novasPartidas.length, erros }, { status: 201 })
}
