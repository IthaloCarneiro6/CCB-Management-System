import { supabase } from '@/lib/supabase'

type RawPartida = {
  id: string
  campeonato_id: string
  equipe_a: { id: string; nome: string; chave: string }
  equipe_b: { id: string; nome: string; chave: string }
}

export async function GET() {
  const [campRes, eqRes, anyPartidaRes] = await Promise.all([
    supabase.from('campeonatos').select('id, nome, formato_chaves').order('nome'),
    supabase.from('equipes').select('id, campeonato_id, nome, chave').order('nome'),
    supabase.from('partidas').select('campeonato_id'),
  ])

  const campeonatos = campRes.data ?? []
  const equipes = eqRes.data ?? []
  const campComPartidas = new Set((anyPartidaRes.data ?? []).map((p) => p.campeonato_id))

  // Auto-generate partidas for campeonatos that have equipes but no partidas yet
  const novas: Array<{ campeonato_id: string; equipe_a_id: string; equipe_b_id: string; status: 'pendente' }> = []

  for (const camp of campeonatos) {
    if (campComPartidas.has(camp.id)) continue
    const times = equipes.filter((e) => e.campeonato_id === camp.id)
    if (times.length < 2) continue

    if (camp.formato_chaves) {
      const grupos: Record<string, typeof times> = {}
      for (const e of times) {
        const ch = e.chave ?? 'Unica'
        if (!grupos[ch]) grupos[ch] = []
        grupos[ch].push(e)
      }
      for (const g of Object.values(grupos)) {
        for (let i = 0; i < g.length; i++)
          for (let j = i + 1; j < g.length; j++) {
            const [aId, bId] = [g[i].id, g[j].id].sort()
            novas.push({ campeonato_id: camp.id, equipe_a_id: aId, equipe_b_id: bId, status: 'pendente' })
          }
      }
    } else {
      for (let i = 0; i < times.length; i++)
        for (let j = i + 1; j < times.length; j++) {
          const [aId, bId] = [times[i].id, times[j].id].sort()
          novas.push({ campeonato_id: camp.id, equipe_a_id: aId, equipe_b_id: bId, status: 'pendente' })
        }
    }
  }

  if (novas.length > 0) {
    await supabase.from('partidas').insert(novas)
  }

  // Fetch all pending partidas with team names
  const { data: raw } = await supabase
    .from('partidas')
    .select(`id, campeonato_id,
      equipe_a:equipes!equipe_a_id(id, nome, chave),
      equipe_b:equipes!equipe_b_id(id, nome, chave)`)
    .eq('status', 'pendente')
    .order('campeonato_id')

  const pending = (raw ?? []) as unknown as RawPartida[]
  const campNome = new Map(campeonatos.map((c) => [c.id, c.nome]))

  // Build flat list of partidas per campeonato
  const gruposMap = new Map<string, { id: string; equipe_a: { id: string; nome: string }; equipe_b: { id: string; nome: string } }[]>()

  for (const p of pending) {
    if (!gruposMap.has(p.campeonato_id)) gruposMap.set(p.campeonato_id, [])
    gruposMap.get(p.campeonato_id)!.push({
      id: p.id,
      equipe_a: { id: p.equipe_a.id, nome: p.equipe_a.nome },
      equipe_b: { id: p.equipe_b.id, nome: p.equipe_b.nome },
    })
  }

  const grupos = Array.from(gruposMap.entries()).map(([campeonato_id, partidas]) => ({
    campeonato_id,
    campeonato_nome: campNome.get(campeonato_id) ?? campeonato_id,
    total_pendentes: partidas.length,
    partidas: [...partidas].sort((a, b) => a.equipe_a.nome.localeCompare(b.equipe_a.nome, 'pt-BR')),
  }))

  return Response.json({ grupos })
}
