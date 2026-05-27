'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { AppHeader } from '@/components/AppHeader'
import { PlanejamentoView } from '@/components/planejar/PlanejamentoView'
import { VisaoGeralView } from '@/components/visao-geral/VisaoGeralView'
import { PoolView } from '@/components/pool/PoolView'
import { ImportarView } from '@/components/importar/ImportarView'
import { LogsView } from '@/components/logs/LogsView'
import { ToastContainer } from '@/components/ui/Toast'
import type { Campeonato, Tab } from '@/lib/types'

export default function Dashboard() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('planejar')
  const [campeonatos, setCampeonatos] = useState<Campeonato[]>([])

  const carregarCampeonatos = useCallback(async () => {
    const { data } = await supabase.from('campeonatos').select('id, nome').order('nome')
    if (data) setCampeonatos(data)
  }, [])

  useEffect(() => {
    if (activeTab === 'importar') carregarCampeonatos()
  }, [activeTab, carregarCampeonatos])

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.replace('/login')
  }

  function handleCampeonatoCreated(c: Campeonato) {
    setCampeonatos((prev) => [...prev, c].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')))
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#050505]">
      <AppHeader activeTab={activeTab} onTabChange={setActiveTab} onLogout={handleLogout} />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
        {activeTab === 'planejar'    && <PlanejamentoView />}
        {activeTab === 'visao-geral' && <VisaoGeralView />}
        {activeTab === 'pool'        && <PoolView />}
        {activeTab === 'importar'    && (
          <ImportarView
            campeonatos={campeonatos}
            onCampeonatoCreated={handleCampeonatoCreated}
          />
        )}
        {activeTab === 'logs'        && <LogsView />}
      </main>

      <ToastContainer />
    </div>
  )
}
