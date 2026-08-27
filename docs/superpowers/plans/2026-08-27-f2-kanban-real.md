# F2 — Kanban Real: Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reescrever `/crm` sobre a API da F1, com o card de cinco linhas do PRD, sem perder nenhum recurso existente.

**Architecture:** A página vira composição fina; a lógica de dados fica num hook (`useCrm`) e a apresentação em componentes de responsabilidade única. Um adaptador traduz `DealCardDTO` para o tipo `Lead`, mantendo `LeadSheet`, o modal de WhatsApp e a conversão em mentorado intocados.

**Tech Stack:** Next.js 15, React 19, `@hello-pangea/dnd`, Tailwind, variáveis CSS de tema, Vitest.

**Spec:** [2026-08-27-crm-whatsapp-f2-kanban-real-design.md](../specs/2026-08-27-crm-whatsapp-f2-kanban-real-design.md)

## Global Constraints

- **`@hello-pangea/dnd`, não `@dnd-kit`.** Decisão sua, registrada no roadmap.
- **Nenhuma cor de fundo fixa.** Só variáveis de tema (`--theme-surface`, `--theme-border`, `--primary-color`).
- **Badges de canal preservam o matiz da marca** e trocam luminosidade conforme `isLightMode`.
- **Nenhum recurso da tela atual pode ser perdido.**
- **Métricas vêm dos agregados do servidor**, nunca somadas no cliente.
- Textos de interface em português; código e commits em inglês.

---

### Task 1: Adaptador e estado de SLA

**Files:**
- Create: `lib/crm/adapters.ts`, `lib/crm/sla.ts`
- Create: `lib/crm/__tests__/adapters.test.ts`, `lib/crm/__tests__/sla.test.ts`

**Interfaces:**
- Produces: `dealToLead(deal): Lead`, `slaState(slaDueAt, now): 'none' | 'ok' | 'warning' | 'overdue'`, `relativeTime(iso, now): string`

- [ ] **Step 1: Escrever os testes que falham**
- [ ] **Step 2: Rodar e confirmar a falha**
- [ ] **Step 3: Implementar**
- [ ] **Step 4: Rodar e confirmar sucesso**
- [ ] **Step 5: Commit**

---

### Task 2: Hook de dados

**Files:**
- Create: `lib/crm/use-crm.ts`

**Interfaces:**
- Produces: `useCrm()` devolvendo `{ pipeline, stages, deals, isLoading, error, reload, moveDeal, createDeal, updateDeal, deleteDeal }`

- [ ] **Step 1: Carga paralela de pipelines e deals**
- [ ] **Step 2: `moveDeal` otimista com rollback**
- [ ] **Step 3: Tratamento de 401 e 403**
- [ ] **Step 4: `tsc --noEmit`**
- [ ] **Step 5: Commit**

---

### Task 3: Componentes de apresentação

**Files:**
- Create: `components/crm/channel-badge.tsx`, `sla-indicator.tsx`, `deal-card.tsx`, `kanban-column.tsx`, `kanban-board.tsx`

- [ ] **Step 1: `ChannelBadge` com variantes por tema**
- [ ] **Step 2: `SlaIndicator` — filete e rótulo**
- [ ] **Step 3: `DealCard` com as cinco linhas**
- [ ] **Step 4: `KanbanColumn` com cor, contador, somatório e recolher**
- [ ] **Step 5: `KanbanBoard` com `DragDropContext`**
- [ ] **Step 6: `tsc --noEmit`**
- [ ] **Step 7: Commit**

---

### Task 4: Métricas e filtros

**Files:**
- Create: `components/crm/crm-metrics.tsx`, `components/crm/crm-filters.tsx`

- [ ] **Step 1: `CrmMetrics` a partir dos agregados do servidor**
- [ ] **Step 2: `CrmFilters` preservando os quatro filtros atuais**
- [ ] **Step 3: `tsc --noEmit`**
- [ ] **Step 4: Commit**

---

### Task 5: Reescrever a página

**Files:**
- Modify: `app/(dashboard)/crm/page.tsx`

- [ ] **Step 1: Compor os componentes, preservando drawer, modal de WhatsApp e conversão**
- [ ] **Step 2: Estados de carregando, erro, vazio e sem funil**
- [ ] **Step 3: Confirmar que `MOCK_LEADS` não é mais importado**
- [ ] **Step 4: Conferir contagem de linhas abaixo de 300**
- [ ] **Step 5: `tsc --noEmit` e `npm run build`**
- [ ] **Step 6: Commit**

---

### Task 6: Verificação real

- [ ] **Step 1: Criar contato e card pela API**
- [ ] **Step 2: Abrir `/crm`, conferir o card e o somatório**
- [ ] **Step 3: Arrastar entre colunas, recarregar, confirmar persistência**
- [ ] **Step 4: Limpar os dados de verificação**
- [ ] **Step 5: Commit final**
