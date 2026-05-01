'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Wand2,
  Trophy,
  Layers,
  ScrollText,
  CalendarDays,
  ChevronRight,
  Plus,
  X,
  Loader2,
  Zap,
  MapPin,
  AlertTriangle,
  ListChecks,
  RotateCcw,
  CheckCircle2,
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatarData(iso: string): string {
  if (!iso) return ''
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function SugestaoCard({
  sugestao,
  isStaged,
  onAdd,
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
            <span
              key={i}
              className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${labelClasses(label)}`}
            >
              <LabelIcon label={label} />
              {label}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-black uppercase italic text-white text-s leading-tight truncate">
            {sugestao.equipe_a.nome}
          </p>
          <p className="text-orange-400 text-xs mt-0.5 font-medium">
            {sugestao.equipe_a.jogos_pendentes} JP
          </p>
        </div>

        <div className="flex flex-col items-center shrink-0">
          <span className="font-black text-orange-400 text-xs tracking-widest">VS</span>
          <span className="text-neutral-500 text-[10px] font-medium mt-0.5 whitespace-nowrap">
            {formatarData(sugestao.data_sugerida)}
          </span>
          <span className="text-neutral-600 text-[10px] font-semibold whitespace-nowrap">
            {nomeDiaSemana(sugestao.data_sugerida)}
          </span>
        </div>

        <div className="flex-1 min-w-0 text-right">
          <p className="font-black uppercase italic text-white text-s leading-tight truncate">
            {sugestao.equipe_b.nome}
          </p>
          <p className="text-orange-400 text-xs mt-0.5 font-medium">
            {sugestao.equipe_b.jogos_pendentes} JP
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
        <span className="text-xs text-white-700 font-semibold tracking-wide">
          Chave {sugestao.chave}
        </span>
        <button
          onClick={onAdd}
          disabled={isStaged}
          className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all active:scale-95
            ${isStaged
              ? 'bg-neutral-800 text-neutral-600 cursor-not-allowed'
              : 'bg-orange-500 hover:bg-orange-400 text-white shadow-md shadow-orange-500/20'
            }`}
        >
          {isStaged ? (
            'Adicionado ✓'
          ) : (
            <>
              <Plus className="w-3.5 h-3.5" />
              Adicionar
            </>
          )}
        </button>
      </div>
    </div>
  )
}

function StagedCard({
  sugestao,
  onRemove,
}: {
  sugestao: Sugestao
  onRemove: () => void
}) {
  return (
    <div className="flex items-center gap-3 bg-neutral-800/50 border border-neutral-700/50 rounded-xl px-3 py-2.5">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-black uppercase italic text-white text-xs truncate">
            {sugestao.equipe_a.nome}
          </span>
          <span className="text-orange-500 font-black text-xs shrink-0">VS</span>
          <span className="font-black uppercase italic text-white text-xs truncate">
            {sugestao.equipe_b.nome}
          </span>
        </div>
        <p className="text-neutral-600 text-xs mt-0.5">
          {formatarData(sugestao.data_sugerida)} · {sugestao.campeonato_nome}
        </p>
      </div>
      <button
        onClick={onRemove}
        className="shrink-0 w-6 h-6 flex items-center justify-center rounded-lg text-neutral-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        aria-label="Remover"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'planejar', label: 'Planejar', Icon: Wand2 },
  { id: 'visao-geral', label: 'Visão Geral', Icon: Trophy },
  { id: 'pool', label: 'Pool de Jogos', Icon: Layers },
  { id: 'logs', label: 'Logs', Icon: ScrollText },
]

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('planejar')

  const [dataSabado, setDataSabado] = useState('')
  const [dataDomingo, setDataDomingo] = useState('')
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([])
  const [staging, setStaging] = useState<Sugestao[]>([])
  const [rodadaOficial, setRodadaOficial] = useState<PartidaOficial[]>([])
  const [isLoadingSugestoes, setIsLoadingSugestoes] = useState(false)
  const [isConfirmando, setIsConfirmando] = useState(false)
  const [atualizandoIds, setAtualizandoIds] = useState<Set<string>>(new Set())
  const [erro, setErro] = useState('')

  const carregarRodadaOficial = useCallback(async () => {
    const { data } = await supabase
      .from('partidas')
      .select(`
        id, campeonato_id, data_agendada,
        campeonato:campeonatos!campeonato_id(nome),
        equipe_a:equipes!equipe_a_id(nome),
        equipe_b:equipes!equipe_b_id(nome)
      `)
      .eq('status', 'aguardando')
      .order('campeonato_id')
    if (data) {
      setRodadaOficial(
        (data as unknown as Array<{
          id: string
          campeonato_id: string
          data_agendada: string | null
          campeonato: { nome: string } | null
          equipe_a: { nome: string }
          equipe_b: { nome: string }
        }>).map((p) => ({
          ...p,
          campeonato_nome: p.campeonato?.nome ?? 'Sem categoria',
        }))
      )
    }
  }, [])

  useEffect(() => {
    carregarRodadaOficial()
  }, [carregarRodadaOficial])

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
    if (!staging.some((x) => x.partida_id === s.partida_id))
      setStaging((prev) => [...prev, s])
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
      setAtualizandoIds((prev) => {
        const next = new Set(prev)
        next.delete(partida_id)
        return next
      })
    }
  }

  const gruposSugestoes = agruparPor(sugestoes, (s) => s.campeonato_nome)
  const gruposRodada = agruparPor(rodadaOficial, (p) => p.campeonato_nome)

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
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all
                  ${activeTab === id
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

        {/* ── PLANEJAR ── */}
        {activeTab === 'planejar' && (
          <div className="flex flex-col gap-6">

            {/* Controls bar */}
            <section className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-5">

                {/* Texto descritivo */}
                <div className="flex flex-col gap-1">
                  <h2 className="font-black italic uppercase text-white text-base tracking-tight leading-none">
                    Montar <span className="text-orange-500">Rodada</span>
                  </h2>
                  <p className="text-neutral-500 text-xs leading-relaxed max-w-xs">
                    Selecione o fim de semana e veja todos os confrontos possíveis por categoria.
                  </p>
                </div>

                {/* Inputs + Botão */}
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
                    {isLoadingSugestoes
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Zap className="w-4 h-4" />
                    }
                    Analisar Disponibilidade
                  </button>
                </div>
              </div>

              {erro && (
                <div className="flex items-center gap-2 mt-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {erro}
                </div>
              )}
            </section>

            {/* Two-column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">

              {/* ── LEFT: Sugestões agrupadas por categoria ── */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between h-7">
                  <h2 className="font-black italic uppercase text-white text-base tracking-tight">
                    Sugestões por Categoria
                  </h2>
                  {sugestoes.length > 0 && (
                    <span className="bg-orange-500/15 text-white-400 text-xs font-semibold px-3 py-1 rounded-full">
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
                        {/* Category header */}
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] font-black text-orange-400 uppercase tracking-widest whitespace-nowrap">
                            {grupo.chave}
                          </span>
                          <div className="flex-1 h-px bg-orange-400" />
                          <span className="text-[11px] text-orange-400 font-semibold shrink-0">
                            {grupo.items.length} jogo{grupo.items.length > 1 ? 's' : ''}
                          </span>
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

              {/* ── RIGHT: Staging + Rodada Oficial ── */}
              <div className="flex flex-col gap-4">

                {/* Box de Montagem */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ListChecks className="w-4 h-4 text-orange-500" />
                      <h3 className="font-bold text-white text-sm">Box de Montagem</h3>
                    </div>
                    {staging.length > 0 && (
                      <span className="w-5 h-5 bg-orange-500 text-white text-[11px] font-black rounded-full flex items-center justify-center">
                        {staging.length}
                      </span>
                    )}
                  </div>

                  <div className="p-3 flex flex-col gap-2">
                    {staging.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 gap-2">
                        <p className="text-neutral-700 text-xs text-center leading-relaxed">
                          Adicione jogos das sugestões<br />para montar a rodada
                        </p>
                      </div>
                    ) : (
                      staging.map((s) => (
                        <StagedCard
                          key={s.partida_id}
                          sugestao={s}
                          onRemove={() => removeFromStaging(s.partida_id)}
                        />
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
                        {isConfirmando
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <ChevronRight className="w-4 h-4" />
                        }
                        {isConfirmando
                          ? 'Confirmando...'
                          : `Confirmar no Banco · ${staging.length} jogo${staging.length > 1 ? 's' : ''}`
                        }
                      </button>
                    </div>
                  )}
                </div>

                {/* Box da Rodada Oficial */}
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
                      <div className="flex flex-col items-center justify-center py-10 gap-2">
                        <p className="text-neutral-700 text-xs text-center leading-relaxed">
                          Nenhum jogo confirmado ainda
                        </p>
                      </div>
                    ) : (
                      <div className="p-3 flex flex-col gap-4">
                        {gruposRodada.map((grupo) => (
                          <div key={grupo.chave}>
                            {/* Category header */}
                            <div className="flex items-center gap-2 mb-2 px-1">
                              <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest whitespace-nowrap">
                                {grupo.chave}
                              </span>
                              <div className="flex-1 h-px bg-neutral-800" />
                            </div>

                            {/* Games */}
                            <div className="flex flex-col gap-1.5">
                              {grupo.items.map((p) => (
                                <div
                                  key={p.id}
                                  className={`flex items-center gap-2 bg-neutral-800/50 rounded-xl px-3 py-2.5 transition-opacity ${atualizandoIds.has(p.id) ? 'opacity-40' : ''}`}
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-black uppercase italic text-white text-xs truncate">
                                        {p.equipe_a.nome}
                                      </span>
                                      <span className="text-orange-500 font-black text-xs shrink-0">VS</span>
                                      <span className="font-black uppercase italic text-white text-xs truncate">
                                        {p.equipe_b.nome}
                                      </span>
                                    </div>
                                    {p.data_agendada && (
                                      <p className="text-neutral-600 text-xs mt-0.5">
                                        {formatarData(p.data_agendada)}
                                      </p>
                                    )}
                                  </div>

                                  {/* Action buttons */}
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

        {/* ── PLACEHOLDER TABS ── */}
        {activeTab !== 'planejar' && (
          <div className="flex flex-col items-center justify-center h-72 gap-4 text-neutral-700">
            <div className="w-16 h-16 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center">
              <Layers className="w-7 h-7 opacity-40" />
            </div>
            <div className="text-center">
              <p className="font-bold text-neutral-500 text-base">Em desenvolvimento</p>
              <p className="text-sm mt-1.5 text-neutral-700">Esta seção será implementada em breve.</p>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}
