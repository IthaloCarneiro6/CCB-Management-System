## Desenvolvedor

**Ithalo Carneiro**
*   Graduando em Engenharia de Computação pela Universidade Federal do Ceará (UFC).
*   Desenvolvedor Full Stack com foco em IA e Analytics.
*   Organizador e Atleta da Copa Cearense de Basquete.

---
> *Este projeto faz parte da evolução tecnológica do basquete cearense, unindo engenharia e esporte.*
---

# 🏀 SISTEMA DE GESTÃO CCB — Dashboard Logístico

![Next.js](https://img.shields.io/badge/Next.js-000?style=for-the-badge&logo=next.js&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000?style=for-the-badge&logo=vercel&logoColor=white)

**Acesso em produção:** https://gestaoccb.vercel.app

O **Sistema de Gestão CCB** é uma plataforma interna desenvolvida para centralizar e automatizar a logística do **Circuito Cearense de Basquete**. O sistema resolve o desafio de organizar rodadas que envolvem múltiplas categorias, equipes do interior e restrições de disponibilidade.

---

## ⚡ Funcionalidades

- **Matchmaking Inteligente** — cruza partidas pendentes com disponibilidades das equipes para sugerir confrontos ideais por data
- **Planejar Rodada** — monta a grade de jogos com número, horário e local; confirma em lote
- **Rodada Oficial** — visualiza jogos agendados agrupados por data/local; desfaz ou marca como realizado com confirmação inline
- **Pool de Jogos** — todos os confrontos pendentes agrupados por time pivô, com filtro por campeonato e busca
- **Visão Geral** — estatísticas JP/JA/JR por campeonato e equipe
- **Importar** — equipes e disponibilidades via CSV (suporte a Google Forms e formato legado)
- **Logs** — histórico paginado de todas as ações com registro de auditoria

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16 (App Router) |
| Banco de dados | Supabase (PostgreSQL) com RLS |
| Estilização | Tailwind CSS v4 — dark UI `#050505`, accent `orange-500` |
| Linguagem | TypeScript strict |
| Estado global | Zustand 5 (toast system) |
| Ícones | Lucide React |
| CSV | PapaParse 5.5.3 |
| Deploy | Vercel (CI/CD automático via GitHub) |

---

## 🔐 Segurança

- Autenticação por cookie `httpOnly` + `secure` em produção (sessão de 7 dias)
- `proxy.ts` protege todas as rotas — redireciona para `/login` sem sessão válida
- `requireAuth()` em todas as API routes como camada adicional de defesa
- Headers HTTP de segurança: HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- Supabase RLS ativo em todas as tabelas

---

## 🚀 Rodando localmente

```bash
npm install
```

Crie `.env.local` na raiz do projeto:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...

AUTH_USERNAME=Gestor
AUTH_PASSWORD=sua_senha_forte
AUTH_SECRET=cole_aqui_o_hex_gerado
```

Para gerar o `AUTH_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

```bash
npm run dev
# Acesse http://localhost:3000
```

---

## 🌐 Deploy (Vercel)

O deploy é automático a cada push na branch `main`. Para configurar um novo ambiente, defina as seguintes variáveis em **Vercel → Settings → Environment Variables**:

| Variável | Descrição |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave pública do Supabase |
| `AUTH_USERNAME` | Usuário de acesso |
| `AUTH_PASSWORD` | Senha de acesso |
| `AUTH_SECRET` | Segredo do cookie de sessão (hex 64 chars) |
