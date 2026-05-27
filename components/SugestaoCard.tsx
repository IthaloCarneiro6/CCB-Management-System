import { Plus, CheckCircle2 } from 'lucide-react'
import { formatarDataCurta, nomeDiaSemana } from '@/lib/date-helpers'
import { labelClasses, LabelIcon } from '@/lib/class-helpers'
import type { Sugestao } from '@/lib/types'

type Props = {
  sugestao: Sugestao
  isStaged: boolean
  onAdd: () => void
}

export function SugestaoCard({ sugestao, isStaged, onAdd }: Props) {
  return (
    <div className="group bg-neutral-800/40 border border-neutral-700/40 hover:border-neutral-600/60 rounded-xl px-3 py-2.5 flex items-center gap-3 transition-colors">
      {/* Data */}
      <div className="shrink-0 w-10 text-center">
        <p className="text-[11px] font-bold text-neutral-400 leading-none">
          {formatarDataCurta(sugestao.data_sugerida)}
        </p>
        <p className="text-[9px] text-neutral-600 font-semibold mt-0.5">
          {nomeDiaSemana(sugestao.data_sugerida).slice(0, 3)}
        </p>
      </div>
      {/* Time A */}
      <div className="flex-1 min-w-0 text-right">
        <p className="font-black uppercase italic text-white text-sm leading-tight truncate">
          {sugestao.equipe_a.nome}
        </p>
        <p className="text-orange-400 text-[10px] font-medium">
          {sugestao.equipe_a.jogos_pendentes} JP
        </p>
      </div>
      {/* VS */}
      <span className="font-black text-orange-500 text-xs tracking-widest shrink-0">VS</span>
      {/* Time B */}
      <div className="flex-1 min-w-0">
        <p className="font-black uppercase italic text-white text-sm leading-tight truncate">
          {sugestao.equipe_b.nome}
        </p>
        <p className="text-orange-400 text-[10px] font-medium">
          {sugestao.equipe_b.jogos_pendentes} JP
        </p>
      </div>
      {/* Labels */}
      {sugestao.labels.length > 0 && (
        <div className="hidden sm:flex flex-col gap-0.5 shrink-0">
          {sugestao.labels.map((label, i) => (
            <span
              key={i}
              className={`flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${labelClasses(label)}`}
            >
              <LabelIcon label={label} />
              {label}
            </span>
          ))}
        </div>
      )}
      {/* Botão */}
      <button
        onClick={onAdd}
        disabled={isStaged}
        title={isStaged ? 'Já adicionado' : 'Adicionar ao Box de Montagem'}
        className={`shrink-0 flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg transition-all active:scale-95 ${
          isStaged
            ? 'bg-neutral-800 text-neutral-600 cursor-not-allowed'
            : 'bg-orange-500 hover:bg-orange-400 text-white shadow-md shadow-orange-500/20'
        }`}
      >
        {isStaged ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
      </button>
    </div>
  )
}
