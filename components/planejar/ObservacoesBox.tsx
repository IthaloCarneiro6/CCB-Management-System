import { StickyNote } from 'lucide-react'
import type { ObservacaoDisp } from '@/lib/types'

type Props = {
  observacoes: ObservacaoDisp[]
}

export function ObservacoesBox({ observacoes }: Props) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden h-[45vh] flex flex-col">
      <div className="px-4 py-3 border-b border-neutral-800 flex items-center gap-2 shrink-0">
        <StickyNote className="w-4 h-4 text-orange-500" />
        <h3 className="font-bold text-white text-sm">Observações</h3>
        {observacoes.length > 0 && (
          <span className="ml-auto w-5 h-5 bg-neutral-700 text-neutral-400 text-[11px] font-black rounded-full flex items-center justify-center">
            {observacoes.length}
          </span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {observacoes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10">
            <p className="text-neutral-700 text-xs text-center leading-relaxed">
              Observações dos times<br />disponíveis no fim de semana
            </p>
          </div>
        ) : (
          observacoes.map((obs, i) => (
            <div
              key={i}
              className="flex flex-col gap-1 bg-neutral-800/40 border border-neutral-700/40 rounded-xl px-3 py-2"
            >
              <span className="text-[11px] font-bold text-orange-400 uppercase italic truncate">
                {obs.equipe_nome}
              </span>
              <span className="text-sm text-neutral-300 leading-snug">{obs.observacao}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
