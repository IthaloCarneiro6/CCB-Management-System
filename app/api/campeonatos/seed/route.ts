import { supabase } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-server'

export async function POST(request: Request) {
  const unauthorized = await requireAuth()
  if (unauthorized) return unauthorized

  const body = await request.json()
  const { campeonato_id } = body as { campeonato_id: string }

  if (!campeonato_id) {
    return Response.json({ error: 'campeonato_id é obrigatório' }, { status: 400 })
  }

  const { data: campeonato, error: campError } = await supabase
    .from('campeonatos')
    .select('id, formato_chaves')
    .eq('id', campeonato_id)
    .single()

  if (campError || !campeonato) {
    return Response.json({ error: 'Campeonato não encontrado' }, { status: 404 })
  }

  const { data: equipes, error: eqError } = await supabase
    .from('equipes')
    .select('id, chave')
    .eq('campeonato_id', campeonato_id)

  if (eqError || !equipes || equipes.length < 2) {
    return Response.json({ error: 'É necessário ao menos 2 equipes cadastradas' }, { status: 400 })
  }

  const { count: existentes } = await supabase
    .from('partidas')
    .select('id', { count: 'exact', head: true })
    .eq('campeonato_id', campeonato_id)

  if (existentes && existentes > 0) {
    return Response.json(
      { error: `Este campeonato já possui ${existentes} partidas geradas. Remova-as antes de rodar o seed novamente.`, partidas_existentes: existentes },
      { status: 409 }
    )
  }

  const novasPartidas: Array<{
    campeonato_id: string
    equipe_a_id: string
    equipe_b_id: string
    status: 'pendente'
  }> = []

  if (campeonato.formato_chaves) {
    const grupos: Record<string, typeof equipes> = {}
    for (const equipe of equipes) {
      const chave = equipe.chave ?? 'Unica'
      if (!grupos[chave]) grupos[chave] = []
      grupos[chave].push(equipe)
    }

    for (const times of Object.values(grupos)) {
      for (let i = 0; i < times.length; i++) {
        for (let j = i + 1; j < times.length; j++) {
          const [aId, bId] = [times[i].id, times[j].id].sort()
          novasPartidas.push({ campeonato_id, equipe_a_id: aId, equipe_b_id: bId, status: 'pendente' })
        }
      }
    }
  } else {
    for (let i = 0; i < equipes.length; i++) {
      for (let j = i + 1; j < equipes.length; j++) {
        const [aId, bId] = [equipes[i].id, equipes[j].id].sort()
        novasPartidas.push({ campeonato_id, equipe_a_id: aId, equipe_b_id: bId, status: 'pendente' })
      }
    }
  }

  if (novasPartidas.length === 0) {
    return Response.json({ error: 'Nenhuma partida gerada' }, { status: 400 })
  }

  const { data, error } = await supabase.from('partidas').insert(novasPartidas).select()

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ partidas_geradas: data.length, partidas: data }, { status: 201 })
}
