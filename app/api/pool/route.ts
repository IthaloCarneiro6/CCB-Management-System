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
          for (let j = i + 1; j < g.length; j++)
            novas.push({ campeonato_id: camp.id, equipe_a_id: g[i].id, equipe_b_id: g[j].id, status: 'pendente' })
      }
    } else {
      for (let i = 0; i < times.length; i++)
        for (let j = i + 1; j < times.length; j++)
          novas.push({ campeonato_id: camp.id, equipe_a_id: times[i].id, equipe_b_id: times[j].id, status: 'pendente' })
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

  // Build per-campeonato, per-team structure
  const gruposMap = new Map<
    string,
    Map<string, { id: string; nome: string; chave: string; adversarios: { partida_id: string; nome: string }[] }>
  >()

  for (const p of pending) {
    if (!gruposMap.has(p.campeonato_id)) gruposMap.set(p.campeonato_id, new Map())
    const m = gruposMap.get(p.campeonato_id)!

    if (!m.has(p.equipe_a.id))
      m.set(p.equipe_a.id, { id: p.equipe_a.id, nome: p.equipe_a.nome, chave: p.equipe_a.chave, adversarios: [] })
    m.get(p.equipe_a.id)!.adversarios.push({ partida_id: p.id, nome: p.equipe_b.nome })

    if (!m.has(p.equipe_b.id))
      m.set(p.equipe_b.id, { id: p.equipe_b.id, nome: p.equipe_b.nome, chave: p.equipe_b.chave, adversarios: [] })
    m.get(p.equipe_b.id)!.adversarios.push({ partida_id: p.id, nome: p.equipe_a.nome })
  }

  const grupos = Array.from(gruposMap.entries()).map(([campeonato_id, m]) => ({
    campeonato_id,
    campeonato_nome: campNome.get(campeonato_id) ?? campeonato_id,
    total_pendentes: Math.round(Array.from(m.values()).reduce((s, t) => s + t.adversarios.length, 0) / 2),
    times: Array.from(m.values()),
  }))

  return Response.json({ grupos })
}
