'use client'

import { useState } from 'react'
import { Trophy, Plus, X, Loader2, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Campeonato } from '@/lib/types'

type Props = {
  onClose: () => void
  onCreated: (c: Campeonato) => void
}

export function NovoCampeonatoModal({ onClose, onCreated }: Props) {
  const [nome, setNome] = useState('')
  const [temporada, setTemporada] = useState('2026')
  const [isSaving, setIsSaving] = useState(false)
  const [erro, setErro] = useState('')

  async function handleSalvar() {
    const nomeFinal = [nome.trim(), temporada.trim()].filter(Boolean).join(' ')
    if (!nomeFinal) { setErro('Informe o nome do campeonato.'); return }
    setIsSaving(true)
    setErro('')
    try {
      const { data, error } = await supabase
        .from('campeonatos')
        .insert({ nome: nomeFinal, formato_chaves: false })
        .select('id, nome')
        .single()
      if (error) throw error
      const novo = data as Campeonato
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await supabase.from('logs_transacoes').insert({
        acao: 'CRIACAO_CAMPEONATO',
        payload: { campeonato_id: novo.id, campeonato_nome: novo.nome },
        batch_id: crypto.randomUUID(),
      } as any)
      onCreated(novo)
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao criar campeonato.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl">

        <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-orange-500" />
            <h2 className="font-black italic uppercase text-white text-sm tracking-tight">
              Novo <span className="text-orange-500">Campeonato</span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-600 hover:text-neutral-300 hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest">
              Nome / Categoria
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSalvar()}
              placeholder="ex: Adulto Masc — Chave A"
              autoFocus
              className="bg-neutral-800 border border-neutral-700 text-neutral-200 text-sm italic rounded-xl px-3 py-2.5 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition-colors placeholder:not-italic placeholder:text-neutral-600"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest">Temporada</label>
            <input
              type="number"
              value={temporada}
              onChange={(e) => setTemporada(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSalvar()}
              className="bg-neutral-800 border border-neutral-700 text-neutral-200 text-sm italic rounded-xl px-3 py-2.5 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition-colors w-32"
            />
          </div>

          {erro && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl px-3 py-2.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />{erro}
            </div>
          )}
        </div>

        <div className="px-5 pb-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSalvar}
            disabled={!nome.trim() || isSaving}
            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white font-bold px-5 py-2 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed text-sm shadow-lg shadow-orange-500/20"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {isSaving ? 'Criando...' : 'Criar Campeonato'}
          </button>
        </div>
      </div>
    </div>
  )
}
