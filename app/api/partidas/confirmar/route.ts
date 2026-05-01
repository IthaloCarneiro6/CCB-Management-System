import { supabase } from '@/lib/supabase'

type PartidaInput = {
  id: string
  data_agendada: string
}

export async function POST(request: Request) {
  const body = await request.json()
  const { partidas, acao } = body as {
    partidas: PartidaInput[]
    acao: string
  }

  if (!partidas?.length || !acao) {
    return Response.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 })
  }

  const batch_id = crypto.randomUUID()

  const updates = await Promise.all(
    partidas.map((p) =>
      supabase
        .from('partidas')
        .update({ status: 'aguardando', data_agendada: p.data_agendada })
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

  const { error: logError } = await supabase.from('logs_transacoes').insert(logs)

  if (logError) {
    return Response.json({ error: logError.message }, { status: 500 })
  }

  return Response.json({ sucesso: true, batch_id, confirmadas: partidas.length })
}
