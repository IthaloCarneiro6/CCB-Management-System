'use client'

import { useState, useEffect, useCallback } from 'react'
import { ScrollText, RefreshCw, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatarDataHora } from '@/lib/date-helpers'
import { acaoClasses, acaoLabel, statusBadgeClasses, statusLabel } from '@/lib/class-helpers'
import type { LogTransacao } from '@/lib/types'

export function LogsView() {
  const [logs, setLogs] = useState<LogTransacao[]>([])
  const [isLoadingLogs, setIsLoadingLogs] = useState(false)
  const [pagina, setPagina] = useState(0)
  const POR_PAGINA = 50

  const carregarLogs = useCallback(async (pag = 0) => {
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
        .range(pag * POR_PAGINA, (pag + 1) * POR_PAGINA - 1)
      if (data) {
        if (pag === 0) {
          setLogs(data as unknown as LogTransacao[])
        } else {
          setLogs((prev) => [...prev, ...(data as unknown as LogTransacao[])])
        }
      }
    } finally {
      setIsLoadingLogs(false)
    }
  }, [])

  useEffect(() => { carregarLogs(0) }, [carregarLogs])

  function handleRefresh() {
    setPagina(0)
    carregarLogs(0)
  }

  function handleCarregarMais() {
    const proxPag = pagina + 1
    setPagina(proxPag)
    carregarLogs(proxPag)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="font-black italic uppercase text-white text-base tracking-tight">
          Logs de <span className="text-orange-500">Transações</span>
        </h2>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-300 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Atualizar
        </button>
      </div>

      {isLoadingLogs && logs.length === 0 ? (
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
        <>
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
            <div className="grid grid-cols-[1fr_100px_110px_110px_140px] gap-4 px-5 py-3 border-b border-neutral-800 bg-neutral-800/30">
              <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest">Partida</span>
              <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest text-center">Ação</span>
              <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest">Status Anterior</span>
              <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest">Status Atual</span>
              <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest text-right">Quando</span>
            </div>

            <div className="divide-y divide-neutral-800/50">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="grid grid-cols-[1fr_100px_110px_110px_140px] gap-4 px-5 py-3 items-center hover:bg-neutral-800/20 transition-colors"
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

                  <div>
                    {log.status_anterior ? (
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${statusBadgeClasses(log.status_anterior)}`}>
                        {statusLabel(log.status_anterior)}
                      </span>
                    ) : (
                      <span className="text-xs text-neutral-700">—</span>
                    )}
                  </div>

                  <div>
                    {log.status_novo ? (
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${statusBadgeClasses(log.status_novo)}`}>
                        {statusLabel(log.status_novo)}
                      </span>
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

          {/* Carregar mais */}
          <div className="flex justify-center">
            <button
              onClick={handleCarregarMais}
              disabled={isLoadingLogs}
              className="flex items-center gap-2 text-sm font-semibold text-neutral-500 hover:text-neutral-300 transition-colors disabled:opacity-50"
            >
              {isLoadingLogs ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Carregar mais
            </button>
          </div>
        </>
      )}
    </div>
  )
}
