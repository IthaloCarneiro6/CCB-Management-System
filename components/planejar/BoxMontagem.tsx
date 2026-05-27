import { ListChecks, ArrowLeftRight, X, ChevronRight, Loader2 } from 'lucide-react'
import { formatarData } from '@/lib/date-helpers'
import type { Sugestao } from '@/lib/types'

type LogisticaMap = Record<string, { numero_jogo: string; horario: string; local: string }>

type Props = {
  staging: Sugestao[]
  stagingLogistica: LogisticaMap
  swappedIds: Set<string>
  isConfirmando: boolean
  onRemove: (id: string) => void
  onSwap: (id: string) => void
  onLogisticaChange: (id: string, field: 'numero_jogo' | 'horario' | 'local', value: string) => void
  onConfirmar: () => void
}

export function BoxMontagem({
  staging,
  stagingLogistica,
  swappedIds,
  isConfirmando,
  onRemove,
  onSwap,
  onLogisticaChange,
  onConfirmar,
}: Props) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden h-[45vh] flex flex-col">
      <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between shrink-0">
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

      <div className="flex-1 overflow-y-auto p-3 pr-4 flex flex-col gap-2">
        {staging.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10">
            <p className="text-neutral-700 text-xs text-center leading-relaxed">
              Adicione jogos das sugestões<br />para montar a rodada
            </p>
          </div>
        ) : (
          staging.map((s) => {
            const log = stagingLogistica[s.partida_id] ?? { numero_jogo: '', horario: '', local: '' }
            const isSwapped = swappedIds.has(s.partida_id)
            const tA = isSwapped ? s.equipe_b : s.equipe_a
            const tB = isSwapped ? s.equipe_a : s.equipe_b
            return (
              <div
                key={s.partida_id}
                className="bg-neutral-800/40 border border-neutral-700/40 rounded-xl p-3 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 min-w-0 flex-1">
                    <span className="font-black uppercase italic text-white text-xs truncate">{tA.nome}</span>
                    <button
                      onClick={() => onSwap(s.partida_id)}
                      title="Inverter mando"
                      className="shrink-0 w-5 h-5 flex items-center justify-center rounded text-orange-500 hover:bg-orange-500/15 transition-colors"
                    >
                      <ArrowLeftRight className="w-3 h-3" />
                    </button>
                    <span className="font-black uppercase italic text-white text-xs truncate">{tB.nome}</span>
                  </div>
                  <button
                    onClick={() => onRemove(s.partida_id)}
                    className="shrink-0 w-6 h-6 flex items-center justify-center rounded-lg text-neutral-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p className="text-neutral-600 text-[10px] px-0.5">
                  {formatarData(s.data_sugerida)} · {s.campeonato_nome}
                </p>

                <div className="grid grid-cols-3 gap-1.5">
                  {(['numero_jogo', 'horario', 'local'] as const).map((field) => (
                    <div key={field} className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-neutral-600 uppercase tracking-widest">
                        {field === 'numero_jogo' ? 'Nº' : field === 'horario' ? 'Horário' : 'Local'}
                      </label>
                      <input
                        type={field === 'horario' ? 'time' : field === 'numero_jogo' ? 'number' : 'text'}
                        value={log[field]}
                        onChange={(e) => onLogisticaChange(s.partida_id, field, e.target.value)}
                        placeholder={field === 'numero_jogo' ? '001' : field === 'local' ? 'Quadra...' : undefined}
                        className="bg-neutral-900 border border-neutral-700 text-neutral-200 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-orange-500 w-full min-w-0"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>

      {staging.length > 0 && (
        <div className="px-3 pb-3 shrink-0">
          <button
            onClick={onConfirmar}
            disabled={isConfirmando}
            className="w-full bg-orange-500 hover:bg-orange-400 active:bg-orange-600 text-white font-bold py-2.5 rounded-xl transition-all text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isConfirmando ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            {isConfirmando
              ? 'Confirmando...'
              : `Confirmar · ${staging.length} jogo${staging.length > 1 ? 's' : ''}`}
          </button>
        </div>
      )}
    </div>
  )
}
