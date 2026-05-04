'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Wand2, Trophy, Layers, ScrollText, CalendarDays, ChevronRight,
  Plus, X, Loader2, Zap, MapPin, AlertTriangle, ListChecks, RotateCcw,
  CheckCircle2, Search, Upload, BarChart3, Clock, RefreshCw,
  FileText, ArrowRight, Activity,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

// ─── Types ───────────────────────────────────────────────────────────────────

type Tab = 'planejar' | 'visao-geral' | 'pool' | 'logs'

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
  partida_id: string
  acao: string
  status_anterior: string
  status_novo: string
  batch_id: string
  created_at: string
  partida: {
    equipe_a: { nome: string }
    equipe_b: { nome: string }
  } | null
}

type Campeonato = {
  id: string
  nome: string
}

type CategoriaBreakdown = {
  campeonato_id: string
  nome: string
  pendentes: number
  aguardando: number
}

type Stats = {
  pendentes: number
  aguardando: number
  categoriasAtivas: number
  breakdown: CategoriaBreakdown[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatarData(iso: string): string {
  if (!iso) return ''
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
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
  const data = new Date(`${iso}T12:00:00`)
  return ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][data.getDay()]
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

// ─── Main Dashboard ───────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'planejar',    label: 'Planejar',     Icon: Wand2      },
  { id: 'visao-geral', label: 'Visão Geral',  Icon: Trophy     },
  { id: 'pool',        label: 'Pool de Jogos', Icon: Layers    },
  { id: 'logs',        label: 'Logs',          Icon: ScrollText },
]

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('planejar')

  // ── Planejar ──
  const [dataSabado, setDataSabado] = useState('')
  const [dataDomingo, setDataDomingo] = useState('')
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([])
  const [staging, setStaging] = useState<Sugestao[]>([])
  const [rodadaOficial, setRodadaOficial] = useState<PartidaOficial[]>([])
  const [isLoadingSugestoes, setIsLoadingSugestoes] = useState(false)
  const [isConfirmando, setIsConfirmando] = useState(false)
  const [atualizandoIds, setAtualizandoIds] = useState<Set<string>>(new Set())
  const [erro, setErro] = useState('')

  // ── Pool ──
  const [partidasPendentes, setPartidasPendentes] = useState<PartidaPendente[]>([])
  const [searchPool, setSearchPool] = useState('')
  const [isLoadingPool, setIsLoadingPool] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [campeonatos, setCampeonatos] = useState<Campeonato[]>([])

  // ── Logs ──
  const [logs, setLogs] = useState<LogTransacao[]>([])
  const [isLoadingLogs, setIsLoadingLogs] = useState(false)

  // ── Stats ──
  const [stats, setStats] = useState<Stats>({ pendentes: 0, aguardando: 0, categoriasAtivas: 0, breakdown: [] })
  const [isLoadingStats, setIsLoadingStats] = useState(false)

  // ── Data loaders ──

  const carregarRodadaOficial = useCallback(async () => {
    const { data } = await supabase
      .from('partidas')
      .select(`id, campeonato_id, data_agendada,
        campeonato:campeonatos!campeonato_id(nome),
        equipe_a:equipes!equipe_a_id(nome),
        equipe_b:equipes!equipe_b_id(nome)`)
      .eq('status', 'aguardando')
      .order('campeonato_id')
    if (data) {
      setRodadaOficial(
        (data as unknown as Array<{
          id: string; campeonato_id: string; data_agendada: string | null
          campeonato: { nome: string } | null
          equipe_a: { nome: string }; equipe_b: { nome: string }
        }>).map((p) => ({ ...p, campeonato_nome: p.campeonato?.nome ?? 'Sem categoria' }))
      )
    }
  }, [])

  const carregarPool = useCallback(async () => {
    setIsLoadingPool(true)
    try {
      const { data } = await supabase
        .from('partidas')
        .select(`id, campeonato_id,
          campeonato:campeonatos!campeonato_id(nome),
          equipe_a:equipes!equipe_a_id(nome, chave),
          equipe_b:equipes!equipe_b_id(nome, chave)`)
        .eq('status', 'pendente')
        .order('campeonato_id')
      if (data) {
        setPartidasPendentes(
          (data as unknown as Array<{
            id: string; campeonato_id: string
            campeonato: { nome: string } | null
            equipe_a: { nome: string; chave: string }
            equipe_b: { nome: string; chave: string }
          }>).map((p) => ({
            id: p.id,
            campeonato_id: p.campeonato_id,
            campeonato_nome: p.campeonato?.nome ?? 'Sem categoria',
            equipe_a: p.equipe_a,
            equipe_b: p.equipe_b,
          }))
        )
      }
    } finally {
      setIsLoadingPool(false)
    }
  }, [])

  const carregarLogs = useCallback(async () => {
    setIsLoadingLogs(true)
    try {
      const { data } = await supabase
        .from('logs_transacoes')
        .select(`id, partida_id, acao, status_anterior, status_novo, batch_id, created_at,
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
      type Row = { campeonato_id: string; campeonato: { nome: string } | null }
      const [pendenteRes, aguardandoRes] = await Promise.all([
        supabase.from('partidas')
          .select('campeonato_id, campeonato:campeonatos!campeonato_id(nome)')
          .eq('status', 'pendente'),
        supabase.from('partidas')
          .select('campeonato_id, campeonato:campeonatos!campeonato_id(nome)')
          .eq('status', 'aguardando'),
      ])
      const pData = (pendenteRes.data ?? []) as unknown as Row[]
      const aData = (aguardandoRes.data ?? []) as unknown as Row[]

      const map = new Map<string, CategoriaBreakdown>()
      for (const p of pData) {
        if (!map.has(p.campeonato_id))
          map.set(p.campeonato_id, { campeonato_id: p.campeonato_id, nome: p.campeonato?.nome ?? 'Sem categoria', pendentes: 0, aguardando: 0 })
        map.get(p.campeonato_id)!.pendentes++
      }
      for (const p of aData) {
        if (!map.has(p.campeonato_id))
          map.set(p.campeonato_id, { campeonato_id: p.campeonato_id, nome: p.campeonato?.nome ?? 'Sem categoria', pendentes: 0, aguardando: 0 })
        map.get(p.campeonato_id)!.aguardando++
      }

      const breakdown = Array.from(map.values()).sort((a, b) => a.nome.localeCompare(b.nome))
      setStats({
        pendentes: pData.length,
        aguardando: aData.length,
        categoriasAtivas: new Set(pData.map((p) => p.campeonato_id)).size,
        breakdown,
      })
    } finally {
      setIsLoadingStats(false)
    }
  }, [])

  const carregarCampeonatos = useCallback(async () => {
    const { data } = await supabase.from('campeonatos').select('id, nome').order('nome')
    if (data) setCampeonatos(data)
  }, [])

  useEffect(() => { carregarRodadaOficial() }, [carregarRodadaOficial])

  useEffect(() => {
    if (activeTab === 'pool')        carregarPool()
    if (activeTab === 'logs')        carregarLogs()
    if (activeTab === 'visao-geral') carregarStats()
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
    if (!staging.some((x) => x.partida_id === s.partida_id)) setStaging((prev) => [...prev, s])
  }

  function removeFromStaging(id: string) {
    setStaging((prev) => prev.filter((s) => s.partida_id !== id))
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
          partidas: staging.map((s) => ({ id: s.partida_id, data_agendada: s.data_sugerida })),
          acao: 'agendar',
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      const confirmados = new Set(staging.map((s) => s.partida_id))
      setSugestoes((prev) => prev.filter((s) => !confirmados.has(s.partida_id)))
      setStaging([])
      await carregarRodadaOficial()
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

  // ── Derived ──
  const gruposSugestoes = agruparPor(sugestoes, (s) => s.campeonato_nome)
  const gruposRodada    = agruparPor(rodadaOficial, (p) => p.campeonato_nome)

  const partidasFiltradas = searchPool.trim()
    ? partidasPendentes.filter((p) =>
        p.equipe_a.nome.toLowerCase().includes(searchPool.toLowerCase()) ||
        p.equipe_b.nome.toLowerCase().includes(searchPool.toLowerCase())
      )
    : partidasPendentes
  const gruposPool = agruparPor(partidasFiltradas, (p) => p.campeonato_nome)

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

              {/* Sidebar */}
              <div className="flex flex-col gap-4">
                {/* Box de Montagem */}
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
                      staging.map((s) => (
                        <StagedCard key={s.partida_id} sugestao={s} onRemove={() => removeFromStaging(s.partida_id)} />
                      ))
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
                        {isConfirmando ? 'Confirmando...' : `Confirmar no Banco · ${staging.length} jogo${staging.length > 1 ? 's' : ''}`}
                      </button>
                    </div>
                  )}
                </div>

                {/* Rodada Oficial */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-neutral-800 flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-neutral-600" />
                    <h3 className="font-bold text-white text-sm">Rodada Oficial</h3>
                    {rodadaOficial.length > 0 && (
                      <span className="ml-auto text-[11px] bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-2 py-0.5 rounded-full font-semibold">
                        {rodadaOficial.length} aguardando
                      </span>
                    )}
                  </div>
                  <div className="max-h-[520px] overflow-y-auto">
                    {rodadaOficial.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10">
                        <p className="text-neutral-700 text-xs text-center leading-relaxed">Nenhum jogo confirmado ainda</p>
                      </div>
                    ) : (
                      <div className="p-3 flex flex-col gap-4">
                        {gruposRodada.map((grupo) => (
                          <div key={grupo.chave}>
                            <div className="flex items-center gap-2 mb-2 px-1">
                              <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest whitespace-nowrap">{grupo.chave}</span>
                              <div className="flex-1 h-px bg-neutral-800" />
                            </div>
                            <div className="flex flex-col gap-1.5">
                              {grupo.items.map((p) => (
                                <div
                                  key={p.id}
                                  className={`flex items-center gap-2 bg-neutral-800/50 rounded-xl px-3 py-2.5 transition-opacity ${atualizandoIds.has(p.id) ? 'opacity-40' : ''}`}
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-black uppercase italic text-white text-xs truncate">{p.equipe_a.nome}</span>
                                      <span className="text-orange-500 font-black text-xs shrink-0">VS</span>
                                      <span className="font-black uppercase italic text-white text-xs truncate">{p.equipe_b.nome}</span>
                                    </div>
                                    {p.data_agendada && (
                                      <p className="text-neutral-600 text-xs mt-0.5">{formatarData(p.data_agendada)}</p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-0.5 shrink-0">
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
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════ VISÃO GERAL ════════════════════════ */}
        {activeTab === 'visao-geral' && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h2 className="font-black italic uppercase text-white text-base tracking-tight">
                Visão <span className="text-orange-500">Geral</span>
              </h2>
              <button
                onClick={carregarStats}
                className="flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-300 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Atualizar
              </button>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard title="Total de Jogos Pendentes"       value={stats.pendentes}       icon={Clock}     color="orange" loading={isLoadingStats} />
              <StatCard title="Jogos Agendados (Aguardando)"   value={stats.aguardando}      icon={BarChart3} color="yellow" loading={isLoadingStats} />
              <StatCard title="Categorias Ativas"              value={stats.categoriasAtivas} icon={Trophy}   color="blue"   loading={isLoadingStats} />
            </div>

            {/* Breakdown table */}
            {!isLoadingStats && stats.breakdown.length > 0 && (
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-neutral-800 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-orange-500" />
                  <h3 className="font-bold text-white text-sm">Distribuição por Categoria</h3>
                </div>
                <div className="divide-y divide-neutral-800/60">
                  <div className="grid grid-cols-3 px-5 py-2 bg-neutral-800/30">
                    <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest">Categoria</span>
                    <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest text-center">Pendentes</span>
                    <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest text-center">Aguardando</span>
                  </div>
                  {stats.breakdown.map((cat) => (
                    <div key={cat.campeonato_id} className="grid grid-cols-3 px-5 py-3 items-center hover:bg-neutral-800/20 transition-colors">
                      <span className="font-black italic uppercase text-white text-sm truncate">{cat.nome}</span>
                      <div className="flex justify-center">
                        <span className="text-sm font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-3 py-0.5 rounded-full">{cat.pendentes}</span>
                      </div>
                      <div className="flex justify-center">
                        {cat.aguardando > 0 ? (
                          <span className="text-sm font-bold text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-3 py-0.5 rounded-full">{cat.aguardando}</span>
                        ) : (
                          <span className="text-sm font-semibold text-neutral-700">—</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!isLoadingStats && stats.breakdown.length === 0 && (
              <div className="flex flex-col items-center justify-center bg-neutral-900/20 rounded-2xl border border-dashed border-neutral-800 py-20 gap-3">
                <div className="w-14 h-14 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-neutral-600" />
                </div>
                <p className="text-neutral-500 text-sm font-medium">Nenhuma partida encontrada.</p>
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
                onClick={() => setShowImportModal(true)}
                className="flex items-center gap-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-orange-500/40 text-neutral-300 font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors"
              >
                <Upload className="w-4 h-4 text-orange-500" />
                Importar CSV
              </button>
              <button
                onClick={carregarPool}
                title="Atualizar"
                className="w-10 h-10 flex items-center justify-center bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-xl text-neutral-600 hover:text-neutral-300 transition-colors shrink-0"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Pool count */}
            {!isLoadingPool && partidasPendentes.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-neutral-600 uppercase tracking-widest">
                  {partidasFiltradas.length} jogo{partidasFiltradas.length !== 1 ? 's' : ''} pendente{partidasFiltradas.length !== 1 ? 's' : ''}
                  {searchPool && ` · filtrado por "${searchPool}"`}
                </span>
              </div>
            )}

            {/* Content */}
            {isLoadingPool ? (
              <div className="flex flex-col items-center justify-center bg-neutral-900/40 rounded-2xl border border-neutral-800 py-20 gap-3">
                <Loader2 className="w-7 h-7 text-orange-500 animate-spin" />
                <p className="text-neutral-500 text-sm font-medium">Carregando partidas pendentes...</p>
              </div>
            ) : partidasFiltradas.length === 0 ? (
              <div className="flex flex-col items-center justify-center bg-neutral-900/20 rounded-2xl border border-dashed border-neutral-800 py-20 gap-3">
                <div className="w-14 h-14 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center">
                  <Layers className="w-6 h-6 text-neutral-600" />
                </div>
                <p className="text-neutral-500 text-sm font-medium text-center max-w-xs leading-relaxed">
                  {searchPool
                    ? `Nenhuma equipe encontrada para "${searchPool}"`
                    : 'Nenhuma partida pendente no momento.'}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {gruposPool.map((grupo) => (
                  <div key={grupo.chave} className="flex flex-col gap-3">
                    {/* Category header */}
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-black text-orange-400 uppercase tracking-widest whitespace-nowrap">
                        {grupo.chave}
                      </span>
                      <div className="flex-1 h-px bg-orange-400/25" />
                      <span className="text-[11px] text-orange-400/60 font-semibold shrink-0">
                        {grupo.items.length} jogo{grupo.items.length > 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Partidas */}
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
                      {grupo.items.map((partida, idx) => (
                        <div
                          key={partida.id}
                          className={`flex items-center gap-3 px-4 py-3 ${idx > 0 ? 'border-t border-neutral-800/60' : ''}`}
                        >
                          <div className="flex-1 min-w-0 flex items-center gap-2">
                            <span className="font-black uppercase italic text-white text-sm truncate">{partida.equipe_a.nome}</span>
                            <span className="text-orange-500 font-black text-xs shrink-0">VS</span>
                            <span className="font-black uppercase italic text-white text-sm truncate">{partida.equipe_b.nome}</span>
                          </div>
                          <span className="text-[11px] text-neutral-600 font-semibold shrink-0 bg-neutral-800 px-2 py-0.5 rounded-full">
                            Chave {partida.equipe_a.chave}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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
                          <span className="text-xs text-neutral-600 font-mono">{log.partida_id.slice(0, 8)}…</span>
                        )}
                      </div>

                      <div className="flex justify-center">
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap border ${acaoClasses(log.acao)}`}>
                          {acaoLabel(log.acao)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${statusBadgeClasses(log.status_anterior)}`}>
                          {statusLabel(log.status_anterior)}
                        </span>
                        <ArrowRight className="w-3 h-3 text-neutral-600 shrink-0" />
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${statusBadgeClasses(log.status_novo)}`}>
                          {statusLabel(log.status_novo)}
                        </span>
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
    </div>
  )
}
