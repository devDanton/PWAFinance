# 💰 PWAFinance

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Auth-3ecf8e?style=flat-square&logo=supabase)](https://supabase.com/)
[![PWA](https://img.shields.io/badge/PWA-Ready-orange?style=flat-square&logo=pwa)](https://web.dev/progressive-web-apps/)

**PWAFinance** é uma aplicação web progressiva (PWA) moderna, veloz e responsiva voltada para gestão financeira pessoal e familiar avançada. Desenvolvida com Next.js 16 (App Router + Turbopack), Supabase e Tailwind CSS, permite gerenciar múltiplos workspaces, cartões de crédito, compras parceladas, assinaturas recorrentes com automação nativa e **rateio inteligente de compras com relatório de acerto de contas para terceiros**.

---

## ✨ Funcionalidades Principais

### 📊 Painel & Gestão Financeira
- **Multi-Workspaces:** Organize despesas separadamente (ex.: Pessoal, Família, Negócios) com isolamento total de dados.
- **Receitas & Despesas:** Lançamentos com categorias personalizadas, datas de competência e vencimento.
- **Cartões de Crédito & Parcelamento:** Controle de múltiplos cartões, limites, dias de fechamento e vencimento de fatura, com geração automática de parcelas futuras.
- **Assinaturas Recorrentes (`subscriptions`):** Lançamento automatizado de serviços mensais/anuais via `pg_cron` nativo do PostgreSQL.
- **Edição e Exclusão em Lote:** Ações em massa para agilizar a manutenção de dezenas de transações.

---

### 🤝 Rateio de Despesas & Acerto de Contas (`/reimbursements`)
Ideal para quem concentra compras da família ou de amigos em seus cartões de crédito e precisa cobrar as partes devidas no final do mês:
- **Rateio Flexível:**
  - Divida qualquer compra nova ou já lançada entre quantos participantes desejar.
  - Botão **"Dividir Igualmente"** com compensação automática de centavos na última pessoa.
  - Validador em tempo real do valor total rateado.
- **Painel de Acerto de Contas Mensal:**
  - Navegação entre meses por data da compra ou vencimento da fatura.
  - Exclusão dinâmica dos titulares da casa (ex.: `Danton` e `Lauren`), exibindo apenas quem realmente deve reembolsar.
  - Visão por pessoa com total pendente, total já reembolsado e lista de compras com identificação de cartão.
- **Cobrança Rápida via WhatsApp:**
  - Gera com 1 clique um resumo elegante e formatado com emojis pronto para colar no WhatsApp do terceiro:
    ```text
    Olá *Carlos*! Segue o resumo dos seus gastos no cartão em *setembro de 2026*:

    💳 *Nubank* (Total: *R$ 30,00*):
    • 08/09 - Uber Viagem: *R$ 30,00* _(Rateio de R$ 60,00)_

    💰 *Total a pagar: R$ 30,00*
    ```
- **Controle de Liquidação:** Marque cotas individuais como pagas ou quite o mês inteiro de uma pessoa com um único clique.
- **Exportação:** Download do extrato do terceiro em arquivo CSV.

---

### 📥 Importação Inteligente (CSV & IA / Gemini)
- **Modelo Oficial:** Download direto na interface de um arquivo CSV modelo com codificação UTF-8 BOM (compatível nativamente com Microsoft Excel).
- **Importação via Arquivo ou Texto Copiado:** Permite subir um arquivo `.csv` ou simplesmente colar o texto retornado por modelos de IA (Gemini / ChatGPT), com remoção automática de blocos markdown.
- **Detecção Automática de Cartão e Rateio:** Identifica cartões pelo nome e processa formatos de rateio como `Danton: 100; João: 100` ou `João, Maria`.

---

### 🛡️ Automação & Keep-Alive 24/7
- **GitHub Actions Keep-Alive:** Workflow diário (`.github/workflows/keep-alive.yml`) que envia pings autenticados na API do Supabase, impedindo que o banco de dados seja pausado no tier gratuito (*Free Tier*).
- **Assinaturas via `pg_cron`:** Job diário à meia-noite rodando internamente no banco para processar assinaturas vencidas.

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| **Framework Web** | [Next.js 16](https://nextjs.org/) (App Router, Server Actions, Turbopack) |
| **Biblioteca de UI** | [React 19](https://react.dev/) |
| **Linguagem** | [TypeScript](https://www.typescriptlang.org/) |
| **Estilização** | [Tailwind CSS v4](https://tailwindcss.com/) & [Radix UI](https://www.radix-ui.com/) |
| **Internacionalização** | [next-intl](https://next-intl-docs.vercel.app/) (Português & Inglês) |
| **Banco de Dados & Auth** | [Supabase](https://supabase.com/) (PostgreSQL, Row Level Security, Auth) |
| **PWA** | [next-pwa](https://github.com/shadowwalker/next-pwa) com suporte offline e instalação móvel |

---

## 🚀 Começando

### Pré-requisitos
- [Node.js](https://nodejs.org/) versão 20+ ou superior
- Gerenciador de pacotes `npm`, `pnpm` ou `yarn`
- Projeto criado no [Supabase](https://supabase.com/)

### 1. Clonar o repositório
```bash
git clone https://github.com/devDanton/PWAFinance.git
cd PWAFinance
```

### 2. Instalar as dependências
```bash
npm install
```

### 3. Configurar variáveis de ambiente
Crie um arquivo `.env.local` na raiz do projeto baseado nas suas credenciais do Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-publica
```

### 4. Configurar o Banco de Dados (Supabase SQL)
No painel do seu Supabase, abra o **SQL Editor** e execute os scripts na seguinte ordem:
1. `schema.sql`: Estrutura principal (tabelas, triggers, RLS e funções de workspace).
2. `new-features.sql`: Assinaturas, categorias e agendamento `pg_cron`.
3. `supabase/add-payers.sql`: Sistema de pagadores/terceiros.
4. `supabase/add-transaction-splits.sql`: Tabela de rateio de despesas (`transaction_splits`).
5. `supabase/add-indexes.sql`: Índices para máxima performance de leitura.

### 5. Executar em modo de desenvolvimento
```bash
npm run dev
```
Acesse [http://localhost:3000](http://localhost:3000) no navegador.

---

## 📦 Scripts Disponíveis

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia o servidor local de desenvolvimento (Turbopack) |
| `npm run build` | Executa a verificação de tipos e compila para produção |
| `npm run start` | Inicia o servidor de produção localmente |
| `npm run lint` | Executa o linter ESLint |

---

## 📱 Instalação como PWA
- **No iOS (Safari):** Clique no botão de compartilhar e selecione **"Adicionar à Tela de Início"**.
- **No Android (Chrome):** Clique no menu de três pontos ou no aviso da barra inferior e selecione **"Instalar aplicativo"**.

---

## 📄 Licença
Distribuído sob licença proprietária para uso pessoal.
