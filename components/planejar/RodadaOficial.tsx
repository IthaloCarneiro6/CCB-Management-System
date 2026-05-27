'use client'

import { useState } from 'react'
import {
  Trophy, RefreshCw, Pencil, RotateCcw, CheckCircle2, Check, X,
  ArrowLeftRight, MapPin, Printer, Loader2,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { ymd, formatarDataCurta, nomeDiaSemana, agruparPor } from '@/lib/date-helpers'
import { useToastStore } from '@/stores/useToastStore'
import type { PartidaOficial } from '@/lib/types'

type Props = {
  rodadaOficial: PartidaOficial[]
  onReload: () => void
  onStatusChange: (partida_id: string, status_novo: 'pendente' | 'realizado', acao: string) => Promise<void>
  atualizandoIds: Set<string>
}

type EditBuffer = {
  numero_jogo: string
  horario: string
  local: string
  swapped: boolean
}

export function RodadaOficial({ rodadaOficial, onReload, onStatusChange, atualizandoIds }: Props) {
  const toast = useToastStore()
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editBuffer, setEditBuffer] = useState<EditBuffer | null>(null)
  const [confirmando, setConfirmando] = useState<{ id: string; tipo: 'undo' | 'realizado' } | null>(null)

  const gruposRodada = agruparPor(
    [...rodadaOficial].sort((a, b) => {
      const d = ymd(a.data_agendada ?? '').localeCompare(ymd(b.data_agendada ?? ''))
      return d !== 0 ? d : (a.local ?? '').localeCompare(b.local ?? '')
    }),
    (p) => `${ymd(p.data_agendada ?? '')}|${p.local ?? ''}`,
  )

  function iniciarEdicao(p: PartidaOficial) {
    setEditandoId(p.id)
    setEditBuffer({
      numero_jogo: p.numero_jogo != null ? String(p.numero_jogo) : '',
      horario: p.horario ?? '',
      local: p.local ?? '',
      swapped: false,
    })
  }

  async function salvarEdicao(partida_id: string, p: PartidaOficial) {
    if (!editBuffer) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('partidas') as any).update({
      numero_jogo: editBuffer.numero_jogo.trim() ? parseInt(editBuffer.numero_jogo, 10) : null,
      horario: editBuffer.horario || null,
      local: editBuffer.local || null,
      ...(editBuffer.swapped && { equipe_a_id: p.equipe_b.id, equipe_b_id: p.equipe_a.id }),
    }).eq('id', partida_id)
    setEditandoId(null)
    setEditBuffer(null)
    toast.push('success', 'Jogo atualizado.')
    onReload()
  }

  async function confirmarAcao(partida_id: string, tipo: 'undo' | 'realizado') {
    setConfirmando(null)
    if (tipo === 'undo') await onStatusChange(partida_id, 'pendente', 'cancelar')
    else await onStatusChange(partida_id, 'realizado', 'realizar')
  }

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-neutral-800 flex items-center gap-2">
        <Trophy className="w-4 h-4 text-neutral-600" />
        <h3 className="font-bold text-white text-sm">Rodada Oficial</h3>
        <button
          onClick={onReload}
          title="Atualizar"
          className="ml-1 text-neutral-700 hover:text-neutral-400 transition-colors print:hidden"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
        {rodadaOficial.length > 0 && (
          <span className="ml-auto text-[11px] bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-2.5 py-0.5 rounded-full font-semibold">
            {rodadaOficial.length} aguardando
          </span>
        )}
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-300 transition-colors print:hidden ml-2"
          title="Exportar PDF"
        >
          <Printer className="w-3.5 h-3.5" />
          Imprimir
        </button>
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
                <th className="px-5 py-2.5 w-28 print:hidden"></th>
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
                          {dataKey
                            ? `${nomeDiaSemana(dataKey)}, ${formatarDataCurta(dataKey)}`
                            : 'Sem data'}
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
                  ...grupo.items.map((p, i) => {
                    const isEditing = editandoId === p.id
                    const isConfirming = confirmando?.id === p.id
                    return (
                      <tr
                        key={p.id}
                        className={`border-b border-neutral-800/40 transition-opacity ${
                          atualizandoIds.has(p.id) ? 'opacity-40' : ''
                        } ${i % 2 === 1 ? 'bg-neutral-900/50' : ''}`}
                      >
                        {/* Nº */}
                        <td className="px-5 py-3 font-mono font-bold whitespace-nowrap">
                          {isEditing ? (
                            <input
                              type="number"
                              value={editBuffer?.numero_jogo ?? ''}
                              onChange={(e) =>
                                setEditBuffer((prev) => prev ? { ...prev, numero_jogo: e.target.value } : null)
                              }
                              className="bg-neutral-800 border border-neutral-700 text-orange-400 font-mono text-xs rounded px-2 py-1 w-14 focus:outline-none focus:border-orange-500"
                              placeholder="001"
                            />
                          ) : p.numero_jogo != null ? (
                            <span className="text-orange-400">#{String(p.numero_jogo).padStart(3, '0')}</span>
                          ) : (
                            <span className="text-neutral-700">—</span>
                          )}
                        </td>

                        {/* Horário */}
                        <td className="px-3 py-3 text-neutral-300 font-mono whitespace-nowrap">
                          {isEditing ? (
                            <input
                              type="time"
                              value={editBuffer?.horario ?? ''}
                              onChange={(e) =>
                                setEditBuffer((prev) => prev ? { ...prev, horario: e.target.value } : null)
                              }
                              className="bg-neutral-800 border border-neutral-700 text-neutral-300 font-mono text-xs rounded px-2 py-1 focus:outline-none focus:border-orange-500 min-w-[80px]"
                            />
                          ) : p.horario ? (
                            p.horario.slice(0, 5)
                          ) : (
                            <span className="text-neutral-700">—</span>
                          )}
                        </td>

                        {/* Time A */}
                        <td className="px-3 py-3 text-right font-black uppercase italic text-white whitespace-nowrap text-sm">
                          {isEditing && editBuffer?.swapped ? p.equipe_b.nome : p.equipe_a.nome}
                        </td>

                        {/* VS / Swap */}
                        <td className="px-2 py-3 text-center whitespace-nowrap">
                          {isEditing ? (
                            <button
                              onClick={() =>
                                setEditBuffer((prev) => prev ? { ...prev, swapped: !prev.swapped } : null)
                              }
                              title="Inverter mando"
                              className="w-6 h-6 inline-flex items-center justify-center rounded text-orange-500 hover:bg-orange-500/15 transition-colors"
                            >
                              <ArrowLeftRight className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span className="font-black text-orange-500 text-[11px] tracking-widest">vs</span>
                          )}
                        </td>

                        {/* Time B */}
                        <td className="px-3 py-3 font-black uppercase italic text-white whitespace-nowrap text-sm">
                          {isEditing && editBuffer?.swapped ? p.equipe_a.nome : p.equipe_b.nome}
                        </td>

                        {/* Categoria / Local no modo edição */}
                        <td className="px-3 py-3 text-neutral-500 whitespace-nowrap">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editBuffer?.local ?? ''}
                              onChange={(e) =>
                                setEditBuffer((prev) => prev ? { ...prev, local: e.target.value } : null)
                              }
                              className="bg-neutral-800 border border-neutral-700 text-neutral-400 text-xs rounded px-2 py-1 w-full focus:outline-none focus:border-orange-500"
                              placeholder="Quadra..."
                            />
                          ) : (
                            p.campeonato_nome
                          )}
                        </td>

                        {/* Ações */}
                        <td className="px-3 py-3 print:hidden">
                          <div className="flex items-center justify-end gap-0.5">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => { setEditandoId(null); setEditBuffer(null) }}
                                  title="Cancelar"
                                  className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-600 hover:text-neutral-300 hover:bg-neutral-800 transition-colors"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => salvarEdicao(p.id, p)}
                                  title="Salvar"
                                  className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-600 hover:text-green-400 hover:bg-green-500/10 transition-colors"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : isConfirming ? (
                              /* Confirmação inline */
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-neutral-500 mr-1">
                                  {confirmando!.tipo === 'undo' ? 'Desfazer?' : 'Realizado?'}
                                </span>
                                <button
                                  onClick={() => confirmarAcao(p.id, confirmando!.tipo)}
                                  className={`px-2 py-0.5 text-[10px] font-bold rounded-lg border transition-colors ${
                                    confirmando!.tipo === 'undo'
                                      ? 'bg-red-500/15 border-red-500/30 text-red-400 hover:bg-red-500/25'
                                      : 'bg-green-500/15 border-green-500/30 text-green-400 hover:bg-green-500/25'
                                  }`}
                                >
                                  Sim
                                </button>
                                <button
                                  onClick={() => setConfirmando(null)}
                                  className="px-2 py-0.5 text-[10px] font-bold bg-neutral-800 border border-neutral-700 text-neutral-400 rounded-lg hover:bg-neutral-700 transition-colors"
                                >
                                  Não
                                </button>
                              </div>
                            ) : (
                              <>
                                <button
                                  onClick={() => iniciarEdicao(p)}
                                  disabled={atualizandoIds.has(p.id)}
                                  title="Editar"
                                  className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-600 hover:text-orange-400 hover:bg-orange-500/10 transition-colors disabled:cursor-not-allowed"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setConfirmando({ id: p.id, tipo: 'undo' })}
                                  disabled={atualizandoIds.has(p.id)}
                                  title="Desfazer — volta para pendente"
                                  className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-600 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:cursor-not-allowed"
                                >
                                  {atualizandoIds.has(p.id) ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <RotateCcw className="w-3.5 h-3.5" />
                                  )}
                                </button>
                                <button
                                  onClick={() => setConfirmando({ id: p.id, tipo: 'realizado' })}
                                  disabled={atualizandoIds.has(p.id)}
                                  title="Marcar como realizado"
                                  className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-600 hover:text-green-400 hover:bg-green-500/10 transition-colors disabled:cursor-not-allowed"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  }),
                ]
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
