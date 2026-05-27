'use client'

import { Trophy, Wand2, Upload, Layers, ScrollText, LogOut } from 'lucide-react'
import type { Tab } from '@/lib/types'

const TABS: { id: Tab; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'planejar',    label: 'Planejar',      Icon: Wand2      },
  { id: 'visao-geral', label: 'Visão Geral',   Icon: Trophy     },
  { id: 'pool',        label: 'Pool de Jogos', Icon: Layers     },
  { id: 'importar',    label: 'Importar',      Icon: Upload     },
  { id: 'logs',        label: 'Logs',          Icon: ScrollText },
]

type Props = {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  onLogout: () => void
}

export function AppHeader({ activeTab, onTabChange, onLogout }: Props) {
  return (
    <header className="sticky top-0 z-10 border-b border-neutral-800/60 bg-[#050505]/90 backdrop-blur-md print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">

        {/* Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/25">
            <Trophy className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <div className="leading-none hidden sm:block">
            <h1 className="font-black italic uppercase tracking-tight text-white text-lg leading-none">
              CCB <span className="text-orange-500">Gestão</span>
            </h1>
            <p className="text-neutral-600 text-[10px] font-semibold tracking-widest uppercase mt-1">
              Dashboard Logístico
            </p>
          </div>
        </div>

        {/* Nav + Logout */}
        <div className="flex items-center gap-3 min-w-0">
          <nav className="flex items-center gap-0.5 sm:gap-1 bg-neutral-900 p-1 rounded-xl border border-neutral-800 overflow-x-auto">
            {TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => onTabChange(id)}
                className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                  activeTab === id
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25'
                    : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden md:inline">{label}</span>
              </button>
            ))}
          </nav>

          <button
            onClick={onLogout}
            title="Sair"
            className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl border border-neutral-800 text-neutral-500 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/5 transition-all"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

      </div>
    </header>
  )
}
