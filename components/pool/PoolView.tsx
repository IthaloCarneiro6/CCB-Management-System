'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Search, RefreshCw, Trash2, Layers, Loader2 } from 'lucide-react'
import type { GrupoPool, GrupoPoolAgrupado, BlocoPool } from '@/lib/types'

export function PoolView() {
  const [gruposPool, setGruposPool] = useState<GrupoPool[]>([])
  const [searchPool, setSearchPool] = useState('')
  const [filtroCampeonato, setFiltroCampeonato] = useState('')
  const [isLoadingPool, setIsLoadingPool] = useState(false)
  const [isLimpandoDuplicatas, setIsLimpandoDuplicatas] = useState(false)

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

  useEffect(() => { carregarPool() }, [carregarPool])

  async function limparDuplicatas() {
    setIsLimpandoDuplicatas(true)
    try {
      const res = await fetch('/api/pool/limpar-duplicatas', { method: 'POST' })
      if (res.ok) await carregarPool()
    } finally {
      setIsLimpandoDuplicatas(false)
    }
  }

  const campeonatosDisponiveis = useMemo(
    () => gruposPool.map((g) => ({ id: g.campeonato_id, nome: g.campeonato_nome })),
    [gruposPool],
  )

  const gruposFiltrados: GrupoPoolAgrupado[] = useMemo(() => {
    const q = searchPool.toLowerCase()
    return (searchPool.trim() || filtroCampeonato
      ? gruposPool
          .filter((g) => !filtroCampeonato || g.campeonato_id === filtroCampeonato)
          .map((g) => ({
            ...g,
            partidas: searchPool.trim()
              ? g.partidas.filter(
                  (p) =>
                    p.equipe_a.nome.toLowerCase().includes(q) ||
                    p.equipe_b.nome.toLowerCase().includes(q),
                )
              : g.partidas,
          }))
          .filter((g) => g.partidas.length > 0)
      : gruposPool
    ).map((g) => {
      const blocoMap = new Map<string, BlocoPool>()
      for (const p of g.partidas) {
        if (!blocoMap.has(p.equipe_a.id)) {
          blocoMap.set(p.equipe_a.id, {
            pivotId: p.equipe_a.id,
            pivotNome: p.equipe_a.nome,
            count: 0,
            partidas: [],
          })
        }
        const bloco = blocoMap.get(p.equipe_a.id)!
        bloco.count++
        bloco.partidas.push(p)
      }
      const blocos = Array.from(blocoMap.values()).sort((a, b) => b.count - a.count)
      return {
        campeonato_id: g.campeonato_id,
        campeonato_nome: g.campeonato_nome,
        total_pendentes: g.total_pendentes,
        blocos,
      }
    })
  }, [gruposPool, searchPool, filtroCampeonato])

  return (
    <div className="flex flex-col gap-6">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por equipe..."
            value={searchPool}
            onChange={(e) => setSearchPool(e.target.value)}
            className="w-full bg-neutral-900 border border-neutral-800 text-neutral-200 text-sm rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition-colors placeholder:text-neutral-700"
          />
        </div>

        {campeonatosDisponiveis.length > 1 && (
          <select
            value={filtroCampeonato}
            onChange={(e) => setFiltroCampeonato(e.target.value)}
            className="bg-neutral-900 border border-neutral-800 text-neutral-200 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition-colors"
          >
            <option value="">Todos os campeonatos</option>
            {campeonatosDisponiveis.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        )}

        <button
          onClick={carregarPool}
          title="Atualizar"
          className="w-10 h-10 flex items-center justify-center bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-xl text-neutral-600 hover:text-neutral-300 transition-colors shrink-0"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        <button
          onClick={limparDuplicatas}
          disabled={isLimpandoDuplicatas}
          title="Remove partidas pendentes duplicadas"
          className="flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-red-400 transition-colors disabled:opacity-50 shrink-0"
        >
          {isLimpandoDuplicatas ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Trash2 className="w-3.5 h-3.5" />
          )}
          Limpar duplicatas
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
        <div className="flex flex-col gap-10">
          {gruposFiltrados.map((grupo) => (
            <div key={grupo.campeonato_id} className="flex flex-col gap-5">
              <div className="bg-neutral-800 border-l-4 border-orange-500 px-4 py-3 flex justify-between items-center rounded-r-md">
                <span className="font-black italic uppercase text-lg text-white leading-tight">
                  {grupo.campeonato_nome}
                </span>
                <span className="text-sm font-bold text-orange-500 bg-orange-500/20 px-3 py-1 rounded-md shrink-0 ml-4">
                  {grupo.total_pendentes} restante{grupo.total_pendentes !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="flex flex-col gap-6">
                {grupo.blocos.map((bloco) => (
                  <div key={bloco.pivotId}>
                    <div className="border-b border-neutral-800 pb-1 mb-3">
                      <span className="text-base font-bold uppercase text-neutral-300">
                        {bloco.pivotNome}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {bloco.partidas.map((partida) => (
                        <div
                          key={partida.id}
                          className="bg-neutral-900/50 border border-neutral-800 rounded-md p-2 flex items-center hover:border-orange-500/50 transition-colors"
                        >
                          <span className="text-[10px] text-orange-500 font-bold mr-1.5 shrink-0">VS</span>
                          <span className="font-bold uppercase text-white text-xs truncate">
                            {partida.equipe_b.nome}
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
  )
}
