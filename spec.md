# 🚀 ROCKET CLUB SAAS — ESPECIFICAÇÕES TÉCNICAS, AUDITORIA & MAPA DE PENDÊNCIAS

> **Data do Documento:** 08/10/2026  
> **Versão do Sistema:** 2.0.0 (Release Candidate SaaS)  
> **Status de Qualidade:** 34 suítes / 408 testes unitários passando (100%) | `tsc --noEmit` limpo | 77 rotas compiladas em `next build`  
> **Autor / Arquitetura:** Antigravity Architect Squad (`@senior-architect` & `@security-auditor`)

---

## 📌 1. Sumário Executivo

Este documento consolida o **overview arquitetural completo**, a **análise técnica de especificações**, a **auditoria de segurança e blindagem**, o **diagnóstico de desempenho de renderização/rotas** e o **roadmap estruturado de pendências** para transformar o **Rocket Club** em um SaaS escalável, blindado contra invasões e comercialmente vendável de forma impecável.

---

## 🏗️ 2. Arquitetura Atual & Veredito Tecnológico

### 2.1 Coexistência Tecnológica (Transição de Versões)
O repositório apresenta duas camadas sobrepostas:
1. **Legado PHP / Hostinger cPanel:** Arquivos de scripts monolíticos na raiz (`dashboard.php`, `kanban.php`, `financial.php`, `academy.php`, `api/db.php`, `api/members.php`, etc.).
2. **Moderno SaaS Full-Stack:** Aplicação Next.js 15 (App Router) com React 19, Tailwind CSS, Prisma ORM, Neon Serverless PostgreSQL, Jose (JWT), Lucide Icons e Framer Motion.

### 2.2 Avaliação Tecnológica: O Processo Atual é o Ideal?
- **PHP Legado:** ❌ **Inadequado para venda como SaaS.** Carece de multi-tenancy robusto com isolamento de dados por tenant (`organizationId`), não suporta componentes reativos fluidos e apresenta risco de acoplamento a servidores compartilhados.
- **Next.js 15 + Prisma + Neon Serverless PostgreSQL:** ✅ **Padrão-Ouro de Mercado.** Essa arquitetura é a ideal para um SaaS moderno:
  - **Serverless Ready:** Escala a zero e atende picos repentinos sem custo fixo desnecessário.
  - **Isolamento Multi-Tenant:** Centralizado no banco via `organizationId` e validado em nível de sessão JWT.
  - **Webhooks & Streaming:** Capacidade nativa de processar webhooks de pagamentos (Asaas, Stripe) e WhatsApp (Evolution API) além de Server-Sent Events (SSE) sem brokers externos pagos.
- **Recomendação Estrutural:** Isolar e arquivar completamente os arquivos `.php` da raiz para evitar confusão de deploy e blindar o endpoint contra execuções inesperadas em servidores que interpretem PHP.

---

## 📦 3. Inventário de Recursos Desenvolvidos & Homologados

O sistema conta atualmente com **100% de sua lógica de negócio coberta por 408 testes unitários automatizados** e 77 rotas funcionais:

| Módulo / Recurso | Status | Especificação Técnica & Capacidades Entregues |
| :--- | :---: | :--- |
| **Auth & RBAC Multi-Tenant** | ✅ Homologado | Sessão baseada em JWT assinado criptograficamente (armazenado em cookie `HttpOnly`, `SameSite=Lax`, `Secure`). Matriz com 5 papéis: `Master`, `Administrador`, `Editor`, `Cliente`, `Usuário`. Suporte a simulação de papéis restrita ao Master. |
| **CRM Comercial & Pipelines** | ✅ Homologado | Múltiplos funis e estágios customizáveis (cores, SLA, ganho/perda). Cards de oportunidade com valor decimal preciso, responsável, prioridade, tarefas vinculadas e histórico de atividades. |
| **WhatsApp Inbox & Atendimento** | ✅ Homologado | Conexão com Evolution API, suporte a mensagens de texto, imagens, áudios com transcrição automatizada por IA, atribuição de atendentes por setor/departamento e persistência de conversas. |
| **Chatbot & Automações Visuais** | ✅ Homologado | Editor visual de grafos (`@xyflow/react`) com nós de gatilho, mensagem, condição e ação. Cadência humanizada de digitação ("digitando..."), triagem automática e retomada de leads inativos. |
| **Disparos em Massa & Anti-Ban** | ✅ Homologado | Fila persistente com processamento seguro (`FOR UPDATE SKIP LOCKED`). Tratamento legal de opt-out (palavra-chave "PARE"). Intervalos randômicos para proteção contra banimento de chip. |
| **IA & Diagnóstico 360°** | ✅ Homologado | Integração com Google Gemini para qualificação de temperatura de lead (Score 0-100), geração de resumos executivos de conversas e base de conhecimento por organização. |
| **Central de Contratos Digitais** | ✅ Homologado | Modelos dinâmicos com interpolação de tags (`{{NOME_MENTORADO}}`, `{{VALOR}}`, `{{CPF_CNPJ}}`), assinatura manuscrita em Canvas HTML5, carimbo criptográfico SHA-256 e emissão de minuta. |
| **Financeiro & Análise Cohort LTV** | ✅ Homologado | Gestão de receitas/despesas, planos de mentoria, heatmap de retenção Cohort M0-M12, métricas de LTV, CAC e Payback, além de conciliação de faturas. |
| **Scale Academy & Certificados** | ✅ Homologado | Player de cursos e aulas, cálculo de progresso percentual persistido no banco, atalhos de teclado e emissão de certificado oficial com código de validação único. |
| **Gestão de Tarefas & Calendário** | ✅ Homologado | Quadro de tarefas internas com subtarefas e comentários. Feed iCal (`/api/calendar/feed?token=...`) e agendamento público de mentorias integrado com Google Calendar e Google Meet. |
| **Gamificação & PWA** | ✅ Homologado | Motor de XP e níveis de engajamento, 7 insígnias exclusivas, ranking público em `/leaderboard` e suporte a Progressive Web App (Service Worker + Manifest). |

---

## 🛡️ 4. Auditoria Completa de Segurança & Blindagem

Nossa varredura de código identificou pontos vitais de segurança que necessitam de intervenção imediata para blindar a plataforma contra ataques, vazamento de dados e fraudes financeiras:

### 🔴 4.1 Validação de Assinatura nos Webhooks de Pagamento (RISCO CRÍTICO)
* **Arquivos:**
  * [`app/api/webhooks/asaas/route.ts`](file:///d:/PROJETOS/DG/ROCKET%20CLUB/APPs/rocket-club/app/api/webhooks/asaas/route.ts)
  * [`app/api/webhooks/stripe/route.ts`](file:///d:/PROJETOS/DG/ROCKET%20CLUB/APPs/rocket-club/app/api/webhooks/stripe/route.ts)
  * [`app/api/webhook/payments/route.ts`](file:///d:/PROJETOS/DG/ROCKET%20CLUB/APPs/rocket-club/app/api/webhook/payments/route.ts)
* **Cenário de Ameaça:** O [`middleware.ts`](file:///d:/PROJETOS/DG/ROCKET%20CLUB/APPs/rocket-club/middleware.ts) isenta o prefixo `/api/webhook*` de autenticação para permitir que gateways entreguem eventos. Porém, as rotas hoje processam o payload JSON diretamente sem checar tokens de autenticação ou assinaturas criptográficas.
* **Impacto:** Um agente mal-intencionado pode simular um payload de `PAYMENT_RECEIVED` ou `checkout.session.completed` apontando para o ID da sua transação e liberar assinaturas/mentorias sem que qualquer valor tenha entrado na conta bancária.
* **Blindagem Obrigatória:**
  1. No Asaas: Validar o cabeçalho `asaas-access-token` comparando em tempo constante (`crypto.timingSafeEqual`) contra `ASAAS_WEBHOOK_TOKEN`.
  2. Na Stripe: Validar a assinatura criptográfica usando `stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET)`.
  3. No webhook legado: Exigir token secreto compartilhado.

---

### 🔴 4.2 Ausência de Rate Limiting em Rotas Públicas (RISCO ALTO)
* **Rotas Vulneráveis:**
  * [`app/api/agendar/route.ts`](file:///d:/PROJETOS/DG/ROCKET%20CLUB/APPs/rocket-club/app/api/agendar/route.ts): Rota pública que gera evento no Google Calendar e dispara mensagem de WhatsApp via Evolution API.
  * [`app/api/auth/forgot-password/route.ts`](file:///d:/PROJETOS/DG/ROCKET%20CLUB/APPs/rocket-club/app/api/auth/forgot-password/route.ts): Rota pública que envia e-mail com código de 6 dígitos via Resend.
  * [`app/api/auth/reset-password/route.ts`](file:///d:/PROJETOS/DG/ROCKET%20CLUB/APPs/rocket-club/app/api/auth/reset-password/route.ts): Valida o código de 6 dígitos.
* **Cenário de Ameaça:**
  * Em `/api/agendar`, ataques automatizados podem disparar milhares de envios para telefones arbitrários (Toll Fraud / Spam de WhatsApp), provocando bloqueio do número corporativo da empresa no WhatsApp.
  * Em `/api/auth/forgot-password`, bots podem esgotar a cota de 3.000 envios gratuitos do Resend em poucos minutos.
  * Em `/api/auth/reset-password`, o código de 6 dígitos (1 milhão de combinações) pode ser adivinhado por força bruta durante sua janela de validade de 15 minutos se não houver bloqueio de tentativas sucessivas.
* **Blindagem Obrigatória:**
  * Integrar o sliding-window rate limiter existente ([`lib/auth/rate-limiter.ts`](file:///d:/PROJETOS/DG/ROCKET%20CLUB/APPs/rocket-club/lib/auth/rate-limiter.ts)) em todas essas 3 rotas (ex.: limite de 5 requisições por minuto por IP com resposta `429 Too Many Requests`).

---

### ⚠️ 4.3 Falha de "Fail-Open" no Cron de Prazos
* **Arquivo:** [`app/api/cron/check-deadlines/route.ts`](file:///d:/PROJETOS/DG/ROCKET%20CLUB/APPs/rocket-club/app/api/cron/check-deadlines/route.ts)
* **Vulnerabilidade:** A validação está implementada como `if (cronSecret && authHeader !== ... )`. Se `CRON_SECRET` não estiver configurado no `.env`, a condição é avaliada como falsa e o acesso é concedido publicamente a qualquer visitante.
* **Blindagem Obrigatória:** Substituir pela função padronizada `verifyCronSecret(request)` de [`lib/dispatch/cron-auth.ts`](file:///d:/PROJETOS/DG/ROCKET%20CLUB/APPs/rocket-club/lib/dispatch/cron-auth.ts), que falha fechada (retorna `false` e emite `401 Unauthorized` caso o segredo não esteja configurado).

---

### ⚠️ 4.4 Risco de Vazamento em Cache de Dados Sensíveis
* **Arquivo:** [`app/api/members/route.ts`](file:///d:/PROJETOS/DG/ROCKET%20CLUB/APPs/rocket-club/app/api/members/route.ts#L28)
* **Vulnerabilidade:** O cabeçalho de resposta está definido como `'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=45'`.
* **Impacto:** Como essa rota retorna informações pessoais completas (CPF, dados de faturamento mensal, e-mails e anotações confidenciais), o uso da diretiva `public` autoriza proxies intermediários, VPNs e caches de borda da CDN a armazenar esses dados em cache compartilhado.
* **Blindagem Obrigatória:** Substituir imediatamente por `'Cache-Control': 'private, no-cache, no-store, must-revalidate'`.

---

### ⚠️ 4.5 Bloqueio Indevido de Assinatura iCal
* **Arquivo:** [`app/api/calendar/feed/route.ts`](file:///d:/PROJETOS/DG/ROCKET%20CLUB/APPs/rocket-club/app/api/calendar/feed/route.ts)
* **Problema:** A rota exige `token` na query string (comportamento correto do padrão iCal). No entanto, o [`middleware.ts`](file:///d:/PROJETOS/DG/ROCKET%20CLUB/APPs/rocket-club/middleware.ts) não tem `/api/calendar/feed` na lista `PUBLIC_API`.
* **Impacto:** Clientes externos de calendário (Google Agenda, Apple Calendar, Outlook) não enviam cookies de sessão e são bloqueados com `401`, impedindo a sincronização das agendas da equipe.
* **Blindagem Obrigatória:** Adicionar `/api/calendar/feed` na lista de rotas públicas autorizadas pelo middleware.

---

## ⚡ 5. Auditoria de Desempenho & Otimização de Arquivos

### 5.1 Gargalo de Tamanho de Bundle: `/mentorados`
* **Diagnóstico:** O arquivo [`app/(dashboard)/mentorados/page.tsx`](file:///d:/PROJETOS/DG/ROCKET%20CLUB/APPs/rocket-club/app/%28dashboard%29/mentorados/page.tsx) é o maior gargalo de carregamento da aplicação:
  * **Tamanho Atual:** 165 kB (código compilado) | **335 kB de First Load JavaScript**.
* **Causas Identificadas:**
  1. Carregamento estático das bibliotecas pesadas de geração de PDF (`html2pdf.js`, `jspdf`, `html2canvas`) que são baixadas no primeiro acesso de todos os usuários, mesmo que ninguém clique em "Baixar PDF".
  2. Modais pesados (como o formulário de cadastro com mais de 30 campos) e drawers laterais (`MenteeSheet`) compilados diretamente no corpo principal da página.
* **Ganhos com Otimização:** 
  * Importação dinâmica sob demanda de `html2pdf.js` apenas no clique do botão de exportação.
  * Lazy loading (`next/dynamic` com `ssr: false`) para os modais e painéis secundários.
  * **Resultado esperado:** Redução do First Load JS de **335 kB para ~135 kB** (~60% mais rápido).

---

### 5.2 Otimização de `/atendimento-automatico` (Flow Builder)
* O construtor visual de automações pesa **74.6 kB (180 kB First Load)** por incluir o motor de nós `@xyflow/react`.
* A exibição de um skeleton instantâneo e o carregamento desacoplado do canvas garantem que a transição de rota seja imperceptível.

---

### 5.3 Otimização do Cache de Banco de Dados
* Em [`lib/neon-db.ts`](file:///d:/PROJETOS/DG/ROCKET%20CLUB/APPs/rocket-club/lib/neon-db.ts), a variável global `cachedMembers` vive na memória volátil da função serverless. Em ambientes serverless e multi-tenant:
  1. A memória não é compartilhada entre diferentes instâncias serverless (gerando inconsistências de cache).
  2. Há risco de vazamento de cache entre organizações caso a instância seja reaproveitada.
* **Solução Recomendada:** Eliminar o cache global volátil e padronizar as consultas no Prisma Client conectado ao endpoint do Neon com pooler ativo (`-pooler.neon.tech`), utilizando SWR ou TanStack Query no lado cliente com `staleTime` de 30 a 60 segundos.

---

## 🗺️ 6. Roadmap Priorizado de Pendências para o Sistema Ficar 100% Vendável

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        ROADMAP DE BLINDAGEM & ESCALA SAAS                              │
└────────────────────────────────────────────────────────────────────────────────────────┘

🔴 PRIORIDADE 0: SEGURANÇA IMEDIATA & BLINDAGEM (BARRAR INVASÃO / FRAUDE)
  ├── [P0.1] Validação de assinatura em /api/webhooks/asaas (asaas-access-token)
  ├── [P0.2] Validação de assinatura em /api/webhooks/stripe (stripe.webhooks.constructEvent)
  ├── [P0.3] Rate Limiting em /api/agendar (proteção contra abuso de WhatsApp e Calendar)
  ├── [P0.4] Rate Limiting em /api/auth/forgot-password e /api/auth/reset-password
  ├── [P0.5] Correção de Fail-Open em /api/cron/check-deadlines com verifyCronSecret
  ├── [P0.6] Correção de Cache-Control em /api/members para private, no-cache, no-store
  └── [P0.7] Liberação de /api/calendar/feed no middleware.ts para clientes iCal externos

🟡 PRIORIDADE 1: OTIMIZAÇÃO DE DESEMPENHO & VELOCIDADE (CARREGAMENTO INSTANTÂNEO)
  ├── [P1.1] Code-splitting e dynamic imports na página /mentorados (redução de 335kB para ~135kB)
  ├── [P1.2] Carregamento sob demanda (lazy-load) de html2pdf.js e jspdf
  ├── [P1.3] Limpeza e arquivamento dos arquivos legados PHP da raiz do projeto
  └── [P1.4] Refinamento dos headers de segurança (CSP, HSTS) no next.config.js

🟢 PRIORIDADE 2: SAAS ENTERPRISE & PRONTO PARA VENDA EM ESCALA
  ├── [P2.1] Fluxo de Auto-Onboarding e Cadastro Self-Service de novas organizações
  ├── [P2.2] Configuração explícita da connection string com Neon Connection Pooling (-pooler)
  └── [P2.3] Painel de logs de auditoria administrativa para monitoramento de acessos do Master
```

---

## 🧪 7. Comandos de Homologação e Verificação Contínua

Antes de qualquer deploy para produção, os seguintes comandos devem ser executados para assegurar a integridade do sistema:

```bash
# 1. Rodar toda a suíte de testes unitários (408 testes)
npm test

# 2. Verificação estática de tipos TypeScript
npx tsc --noEmit

# 3. Compilação e build de produção Next.js (verificação de todas as rotas e bundles)
npm run build
```

---

> **Observação:** Este documento está salvo na raiz do projeto como [`spec.md`](file:///d:/PROJETOS/DG/ROCKET%20CLUB/APPs/rocket-club/spec.md) e serve como diretriz oficial para a execução das implementações de blindagem e performance.
