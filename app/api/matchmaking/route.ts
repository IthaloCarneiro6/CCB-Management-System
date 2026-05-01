import { supabase } from '@/lib/supabase'

const LIMIAR_ALTA_DEFASAGEM = 4

type Equipe = {
  id: string
  nome: string
  chave: string
  eh_interior: boolean
}

type CampeonatoInfo = {
  id: string
  nome: string
}

type Partida = {
  id: string
  campeonato_id: string
  equipe_a_id: string
  equipe_b_id: string
  status: string
  campeonato: CampeonatoInfo
  equipe_a: Equipe
  equipe_b: Equipe
}

type Disponibilidade = {
  equipe_id: string
  data: string
}

export async function POST(request: Request) {
  const body = await request.json()
  const { data_sabado, data_domingo, campeonato_id } = body as {
    data_sabado?: string
    data_domingo?: string
    campeonato_id?: string
  }

  if (!data_sabado && !data_domingo) {
    return Response.json(
      { error: 'Informe ao menos uma data (data_sabado ou data_domingo)' },
      { status: 400 }
    )
  }

  const datas = [data_sabado, data_domingo].filter((d): d is string => Boolean(d))

  let query = supabase
    .from('partidas')
    .select(`
      id,
      campeonato_id,
      equipe_a_id,
      equipe_b_id,
      status,
      campeonato:campeonatos!campeonato_id(id, nome),
      equipe_a:equipes!equipe_a_id(id, nome, chave, eh_interior),
      equipe_b:equipes!equipe_b_id(id, nome, chave, eh_interior)
    `)
    .eq('status', 'pendente')

  if (campeonato_id) {
    query = query.eq('campeonato_id', campeonato_id)
  }

  const { data: partidas, error: pError } = await query

  if (pError) {
    return Response.json({ error: pError.message }, { status: 500 })
  }

  if (!partidas || partidas.length === 0) {
    return Response.json({ sugestoes: [], total: 0 })
  }

  const idsEquipes = new Set<string>()
  for (const p of partidas as Partida[]) {
    idsEquipes.add(p.equipe_a_id)
    idsEquipes.add(p.equipe_b_id)
  }

  const { data: disponibilidades, error: dError } = await supabase
    .from('disponibilidades')
    .select('equipe_id, data')
    .in('equipe_id', Array.from(idsEquipes))
    .in('data', datas)

  if (dError) {
    return Response.json({ error: dError.message }, { status: 500 })
  }

  const mapaDisponibilidade: Record<string, Set<string>> = {}
  for (const d of (disponibilidades ?? []) as Disponibilidade[]) {
    if (!mapaDisponibilidade[d.equipe_id]) mapaDisponibilidade[d.equipe_id] = new Set()
    mapaDisponibilidade[d.equipe_id].add(d.data)
  }

  const jogosPendentes: Record<string, number> = {}
  for (const p of partidas as Partida[]) {
    jogosPendentes[p.equipe_a_id] = (jogosPendentes[p.equipe_a_id] ?? 0) + 1
    jogosPendentes[p.equipe_b_id] = (jogosPendentes[p.equipe_b_id] ?? 0) + 1
  }

  const sugestoes = []

  for (const partida of partidas as Partida[]) {
    const equipeA = partida.equipe_a
    const equipeB = partida.equipe_b

    if (equipeA.chave !== equipeB.chave) continue

    let dataEscolhida: string | null = null
    for (const data of datas) {
      if (
        mapaDisponibilidade[partida.equipe_a_id]?.has(data) &&
        mapaDisponibilidade[partida.equipe_b_id]?.has(data)
      ) {
        dataEscolhida = data
        break
      }
    }
    if (!dataEscolhida) continue

    const jpA = jogosPendentes[partida.equipe_a_id] ?? 0
    const jpB = jogosPendentes[partida.equipe_b_id] ?? 0
    let score = jpA + jpB
    if (equipeA.eh_interior) score += 2
    if (equipeB.eh_interior) score += 2

    const labels: string[] = []
    if (equipeA.eh_interior) labels.push('[Equipe do Interior]')
    if (equipeB.eh_interior) labels.push('[Equipe do Interior]')
    if (jpA >= LIMIAR_ALTA_DEFASAGEM || jpB >= LIMIAR_ALTA_DEFASAGEM) labels.push('[Alta Defasagem]')

    sugestoes.push({
      partida_id: partida.id,
      campeonato_id: partida.campeonato_id,
      campeonato_nome: partida.campeonato.nome,
      data_sugerida: dataEscolhida,
      equipe_a: { ...equipeA, jogos_pendentes: jpA },
      equipe_b: { ...equipeB, jogos_pendentes: jpB },
      chave: equipeA.chave,
      score,
      labels,
    })
  }

  sugestoes.sort((a, b) => b.score - a.score)

  return Response.json({ sugestoes, total: sugestoes.length })
}
