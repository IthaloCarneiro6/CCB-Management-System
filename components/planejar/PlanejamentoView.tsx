'use client'

import { useState, useEffect, useCallback } from 'react'
import { Wand2, CalendarDays, Zap, Loader2, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { agruparPor } from '@/lib/date-helpers'
import { useToastStore } from '@/stores/useToastStore'
import { SugestaoCard } from '@/components/SugestaoCard'
import { BoxMontagem } from './BoxMontagem'
import { ObservacoesBox } from './ObservacoesBox'
import { RodadaOficial } from './RodadaOficial'
import type { Sugestao, PartidaOficial, ObservacaoDisp } from '@/lib/types'

export function PlanejamentoView() {
  const toast = useToastStore()

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
  const [observacoesDisp, setObservacoesDisp] = useState<ObservacaoDisp[]>([])
  const [swappedIds, setSwappedIds] = useState<Set<string>>(new Set())

  const carregarRodadaOficial = useCallback(async () => {
    const { data } = await supabase
      .from('partidas')
      .select(`id, campeonato_id, data_agendada, numero_jogo, horario, local,
        campeonato:campeonatos!campeonato_id(nome),
        equipe_a:equipes!equipe_a_id(id, nome),
        equipe_b:equipes!equipe_b_id(id, nome)`)
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
          equipe_a: { id: string; nome: string }; equipe_b: { id: string; nome: string }
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
    const usados = new Set(
      (data ?? []).map((r) => (r as { numero_jogo: number }).numero_jogo)
    )
    let proximo = 1
    while (usados.has(proximo)) proximo++
    setProximoNumeroJogo(proximo)
  }, [])

  const carregarObservacoes = useCallback(async (datas: string[]) => {
    const datasValidas = datas.filter(Boolean)
    if (datasValidas.length === 0) { setObservacoesDisp([]); return }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase
      .from('disponibilidades')
      .select('observacao, equipe:equipes!equipe_id(nome)')
      .in('data', datasValidas)
      .not('observacao', 'is', null) as any)
    const rows = (data ?? []) as Array<{ observacao: string | null; equipe: { nome: string } | null }>
    const seen = new Set<string>()
    const obs: ObservacaoDisp[] = []
    for (const r of rows) {
      if (!r.equipe || !r.observacao?.trim()) continue
      const key = `${r.equipe.nome}|${r.observacao}`
      if (!seen.has(key)) {
        seen.add(key)
        obs.push({ equipe_nome: r.equipe.nome, observacao: r.observacao })
      }
    }
    setObservacoesDisp(obs.sort((a, b) => a.equipe_nome.localeCompare(b.equipe_nome, 'pt-BR')))
  }, [])

  useEffect(() => {
    carregarRodadaOficial()
    carregarProximoNumero()
  }, [carregarRodadaOficial, carregarProximoNumero])

  async function gerarSugestoes() {
    if (!dataSabado && !dataDomingo) {
      toast.push('error', 'Informe ao menos uma data.')
      return
    }
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
      await carregarObservacoes([dataSabado, dataDomingo].filter(Boolean))
    } catch (e: unknown) {
      toast.push('error', e instanceof Error ? e.message : 'Erro ao gerar sugestões.')
    } finally {
      setIsLoadingSugestoes(false)
    }
  }

  function addToStaging(s: Sugestao) {
    if (staging.some((x) => x.partida_id === s.partida_id)) return
    setStaging((prev) => [...prev, s])
    setStagingLogistica((prev) => {
      const offset = Object.keys(prev).length
      return {
        ...prev,
        [s.partida_id]: {
          numero_jogo: String(proximoNumeroJogo + offset),
          horario: '',
          local: 'Juvenal de Carvalho',
        },
      }
    })
  }

  function removeFromStaging(id: string) {
    setStaging((prev) => prev.filter((s) => s.partida_id !== id))
    setStagingLogistica((prev) => { const n = { ...prev }; delete n[id]; return n })
    setSwappedIds((prev) => { const n = new Set(prev); n.delete(id); return n })
  }

  function swapInStaging(partida_id: string) {
    setSwappedIds((prev) => {
      const n = new Set(prev)
      if (n.has(partida_id)) n.delete(partida_id)
      else n.add(partida_id)
      return n
    })
  }

  function handleLogisticaChange(id: string, field: 'numero_jogo' | 'horario' | 'local', value: string) {
    setStagingLogistica((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }))
  }

  async function confirmarRodada() {
    if (!staging.length) return
    setIsConfirmando(true)
    try {
      const res = await fetch('/api/partidas/confirmar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partidas: staging.map((s) => {
            const log = stagingLogistica[s.partida_id]
            const isSwapped = swappedIds.has(s.partida_id)
            return {
              id: s.partida_id,
              data_agendada: s.data_sugerida,
              numero_jogo: log?.numero_jogo ? parseInt(log.numero_jogo, 10) : null,
              horario: log?.horario || null,
              local: log?.local || null,
              equipe_a_id: isSwapped ? s.equipe_b.id : s.equipe_a.id,
              equipe_b_id: isSwapped ? s.equipe_a.id : s.equipe_b.id,
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
      setSwappedIds(new Set())
      toast.push('success', `${confirmados.size} jogo${confirmados.size > 1 ? 's' : ''} confirmado${confirmados.size > 1 ? 's' : ''} na rodada!`)
      await carregarRodadaOficial()
      await carregarProximoNumero()
    } catch (e: unknown) {
      toast.push('error', e instanceof Error ? e.message : 'Erro ao confirmar a rodada.')
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
      if (res.ok) {
        await carregarRodadaOficial()
        if (status_novo === 'pendente') toast.push('info', 'Jogo desfeito — voltou para pendente.')
        if (status_novo === 'realizado') toast.push('success', 'Jogo marcado como realizado.')
      }
    } finally {
      setAtualizandoIds((prev) => { const n = new Set(prev); n.delete(partida_id); return n })
    }
  }

  const gruposSugestoes = agruparPor(sugestoes, (s) => s.campeonato_nome)

  return (
    <div className="flex flex-col gap-6">
      {/* Painel de datas */}
      <section className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 print:hidden">
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
            {(['Sábado', 'Domingo'] as const).map((dia) => {
              const value = dia === 'Sábado' ? dataSabado : dataDomingo
              const setter = dia === 'Sábado' ? setDataSabado : setDataDomingo
              return (
                <div key={dia} className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-1.5">
                    <CalendarDays className="w-3 h-3" /> {dia}
                  </label>
                  <input
                    type="date"
                    value={value}
                    onChange={(e) => setter(e.target.value)}
                    className="bg-neutral-800 border border-neutral-700 text-neutral-200 text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition-colors"
                  />
                </div>
              )
            })}
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
      </section>

      {/* Grid 3 boxes */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start print:hidden">
        {/* Sugestões */}
        <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden h-[45vh] flex flex-col">
          <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-orange-500" />
              <h2 className="font-bold text-white text-sm">Sugestões por Categoria</h2>
            </div>
            {sugestoes.length > 0 && (
              <span className="bg-orange-500/15 text-orange-400 text-xs font-semibold px-2.5 py-0.5 rounded-full shrink-0">
                {sugestoes.length}j · {gruposSugestoes.length}cat
              </span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-4">
            {isLoadingSugestoes ? (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <Loader2 className="w-7 h-7 text-orange-500 animate-spin" />
                <p className="text-neutral-500 text-sm font-medium">Calculando matchmaking...</p>
              </div>
            ) : sugestoes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <div className="w-12 h-12 rounded-2xl bg-neutral-800 border border-neutral-700 flex items-center justify-center">
                  <Wand2 className="w-5 h-5 text-neutral-600" />
                </div>
                <p className="text-neutral-500 text-xs font-medium text-center leading-relaxed px-4">
                  Informe as datas e clique em{' '}
                  <span className="text-orange-500 font-semibold">Analisar Disponibilidade</span>.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                {gruposSugestoes.map((grupo) => (
                  <div key={grupo.chave} className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-black text-orange-400 uppercase tracking-widest whitespace-nowrap">
                        {grupo.chave}
                      </span>
                      <div className="flex-1 h-px bg-orange-400/40" />
                      <span className="text-[11px] text-orange-400 font-semibold shrink-0">
                        {grupo.items.length}j
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
        </div>

        {/* Box de Montagem */}
        <BoxMontagem
          staging={staging}
          stagingLogistica={stagingLogistica}
          swappedIds={swappedIds}
          isConfirmando={isConfirmando}
          onRemove={removeFromStaging}
          onSwap={swapInStaging}
          onLogisticaChange={handleLogisticaChange}
          onConfirmar={confirmarRodada}
        />

        {/* Box de Observações */}
        <ObservacoesBox observacoes={observacoesDisp} />
      </div>

      {/* Rodada Oficial */}
      <RodadaOficial
        rodadaOficial={rodadaOficial}
        onReload={carregarRodadaOficial}
        onStatusChange={atualizarStatus}
        atualizandoIds={atualizandoIds}
      />
    </div>
  )
}
