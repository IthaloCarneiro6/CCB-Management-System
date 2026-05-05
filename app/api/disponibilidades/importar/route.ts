import Papa from 'papaparse'
import { supabase } from '@/lib/supabase'

type CsvRow = { equipe: string; data: string }

function parseDateToBR(valor: string): string | null {
  const trimmed = valor.trim()
  const brMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (brMatch) return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`
  const isoMatch = trimmed.match(/^\d{4}-\d{2}-\d{2}$/)
  if (isoMatch) return trimmed
  return null
}

export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const campeonato_id = formData.get('campeonato_id') as string | null

  if (!file || !campeonato_id) {
    return Response.json(
      { error: 'Os campos "file" e "campeonato_id" são obrigatórios' },
      { status: 400 }
    )
  }

  const texto = await file.text()
  const { data: linhas, errors: parseErrors } = Papa.parse<CsvRow>(texto, {
    header: true,
    skipEmptyLines: true,
  })

  if (parseErrors.length > 0) {
    return Response.json({ error: 'CSV inválido', detalhes: parseErrors }, { status: 400 })
  }

  const [equipeRes, campRes] = await Promise.all([
    supabase.from('equipes').select('id, nome').eq('campeonato_id', campeonato_id),
    supabase.from('campeonatos').select('nome').eq('id', campeonato_id).single(),
  ])

  if (equipeRes.error) {
    return Response.json({ error: equipeRes.error.message }, { status: 500 })
  }

  const equipes = equipeRes.data ?? []
  const campeonatoNome = campRes.data?.nome ?? ''
  const inserir: Array<{ equipe_id: string; data: string }> = []
  const erros: string[] = []

  for (const linha of linhas) {
    const nomeCSV = linha.equipe?.trim()
    const dataCSV = linha.data?.trim()

    if (!nomeCSV || !dataCSV) {
      erros.push(`Linha ignorada por estar incompleta: ${JSON.stringify(linha)}`)
      continue
    }

    const equipe = equipes.find((e) => e.nome.toLowerCase() === nomeCSV.toLowerCase())
    if (!equipe) {
      erros.push(`Equipe não encontrada no campeonato: "${nomeCSV}"`)
      continue
    }

    const dataFormatada = parseDateToBR(dataCSV)
    if (!dataFormatada) {
      erros.push(`Formato de data inválido para a equipe "${nomeCSV}": "${dataCSV}"`)
      continue
    }

    inserir.push({ equipe_id: equipe.id, data: dataFormatada })
  }

  if (inserir.length === 0) {
    return Response.json(
      { error: 'Nenhum registro válido encontrado no CSV', erros },
      { status: 400 }
    )
  }

  // ignoreDuplicates: true → ON CONFLICT DO NOTHING, .select() retorna apenas os inseridos
  const { data, error } = await supabase
    .from('disponibilidades')
    .upsert(inserir, { onConflict: 'equipe_id,data', ignoreDuplicates: true })
    .select()

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  const insertedIds = (data ?? []).map((d) => d.id).filter(Boolean) as string[]

  // ── Log de auditoria ──
  if (insertedIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await supabase.from('logs_transacoes').insert({
      acao: 'IMPORT_DISPONIBILIDADES',
      payload: {
        campeonato_id,
        campeonato_nome: campeonatoNome,
        disponibilidade_ids: insertedIds,
        total: insertedIds.length,
      },
      batch_id: crypto.randomUUID(),
    } as any)
  }

  return Response.json({ importados: data?.length ?? 0, erros }, { status: 201 })
}
