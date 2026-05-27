import { Loader2 } from 'lucide-react'

type Props = {
  title: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  color?: 'orange' | 'yellow' | 'blue'
  loading: boolean
}

export function StatCard({ title, value, icon: Icon, color = 'orange', loading }: Props) {
  const palette = {
    orange: { bg: 'bg-orange-500/10', icon: 'text-orange-500', border: 'border-orange-500/20' },
    yellow: { bg: 'bg-yellow-500/10', icon: 'text-yellow-400', border: 'border-yellow-500/20' },
    blue:   { bg: 'bg-sky-500/10',    icon: 'text-sky-400',    border: 'border-sky-500/20'    },
  }[color]

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest leading-relaxed">
          {title}
        </span>
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
