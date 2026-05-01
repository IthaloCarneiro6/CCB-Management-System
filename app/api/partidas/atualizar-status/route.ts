import { supabase } from '@/lib/supabase'

export async function POST(request: Request) {
  const body = await request.json()
  const { partida_id, status_novo, acao } = body as {
    partida_id: string
    status_novo: 'pendente' | 'realizado'
    acao: string
  }

  if (!partida_id || !status_novo || !acao) {
    return Response.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 })
  }

  type Payload = { status: 'pendente' | 'realizado'; data_agendada?: null }
  const payload: Payload = { status: status_novo }
  if (status_novo === 'pendente') payload.data_agendada = null

  const { error: updateError } = await supabase
    .from('partidas')
    .update(payload)
    .eq('id', partida_id)
    .eq('status', 'aguardando')

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 })
  }

  const { error: logError } = await supabase.from('logs_transacoes').insert({
    partida_id,
    acao,
    status_anterior: 'aguardando',
    status_novo,
    batch_id: crypto.randomUUID(),
  })

  if (logError) {
    return Response.json({ error: logError.message }, { status: 500 })
  }

  return Response.json({ sucesso: true })
}
