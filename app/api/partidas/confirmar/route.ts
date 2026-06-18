import { supabase } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth-server'

type PartidaInput = {
  id: string
  data_agendada: string
  numero_jogo?: number | null
  horario?: string | null
  local?: string | null
  equipe_a_id?: string | null
  equipe_b_id?: string | null
}

export async function POST(request: Request) {
  const unauthorized = await requireAuth()
  if (unauthorized) return unauthorized

  const body = await request.json()
  const { partidas, acao } = body as { partidas: PartidaInput[]; acao: string }

  if (!partidas?.length || !acao) {
    return Response.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 })
  }

  const batch_id = crypto.randomUUID()

  const updates = await Promise.all(
    partidas.map((p) =>
      supabase
        .from('partidas')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update({
          status: 'aguardando',
          data_agendada: p.data_agendada,
          ...(p.equipe_a_id != null && { equipe_a_id: p.equipe_a_id }),
          ...(p.equipe_b_id != null && { equipe_b_id: p.equipe_b_id }),
          ...(p.numero_jogo != null && { numero_jogo: p.numero_jogo }),
          ...(p.horario != null && { horario: p.horario }),
          ...(p.local != null && { local: p.local }),
        } as any)
        .eq('id', p.id)
        .eq('status', 'pendente')
    )
  )

  const primeiroErro = updates.find((r) => r.error)
  if (primeiroErro?.error) {
    return Response.json({ error: primeiroErro.error.message }, { status: 500 })
  }

  const logs = partidas.map((p) => ({
    partida_id: p.id,
    acao,
    status_anterior: 'pendente',
    status_novo: 'aguardando',
    batch_id,
  }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: logError } = await supabase.from('logs_transacoes').insert(logs as any)
  if (logError) return Response.json({ error: logError.message }, { status: 500 })

  return Response.json({ sucesso: true, batch_id, confirmadas: partidas.length })
}
