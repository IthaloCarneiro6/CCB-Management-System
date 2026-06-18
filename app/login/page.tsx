'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Trophy, Loader2, AlertTriangle, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [erro, setErro] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErro('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      if (!res.ok) {
        const json = await res.json()
        setErro(json.error ?? 'Credenciais inválidas.')
        return
      }

      router.replace('/')
    } catch {
      setErro('Erro de conexão. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center gap-4 mb-10">
          <div className="w-14 h-14 rounded-2xl bg-orange-500 flex items-center justify-center shadow-xl shadow-orange-500/30">
            <Trophy className="w-7 h-7 text-white" strokeWidth={2.5} />
          </div>
          <div className="text-center leading-none">
            <h1 className="font-black italic uppercase tracking-tight text-white text-2xl leading-none">
              CCB <span className="text-orange-500">Gestão</span>
            </h1>
            <p className="text-neutral-600 text-[11px] font-semibold tracking-widest uppercase mt-2">
              Dashboard Logístico
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
          <h2 className="font-black italic uppercase text-white text-base tracking-tight mb-5">
            Acesso <span className="text-orange-500">Restrito</span>
          </h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest">
                Usuário
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
                required
                placeholder="Insira Usuário"
                className="bg-neutral-800 border border-neutral-700 text-neutral-200 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition-colors placeholder:text-neutral-600"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  placeholder="Insira senha"
                  className="w-full bg-neutral-800 border border-neutral-700 text-neutral-200 text-sm rounded-xl px-3 py-2.5 pr-10 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition-colors placeholder:text-neutral-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-neutral-400 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {erro && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl px-3 py-2.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {erro}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !username || !password}
              className="flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white font-bold px-5 py-2.5 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed text-sm shadow-lg shadow-orange-500/20 mt-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </button>
          </form>
        </div>

      </div>
    </div>
  )
}
