# Blueprint do Sistema: Dashboard de Gestão Logística - CCB

## 1. Visão Geral
Este é um sistema interno (Full-Stack Next.js App Router) para o gestor da CCB organizar as rodadas de basquete do final de semana. O foco do sistema **NÃO** é tabela de classificação nem pontuação de jogos, mas sim a **Gestão de Estado das Partidas (Logística)**.

## 2. Stack Tecnológica
*   **Core:** Next.js (App Router). Pastas divididas logicamente em Frontend (`/components`, `/app/page.tsx`) e Backend (`/app/api/...`).
*   **Estilização:** Tailwind CSS (Modern Sports Dark UI). Fundo preto/chumbo, cantos arredondados, destaques em laranja vibrante (`#FF5500`), remoção total de estética Neo-brutalista (sem bordas grossas ou sombras quadradas).
*   **Estado Frontend:** Zustand (se necessário) e Fetch API.
*   **Banco de Dados:** Supabase (PostgreSQL) acessado via cliente oficial `lib/supabase.ts`.

## 3. Arquitetura de Dados Relacional (Supabase)
O banco de dados segue a estrutura de "Múltiplas Temporadas/Categorias":

1.  **`campeonatos`**: Onde as categorias e temporadas são isoladas (Ex: "Adulto Masc Ouro 2026").
    *   Campos Chave: `id`, `nome`, `formato_chaves` (boolean: true para múltiplas, false para única), `status`.
2.  **`equipes`**: Entidades isoladas por campeonato.
    *   Campos Chave: `id`, `campeonato_id`, `nome`, `chave` (ex: "A", "B", ou "Unica"), `eh_interior` (boolean).
3.  **`partidas`**: A tabela principal do sistema.
    *   Campos Chave: `id`, `campeonato_id`, `equipe_a_id`, `equipe_b_id`, `status` ('pendente', 'aguardando', 'realizado'), `data_agendada`.
4.  **`disponibilidades`**: Tabela associativa com a data em que os times informaram que podem jogar.
    *   Campos Chave: `equipe_id`, `data`.
5.  **`logs_transacoes`**: Sistema atômico de auditoria para função "Ctrl+Z".
    *   Campos Chave: `id`, `partida_id`, `acao`, `status_anterior`, `status_novo`, `batch_id` (para agrupar ações simultâneas).

## 4. Regras de Negócio do Backend (APIs)

### A. Geração Inicial do Campeonato (Seed)
*   **Rotina:** Ao iniciar um campeonato, o sistema usa Análise Combinatória para gerar todos os jogos da fase de grupos com o status inicial de `pendente`.
*   **Regra:** Se `formato_chaves` for `true`, gerar cruzamentos apenas entre times da mesma `chave`. Se for `false`, gerar entre todos da categoria.

### B. Motor de Matchmaking (O Cérebro da Rodada)
Ao requisitar sugestões para um Sábado e Domingo:
1.  **Hard Filter 1 (Disponibilidade):** Só buscar jogos onde `Equipe A` E `Equipe B` estejam na tabela de `disponibilidades` para a data analisada.
2.  **Hard Filter 2 (Chaveamento):** Só permitir confrontos onde `EquipeA.chave == EquipeB.chave` (Fase de Grupos).
3.  **Ordenação Inteligente (Balanceamento de Defasagem):** 
    *   Calcular dinamicamente quantos **Jogos Pendentes (JP)** cada equipe tem.
    *   A prioridade máxima é trazer confrontos entre os times que possuem a maior quantidade de jogos atrasados/pendentes.
    *   Somar um peso adicional se uma das equipes for `eh_interior`.

### C. Confirmação e Desfazer (Ctrl+Z)
*   Ao mover jogos para a rodada, a API altera o status de `pendente` para `aguardando` e gera um log com um `batch_id` único para aquela operação.
*   A ação de "Desfazer" não exclui a partida, apenas restaura o `status` para o que estava gravado no log usando o `batch_id`.

## 5. Diretrizes de Interface de Usuário (UI)
*   A "Inteligência Artificial" da API não deve tomar a decisão final. O sistema é de **Sugestão**.
*   **Transparência de Dados:** Nos cards de sugestão de jogos, exibir visualmente a carga de atraso do time abaixo do nome. Exemplo: **"Equipe A (5 JP) vs Equipe B (3 JP)"**.
*   **Badges/Labels:** Exibir selos visuais como `[Equipe do Interior]` ou `[Alta Defasagem]` no card em vez de "Scores numéricos".