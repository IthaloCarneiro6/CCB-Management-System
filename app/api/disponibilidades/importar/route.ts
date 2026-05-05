import Papa from 'papaparse'
import { supabase } from '@/lib/supabase'

// Accepts both old format (equipe, data) and Google Forms format
type CsvRowOld = { equipe: string; data: string }
type CsvRowForms = Record<string, string>

const FORMS_EQUIPE_COL = 'Qual sua equipe ?'
const FORMS_DATAS_COL = 'Quais das seguintes datas sua equipe tem disponibilidade:'
const FORMS_OBS_COL = 'Observações:'

function isFormsFormat(headers: string[]): boolean {
  return headers.includes(FORMS_EQUIPE_COL)
}

// Parses "DD/MM/YY - DayName", "DD/MM/YY", "DD/MM/YYYY" or "YYYY-MM-DD"
function parseDatePart(valor: string): string | null {
  const trimmed = valor.trim()
  // Strip " - NomeDia" suffix if present (e.g. "16/05/26 - Sábado")
  const dataPart = trimmed.split(' - ')[0].trim()

  const brLong = dataPart.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (brLong) return `${brLong[3]}-${brLong[2]}-${brLong[1]}`

  const brShort = dataPart.match(/^(\d{2})\/(\d{2})\/(\d{2})$/)
  if (brShort) return `20${brShort[3]}-${brShort[2]}-${brShort[1]}`

  const iso = dataPart.match(/^\d{4}-\d{2}-\d{2}$/)
  if (iso) return dataPart

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
  const { data: linhas, errors: parseErrors, meta } = Papa.parse<CsvRowForms>(texto, {
    header: true,
    skipEmptyLines: true,
  })

  if (parseErrors.length > 0) {
    return Response.json({ error: 'CSV inválido', detalhes: parseErrors }, { status: 400 })
  }

  const headers = meta.fields ?? []
  const usandoFormsFormat = isFormsFormat(headers)

  const [equipeRes, campRes] = await Promise.all([
    supabase.from('equipes').select('id, nome').eq('campeonato_id', campeonato_id),
    supabase.from('campeonatos').select('nome').eq('id', campeonato_id).single(),
  ])

  if (equipeRes.error) {
    return Response.json({ error: equipeRes.error.message }, { status: 500 })
  }

  const equipes = equipeRes.data ?? []
  const campeonatoNome = campRes.data?.nome ?? ''
  const inserir: Array<{ equipe_id: string; data: string; observacao: string | null }> = []
  const erros: string[] = []

  if (usandoFormsFormat) {
    // ── Google Forms format ──
    for (const linha of linhas) {
      const nomeCSV = (linha[FORMS_EQUIPE_COL] ?? '').trim()
      const datasStr = (linha[FORMS_DATAS_COL] ?? '').trim()
      const observacao = (linha[FORMS_OBS_COL] ?? '').trim() || null

      if (!nomeCSV) {
        erros.push(`Linha ignorada: nome da equipe vazio.`)
        continue
      }

      const equipe = equipes.find((e) => e.nome.toLowerCase() === nomeCSV.toLowerCase())
      if (!equipe) {
        erros.push(`Equipe não encontrada no campeonato: "${nomeCSV}"`)
        continue
      }

      if (!datasStr) {
        erros.push(`Equipe "${nomeCSV}" sem datas informadas.`)
        continue
      }

      // Split comma-separated date entries: "16/05/26 - Sábado, 30/05/26 - Sábado"
      const entradas = datasStr.split(',').map((s) => s.trim()).filter(Boolean)
      for (const entrada of entradas) {
        const dataFormatada = parseDatePart(entrada)
        if (!dataFormatada) {
          erros.push(`Formato de data inválido para "${nomeCSV}": "${entrada}"`)
          continue
        }
        inserir.push({ equipe_id: equipe.id, data: dataFormatada, observacao })
      }
    }
  } else {
    // ── Old format (equipe, data) ──
    for (const linha of linhas as unknown as CsvRowOld[]) {
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

      const dataFormatada = parseDatePart(dataCSV)
      if (!dataFormatada) {
        erros.push(`Formato de data inválido para a equipe "${nomeCSV}": "${dataCSV}"`)
        continue
      }

      inserir.push({ equipe_id: equipe.id, data: dataFormatada, observacao: null })
    }
  }

  if (inserir.length === 0) {
    return Response.json(
      { error: 'Nenhum registro válido encontrado no CSV', erros },
      { status: 400 }
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase
    .from('disponibilidades')
    .upsert(inserir as any, { onConflict: 'equipe_id,data', ignoreDuplicates: true })
    .select() as any) as { data: Array<{ id: string }> | null; error: { message: string } | null }

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  const insertedIds = (data ?? []).map((d) => d.id).filter(Boolean) as string[]

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
