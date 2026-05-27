import { MapPin, AlertTriangle } from 'lucide-react'

export function labelClasses(label: string) {
  if (label.includes('Interior'))
    return 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
  return 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
}

export function LabelIcon({ label }: { label: string }) {
  if (label.includes('Interior')) return <MapPin className="w-3 h-3 shrink-0" />
  return <AlertTriangle className="w-3 h-3 shrink-0" />
}

export function statusBadgeClasses(status: string) {
  switch (status) {
    case 'pendente':   return 'bg-neutral-800 text-neutral-400 border border-neutral-700'
    case 'aguardando': return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
    case 'realizado':  return 'bg-green-500/10 text-green-400 border border-green-500/20'
    default:           return 'bg-neutral-800 text-neutral-400'
  }
}

export function acaoClasses(acao: string) {
  switch (acao) {
    case 'agendar':  return 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
    case 'cancelar': return 'bg-red-500/10 text-red-400 border border-red-500/20'
    case 'realizar': return 'bg-green-500/10 text-green-400 border border-green-500/20'
    default:         return 'bg-neutral-800 text-neutral-400'
  }
}

export function acaoLabel(acao: string) {
  const map: Record<string, string> = {
    agendar: 'Agendado',
    cancelar: 'Cancelado',
    realizar: 'Realizado',
  }
  return map[acao] ?? acao
}

export function statusLabel(status: string) {
  const map: Record<string, string> = {
    pendente: 'Pendente',
    aguardando: 'Aguardando',
    realizado: 'Realizado',
  }
  return map[status] ?? status
}
