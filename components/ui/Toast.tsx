'use client'

import { X, CheckCircle2, AlertTriangle, Info } from 'lucide-react'
import { useToastStore } from '@/stores/useToastStore'

const ICONS = {
  success: <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />,
  error:   <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />,
  info:    <Info className="w-4 h-4 text-sky-400 shrink-0" />,
}

const STYLES = {
  success: 'bg-neutral-900 border-green-500/30 text-green-300',
  error:   'bg-neutral-900 border-red-500/30 text-red-300',
  info:    'bg-neutral-900 border-sky-500/30 text-sky-300',
}

export function ToastContainer() {
  const { toasts, remove } = useToastStore()

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl text-sm font-medium max-w-sm pointer-events-auto animate-in slide-in-from-right-4 fade-in duration-200 ${STYLES[t.type]}`}
        >
          {ICONS[t.type]}
          <span className="flex-1">{t.message}</span>
          <button
            onClick={() => remove(t.id)}
            className="shrink-0 text-neutral-600 hover:text-neutral-300 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}
