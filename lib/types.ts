export type Tab = 'planejar' | 'visao-geral' | 'pool' | 'logs' | 'importar'
export type ImportTipo = 'equipes' | 'disponibilidades'

export type EquipeSugestao = {
  id: string
  nome: string
  chave: string
  eh_interior: boolean
  jogos_pendentes: number
}

export type Sugestao = {
  partida_id: string
  campeonato_id: string
  campeonato_nome: string
  data_sugerida: string
  equipe_a: EquipeSugestao
  equipe_b: EquipeSugestao
  chave: string
  score: number
  labels: string[]
}

export type PartidaOficial = {
  id: string
  campeonato_id: string
  campeonato_nome: string
  data_agendada: string | null
  numero_jogo: number | null
  horario: string | null
  local: string | null
  equipe_a: { id: string; nome: string }
  equipe_b: { id: string; nome: string }
}

export type LogTransacao = {
  id: string
  partida_id: string | null
  acao: string
  status_anterior: string | null
  status_novo: string | null
  batch_id: string | null
  created_at: string
  payload: Record<string, unknown> | null
  partida: { equipe_a: { nome: string }; equipe_b: { nome: string } } | null
}

export type Campeonato = { id: string; nome: string }

export type EquipeStats = { id: string; nome: string; jp: number; ja: number; jr: number }
export type ObservacaoDisp = { equipe_nome: string; observacao: string }
export type CampeonatoVG = { id: string; nome: string; equipes: EquipeStats[] }

export type PartidaPool = {
  id: string
  equipe_a: { id: string; nome: string }
  equipe_b: { id: string; nome: string }
}
export type GrupoPool = {
  campeonato_id: string
  campeonato_nome: string
  total_pendentes: number
  partidas: PartidaPool[]
}
export type BlocoPool = {
  pivotId: string
  pivotNome: string
  count: number
  partidas: PartidaPool[]
}
export type GrupoPoolAgrupado = {
  campeonato_id: string
  campeonato_nome: string
  total_pendentes: number
  blocos: BlocoPool[]
}
