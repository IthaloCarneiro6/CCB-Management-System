# Blueprint — Dashboard de Gestão Logística CCB
**Última atualização:** maio 2026

---

## 1. Visão Geral

Sistema interno Next.js para o gestor da CCB organizar rodadas de basquete de fim de semana. O foco é **logística de quadra** (quem joga, quando, onde), não tabela de classificação ou pontuação.

---

## 2. Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16 (App Router) — breaking changes vs versões anteriores |
| Banco | Supabase (PostgreSQL) via `lib/supabase.ts` |
| Estilização | Tailwind CSS v4 — dark UI `#050505`, accent `orange-500` |
| Tipagem | TypeScript strict |
| CSV | PapaParse 5.5.3 (client-side) |
| Estado global | Zustand 5 (usado no `stores/useToastStore.ts`) |

---

## 3. Schema do Banco (Supabase)

```
campeonatos
  id, nome, formato_chaves (boolean)

equipes
  id, campeonato_id, nome, chave (sempre 'Unica'), eh_interior (boolean)

partidas
  id, campeonato_id, equipe_a_id, equipe_b_id
  status ('pendente' | 'aguardando' | 'realizado')
  data_agendada (timestamp — vem como "2025-05-10T00:00:00", nunca só data)
  numero_jogo (INTEGER)
  horario (TEXT)
  local (TEXT)

disponibilidades
  id, equipe_id, data, observacao TEXT NULL
  (UNIQUE constraint em equipe_id, data)

logs_transacoes
  id, partida_id, acao, status_anterior, status_novo, batch_id, created_at, payload (JSONB)
```

### Fluxo de status

```
pendente → aguardando → realizado
               ↑
           pendente (undo: limpa numero_jogo, horario, local, data_agendada → NULL)
```

### formato_chaves

- `true` → round-robin só dentro da mesma chave (A×A, B×B)
- `false` → round-robin geral (todos contra todos)
- Novos campeonatos criados via UI sempre usam `false`

---

## 4. Estrutura de Arquivos

### Raiz do projeto

```
middleware.ts                 — proteção de rotas (redireciona para /login se sem sessão)
lib/
  supabase.ts                 — cliente Supabase
  types.ts                    — todos os tipos compartilhados (Tab, Sugestao, PartidaOficial, etc.)
  date-helpers.ts             — ymd, formatarData, formatarDataCurta, formatarDataHora, nomeDiaSemana, agruparPor
  class-helpers.tsx           — labelClasses, LabelIcon, statusBadgeClasses, acaoClasses, acaoLabel, statusLabel
stores/
  useToastStore.ts            — Zustand: push(type, message), remove(id), auto-remoção 4s
components/
  AppHeader.tsx               — header sticky + nav tabs + botão logout (responsivo)
  StatCard.tsx                — card JP/JA/JR
  SugestaoCard.tsx            — card de sugestão (linha única)
  ui/
    Toast.tsx                 — ToastContainer (renderiza toasts do store)
  planejar/
    PlanejamentoView.tsx      — aba Planejar completa (owns all state)
    BoxMontagem.tsx           — staging de jogos com campos Nº/Horário/Local + swap
    ObservacoesBox.tsx        — caixa de observações das disponibilidades
    RodadaOficial.tsx         — tabela da rodada com edição inline + confirmação antes de undo/realizado
  pool/
    PoolView.tsx              — cascata por time pivô + filtro por campeonato + busca
  visao-geral/
    VisaoGeralView.tsx        — cards JP/JA/JR por campeonato + filtro
  importar/
    ImportarView.tsx          — upload CSV com preview + drag-and-drop
    NovoCampeonatoModal.tsx   — modal de criação de campeonato
  logs/
    LogsView.tsx              — logs paginados (50 por vez, botão carregar mais)
```

### App (Next.js)

```
app/
  page.tsx                    — shell (~58 linhas): monta Header + views + ToastContainer
  layout.tsx                  — root layout com fonte Geist
  globals.css                 — estilos globais + print CSS (dark mode forçado)
  login/
    page.tsx                  — página de login (client component)
  api/
    auth/
      login/route.ts          — POST: valida credenciais, seta cookie httpOnly 7 dias
      logout/route.ts         — POST: apaga cookie
    matchmaking/route.ts      — POST: sugestões por disponibilidade mútua + score
    pool/
      route.ts                — GET: pendentes agrupados; auto-gera round-robin se vazio
      limpar-duplicatas/      — POST: remove pares duplicados
    partidas/
      confirmar/route.ts      — POST: pendente→aguardando com campos logísticos
      atualizar-status/       — POST: aguardando→pendente (undo) ou →realizado
      importar/               — POST: importa confrontos por nome de equipe
    equipes/importar/         — POST: importa equipes + diff round-robin + log
    disponibilidades/importar/— POST FormData: CSV disponibilidades + log
    campeonatos/
      route.ts                — GET: lista campeonatos
      seed/route.ts           — POST: gera round-robin completo (409 se já existir)
```

**CRÍTICO — alias `@/`:** mapeia para a **raiz do projeto** (`./*`), confirmado em `tsconfig.json`: `"paths": { "@/*": ["./*"] }`. `lib/`, `stores/`, `components/` ficam na raiz, não dentro de `app/`.

---

## 5. Tipos Principais (`lib/types.ts`)

```typescript
type Tab = 'planejar' | 'visao-geral' | 'pool' | 'logs' | 'importar'
type ImportTipo = 'equipes' | 'disponibilidades'

type PartidaOficial = {
  id: string; campeonato_id: string; campeonato_nome: string
  data_agendada: string | null    // timestamp — sempre usar ymd() para formatar
  numero_jogo: number | null
  horario: string | null; local: string | null
  equipe_a: { id: string; nome: string }   // id necessário para swap inline
  equipe_b: { id: string; nome: string }
}

type LogTransacao = {
  id: string; partida_id: string | null; acao: string
  status_anterior: string | null; status_novo: string | null
  batch_id: string | null; created_at: string
  payload: Record<string, unknown> | null
  partida: { equipe_a: { nome: string }; equipe_b: { nome: string } } | null
}

type PartidaPool      = { id: string; equipe_a: { id: string; nome: string }; equipe_b: { id: string; nome: string } }
type GrupoPool        = { campeonato_id: string; campeonato_nome: string; total_pendentes: number; partidas: PartidaPool[] }
type BlocoPool        = { pivotId: string; pivotNome: string; count: number; partidas: PartidaPool[] }
type GrupoPoolAgrupado = { campeonato_id: string; campeonato_nome: string; total_pendentes: number; blocos: BlocoPool[] }
type CampeonatoVG   = { id: string; nome: string; equipes: EquipeStats[] }
type EquipeStats    = { id: string; nome: string; jp: number; ja: number; jr: number }
type ObservacaoDisp = { equipe_nome: string; observacao: string }
```

---

## 6. Helpers de Data (CRÍTICO)

O campo `data_agendada` vem do banco com hora (`2025-05-10T00:00:00`). **Nunca** fazer `split('-')` diretamente.

```typescript
// lib/date-helpers.ts
function ymd(iso: string): string       // .slice(0, 10) — normaliza timestamps
function formatarData(iso)              // DD/MM/YYYY
function formatarDataCurta(iso)         // DD/MM
function formatarDataHora(iso)          // DD/MM/AA HH:mm
function nomeDiaSemana(iso)             // "Sábado", "Domingo"... — usa ymd() internamente
function agruparPor<T>(items, getKey)   // agrupamento genérico em Map
```

---

## 7. Autenticação

Credenciais únicas para toda a equipe — armazenadas em `.env.local` (nunca no git).

```
AUTH_USERNAME=gestor
AUTH_PASSWORD=ccb2026          ← alterar antes do deploy
AUTH_SECRET=<hex-64-chars>     ← token de sessão; não exposto ao cliente
```

**Fluxo:**
1. `GET /` sem cookie → middleware redireciona para `/login`
2. `POST /api/auth/login` com credenciais → seta cookie `ccb_session` (httpOnly, secure em prod, 7 dias)
3. Middleware lê cookie e compara com `AUTH_SECRET` — qualquer divergência → redirect `/login`
4. `POST /api/auth/logout` → apaga cookie → próxima requisição vai para `/login`

**Rotas públicas** (middleware não protege): `/login`, `/api/auth/*`

---

## 8. Fluxos Principais

### A. Planejar Rodada

1. Usuário informa datas → `POST /api/matchmaking` → sugestões por categoria
2. Clica `+` → jogo entra no **Box de Montagem** com `numero_jogo` pré-preenchido e `local: 'Juvenal de Carvalho'`
3. Preenche/ajusta Nº / Horário / Local
4. "Confirmar" → `POST /api/partidas/confirmar` → `pendente→aguardando`
5. Jogo aparece na **Rodada Oficial** (tabela full-width)

### B. Rodada Oficial

- Agrupada por `(data_agendada, local)` — chave `"YYYY-MM-DD|Local"`
- Cabeçalho: `"Sábado, 09/05 — Quadra Central"` (barra laranja)
- Colunas: `Nº (#001) | HH:mm | TIME A | vs | TIME B | Categoria | Ações`
- **Undo** e **Marcar realizado** exigem confirmação inline ("Desfazer? Sim/Não" / "Realizado? Sim/Não")
- Undo → `POST /api/partidas/atualizar-status` → limpa numero_jogo/horario/local/data_agendada

### C. Próximo Número de Jogo (LÓGICA CORRIGIDA)

```typescript
// Busca TODOS os numero_jogo de partidas não-pendentes,
// depois encontra o MENOR inteiro positivo não utilizado.
// Isso garante que slots liberados por undo sejam reutilizados.
const usados = new Set(data.map(r => r.numero_jogo))
let proximo = 1
while (usados.has(proximo)) proximo++
```

### D. Pool de Jogos

- Auto-gera round-robin se campeonato tem equipes mas zero partidas
- Frontend agrupa por `equipe_a.id` (blocos), ordena desc por count
- Filtro por campeonato (dropdown) + busca por equipe
- `/api/pool/limpar-duplicatas` remove pares duplicados

### E. Importar Equipes

- CSV: `nome,eh_interior` (coluna `chave` removida — inserida sempre como `'Unica'`)
- Diff de round-robin com `[a,b].sort().join('|')`
- Log `IMPORT_EQUIPES`

### F. Importar Disponibilidades

1. **Google Forms**: detecta por header `Qual sua equipe ?`
2. **Formato legado**: colunas `equipe`, `data`
- Upsert com `ignoreDuplicates: true`
- Log `IMPORT_DISPONIBILIDADES`

### G. Logs

- Grid 5 colunas: Partida | Ação | Status Anterior | Status Atual | Quando
- Paginado: 50 por vez + botão "Carregar mais" (`.range()` no Supabase)

---

## 9. UX — Toast System

```typescript
// stores/useToastStore.ts
const { push } = useToastStore()
push('success', 'Mensagem')   // verde — auto-remove em 4s
push('error', 'Mensagem')     // vermelho
push('info', 'Mensagem')      // azul
```

Substituiu inline `setErro` e `setImportResultado`. `<ToastContainer />` renderizado em `app/page.tsx`.

---

## 10. Padrões Técnicos

| Padrão | Motivo |
|---|---|
| `as any` em `.update()` do Supabase | Tipos gerados desatualizados — remover após `supabase gen types` |
| `flatMap` em `<tbody>` em vez de `React.Fragment` com key | New JSX transform ativo — React não está importado |
| `[a,b].sort().join('|')` para deduplicação de pares | Key canônica independente de ordem dos times |
| `as unknown as Array<{...}>` em joins Supabase | PostgREST retorna relações como objetos |
| `localeCompare('pt-BR')` em ordenações | Lida corretamente com cedilhas e acentos |
| Cada view component owns seu próprio estado | Evita prop drilling — cada aba é independente |

---

## 11. Estado Atual (maio 2026) — SISTEMA COMPLETO

### ✅ Implementado

- Autenticação com login/logout (cookie httpOnly, middleware de proteção)
- Refactoring completo: `page.tsx` 1990 → 58 linhas; 15+ componentes extraídos
- Toast system (Zustand) substitui feedback inline
- Confirmação antes de desfazer E antes de marcar como realizado (inline, contextual)
- Filtro por campeonato no Pool de Jogos
- Paginação nos Logs (50/página + carregar mais)
- Header responsivo (labels somem em mobile, só ícone)
- Numeração de jogos corrigida: reutiliza slots liberados por undo (menor disponível, não MAX+1)
- Todas as funcionalidades anteriores mantidas

### Pendente — Para Deploy

1. **Variáveis de ambiente no host**: `AUTH_USERNAME`, `AUTH_PASSWORD`, `AUTH_SECRET` + Supabase vars
2. **Trocar credenciais padrão**: `ccb2026` → senha forte antes de ir ao ar
3. **Supabase RLS**: anon key está exposta no frontend — ativar Row Level Security nas tabelas
4. **Regenerar tipos Supabase** (remove `as any`): `npx supabase gen types typescript --project-id <id> > lib/database.types.ts`
