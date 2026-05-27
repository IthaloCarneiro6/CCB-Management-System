'use client'

import { useState, useEffect, useCallback } from 'react'
import { Trophy, RefreshCw, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { CampeonatoVG } from '@/lib/types'

export function VisaoGeralView() {
  const [statsVG, setStatsVG] = useState<CampeonatoVG[]>([])
  const [isLoadingStats, setIsLoadingStats] = useState(false)
  const [filtroVG, setFiltroVG] = useState('')

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
      const partidas = (partRes.data ?? []) as {
        equipe_a_id: string; equipe_b_id: string; status: string
      }[]

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
          .filter((c) => c.equipes.length > 0),
      )
    } finally {
      setIsLoadingStats(false)
    }
  }, [])

  useEffect(() => { carregarStats() }, [carregarStats])

  const statsVGFiltradas = filtroVG ? statsVG.filter((c) => c.id === filtroVG) : statsVG

  return (
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
              <div className="px-4 py-3 border-b border-neutral-800 flex items-center gap-2.5">
                <div className="w-1.5 h-4 rounded-full bg-orange-500 shrink-0" />
                <h3 className="font-black italic uppercase text-white text-sm tracking-tight truncate flex-1">
                  {camp.nome}
                </h3>
                <span className="text-[10px] font-bold text-neutral-600 shrink-0">
                  {camp.equipes.length} time{camp.equipes.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="grid grid-cols-[1fr_38px_38px_38px] px-4 py-2 bg-neutral-800/30">
                <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">Time</span>
                <span className="text-[10px] font-bold text-orange-500/80 uppercase tracking-widest text-center">JP</span>
                <span className="text-[10px] font-bold text-yellow-500/80 uppercase tracking-widest text-center">JA</span>
                <span className="text-[10px] font-bold text-green-500/80 uppercase tracking-widest text-center">JR</span>
              </div>

              <div className="divide-y divide-neutral-800/40">
                {camp.equipes.map((team) => (
                  <div
                    key={team.id}
                    className="grid grid-cols-[1fr_38px_38px_38px] px-4 py-2.5 items-center hover:bg-neutral-800/20 transition-colors"
                  >
                    <span className="font-black italic uppercase text-white text-xs truncate pr-2">
                      {team.nome}
                    </span>
                    {[
                      { val: team.jp, color: 'orange' },
                      { val: team.ja, color: 'yellow' },
                      { val: team.jr, color: 'green' },
                    ].map(({ val, color }) => (
                      <div key={color} className="flex justify-center">
                        {val > 0 ? (
                          <span className={`text-[10px] font-bold text-${color}-400 bg-${color}-500/10 border border-${color}-500/20 min-w-[22px] h-[18px] flex items-center justify-center rounded-full px-1`}>
                            {val}
                          </span>
                        ) : (
                          <span className="text-[10px] text-neutral-700 font-semibold block text-center">0</span>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
