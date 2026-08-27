# F1 — Fundação de Dados do CRM: Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar a camada de dados do CRM — nove models, pipeline padrão, acesso escopado por organização e rotas REST autenticadas — sem tocar em nenhuma tela.

**Architecture:** Migração SQL idempotente escrita à mão (nunca `db push`), models Prisma em camelCase com `@map` sobre tabelas snake_case, e uma camada `lib/crm/` onde toda consulta carrega `organizationId` da sessão e aplica a regra de visibilidade por papel.

**Tech Stack:** Prisma 6, PostgreSQL (Neon), Next.js 15 Route Handlers, Vitest, TypeScript estrito.

**Spec:** [2026-08-27-crm-whatsapp-f1-fundacao-dados-design.md](../specs/2026-08-27-crm-whatsapp-f1-fundacao-dados-design.md)

## Global Constraints

- **`prisma db push` é proibido.** O schema versionado divergiu do banco real uma vez e quase custou 33 registros. Estrutura muda só por `prisma/migrations/<nome>/migration.sql`.
- **Todo `where` do CRM leva `organizationId: session.organizationId`.** Nunca um id vindo do request.
- **Dinheiro é `Decimal`, nunca `Float`.**
- **Nada de `MOCK_LEADS` no banco.** O CRM nasce vazio.
- **Tabelas snake_case, models camelCase com `@map`.**
- **Enums como `VARCHAR(20)`**, convertidos na borda da aplicação.
- Mensagens de UI em português; código e commits em inglês.

---

### Task 1: Migração das nove tabelas

**Files:**
- Create: `prisma/migrations/f1-crm/migration.sql`
- Modify: `prisma/migrate-f0.ts` → generalizar para `prisma/migrate.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: tabelas `pipelines`, `stages`, `contacts`, `deal_cards`, `tags`, `contact_tags`, `activity_logs`, `conversations`, `messages`

- [ ] **Step 1: Generalizar o runner de migração**

`migrate-f0.ts` tem o caminho do SQL fixo. Vira `migrate.ts` recebendo o nome da migração como argumento, para que F1 e as fases seguintes reusem o mesmo executor estrito (que falha alto, ao contrário de `queryNeon`).

- [ ] **Step 2: Escrever `prisma/migrations/f1-crm/migration.sql`**

Nove `CREATE TABLE IF NOT EXISTS`, todas com `organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE`, mais índices para as consultas do Kanban.

- [ ] **Step 3: Aplicar e conferir que nada se perdeu**

Run: `npm run db:migrate f1-crm`
Run: contagem de `members`, `academy_courses`, `wiki_articles` — devem seguir 33, 5, 4.

- [ ] **Step 4: Commit**

---

### Task 2: Models Prisma

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: `Pipeline`, `Stage`, `Contact`, `DealCard`, `Tag`, `ContactTag`, `ActivityLog`, `Conversation`, `Message` no client

- [ ] **Step 1: Adicionar os nove models com `@map`**
- [ ] **Step 2: Registrar as relações inversas em `Organization`, `User` e `Department`**
- [ ] **Step 3: `npx prisma validate` e `npx prisma generate`**
- [ ] **Step 4: Commit**

---

### Task 3: Seed do pipeline padrão

**Files:**
- Create: `prisma/seed-crm.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `LEAD_STAGES` de `lib/mock-data.ts`
- Produces: funil "Comercial" com seis etapas

- [ ] **Step 1: Escrever o seed, idempotente, sem criar lead algum**
- [ ] **Step 2: Rodar e conferir as seis etapas com as cores de `LEAD_STAGES`**
- [ ] **Step 3: Commit**

---

### Task 4: Regra de visibilidade

**Files:**
- Create: `lib/crm/visibility.ts`
- Create: `lib/crm/__tests__/visibility.test.ts`

**Interfaces:**
- Consumes: `SessionPayload`, `hasAtLeastRole`
- Produces: `dealVisibilityFilter(session)`, `canSeeAllDeals(session)`

- [ ] **Step 1: Escrever o teste que falha** — Master e Administrador veem tudo; Editor, Cliente e Usuário só o que é seu ou não atribuído
- [ ] **Step 2: Rodar e confirmar a falha**
- [ ] **Step 3: Implementar**
- [ ] **Step 4: Rodar e confirmar sucesso**
- [ ] **Step 5: Commit**

---

### Task 5: Normalização de telefone

**Files:**
- Create: `lib/crm/phone.ts`
- Create: `lib/crm/__tests__/phone.test.ts`

**Interfaces:**
- Produces: `normalizePhone(raw): string`, `formatPhoneBr(e164): string`

- [ ] **Step 1: Escrever o teste que falha** — `(11) 98765-4321`, `+55 11 98765-4321` e `5511987654321` convergem para `5511987654321`
- [ ] **Step 2: Rodar e confirmar a falha**
- [ ] **Step 3: Implementar**
- [ ] **Step 4: Rodar e confirmar sucesso**
- [ ] **Step 5: Commit**

---

### Task 6: Camada de acesso a dados

**Files:**
- Create: `lib/crm/pipelines.ts`, `lib/crm/contacts.ts`, `lib/crm/deals.ts`, `lib/crm/tags.ts`, `lib/crm/types.ts`

**Interfaces:**
- Produces: `listPipelines`, `listContacts`, `createContact`, `getContact`, `updateContact`, `deleteContact`, `listDeals`, `createDeal`, `updateDeal`, `deleteDeal`, `listTags`, `createTag`, `deleteTag`, `attachTag`, `detachTag`

- [ ] **Step 1: `types.ts` com os DTOs que as rotas devolvem**
- [ ] **Step 2: `pipelines.ts` com agregação por etapa via `groupBy`**
- [ ] **Step 3: `contacts.ts` com verificação de telefone duplicado**
- [ ] **Step 4: `deals.ts` aplicando `dealVisibilityFilter` e validando `stageId` da mesma organização**
- [ ] **Step 5: `tags.ts`**
- [ ] **Step 6: `tsc --noEmit`**
- [ ] **Step 7: Commit**

---

### Task 7: Rotas REST

**Files:**
- Create: `app/api/crm/pipelines/route.ts`, `app/api/crm/contacts/route.ts`, `app/api/crm/contacts/[id]/route.ts`, `app/api/crm/deals/route.ts`, `app/api/crm/deals/[id]/route.ts`, `app/api/crm/tags/route.ts`

**Interfaces:**
- Consumes: `requireSession`, `withAuth`, camada `lib/crm/`

- [ ] **Step 1: Implementar as seis rotas, todas com `withAuth` + `requireSession`**
- [ ] **Step 2: `tsc --noEmit`**
- [ ] **Step 3: Auditar que nenhuma rota nova ficou aberta**
- [ ] **Step 4: Commit**

---

### Task 8: Verificação real

**Files:** nenhum

- [ ] **Step 1: `npm test`, `tsc --noEmit`, `npm run build`**
- [ ] **Step 2: Subir o servidor e exercitar as rotas com sessão assinada**
  - `/api/crm/pipelines` sem cookie → 401
  - com sessão → seis etapas, totais zerados
  - `POST /api/crm/contacts` → 201; repetir o mesmo telefone → 409
  - `POST /api/crm/deals` → 201; `PATCH` movendo para etapa inexistente → 400
  - `GET /api/crm/deals` → o card criado
- [ ] **Step 3: Conferir que `/crm` continua carregando com `MOCK_LEADS`**
- [ ] **Step 4: Commit final**
