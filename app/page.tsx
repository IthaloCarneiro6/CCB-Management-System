'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Papa from 'papaparse'
import {
  Wand2, Trophy, Layers, ScrollText, CalendarDays, ChevronRight,
  Plus, X, Loader2, Zap, MapPin, AlertTriangle, ListChecks, RotateCcw,
  CheckCircle2, Search, Upload, RefreshCw,
  FileText, ArrowRight, Users2, Database,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

// ─── Types ───────────────────────────────────────────────────────────────────

type Tab = 'planejar' | 'visao-geral' | 'pool' | 'logs' | 'importar'
type ImportTipo = 'equipes' | 'disponibilidades'

type EquipeSugestao = {
  id: string
  nome: string
  chave: string
  eh_interior: boolean
  jogos_pendentes: number
}

type Sugestao = {
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

type PartidaOficial = {
  id: string
  campeonato_id: string
  campeonato_nome: string
  data_agendada: string | null
  numero_jogo: number | null
  horario: string | null
  local: string | null
  equipe_a: { nome: string }
  equipe_b: { nome: string }
}

type PartidaPendente = {
  id: string
  campeonato_id: string
  campeonato_nome: string
  equipe_a: { nome: string; chave: string }
  equipe_b: { nome: string; chave: string }
}

type LogTransacao = {
  id: string
  partida_id: string | null
  acao: string
  status_anterior: string | null
  status_novo: string | null
  batch_id: string | null
  created_at: string
  payload: Record<string, unknown> | null
  partida: {
    equipe_a: { nome: string }
    equipe_b: { nome: string }
  } | null
}

type Campeonato = {
  id: string
  nome: string
}

type EquipeStats = { id: string; nome: string; jp: number; ja: number; jr: number }
type CampeonatoVG = { id: string; nome: string; equipes: EquipeStats[] }

type Adversario = { partida_id: string; nome: string }
type TimePool = { id: string; nome: string; chave: string; adversarios: Adversario[] }
type GrupoPool = { campeonato_id: string; campeonato_nome: string; total_pendentes: number; times: TimePool[] }

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ymd(iso: string): string {
  return iso ? iso.slice(0, 10) : ''
}

function formatarData(iso: string): string {
  if (!iso) return ''
  const [ano, mes, dia] = ymd(iso).split('-')
  return `${dia}/${mes}/${ano}`
}

function formatarDataCurta(iso: string): string {
  if (!iso) return ''
  const [, mes, dia] = ymd(iso).split('-')
  return `${dia}/${mes}`
}

function formatarDataHora(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

function nomeDiaSemana(iso: string): string {
  if (!iso) return ''
  const data = new Date(`${ymd(iso)}T12:00:00`)
  return ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][data.getDay()] ?? ''
}

function labelClasses(label: string) {
  if (label.includes('Interior'))
    return 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
  return 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
}

function LabelIcon({ label }: { label: string }) {
  if (label.includes('Interior')) return <MapPin className="w-3 h-3 shrink-0" />
  return <AlertTriangle className="w-3 h-3 shrink-0" />
}

function agruparPor<T>(items: T[], getKey: (item: T) => string): { chave: string; items: T[] }[] {
  const map = new Map<string, T[]>()
  for (const item of items) {
    const key = getKey(item)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }
  return Array.from(map.entries()).map(([chave, grupo]) => ({ chave, items: grupo }))
}

function statusBadgeClasses(status: string) {
  switch (status) {
    case 'pendente':   return 'bg-neutral-800 text-neutral-400 border border-neutral-700'
    case 'aguardando': return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
    case 'realizado':  return 'bg-green-500/10 text-green-400 border border-green-500/20'
    default:           return 'bg-neutral-800 text-neutral-400'
  }
}

function acaoClasses(acao: string) {
  switch (acao) {
    case 'agendar': return 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
    case 'cancelar': return 'bg-red-500/10 text-red-400 border border-red-500/20'
    case 'realizar': return 'bg-green-500/10 text-green-400 border border-green-500/20'
    default: return 'bg-neutral-800 text-neutral-400'
  }
}

function acaoLabel(acao: string) {
  const map: Record<string, string> = { agendar: 'Agendado', cancelar: 'Cancelado', realizar: 'Realizado' }
  return map[acao] ?? acao
}

function statusLabel(status: string) {
  const map: Record<string, string> = { pendente: 'Pendente', aguardando: 'Aguardando', realizado: 'Realizado' }
  return map[status] ?? status
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SugestaoCard({
  sugestao, isStaged, onAdd,
}: {
  sugestao: Sugestao
  isStaged: boolean
  onAdd: () => void
}) {
  return (
    <div className="group bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-xl p-4 flex flex-col gap-3 transition-colors">
      {sugestao.labels.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {sugestao.labels.map((label, i) => (
            <span key={i} className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${labelClasses(label)}`}>
              <LabelIcon label={label} />
              {label}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-black uppercase italic text-white text-s leading-tight truncate">{sugestao.equipe_a.nome}</p>
          <p className="text-orange-400 text-xs mt-0.5 font-medium">{sugestao.equipe_a.jogos_pendentes} JP</p>
        </div>
        <div className="flex flex-col items-center shrink-0">
          <span className="font-black text-orange-400 text-xs tracking-widest">VS</span>
          <span className="text-neutral-500 text-[10px] font-medium mt-0.5 whitespace-nowrap">{formatarData(sugestao.data_sugerida)}</span>
          <span className="text-neutral-600 text-[10px] font-semibold whitespace-nowrap">{nomeDiaSemana(sugestao.data_sugerida)}</span>
        </div>
        <div className="flex-1 min-w-0 text-right">
          <p className="font-black uppercase italic text-white text-s leading-tight truncate">{sugestao.equipe_b.nome}</p>
          <p className="text-orange-400 text-xs mt-0.5 font-medium">{sugestao.equipe_b.jogos_pendentes} JP</p>
        </div>
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
        <span className="text-xs text-neutral-500 font-semibold tracking-wide">Chave {sugestao.chave}</span>
        <button
          onClick={onAdd}
          disabled={isStaged}
          className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all active:scale-95 ${
            isStaged
              ? 'bg-neutral-800 text-neutral-600 cursor-not-allowed'
              : 'bg-orange-500 hover:bg-orange-400 text-white shadow-md shadow-orange-500/20'
          }`}
        >
          {isStaged ? 'Adicionado ✓' : <><Plus className="w-3.5 h-3.5" />Adicionar</>}
        </button>
      </div>
    </div>
  )
}

function StagedCard({ sugestao, onRemove }: { sugestao: Sugestao; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-3 bg-neutral-800/50 border border-neutral-700/50 rounded-xl px-3 py-2.5">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-black uppercase italic text-white text-xs truncate">{sugestao.equipe_a.nome}</span>
          <span className="text-orange-500 font-black text-xs shrink-0">VS</span>
          <span className="font-black uppercase italic text-white text-xs truncate">{sugestao.equipe_b.nome}</span>
        </div>
        <p className="text-neutral-600 text-xs mt-0.5">{formatarData(sugestao.data_sugerida)} · {sugestao.campeonato_nome}</p>
      </div>
      <button
        onClick={onRemove}
        className="shrink-0 w-6 h-6 flex items-center justify-center rounded-lg text-neutral-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

function StatCard({
  title, value, icon: Icon, color = 'orange', loading,
}: {
  title: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  color?: 'orange' | 'yellow' | 'blue'
  loading: boolean
}) {
  const palette = {
    orange: { bg: 'bg-orange-500/10', icon: 'text-orange-500', border: 'border-orange-500/20' },
    yellow: { bg: 'bg-yellow-500/10', icon: 'text-yellow-400', border: 'border-yellow-500/20' },
    blue:   { bg: 'bg-sky-500/10',    icon: 'text-sky-400',    border: 'border-sky-500/20'    },
  }[color]

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest leading-relaxed">{title}</span>
        <div className={`shrink-0 w-9 h-9 rounded-xl ${palette.bg} border ${palette.border} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${palette.icon}`} />
        </div>
      </div>
      {loading ? (
        <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
      ) : (
        <span className="font-black italic text-4xl text-white leading-none">{value}</span>
      )}
    </div>
  )
}

function ImportModal({ campeonatos, onClose }: { campeonatos: Campeonato[]; onClose: () => void }) {
  const [campeonatoId, setCampeonatoId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [result, setResult] = useState<{ importados?: number; erros?: string[]; error?: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleImport() {
    if (!campeonatoId || !file) return
    setIsImporting(true)
    setResult(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('campeonato_id', campeonatoId)
      const res = await fetch('/api/disponibilidades/importar', { method: 'POST', body: fd })
      setResult(await res.json())
    } catch {
      setResult({ error: 'Erro ao enviar o arquivo.' })
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl">

        <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-orange-500" />
            <h2 className="font-bold text-white text-sm">Importar CSV</h2>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-600 hover:text-neutral-300 hover:bg-neutral-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest">Campeonato / Categoria</label>
            <select
              value={campeonatoId}
              onChange={(e) => setCampeonatoId(e.target.value)}
              className="bg-neutral-800 border border-neutral-700 text-neutral-200 text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition-colors"
            >
              <option value="">Selecione o campeonato...</option>
              {campeonatos.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest">Arquivo CSV (Disponibilidades)</label>
            <div
              onClick={() => fileRef.current?.click()}
              className="border border-dashed border-neutral-700 hover:border-orange-500/50 rounded-xl p-6 flex flex-col items-center gap-3 cursor-pointer transition-colors group"
            >
              <div className="w-10 h-10 rounded-xl bg-neutral-800 group-hover:bg-orange-500/10 flex items-center justify-center transition-colors">
                <FileText className="w-5 h-5 text-neutral-600 group-hover:text-orange-500 transition-colors" />
              </div>
              {file ? (
                <div className="text-center">
                  <p className="text-sm font-semibold text-white">{file.name}</p>
                  <p className="text-xs text-neutral-500 mt-0.5">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-sm font-medium text-neutral-400">Clique para selecionar</p>
                  <p className="text-xs text-neutral-600 mt-0.5">Colunas: equipe, data</p>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>

          <div className="bg-neutral-800/50 rounded-xl p-3 text-xs text-neutral-500 font-mono leading-relaxed">
            <span className="text-neutral-400 font-sans font-semibold">Formato esperado:</span><br />
            equipe,data<br />
            Time A,15/06/2025<br />
            Time B,22/06/2025
          </div>

          {result && (
            <div className={`rounded-xl p-3 text-sm ${result.error ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-green-500/10 border border-green-500/20 text-green-400'}`}>
              {result.error ? (
                <p>{result.error}</p>
              ) : (
                <>
                  <p className="font-semibold">{result.importados} disponibilidade{result.importados !== 1 ? 's' : ''} importada{result.importados !== 1 ? 's' : ''}!</p>
                  {(result.erros?.length ?? 0) > 0 && (
                    <ul className="mt-2 flex flex-col gap-1 text-yellow-400 text-xs">
                      {result.erros!.map((e, i) => <li key={i}>⚠ {e}</li>)}
                    </ul>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="px-5 pb-5 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-neutral-400 hover:text-neutral-200 transition-colors">
            Fechar
          </button>
          <button
            onClick={handleImport}
            disabled={!campeonatoId || !file || isImporting}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 active:bg-orange-600 text-white font-bold px-5 py-2 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed text-sm shadow-lg shadow-orange-500/20"
          >
            {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {isImporting ? 'Importando...' : 'Importar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function NovoCampeonatoModal({ onClose, onCreated }: { onClose: () => void; onCreated: (c: Campeonato) => void }) {
  const [nome, setNome] = useState('')
  const [temporada, setTemporada] = useState('2026')
  const [isSaving, setIsSaving] = useState(false)
  const [erro, setErro] = useState('')

  async function handleSalvar() {
    const nomeFinal = [nome.trim(), temporada.trim()].filter(Boolean).join(' ')
    if (!nomeFinal) { setErro('Informe o nome do campeonato.'); return }
    setIsSaving(true)
    setErro('')
    try {
      const { data, error } = await supabase
        .from('campeonatos')
        .insert({ nome: nomeFinal, formato_chaves: false })
        .select('id, nome')
        .single()
      if (error) throw error
      const novo = data as Campeonato
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await supabase.from('logs_transacoes').insert({
        acao: 'CRIACAO_CAMPEONATO',
        payload: { campeonato_id: novo.id, campeonato_nome: novo.nome },
        batch_id: crypto.randomUUID(),
      } as any)
      onCreated(novo)
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao criar campeonato.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl">

        <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-orange-500" />
            <h2 className="font-black italic uppercase text-white text-sm tracking-tight">
              Novo <span className="text-orange-500">Campeonato</span>
            </h2>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-600 hover:text-neutral-300 hover:bg-neutral-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest">Nome / Categoria</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSalvar()}
              placeholder="ex: Adulto Masc — Chave A"
              autoFocus
              className="bg-neutral-800 border border-neutral-700 text-neutral-200 text-sm italic rounded-xl px-3 py-2.5 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition-colors placeholder:not-italic placeholder:text-neutral-600"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest">Temporada</label>
            <input
              type="number"
              value={temporada}
              onChange={(e) => setTemporada(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSalvar()}
              className="bg-neutral-800 border border-neutral-700 text-neutral-200 text-sm italic rounded-xl px-3 py-2.5 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition-colors w-32"
            />
          </div>

          {erro && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl px-3 py-2.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />{erro}
            </div>
          )}
        </div>

        <div className="px-5 pb-5 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-neutral-400 hover:text-neutral-200 transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSalvar}
            disabled={!nome.trim() || isSaving}
            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white font-bold px-5 py-2 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed text-sm shadow-lg shadow-orange-500/20"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {isSaving ? 'Criando...' : 'Criar Campeonato'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'planejar',    label: 'Planejar',     Icon: Wand2      },
  { id: 'visao-geral', label: 'Visão Geral',  Icon: Trophy     },
  { id: 'pool',        label: 'Pool de Jogos', Icon: Layers    },
  { id: 'importar',   label: 'Importar',      Icon: Upload     },
  { id: 'logs',        label: 'Logs',          Icon: ScrollText },
]

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('planejar')

  // ── Planejar ──
  const [dataSabado, setDataSabado] = useState('')
  const [dataDomingo, setDataDomingo] = useState('')
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([])
  const [staging, setStaging] = useState<Sugestao[]>([])
  const [proximoNumeroJogo, setProximoNumeroJogo] = useState(1)
  const [stagingLogistica, setStagingLogistica] = useState<Record<string, { numero_jogo: string; horario: string; local: string }>>({})
  const [rodadaOficial, setRodadaOficial] = useState<PartidaOficial[]>([])
  const [isLoadingSugestoes, setIsLoadingSugestoes] = useState(false)
  const [isConfirmando, setIsConfirmando] = useState(false)
  const [atualizandoIds, setAtualizandoIds] = useState<Set<string>>(new Set())
  const [erro, setErro] = useState('')

  // ── Pool ──
  const [gruposPool, setGruposPool] = useState<GrupoPool[]>([])
  const [searchPool, setSearchPool] = useState('')
  const [isLoadingPool, setIsLoadingPool] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showNovoCampModal, setShowNovoCampModal] = useState(false)
  const [campeonatos, setCampeonatos] = useState<Campeonato[]>([])

  // ── Importar ──
  const [importTipo, setImportTipo] = useState<ImportTipo>('equipes')
  const [importCampeonatoId, setImportCampeonatoId] = useState('')
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importRows, setImportRows] = useState<Record<string, string>[]>([])
  const [importHeaders, setImportHeaders] = useState<string[]>([])
  const [importCellErrors, setImportCellErrors] = useState<Record<string, true>>({})
  const [isDragging, setIsDragging] = useState(false)
  const [isImportando, setIsImportando] = useState(false)
  const [importResultado, setImportResultado] = useState<{ importados: number; erros: string[]; partidasGeradas?: number } | null>(null)
  const importFileRef = useRef<HTMLInputElement>(null)

  // ── Logs ──
  const [logs, setLogs] = useState<LogTransacao[]>([])
  const [isLoadingLogs, setIsLoadingLogs] = useState(false)

  // ── Stats ──
  const [statsVG, setStatsVG] = useState<CampeonatoVG[]>([])
  const [isLoadingStats, setIsLoadingStats] = useState(false)
  const [filtroVG, setFiltroVG] = useState('')

  // ── Data loaders ──

  const carregarRodadaOficial = useCallback(async () => {
    const { data } = await supabase
      .from('partidas')
      .select(`id, campeonato_id, data_agendada, numero_jogo, horario, local,
        campeonato:campeonatos!campeonato_id(nome),
        equipe_a:equipes!equipe_a_id(nome),
        equipe_b:equipes!equipe_b_id(nome)`)
      .eq('status', 'aguardando')
      .order('data_agendada')
      .order('local')
      .order('numero_jogo')
    if (data) {
      setRodadaOficial(
        (data as unknown as Array<{
          id: string; campeonato_id: string; data_agendada: string | null
          numero_jogo: number | null; horario: string | null; local: string | null
          campeonato: { nome: string } | null
          equipe_a: { nome: string }; equipe_b: { nome: string }
        }>).map((p) => ({ ...p, campeonato_nome: p.campeonato?.nome ?? 'Sem categoria' }))
      )
    }
  }, [])

  const carregarProximoNumero = useCallback(async () => {
    const { data } = await supabase
      .from('partidas')
      .select('numero_jogo')
      .not('numero_jogo', 'is', null)
      .neq('status', 'pendente')
      .order('numero_jogo', { ascending: false })
      .limit(1)
    const max = (data?.[0] as { numero_jogo: number } | undefined)?.numero_jogo ?? 0
    setProximoNumeroJogo(max + 1)
  }, [])

  const carregarPool = useCallback(async () => {
    setIsLoadingPool(true)
    try {
      const res = await fetch('/api/pool')
      const json = await res.json()
      if (res.ok) setGruposPool(json.grupos)
    } finally {
      setIsLoadingPool(false)
    }
  }, [])

  const carregarLogs = useCallback(async () => {
    setIsLoadingLogs(true)
    try {
      const { data } = await supabase
        .from('logs_transacoes')
        .select(`id, partida_id, acao, status_anterior, status_novo, batch_id, created_at, payload,
          partida:partidas!partida_id(
            equipe_a:equipes!equipe_a_id(nome),
            equipe_b:equipes!equipe_b_id(nome)
          )`)
        .order('created_at', { ascending: false })
        .limit(100)
      if (data) setLogs(data as unknown as LogTransacao[])
    } finally {
      setIsLoadingLogs(false)
    }
  }, [])

  const carregarStats = useCallback(async () => {
    setIsLoadingStats(true)
    try {
      const [campRes, eqRes, partRes] = await Promise.all([
        supabase.from('campeonatos').select('id, nome').order('nome'),
        supabase.from('equipes').select('id, campeonato_id, nome').order('nome'),
        supabase.from('partidas').select('equipe_a_id, equipe_b_id, status'),
      ])
      const camps = campRes.data ?? []
      const equipes = eqRes.data ?? []
      const partidas = (partRes.data ?? []) as { equipe_a_id: string; equipe_b_id: string; status: string }[]

      const statsMap = new Map<string, { jp: number; ja: number; jr: number }>()
      const inc = (id: string, status: string) => {
        if (!statsMap.has(id)) statsMap.set(id, { jp: 0, ja: 0, jr: 0 })
        const s = statsMap.get(id)!
        if (status === 'pendente') s.jp++
        else if (status === 'aguardando') s.ja++
        else if (status === 'realizado') s.jr++
      }
      for (const p of partidas) { inc(p.equipe_a_id, p.status); inc(p.equipe_b_id, p.status) }

      setStatsVG(
        camps
          .map((c) => ({
            id: c.id,
            nome: c.nome,
            equipes: equipes
              .filter((e) => e.campeonato_id === c.id)
              .map((e) => ({ id: e.id, nome: e.nome, ...(statsMap.get(e.id) ?? { jp: 0, ja: 0, jr: 0 }) })),
          }))
          .filter((c) => c.equipes.length > 0)
      )
    } finally {
      setIsLoadingStats(false)
    }
  }, [])

  const carregarCampeonatos = useCallback(async () => {
    const { data } = await supabase.from('campeonatos').select('id, nome').order('nome')
    if (data) setCampeonatos(data)
  }, [])

  useEffect(() => { carregarRodadaOficial(); carregarProximoNumero() }, [carregarRodadaOficial, carregarProximoNumero])

  useEffect(() => {
    if (activeTab === 'pool')        carregarPool()
    if (activeTab === 'logs')        carregarLogs()
    if (activeTab === 'visao-geral') carregarStats()
    if (activeTab === 'importar')    carregarCampeonatos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  useEffect(() => {
    if (showImportModal && campeonatos.length === 0) carregarCampeonatos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showImportModal])

  // ── Planejar handlers ──

  async function gerarSugestoes() {
    if (!dataSabado && !dataDomingo) { setErro('Informe ao menos uma data.'); return }
    setErro('')
    setIsLoadingSugestoes(true)
    setSugestoes([])
    try {
      const res = await fetch('/api/matchmaking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(dataSabado && { data_sabado: dataSabado }),
          ...(dataDomingo && { data_domingo: dataDomingo }),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setSugestoes(json.sugestoes)
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao gerar sugestões.')
    } finally {
      setIsLoadingSugestoes(false)
    }
  }

  function addToStaging(s: Sugestao) {
    if (!staging.some((x) => x.partida_id === s.partida_id)) {
      setStaging((prev) => [...prev, s])
      setStagingLogistica((prev) => {
        const offset = Object.keys(prev).length
        return { ...prev, [s.partida_id]: { numero_jogo: String(proximoNumeroJogo + offset), horario: '', local: '' } }
      })
    }
  }

  function removeFromStaging(id: string) {
    setStaging((prev) => prev.filter((s) => s.partida_id !== id))
    setStagingLogistica((prev) => { const n = { ...prev }; delete n[id]; return n })
  }

  async function confirmarRodada() {
    if (!staging.length) return
    setIsConfirmando(true)
    setErro('')
    try {
      const res = await fetch('/api/partidas/confirmar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partidas: staging.map((s) => {
            const log = stagingLogistica[s.partida_id]
            return {
              id: s.partida_id,
              data_agendada: s.data_sugerida,
              numero_jogo: log?.numero_jogo ? parseInt(log.numero_jogo, 10) : null,
              horario: log?.horario || null,
              local: log?.local || null,
            }
          }),
          acao: 'agendar',
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      const confirmados = new Set(staging.map((s) => s.partida_id))
      setSugestoes((prev) => prev.filter((s) => !confirmados.has(s.partida_id)))
      setStaging([])
      setStagingLogistica({})
      await carregarRodadaOficial()
      await carregarProximoNumero()
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao confirmar a rodada.')
    } finally {
      setIsConfirmando(false)
    }
  }

  async function atualizarStatus(partida_id: string, status_novo: 'pendente' | 'realizado', acao: string) {
    setAtualizandoIds((prev) => new Set([...prev, partida_id]))
    try {
      const res = await fetch('/api/partidas/atualizar-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partida_id, status_novo, acao }),
      })
      if (res.ok) await carregarRodadaOficial()
    } finally {
      setAtualizandoIds((prev) => { const n = new Set(prev); n.delete(partida_id); return n })
    }
  }

  // ── Importar helpers ──

  const IMPORT_CONFIG: Record<ImportTipo, { label: string; colunas: string[]; exemplo: string; icon: React.ComponentType<{ className?: string }> }> = {
    equipes: {
      label: 'Equipes',
      icon: Users2,
      colunas: ['nome', 'eh_interior'],
      exemplo: 'nome,eh_interior\nTime Alpha,false\nTime Beta,true\nTime Gamma,false',
    },
    disponibilidades: {
      label: 'Disponibilidades',
      icon: CalendarDays,
      colunas: ['equipe', 'data'],
      exemplo: 'equipe,data\nTime Alpha,15/02/2026\nTime Beta,22/02/2026',
    },
  }

  function detectarCellErrors(tipo: ImportTipo, rows: Record<string, string>[]): Record<string, true> {
    const erros: Record<string, true> = {}
    for (const [i, row] of rows.entries()) {
      if (tipo === 'equipes') {
        if (!row.nome?.trim()) erros[`${i}:nome`] = true
      } else {
        if (!row.equipe?.trim()) erros[`${i}:equipe`] = true
        if (!row.data?.trim()) erros[`${i}:data`] = true
        else if (!/^\d{2}\/\d{2}\/\d{4}$/.test(row.data.trim()) && !/^\d{4}-\d{2}-\d{2}$/.test(row.data.trim()))
          erros[`${i}:data`] = true
      }
    }
    return erros
  }

  function processarArquivo(file: File, tipo: ImportTipo) {
    setImportFile(file)
    setImportResultado(null)
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        setImportRows(result.data)
        setImportHeaders(result.meta.fields ?? [])
        setImportCellErrors(detectarCellErrors(tipo, result.data))
      },
    })
  }

  function handleNovoCampCreated(c: Campeonato) {
    setCampeonatos((prev) => [...prev, c].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')))
    setImportCampeonatoId(c.id)
    setShowNovoCampModal(false)
  }

  function handleTipoChange(tipo: ImportTipo) {
    setImportTipo(tipo)
    setImportFile(null)
    setImportRows([])
    setImportHeaders([])
    setImportCellErrors({})
    setImportResultado(null)
  }

  async function handleImportar() {
    if (!importFile || !importCampeonatoId || importRows.length === 0) return
    setIsImportando(true)
    setImportResultado(null)
    try {
      let res: Response
      if (importTipo === 'disponibilidades') {
        const fd = new FormData()
        fd.append('file', importFile)
        fd.append('campeonato_id', importCampeonatoId)
        res = await fetch('/api/disponibilidades/importar', { method: 'POST', body: fd })
      } else {
        res = await fetch('/api/equipes/importar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            campeonato_id: importCampeonatoId,
            rows: importRows.map((r) => ({
              nome: r.nome?.trim(),
              eh_interior: r.eh_interior?.trim(),
            })),
          }),
        })
      }
      const json = await res.json()
      setImportResultado(
        res.ok
          ? { importados: json.importados ?? 0, erros: json.erros ?? [], partidasGeradas: json.partidas_geradas }
          : { importados: 0, erros: [json.error ?? 'Erro desconhecido'] }
      )
    } catch {
      setImportResultado({ importados: 0, erros: ['Erro de conexão.'] })
    } finally {
      setIsImportando(false)
    }
  }

  // ── Derived ──
  const gruposSugestoes = agruparPor(sugestoes, (s) => s.campeonato_nome)
  const gruposRodada = agruparPor(
    [...rodadaOficial].sort((a, b) => {
      const d = ymd(a.data_agendada ?? '').localeCompare(ymd(b.data_agendada ?? ''))
      if (d !== 0) return d
      return (a.local ?? '').localeCompare(b.local ?? '')
    }),
    (p) => `${ymd(p.data_agendada ?? '')}|${p.local ?? ''}`
  )

  const sortTimes = (g: typeof gruposPool[0]) => ({
    ...g,
    times: [...g.times]
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
      .map((t) => ({
        ...t,
        adversarios: [...t.adversarios].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
      })),
  })

  const statsVGFiltradas = filtroVG ? statsVG.filter((c) => c.id === filtroVG) : statsVG

  const gruposFiltrados = (searchPool.trim()
    ? gruposPool
        .map((g) => ({
          ...g,
          times: g.times.filter(
            (t) =>
              t.nome.toLowerCase().includes(searchPool.toLowerCase()) ||
              t.adversarios.some((a) => a.nome.toLowerCase().includes(searchPool.toLowerCase()))
          ),
        }))
        .filter((g) => g.times.length > 0)
    : gruposPool
  ).map(sortTimes)

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col bg-[#050505]">

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-10 border-b border-neutral-800/60 bg-[#050505]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-6">
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/25">
              <Trophy className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <div className="leading-none">
              <h1 className="font-black italic uppercase tracking-tight text-white text-lg leading-none">
                CCB <span className="text-orange-500">Gestão</span>
              </h1>
              <p className="text-neutral-600 text-[10px] font-semibold tracking-widest uppercase mt-1">
                Dashboard Logístico
              </p>
            </div>
          </div>

          <nav className="flex items-center gap-1 bg-neutral-900 p-1 rounded-xl border border-neutral-800">
            {TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === id
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25'
                    : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* ── MAIN ── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">

        {/* ════════════════════════ PLANEJAR ════════════════════════ */}
        {activeTab === 'planejar' && (
          <div className="flex flex-col gap-6">
            <section className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-5">
                <div className="flex flex-col gap-1">
                  <h2 className="font-black italic uppercase text-white text-base tracking-tight leading-none">
                    Montar <span className="text-orange-500">Rodada</span>
                  </h2>
                  <p className="text-neutral-500 text-xs leading-relaxed max-w-xs">
                    Selecione o fim de semana e veja todos os confrontos possíveis por categoria.
                  </p>
                </div>
                <div className="flex flex-wrap items-end gap-3 shrink-0">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-1.5">
                      <CalendarDays className="w-3 h-3" /> Sábado
                    </label>
                    <input
                      type="date"
                      value={dataSabado}
                      onChange={(e) => setDataSabado(e.target.value)}
                      className="bg-neutral-800 border border-neutral-700 text-neutral-200 text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition-colors"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-1.5">
                      <CalendarDays className="w-3 h-3" /> Domingo
                    </label>
                    <input
                      type="date"
                      value={dataDomingo}
                      onChange={(e) => setDataDomingo(e.target.value)}
                      className="bg-neutral-800 border border-neutral-700 text-neutral-200 text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition-colors"
                    />
                  </div>
                  <button
                    onClick={gerarSugestoes}
                    disabled={isLoadingSugestoes}
                    className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 active:bg-orange-600 text-white font-bold px-5 py-2.5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/20 text-sm"
                  >
                    {isLoadingSugestoes ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                    Analisar Disponibilidade
                  </button>
                </div>
              </div>
              {erro && (
                <div className="flex items-center gap-2 mt-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3">
                  <AlertTriangle className="w-4 h-4 shrink-0" />{erro}
                </div>
              )}
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">
              {/* Sugestões */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between h-7">
                  <h2 className="font-black italic uppercase text-white text-base tracking-tight">Sugestões por Categoria</h2>
                  {sugestoes.length > 0 && (
                    <span className="bg-orange-500/15 text-orange-400 text-xs font-semibold px-3 py-1 rounded-full">
                      {sugestoes.length} jogo{sugestoes.length > 1 ? 's' : ''} · {gruposSugestoes.length} categoria{gruposSugestoes.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                {isLoadingSugestoes && (
                  <div className="flex flex-col items-center justify-center bg-neutral-900/40 rounded-2xl border border-neutral-800 py-20 gap-3">
                    <Loader2 className="w-7 h-7 text-orange-500 animate-spin" />
                    <p className="text-neutral-500 text-sm font-medium">Calculando matchmaking...</p>
                  </div>
                )}
                {!isLoadingSugestoes && sugestoes.length === 0 && (
                  <div className="flex flex-col items-center justify-center bg-neutral-900/20 rounded-2xl border border-dashed border-neutral-800 py-20 gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center">
                      <Wand2 className="w-6 h-6 text-neutral-600" />
                    </div>
                    <p className="text-neutral-500 text-sm font-medium text-center max-w-xs leading-relaxed">
                      Informe as datas do fim de semana e clique em{' '}
                      <span className="text-orange-500 font-semibold">Analisar Disponibilidade</span>.
                    </p>
                  </div>
                )}
                {!isLoadingSugestoes && gruposSugestoes.length > 0 && (
                  <div className="flex flex-col gap-6">
                    {gruposSugestoes.map((grupo) => (
                      <div key={grupo.chave} className="flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] font-black text-orange-400 uppercase tracking-widest whitespace-nowrap">{grupo.chave}</span>
                          <div className="flex-1 h-px bg-orange-400/40" />
                          <span className="text-[11px] text-orange-400 font-semibold shrink-0">{grupo.items.length} jogo{grupo.items.length > 1 ? 's' : ''}</span>
                        </div>
                        {grupo.items.map((s) => (
                          <SugestaoCard
                            key={s.partida_id}
                            sugestao={s}
                            isStaged={staging.some((x) => x.partida_id === s.partida_id)}
                            onAdd={() => addToStaging(s)}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sidebar — Box de Montagem */}
              <div className="flex flex-col gap-4">
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ListChecks className="w-4 h-4 text-orange-500" />
                      <h3 className="font-bold text-white text-sm">Box de Montagem</h3>
                    </div>
                    {staging.length > 0 && (
                      <span className="w-5 h-5 bg-orange-500 text-white text-[11px] font-black rounded-full flex items-center justify-center">{staging.length}</span>
                    )}
                  </div>
                  <div className="p-3 flex flex-col gap-2">
                    {staging.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10">
                        <p className="text-neutral-700 text-xs text-center leading-relaxed">Adicione jogos das sugestões<br />para montar a rodada</p>
                      </div>
                    ) : (
                      staging.map((s) => {
                        const log = stagingLogistica[s.partida_id] ?? { numero_jogo: '', horario: '', local: '' }
                        return (
                          <div key={s.partida_id} className="bg-neutral-800/40 border border-neutral-700/40 rounded-xl p-3 flex flex-col gap-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                <span className="font-black uppercase italic text-white text-xs truncate">{s.equipe_a.nome}</span>
                                <span className="text-orange-500 font-black text-xs shrink-0">VS</span>
                                <span className="font-black uppercase italic text-white text-xs truncate">{s.equipe_b.nome}</span>
                              </div>
                              <button
                                onClick={() => removeFromStaging(s.partida_id)}
                                className="shrink-0 w-6 h-6 flex items-center justify-center rounded-lg text-neutral-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <p className="text-neutral-600 text-[10px] px-0.5">{formatarData(s.data_sugerida)} · {s.campeonato_nome}</p>
                            <div className="grid grid-cols-3 gap-1.5">
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">Nº</label>
                                <input
                                  type="number"
                                  value={log.numero_jogo}
                                  onChange={(e) => setStagingLogistica((prev) => ({ ...prev, [s.partida_id]: { ...log, numero_jogo: e.target.value } }))}
                                  className="bg-neutral-900 border border-neutral-700 text-neutral-200 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-orange-500 w-full"
                                  placeholder="001"
                                />
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">Horário</label>
                                <input
                                  type="time"
                                  value={log.horario}
                                  onChange={(e) => setStagingLogistica((prev) => ({ ...prev, [s.partida_id]: { ...log, horario: e.target.value } }))}
                                  className="bg-neutral-900 border border-neutral-700 text-neutral-200 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-orange-500 w-full"
                                />
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">Local</label>
                                <input
                                  type="text"
                                  value={log.local}
                                  onChange={(e) => setStagingLogistica((prev) => ({ ...prev, [s.partida_id]: { ...log, local: e.target.value } }))}
                                  className="bg-neutral-900 border border-neutral-700 text-neutral-200 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-orange-500 w-full"
                                  placeholder="Quadra..."
                                />
                              </div>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                  {staging.length > 0 && (
                    <div className="px-3 pb-3">
                      <button
                        onClick={confirmarRodada}
                        disabled={isConfirmando}
                        className="w-full bg-orange-500 hover:bg-orange-400 active:bg-orange-600 text-white font-bold py-2.5 rounded-xl transition-all text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isConfirmando ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                        {isConfirmando ? 'Confirmando...' : `Confirmar · ${staging.length} jogo${staging.length > 1 ? 's' : ''}`}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Rodada Oficial (full width) ── */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-neutral-800 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-neutral-600" />
                <h3 className="font-bold text-white text-sm">Rodada Oficial</h3>
                <button onClick={carregarRodadaOficial} title="Atualizar" className="ml-1 text-neutral-700 hover:text-neutral-400 transition-colors">
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                {rodadaOficial.length > 0 && (
                  <span className="ml-auto text-[11px] bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-2.5 py-0.5 rounded-full font-semibold">
                    {rodadaOficial.length} aguardando
                  </span>
                )}
              </div>

              {rodadaOficial.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <p className="text-neutral-700 text-xs text-center">Nenhum jogo confirmado ainda</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-neutral-800/40 border-b border-neutral-800">
                        <th className="px-5 py-2.5 text-left font-bold text-neutral-600 uppercase tracking-widest w-16">Nº</th>
                        <th className="px-3 py-2.5 text-left font-bold text-neutral-600 uppercase tracking-widest w-20">Horário</th>
                        <th className="px-3 py-2.5 text-right font-bold text-neutral-600 uppercase tracking-widest">Time A</th>
                        <th className="px-3 py-2.5 text-center w-10"></th>
                        <th className="px-3 py-2.5 text-left font-bold text-neutral-600 uppercase tracking-widest">Time B</th>
                        <th className="px-3 py-2.5 text-left font-bold text-neutral-600 uppercase tracking-widest">Categoria</th>
                        <th className="px-5 py-2.5 w-20"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {gruposRodada.flatMap((grupo) => {
                        const [dataKey, ...localParts] = grupo.chave.split('|')
                        const localKey = localParts.join('|')
                        return [
                          <tr key={`grp-${grupo.chave}`}>
                            <td colSpan={7} className="px-5 py-2.5 bg-neutral-800/60 border-y border-neutral-800">
                              <div className="flex items-center gap-2.5">
                                <div className="w-1 h-3.5 rounded-full bg-orange-500 shrink-0" />
                                <span className="font-black text-white text-xs">
                                  {dataKey ? `${nomeDiaSemana(dataKey)}, ${formatarDataCurta(dataKey)}` : 'Sem data'}
                                </span>
                                {localKey && (
                                  <span className="flex items-center gap-1 text-neutral-500 text-xs">
                                    <span className="text-neutral-700 select-none mx-0.5">—</span>
                                    <MapPin className="w-3 h-3 shrink-0" />
                                    {localKey}
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>,
                          ...grupo.items.map((p, i) => (
                            <tr
                              key={p.id}
                              className={`border-b border-neutral-800/40 transition-opacity ${atualizandoIds.has(p.id) ? 'opacity-40' : ''} ${i % 2 === 1 ? 'bg-neutral-900/50' : ''}`}
                            >
                              <td className="px-5 py-3 font-mono font-bold whitespace-nowrap">
                                {p.numero_jogo != null
                                  ? <span className="text-orange-400">#{String(p.numero_jogo).padStart(3, '0')}</span>
                                  : <span className="text-neutral-700">—</span>}
                              </td>
                              <td className="px-3 py-3 text-neutral-300 font-mono whitespace-nowrap">
                                {p.horario ? p.horario.slice(0, 5) : <span className="text-neutral-700">—</span>}
                              </td>
                              <td className="px-3 py-3 text-right font-black uppercase italic text-white whitespace-nowrap text-sm">
                                {p.equipe_a.nome}
                              </td>
                              <td className="px-2 py-3 text-center font-black text-orange-500 text-[11px] tracking-widest whitespace-nowrap">
                                vs
                              </td>
                              <td className="px-3 py-3 font-black uppercase italic text-white whitespace-nowrap text-sm">
                                {p.equipe_b.nome}
                              </td>
                              <td className="px-3 py-3 text-neutral-500 whitespace-nowrap">
                                {p.campeonato_nome}
                              </td>
                              <td className="px-3 py-3">
                                <div className="flex items-center justify-end gap-0.5">
                                  <button
                                    onClick={() => atualizarStatus(p.id, 'pendente', 'cancelar')}
                                    disabled={atualizandoIds.has(p.id)}
                                    title="Cancelar — volta para pendente"
                                    className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-600 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:cursor-not-allowed"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => atualizarStatus(p.id, 'realizado', 'realizar')}
                                    disabled={atualizandoIds.has(p.id)}
                                    title="Marcar como realizado"
                                    className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-600 hover:text-green-400 hover:bg-green-500/10 transition-colors disabled:cursor-not-allowed"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )),
                        ]
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════════════════════ VISÃO GERAL ════════════════════════ */}
        {activeTab === 'visao-geral' && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-black italic uppercase text-white text-base tracking-tight">
                Visão <span className="text-orange-500">Geral</span>
              </h2>
              <div className="flex items-center gap-3">
                <select
                  value={filtroVG}
                  onChange={(e) => setFiltroVG(e.target.value)}
                  className="bg-neutral-900 border border-neutral-800 text-neutral-200 text-sm italic rounded-xl px-3 py-2 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition-colors"
                >
                  <option value="">Todos os Campeonatos</option>
                  {statsVG.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
                <button
                  onClick={carregarStats}
                  className="flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-300 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Atualizar
                </button>
              </div>
            </div>

            {isLoadingStats ? (
              <div className="flex flex-col items-center justify-center bg-neutral-900/40 rounded-2xl border border-neutral-800 py-20 gap-3">
                <Loader2 className="w-7 h-7 text-orange-500 animate-spin" />
                <p className="text-neutral-500 text-sm font-medium">Calculando estatísticas...</p>
              </div>
            ) : statsVG.length === 0 ? (
              <div className="flex flex-col items-center justify-center bg-neutral-900/20 rounded-2xl border border-dashed border-neutral-800 py-20 gap-3">
                <div className="w-14 h-14 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-neutral-600" />
                </div>
                <p className="text-neutral-500 text-sm font-medium">Nenhum campeonato com equipes cadastradas.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
                {statsVGFiltradas.map((camp) => (
                  <div key={camp.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
                    {/* Card header */}
                    <div className="px-4 py-3 border-b border-neutral-800 flex items-center gap-2.5">
                      <div className="w-1.5 h-4 rounded-full bg-orange-500 shrink-0" />
                      <h3 className="font-black italic uppercase text-white text-sm tracking-tight truncate flex-1">
                        {camp.nome}
                      </h3>
                      <span className="text-[10px] font-bold text-neutral-600 shrink-0">
                        {camp.equipes.length} time{camp.equipes.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Column headers */}
                    <div className="grid grid-cols-[1fr_38px_38px_38px] px-4 py-2 bg-neutral-800/30">
                      <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">Time</span>
                      <span className="text-[10px] font-bold text-orange-500/80 uppercase tracking-widest text-center">JP</span>
                      <span className="text-[10px] font-bold text-yellow-500/80 uppercase tracking-widest text-center">JA</span>
                      <span className="text-[10px] font-bold text-green-500/80 uppercase tracking-widest text-center">JR</span>
                    </div>

                    {/* Team rows */}
                    <div className="divide-y divide-neutral-800/40">
                      {camp.equipes.map((team) => (
                        <div key={team.id} className="grid grid-cols-[1fr_38px_38px_38px] px-4 py-2.5 items-center hover:bg-neutral-800/20 transition-colors">
                          <span className="font-black italic uppercase text-white text-xs truncate pr-2">{team.nome}</span>

                          <div className="flex justify-center">
                            {team.jp > 0 ? (
                              <span className="text-[10px] font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 min-w-[22px] h-[18px] flex items-center justify-center rounded-full px-1">
                                {team.jp}
                              </span>
                            ) : <span className="text-[10px] text-neutral-700 font-semibold block text-center">0</span>}
                          </div>

                          <div className="flex justify-center">
                            {team.ja > 0 ? (
                              <span className="text-[10px] font-bold text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 min-w-[22px] h-[18px] flex items-center justify-center rounded-full px-1">
                                {team.ja}
                              </span>
                            ) : <span className="text-[10px] text-neutral-700 font-semibold block text-center">0</span>}
                          </div>

                          <div className="flex justify-center">
                            {team.jr > 0 ? (
                              <span className="text-[10px] font-bold text-green-400 bg-green-500/10 border border-green-500/20 min-w-[22px] h-[18px] flex items-center justify-center rounded-full px-1">
                                {team.jr}
                              </span>
                            ) : <span className="text-[10px] text-neutral-700 font-semibold block text-center">0</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════ POOL DE JOGOS ════════════════════════ */}
        {activeTab === 'pool' && (
          <div className="flex flex-col gap-6">
            {/* Toolbar */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar por equipe..."
                  value={searchPool}
                  onChange={(e) => setSearchPool(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 text-neutral-200 text-sm rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition-colors placeholder:text-neutral-700"
                />
              </div>
              <button
                onClick={carregarPool}
                title="Atualizar"
                className="w-10 h-10 flex items-center justify-center bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-xl text-neutral-600 hover:text-neutral-300 transition-colors shrink-0"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            {isLoadingPool ? (
              <div className="flex flex-col items-center justify-center bg-neutral-900/40 rounded-2xl border border-neutral-800 py-20 gap-3">
                <Loader2 className="w-7 h-7 text-orange-500 animate-spin" />
                <p className="text-neutral-500 text-sm font-medium">Carregando confrontos...</p>
              </div>
            ) : gruposFiltrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center bg-neutral-900/20 rounded-2xl border border-dashed border-neutral-800 py-20 gap-3">
                <div className="w-14 h-14 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center">
                  <Layers className="w-6 h-6 text-neutral-600" />
                </div>
                <p className="text-neutral-500 text-sm font-medium text-center max-w-xs leading-relaxed">
                  {searchPool
                    ? `Nenhuma equipe encontrada para "${searchPool}"`
                    : 'Nenhum jogo pendente no momento.'}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-8">
                {gruposFiltrados.map((grupo) => (
                  <div key={grupo.campeonato_id} className="flex flex-col gap-3">
                    {/* Category header */}
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-black text-orange-400 uppercase tracking-widest whitespace-nowrap">
                        {grupo.campeonato_nome}
                      </span>
                      <div className="flex-1 h-px bg-orange-400/25" />
                      <span className="text-[11px] text-orange-400/70 font-bold shrink-0 bg-orange-500/10 border border-orange-500/20 px-2.5 py-0.5 rounded-full">
                        {grupo.total_pendentes} restante{grupo.total_pendentes !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Teams list */}
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden divide-y divide-neutral-800/60">
                      {grupo.times.map((time) => (
                        <div key={time.id} className="flex items-center gap-4 px-5 py-3 min-w-0 hover:bg-neutral-800/20 transition-colors">
                          {/* Team name */}
                          <span className="font-black italic uppercase text-white text-sm w-[160px] shrink-0 truncate">
                            {time.nome}
                          </span>

                          {/* VS */}
                          <span className="text-orange-500 font-black text-[11px] tracking-widest shrink-0">vs</span>

                          {/* Opponents */}
                          <div className="flex items-center flex-wrap gap-y-1 min-w-0">
                            {time.adversarios.map((adv, i) => (
                              <div key={adv.partida_id} className="flex items-center">
                                {i > 0 && (
                                  <span className="text-[10px] text-neutral-700 px-1 select-none leading-none">|</span>
                                )}
                                <span className="font-bold italic uppercase text-[11px] text-neutral-400 whitespace-nowrap px-0.5 tracking-wide">
                                  {adv.nome}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════ IMPORTAR ════════════════════════ */}
        {activeTab === 'importar' && (() => {
          const cfg = IMPORT_CONFIG[importTipo]
          const totalErrors = Object.keys(importCellErrors).length
          const rowsComErro = new Set(Object.keys(importCellErrors).map((k) => k.split(':')[0]))
          const canConfirm = !!importFile && !!importCampeonatoId && importRows.length > 0 && !isImportando

          return (
            <div className="flex flex-col gap-6">
              <h2 className="font-black italic uppercase text-white text-base tracking-tight">
                Importar <span className="text-orange-500">Dados</span>
              </h2>

              {/* Step 1 — Tipo */}
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest">Tipo de dado</label>
                <div className="flex gap-2 flex-wrap">
                  {(Object.entries(IMPORT_CONFIG) as [ImportTipo, typeof cfg][]).map(([id, c]) => {
                    const Icon = c.icon
                    return (
                      <button
                        key={id}
                        onClick={() => handleTipoChange(id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border ${
                          importTipo === id
                            ? 'bg-orange-500/15 border-orange-500/40 text-orange-400'
                            : 'bg-neutral-900 border-neutral-800 text-neutral-500 hover:text-neutral-300 hover:border-neutral-700'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {c.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Step 2 — Campeonato */}
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest">Campeonato / Categoria</label>
                <div className="flex items-center gap-2">
                  <select
                    value={importCampeonatoId}
                    onChange={(e) => setImportCampeonatoId(e.target.value)}
                    className="bg-neutral-900 border border-neutral-800 text-neutral-200 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition-colors flex-1 max-w-sm"
                  >
                    <option value="">Selecione o campeonato...</option>
                    {campeonatos.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                  <button
                    onClick={() => setShowNovoCampModal(true)}
                    title="Novo campeonato"
                    className="w-10 h-10 flex items-center justify-center bg-neutral-900 border border-neutral-800 hover:border-orange-500/50 hover:bg-orange-500/10 rounded-xl text-neutral-500 hover:text-orange-400 transition-colors shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Step 3 — Drop zone */}
              <div className="flex flex-col gap-3">
                <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest">Arquivo CSV</label>
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                  onDragEnter={() => setIsDragging(true)}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setIsDragging(false)
                    const f = e.dataTransfer.files[0]
                    if (f) processarArquivo(f, importTipo)
                  }}
                  onClick={() => importFileRef.current?.click()}
                  className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-10 flex flex-col items-center gap-4 transition-all select-none ${
                    isDragging
                      ? 'border-orange-500 bg-orange-500/5'
                      : importFile
                      ? 'border-orange-500/40 bg-orange-500/5'
                      : 'border-neutral-700 hover:border-orange-500/50 hover:bg-neutral-900/40'
                  }`}
                >
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
                    isDragging || importFile ? 'bg-orange-500/20' : 'bg-neutral-800'
                  }`}>
                    <Upload className={`w-7 h-7 transition-colors ${isDragging || importFile ? 'text-orange-400' : 'text-neutral-500'}`} />
                  </div>
                  {importFile ? (
                    <div className="text-center">
                      <p className="font-bold text-white text-sm">{importFile.name}</p>
                      <p className="text-neutral-500 text-xs mt-1">
                        {(importFile.size / 1024).toFixed(1)} KB · {importRows.length} linha{importRows.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="text-sm font-semibold text-neutral-300">Arraste um arquivo CSV ou clique para selecionar</p>
                      <p className="text-xs text-neutral-600 mt-1">
                        Colunas esperadas: <span className="font-mono text-neutral-500">{cfg.colunas.join(', ')}</span>
                      </p>
                    </div>
                  )}
                  {importFile && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setImportFile(null); setImportRows([]); setImportHeaders([]); setImportCellErrors({}); setImportResultado(null) }}
                      className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-lg text-neutral-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <input
                  ref={importFileRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) processarArquivo(f, importTipo); e.target.value = '' }}
                />

                {/* Format hint */}
                <div className="bg-neutral-900/60 border border-neutral-800/60 rounded-xl px-4 py-3">
                  <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest mb-2">Formato esperado</p>
                  <pre className="text-xs text-neutral-400 font-mono leading-relaxed whitespace-pre-wrap">{cfg.exemplo}</pre>
                </div>
              </div>

              {/* Step 4 — Preview table */}
              {importRows.length > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest">
                      Prévia dos dados
                    </label>
                    {totalErrors > 0 && (
                      <span className="text-[11px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-0.5 rounded-full">
                        {rowsComErro.size} linha{rowsComErro.size !== 1 ? 's' : ''} com erro
                      </span>
                    )}
                    {totalErrors === 0 && (
                      <span className="text-[11px] font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-2.5 py-0.5 rounded-full">
                        Dados válidos ✓
                      </span>
                    )}
                  </div>

                  <div className="overflow-auto rounded-xl border border-neutral-800 max-h-72">
                    <table className="w-full text-xs border-collapse min-w-max">
                      <thead>
                        <tr className="bg-neutral-800/60 sticky top-0">
                          <th className="px-3 py-2.5 text-left font-bold text-neutral-500 uppercase tracking-widest border-b border-neutral-700 w-10">#</th>
                          {importHeaders.map((h) => (
                            <th key={h} className="px-3 py-2.5 text-left font-bold text-neutral-400 uppercase tracking-widest border-b border-neutral-700 whitespace-nowrap">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {importRows.slice(0, 200).map((row, i) => (
                          <tr key={i} className={`${rowsComErro.has(String(i)) ? 'bg-red-500/5' : i % 2 === 0 ? 'bg-neutral-900/60' : 'bg-neutral-950/60'}`}>
                            <td className="px-3 py-2 text-neutral-600 font-mono border-b border-neutral-800/40">{i + 1}</td>
                            {importHeaders.map((h) => {
                              const hasErr = importCellErrors[`${i}:${h}`]
                              return (
                                <td key={h} className={`px-3 py-2 border-b border-neutral-800/40 font-mono whitespace-nowrap ${hasErr ? 'text-red-400 bg-red-500/15' : 'text-neutral-300'}`}>
                                  {row[h] || <span className="text-neutral-700">—</span>}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {importRows.length > 200 && (
                    <p className="text-xs text-neutral-600 text-center">
                      Exibindo 200 de {importRows.length} linhas.
                    </p>
                  )}
                </div>
              )}

              {/* Result */}
              {importResultado && (
                <div className={`rounded-xl p-4 text-sm flex flex-col gap-2 ${
                  importResultado.importados > 0
                    ? 'bg-green-500/10 border border-green-500/20'
                    : 'bg-red-500/10 border border-red-500/20'
                }`}>
                  {importResultado.importados > 0 && (
                    <p className="font-bold text-green-400">
                      {importResultado.importados} equipe{importResultado.importados !== 1 ? 's' : ''} importada{importResultado.importados !== 1 ? 's' : ''} com sucesso!
                      {importTipo === 'equipes' && importResultado.partidasGeradas !== undefined && (
                        importResultado.partidasGeradas > 0
                          ? ` ${importResultado.partidasGeradas} confronto${importResultado.partidasGeradas !== 1 ? 's' : ''} gerado${importResultado.partidasGeradas !== 1 ? 's' : ''} no Pool de Jogos.`
                          : ' (nenhum confronto novo gerado — já existiam partidas para este campeonato)'
                      )}
                    </p>
                  )}
                  {importResultado.erros.length > 0 && (
                    <ul className="flex flex-col gap-1">
                      {importResultado.erros.map((e, i) => (
                        <li key={i} className="text-xs text-yellow-400 flex items-start gap-1.5">
                          <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                          {e}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Confirm button */}
              <div className="flex justify-end">
                <button
                  onClick={handleImportar}
                  disabled={!canConfirm}
                  className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 active:bg-orange-600 text-white font-bold px-6 py-2.5 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed text-sm shadow-lg shadow-orange-500/20"
                >
                  {isImportando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                  {isImportando ? 'Importando...' : 'Confirmar Importação'}
                </button>
              </div>
            </div>
          )
        })()}

        {/* ════════════════════════ LOGS ════════════════════════ */}
        {activeTab === 'logs' && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h2 className="font-black italic uppercase text-white text-base tracking-tight">
                Logs de <span className="text-orange-500">Transações</span>
              </h2>
              <button
                onClick={carregarLogs}
                className="flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-300 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Atualizar
              </button>
            </div>

            {isLoadingLogs ? (
              <div className="flex flex-col items-center justify-center bg-neutral-900/40 rounded-2xl border border-neutral-800 py-20 gap-3">
                <Loader2 className="w-7 h-7 text-orange-500 animate-spin" />
                <p className="text-neutral-500 text-sm font-medium">Carregando logs...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center bg-neutral-900/20 rounded-2xl border border-dashed border-neutral-800 py-20 gap-3">
                <div className="w-14 h-14 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center">
                  <ScrollText className="w-6 h-6 text-neutral-600" />
                </div>
                <p className="text-neutral-500 text-sm font-medium">Nenhuma transação registrada ainda.</p>
              </div>
            ) : (
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
                {/* Table header */}
                <div className="grid grid-cols-[1fr_100px_auto_140px] gap-4 px-5 py-3 border-b border-neutral-800 bg-neutral-800/30">
                  <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest">Partida</span>
                  <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest text-center">Ação</span>
                  <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest">Transição</span>
                  <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest text-right">Quando</span>
                </div>

                {/* Rows */}
                <div className="divide-y divide-neutral-800/50">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="grid grid-cols-[1fr_100px_auto_140px] gap-4 px-5 py-3 items-center hover:bg-neutral-800/20 transition-colors"
                    >
                      <div className="min-w-0">
                        {log.partida ? (
                          <p className="text-sm font-semibold text-white truncate">
                            <span className="italic uppercase">{log.partida.equipe_a.nome}</span>
                            <span className="text-orange-500 mx-1.5 font-black not-italic">VS</span>
                            <span className="italic uppercase">{log.partida.equipe_b.nome}</span>
                          </p>
                        ) : (
                          <span className="text-xs text-neutral-600 font-mono">
                            {log.partida_id ? `${log.partida_id.slice(0, 8)}…` : acaoLabel(log.acao)}
                          </span>
                        )}
                      </div>

                      <div className="flex justify-center">
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap border ${acaoClasses(log.acao)}`}>
                          {acaoLabel(log.acao)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {log.status_anterior && log.status_novo ? (
                          <>
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${statusBadgeClasses(log.status_anterior)}`}>
                              {statusLabel(log.status_anterior)}
                            </span>
                            <ArrowRight className="w-3 h-3 text-neutral-600 shrink-0" />
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${statusBadgeClasses(log.status_novo)}`}>
                              {statusLabel(log.status_novo)}
                            </span>
                          </>
                        ) : (
                          <span className="text-xs text-neutral-700">—</span>
                        )}
                      </div>

                      <span className="text-xs text-neutral-600 whitespace-nowrap text-right">
                        {formatarDataHora(log.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </main>

      {/* ── IMPORT MODAL ── */}
      {showImportModal && (
        <ImportModal campeonatos={campeonatos} onClose={() => setShowImportModal(false)} />
      )}

      {/* ── NOVO CAMPEONATO MODAL ── */}
      {showNovoCampModal && (
        <NovoCampeonatoModal
          onClose={() => setShowNovoCampModal(false)}
          onCreated={handleNovoCampCreated}
        />
      )}
    </div>
  )
}
