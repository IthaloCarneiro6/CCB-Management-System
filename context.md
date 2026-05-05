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

---

## 3. Schema do Banco (Supabase)

```
campeonatos
  id, nome, formato_chaves (boolean)

equipes
  id, campeonato_id, nome, chave ('A'/'B'/'Unica'), eh_interior (boolean)

partidas
  id, campeonato_id, equipe_a_id, equipe_b_id
  status ('pendente' | 'aguardando' | 'realizado')
  data_agendada (timestamp — vem como "2025-05-10T00:00:00", não só data)
  numero_jogo (INTEGER)   ← ⚠️ MIGRATION PENDENTE
  horario (TEXT)          ← ⚠️ MIGRATION PENDENTE
  local (TEXT)            ← ⚠️ MIGRATION PENDENTE

disponibilidades
  id, equipe (TEXT), campeonato_id, data

logs_transacoes
  id, partida_id, acao, status_anterior, status_novo, batch_id, created_at
```

### ⚠️ Migration obrigatória (ainda não aplicada no Supabase)

Rodar no SQL Editor do Supabase antes de usar a Rodada Oficial completa:

```sql
ALTER TABLE partidas ADD COLUMN numero_jogo INTEGER;
ALTER TABLE partidas ADD COLUMN horario TEXT;
ALTER TABLE partidas ADD COLUMN local TEXT;
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

---

## 4. Estrutura de Arquivos

### Frontend

```
app/page.tsx          (~1550 linhas) — componente cliente monolítico, toda a UI
```

**Abas (type Tab):**
```
planejar    → Matchmaking + Box de Montagem + Rodada Oficial
visao-geral → Cards JP/JA/JR por campeonato
pool        → Confrontos pendentes agrupados por time
importar    → Upload CSV (equipes, disponibilidades)
logs        → Histórico de transações
```

### Backend (APIs)

```
app/api/
  matchmaking/route.ts          POST — sugestões por disponibilidade mútua + score
  pool/route.ts                 GET  — pendentes agrupados por time; auto-gera round-robin
  partidas/
    confirmar/route.ts          POST — pendente→aguardando, salva numero_jogo/horario/local
    atualizar-status/route.ts   POST — aguardando→pendente (undo) ou →realizado
    importar/route.ts           POST — importa confrontos por nome de equipe
  equipes/importar/route.ts     POST — importa equipes + diff de round-robin
  disponibilidades/importar/    POST FormData — importa disponibilidades CSV
  campeonatos/seed/route.ts     POST — gera round-robin completo (409 se já existir)
```

---

## 5. Tipos Principais (`app/page.tsx`)

```typescript
type PartidaOficial = {
  id: string
  campeonato_id: string
  campeonato_nome: string
  data_agendada: string | null    // timestamp — sempre usar ymd() para formatar
  numero_jogo: number | null
  horario: string | null          // formato HH:mm
  local: string | null
  equipe_a: { nome: string }
  equipe_b: { nome: string }
}

type GrupoPool    = { campeonato_id, campeonato_nome, total_pendentes, times: TimePool[] }
type TimePool     = { id, nome, chave, adversarios: Adversario[] }
type Adversario   = { partida_id, nome }
type CampeonatoVG = { id, nome, equipes: EquipeStats[] }
type EquipeStats  = { id, nome, jp, ja, jr }
```

---

## 6. Helpers de Data (CRÍTICO)

O campo `data_agendada` vem do banco com hora (`2025-05-10T00:00:00`). **Nunca** fazer `split('-')` diretamente.

```typescript
function ymd(iso: string): string       // .slice(0, 10) — normaliza timestamps
function formatarData(iso)              // DD/MM/YYYY
function formatarDataCurta(iso)         // DD/MM
function nomeDiaSemana(iso)             // "Sábado", "Domingo"... — usa ymd() internamente
```

Todos passam por `ymd()` antes de qualquer operação.

---

## 7. Fluxos Principais

### A. Planejar Rodada

1. Usuário informa datas → `POST /api/matchmaking` → sugestões por categoria
2. Clica "Adicionar" → jogo entra no **Box de Montagem** com `numero_jogo` pré-preenchido
3. Preenche Nº / Horário / Local por jogo no próprio Box
4. "Confirmar" → `POST /api/partidas/confirmar` → `pendente→aguardando` com campos logísticos
5. Jogo aparece na **Rodada Oficial** (tabela full-width abaixo do grid)

### B. Rodada Oficial

- Agrupada por `(data_agendada, local)` — chave `"YYYY-MM-DD|Local"`
- Cabeçalho: `"Sábado, 09/05 — Quadra Central"` (barra laranja + texto branco)
- Colunas: `Nº (#001) | HH:mm | TIME A | vs | TIME B | Categoria | Ações`
- Zebra striping dentro de cada grupo
- Undo → `POST /api/partidas/atualizar-status` → limpa numero_jogo/horario/local/data_agendada

### C. Próximo Número de Jogo

```typescript
// Busca MAX(numero_jogo) só em partidas NÃO pendentes
supabase.from('partidas')
  .select('numero_jogo')
  .not('numero_jogo', 'is', null)
  .neq('status', 'pendente')          // ← exclui jogos desfeitos
  .order('numero_jogo', { ascending: false })
  .limit(1)
// resultado: MAX + 1  (se todos desfeitos → MAX=0 → sugere #1)
```

### D. Pool de Jogos (`GET /api/pool`)

- Se campeonato tem equipes mas zero partidas → auto-gera round-robin
- Retorna times ordenados por `localeCompare('pt-BR')` com adversários pendentes

### E. Importar Equipes (`POST /api/equipes/importar`)

- Insere equipes novas (ignora duplicatas por nome)
- Executa diff de round-robin: só insere pares que não existem
- Retorna `{ importados, partidas_geradas, erros }`

---

## 8. Padrões Técnicos

| Padrão | Motivo |
|---|---|
| `as any` em `.update()` do Supabase | Colunas da migration pendente não estão nos tipos gerados |
| `flatMap` em `<tbody>` em vez de `React.Fragment` com key | New JSX transform ativo — React não está importado |
| `[a,b].sort().join('|')` para deduplicação de pares | Garante key canônica independente de ordem dos times |
| `localeCompare('pt-BR')` em ordenações | Lida corretamente com cedilhas e acentos |

---

## 9. Estado Atual

### ✅ Implementado e funcionando

- Tabs: Planejar, Visão Geral, Pool de Jogos, Importar, Logs
- Motor de matchmaking por disponibilidade + score de defasagem
- Box de Montagem com campos Nº / Horário / Local por jogo
- Confirmação de rodada com campos logísticos
- Rodada Oficial como tabela full-width agrupada por data+local
- Undo limpa numero_jogo/horario/local/data_agendada no banco
- Próximo número correto (ignora pendentes)
- Formatação correta de datas com timestamps via `ymd()`
- Pool com auto-geração de round-robin
- Importação de equipes + round-robin diff
- Importação de disponibilidades
- Visão Geral com JP/JA/JR por time e campeonato
- Logs de transações com join em equipes

### ⚠️ Pendente / Próximos Passos

**Bloqueante:**
1. Rodar a migration das 3 colunas no Supabase (ver seção 3)
2. Após migration, regenerar tipos:
   ```bash
   npx supabase gen types typescript --project-id <SEU_PROJECT_ID> > lib/database.types.ts
   ```
   Depois remover os `as any` em `confirmar/route.ts` e `atualizar-status/route.ts`

**Melhorias futuras (não solicitadas):**
- Editar numero_jogo/horario/local de jogos já agendados inline
- Filtro por data/categoria na Rodada Oficial
- Exportar escala como PDF/CSV
- Reverter lote inteiro por batch_id (Ctrl+Z em bloco)
- Autenticação (sistema hoje é público)
- Responsividade mobile (header de abas e tabela de logs)
