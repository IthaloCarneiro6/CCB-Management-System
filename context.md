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
*   **Design System:** Dark UI (`#050505`), destaques em laranja (`orange-500`), tipografia `font-black italic uppercase` para nomes de times, navegação por abas com pill ativa em laranja.

---

## 6. Progresso Atual

### ✅ Backend — APIs Implementadas
*   **`GET /api/campeonatos`** — Lista todos os campeonatos para uso nos selects do frontend.
*   **`POST /api/campeonatos/seed`** — Gera todas as partidas de uma categoria por análise combinatória. Respeita `formato_chaves` para cruzamentos intra-chave ou totais.
*   **`POST /api/matchmaking`** — Motor de sugestão completo: filtra por disponibilidade mútua, valida chaveamento (`equipeA.chave == equipeB.chave`), ordena por score de defasagem (`JP_a + JP_b + peso_interior`), retorna labels `[Equipe do Interior]` e `[Alta Defasagem]`.
*   **`POST /api/partidas/confirmar`** — Move lote de partidas `pendente → aguardando`, grava `data_agendada` e insere registros em `logs_transacoes` com `batch_id` único.
*   **`POST /api/partidas/atualizar-status`** — Move partidas individuais `aguardando → pendente` (cancelar) ou `aguardando → realizado`, com log atômico.
*   **`POST /api/disponibilidades/importar`** — Lê CSV com colunas `equipe,data`, normaliza datas (BR e ISO), resolve equipes por nome dentro do campeonato, faz upsert em `disponibilidades`.

### ✅ Frontend — Abas Implementadas (`app/page.tsx`)

**Aba "Planejar"**
*   Seleção de datas de Sábado e Domingo via inputs nativos.
*   Chamada ao motor de matchmaking e exibição das sugestões agrupadas por categoria, com cards interativos mostrando JP de cada time e labels visuais.
*   **Box de Montagem:** staging local de sugestões selecionadas antes de confirmar.
*   **Rodada Oficial:** lista partidas `aguardando` agrupadas por categoria, com ações de marcar como Realizado (`✓`) ou devolver para Pendente (`↺`).

**Aba "Visão Geral"**
*   3 cards de resumo: *Total de Jogos Pendentes* (laranja), *Jogos Agendados / Aguardando* (amarelo), *Categorias Ativas* (azul).
*   Tabela "Distribuição por Categoria" mostrando contagem de pendentes e aguardando por campeonato, carregada sob demanda ao entrar na aba.

**Aba "Pool de Jogos"**
*   Exibe todas as partidas com status `pendente` agrupadas por campeonato.
*   Barra de busca em tempo real filtra por nome de equipe, com contador de resultados dinâmico.
*   Botão **"Importar CSV"** abre modal com: seletor de campeonato (via `/api/campeonatos`), área de upload de arquivo, hint de formato e exibição de resultado (importados + avisos de linhas ignoradas).

**Aba "Logs"**
*   Tabela das últimas 100 transações de `logs_transacoes` com join em `partidas → equipes`.
*   Colunas: *Partida* (Equipe A **VS** Equipe B), *Ação* (badge colorido: Agendado/Cancelado/Realizado), *Transição* de status (badge `Pendente → Aguardando` com seta), *Quando* (data/hora localizada em pt-BR).

---

## 7. Próximos Passos

### 🔴 Alta Prioridade
*   **Reverter Batch (Ctrl+Z real):** A infraestrutura já existe (`batch_id` em `logs_transacoes`), mas falta um endpoint `POST /api/partidas/reverter-batch` e um botão na UI para desfazer um lote inteiro de confirmações de uma vez.
*   **Gestão de Campeonatos via UI:** Atualmente não há interface para criar campeonatos, adicionar equipes ou disparar o seed. Tudo precisa ser feito manualmente via SQL ou chamadas diretas à API.

### 🟡 Média Prioridade
*   **Importação de Jogos via CSV:** O modal de importação atual só suporta `disponibilidades`. Adicionar suporte a um segundo tipo de CSV para importar o calendário de partidas (criação em massa).
*   **Responsividade Mobile:** A aba de Logs (grid de 4 colunas) e a navegação por abas no header precisam de ajuste para telas menores que 768px.
*   **Feedback de Ação na Rodada Oficial:** Após marcar um jogo como realizado ou cancelar, a aba de Logs e a Visão Geral ficam desatualizadas. Invalidar/recarregar os dados dessas abas automaticamente após mutações na aba Planejar.

### 🟢 Baixa Prioridade / Futuro
*   **Autenticação:** O sistema não tem proteção de rota. Adicionar Supabase Auth ou middleware Next.js simples antes de compartilhar o link publicamente.
*   **Exportação da Rodada:** Botão para exportar a lista de jogos `aguardando` como CSV ou PDF para comunicação externa.
*   **Paginação de Logs:** A tabela de logs busca no máximo 100 registros. Adicionar paginação ou scroll infinito quando o volume crescer.