'use client'

import { useState, useRef } from 'react'
import Papa from 'papaparse'
import {
  Upload, Plus, Database, Loader2, AlertTriangle, FileText, Users2, CalendarDays, X,
} from 'lucide-react'
import { useToastStore } from '@/stores/useToastStore'
import { NovoCampeonatoModal } from './NovoCampeonatoModal'
import type { Campeonato, ImportTipo } from '@/lib/types'

const IMPORT_CONFIG: Record<ImportTipo, {
  label: string
  icon: React.ComponentType<{ className?: string }>
  colunas: string[]
  exemplo: string
}> = {
  equipes: {
    label: 'Equipes',
    icon: Users2,
    colunas: ['nome', 'eh_interior'],
    exemplo: 'nome,eh_interior\nTime Alpha,false\nTime Beta,true\nTime Gamma,false',
  },
  disponibilidades: {
    label: 'Disponibilidades',
    icon: CalendarDays,
    colunas: ['Qual sua equipe ?', 'Quais das seguintes datas...', 'Observações:'],
    exemplo: 'Qual sua equipe ?,Quais das seguintes datas sua equipe tem disponibilidade:,Observações:\nTime Alpha,"16/05/26 - Sábado, 30/05/26 - Sábado",Sem disponibilidade 2º período\n\n— Formato antigo também aceito —\nequipe,data\nTime Alpha,15/02/2026',
  },
}

function detectarCellErrors(
  tipo: ImportTipo,
  rows: Record<string, string>[],
  headers: string[],
): Record<string, true> {
  const erros: Record<string, true> = {}
  const isFormsFormat = headers.includes('Qual sua equipe ?')
  for (const [i, row] of rows.entries()) {
    if (tipo === 'equipes') {
      if (!row.nome?.trim()) erros[`${i}:nome`] = true
    } else if (isFormsFormat) {
      if (!row['Qual sua equipe ?']?.trim()) erros[`${i}:Qual sua equipe ?`] = true
    } else {
      if (!row.equipe?.trim()) erros[`${i}:equipe`] = true
      if (!row.data?.trim()) erros[`${i}:data`] = true
      else if (
        !/^\d{2}\/\d{2}\/\d{4}$/.test(row.data.trim()) &&
        !/^\d{4}-\d{2}-\d{2}$/.test(row.data.trim())
      )
        erros[`${i}:data`] = true
    }
  }
  return erros
}

type Props = {
  campeonatos: Campeonato[]
  onCampeonatoCreated: (c: Campeonato) => void
}

export function ImportarView({ campeonatos, onCampeonatoCreated }: Props) {
  const toast = useToastStore()
  const [importTipo, setImportTipo] = useState<ImportTipo>('equipes')
  const [importCampeonatoId, setImportCampeonatoId] = useState('')
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importRows, setImportRows] = useState<Record<string, string>[]>([])
  const [importHeaders, setImportHeaders] = useState<string[]>([])
  const [importCellErrors, setImportCellErrors] = useState<Record<string, true>>({})
  const [isDragging, setIsDragging] = useState(false)
  const [isImportando, setIsImportando] = useState(false)
  const [showNovoCampModal, setShowNovoCampModal] = useState(false)
  const importFileRef = useRef<HTMLInputElement>(null)

  const cfg = IMPORT_CONFIG[importTipo]
  const totalErrors = Object.keys(importCellErrors).length
  const rowsComErro = new Set(Object.keys(importCellErrors).map((k) => k.split(':')[0]))
  const canConfirm = !!importFile && !!importCampeonatoId && importRows.length > 0 && !isImportando

  function processarArquivo(file: File, tipo: ImportTipo) {
    setImportFile(file)
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const fields = result.meta.fields ?? []
        setImportRows(result.data)
        setImportHeaders(fields)
        setImportCellErrors(detectarCellErrors(tipo, result.data, fields))
      },
    })
  }

  function handleTipoChange(tipo: ImportTipo) {
    setImportTipo(tipo)
    setImportFile(null)
    setImportRows([])
    setImportHeaders([])
    setImportCellErrors({})
  }

  function handleNovoCampCreated(c: Campeonato) {
    onCampeonatoCreated(c)
    setImportCampeonatoId(c.id)
    setShowNovoCampModal(false)
  }

  async function handleImportar() {
    if (!importFile || !importCampeonatoId || importRows.length === 0) return
    setIsImportando(true)
    try {
      let res: Response
      if (importTipo === 'equipes') {
        res = await fetch('/api/equipes/importar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ campeonato_id: importCampeonatoId, rows: importRows }),
        })
      } else {
        const fd = new FormData()
        fd.append('file', importFile)
        fd.append('campeonato_id', importCampeonatoId)
        res = await fetch('/api/disponibilidades/importar', { method: 'POST', body: fd })
      }
      const json = await res.json()
      if (!res.ok) {
        toast.push('error', json.error ?? 'Erro na importação.')
        return
      }
      const importados = json.importados ?? 0
      if (importTipo === 'equipes') {
        const gerados = json.partidas_geradas ?? 0
        toast.push('success',
          `${importados} equipe${importados !== 1 ? 's' : ''} importada${importados !== 1 ? 's' : ''}.` +
          (gerados > 0 ? ` ${gerados} confronto${gerados !== 1 ? 's' : ''} gerado${gerados !== 1 ? 's' : ''}.` : ''),
        )
      } else {
        toast.push('success', `${importados} disponibilidade${importados !== 1 ? 's' : ''} importada${importados !== 1 ? 's' : ''}.`)
      }
      if ((json.erros ?? []).length > 0) {
        toast.push('info', `${json.erros.length} aviso${json.erros.length > 1 ? 's' : ''} na importação.`)
      }
    } catch {
      toast.push('error', 'Erro de conexão.')
    } finally {
      setIsImportando(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="font-black italic uppercase text-white text-base tracking-tight">
        Importar <span className="text-orange-500">Dados</span>
      </h2>

      {/* Step 1 — Tipo */}
      <div className="flex flex-col gap-2">
        <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest">Tipo de dado</label>
        <div className="flex gap-2 flex-wrap">
          {(Object.entries(IMPORT_CONFIG) as [ImportTipo, typeof cfg][]).map(([id, c]) => {
            const Icon = c.icon
            return (
              <button
                key={id}
                onClick={() => handleTipoChange(id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border ${
                  importTipo === id
                    ? 'bg-orange-500/15 border-orange-500/40 text-orange-400'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-500 hover:text-neutral-300 hover:border-neutral-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {c.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Step 2 — Campeonato */}
      <div className="flex flex-col gap-2">
        <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest">
          Campeonato / Categoria
        </label>
        <div className="flex items-center gap-2">
          <select
            value={importCampeonatoId}
            onChange={(e) => setImportCampeonatoId(e.target.value)}
            className="bg-neutral-900 border border-neutral-800 text-neutral-200 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition-colors flex-1 max-w-sm"
          >
            <option value="">Selecione o campeonato...</option>
            {campeonatos.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <button
            onClick={() => setShowNovoCampModal(true)}
            title="Novo campeonato"
            className="w-10 h-10 flex items-center justify-center bg-neutral-900 border border-neutral-800 hover:border-orange-500/50 hover:bg-orange-500/10 rounded-xl text-neutral-500 hover:text-orange-400 transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Step 3 — Drop zone */}
      <div className="flex flex-col gap-3">
        <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest">Arquivo CSV</label>
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragEnter={() => setIsDragging(true)}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setIsDragging(false)
            const f = e.dataTransfer.files[0]
            if (f) processarArquivo(f, importTipo)
          }}
          onClick={() => importFileRef.current?.click()}
          className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-10 flex flex-col items-center gap-4 transition-all select-none ${
            isDragging
              ? 'border-orange-500 bg-orange-500/5'
              : importFile
              ? 'border-orange-500/40 bg-orange-500/5'
              : 'border-neutral-700 hover:border-orange-500/50 hover:bg-neutral-900/40'
          }`}
        >
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
            isDragging || importFile ? 'bg-orange-500/20' : 'bg-neutral-800'
          }`}>
            <Upload className={`w-7 h-7 transition-colors ${isDragging || importFile ? 'text-orange-400' : 'text-neutral-500'}`} />
          </div>
          {importFile ? (
            <div className="text-center">
              <p className="font-bold text-white text-sm">{importFile.name}</p>
              <p className="text-neutral-500 text-xs mt-1">
                {(importFile.size / 1024).toFixed(1)} KB · {importRows.length} linha{importRows.length !== 1 ? 's' : ''}
              </p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-sm font-semibold text-neutral-300">
                Arraste um arquivo CSV ou clique para selecionar
              </p>
              <p className="text-xs text-neutral-600 mt-1">
                Colunas esperadas:{' '}
                <span className="font-mono text-neutral-500">{cfg.colunas.join(', ')}</span>
              </p>
            </div>
          )}
          {importFile && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setImportFile(null)
                setImportRows([])
                setImportHeaders([])
                setImportCellErrors({})
              }}
              className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-lg text-neutral-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <input
          ref={importFileRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) processarArquivo(f, importTipo)
            e.target.value = ''
          }}
        />

        <div className="bg-neutral-900/60 border border-neutral-800/60 rounded-xl px-4 py-3">
          <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest mb-2">
            Formato esperado
          </p>
          <pre className="text-xs text-neutral-400 font-mono leading-relaxed whitespace-pre-wrap">
            {cfg.exemplo}
          </pre>
        </div>
      </div>

      {/* Step 4 — Preview */}
      {importRows.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest">
              Prévia dos dados
            </label>
            {totalErrors > 0 ? (
              <span className="text-[11px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-0.5 rounded-full">
                {rowsComErro.size} linha{rowsComErro.size !== 1 ? 's' : ''} com erro
              </span>
            ) : (
              <span className="text-[11px] font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-2.5 py-0.5 rounded-full">
                Dados válidos ✓
              </span>
            )}
          </div>

          <div className="overflow-auto rounded-xl border border-neutral-800 max-h-72">
            <table className="w-full text-xs border-collapse min-w-max">
              <thead>
                <tr className="bg-neutral-800/60 sticky top-0">
                  <th className="px-3 py-2.5 text-left font-bold text-neutral-500 uppercase tracking-widest border-b border-neutral-700 w-10">#</th>
                  {importHeaders.map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2.5 text-left font-bold text-neutral-400 uppercase tracking-widest border-b border-neutral-700 whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {importRows.slice(0, 200).map((row, i) => (
                  <tr
                    key={i}
                    className={rowsComErro.has(String(i)) ? 'bg-red-500/5' : i % 2 === 0 ? 'bg-neutral-900/60' : 'bg-neutral-950/60'}
                  >
                    <td className="px-3 py-2 text-neutral-600 font-mono border-b border-neutral-800/40">{i + 1}</td>
                    {importHeaders.map((h) => {
                      const hasErr = importCellErrors[`${i}:${h}`]
                      return (
                        <td
                          key={h}
                          className={`px-3 py-2 border-b border-neutral-800/40 font-mono whitespace-nowrap ${
                            hasErr ? 'text-red-400 bg-red-500/15' : 'text-neutral-300'
                          }`}
                        >
                          {row[h] || <span className="text-neutral-700">—</span>}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {importRows.length > 200 && (
            <p className="text-xs text-neutral-600 text-center">
              Exibindo 200 de {importRows.length} linhas.
            </p>
          )}
        </div>
      )}

      {/* Confirm button */}
      <div className="flex justify-end">
        <button
          onClick={handleImportar}
          disabled={!canConfirm}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 active:bg-orange-600 text-white font-bold px-6 py-2.5 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed text-sm shadow-lg shadow-orange-500/20"
        >
          {isImportando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
          {isImportando ? 'Importando...' : 'Confirmar Importação'}
        </button>
      </div>

      {showNovoCampModal && (
        <NovoCampeonatoModal
          onClose={() => setShowNovoCampModal(false)}
          onCreated={handleNovoCampCreated}
        />
      )}
    </div>
  )
}
