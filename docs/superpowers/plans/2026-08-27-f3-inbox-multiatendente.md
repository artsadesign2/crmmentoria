# F3 — Inbox multiatendente · Plano de implementação

**Spec:** [2026-08-27-crm-whatsapp-f3-inbox-multiatendente-design.md](../specs/2026-08-27-crm-whatsapp-f3-inbox-multiatendente-design.md)

**Objetivo:** fazer o WhatsApp chegar e sair pelo sistema, com três atendentes
compartilhando uma caixa sem pisar um no outro.

**Arquitetura:** webhook autenticado grava `Conversation`/`Message`; distribuição
por menor carga entre quem está online; polling com cursor para tempo real;
resposta e nota interna em rotas separadas, sendo que a de nota não conhece o
cliente da Evolution.

**Stack:** Next.js 15 · Prisma 6 · Neon Postgres · Vitest · Tailwind

## Restrições globais

- Nada de `prisma db push`. Migração SQL idempotente, escrita à mão, aplicada
  por `npm run db:migrate f3-inbox`.
- Nenhum `DROP TABLE`, nenhuma coluna removida. Os dados existentes (33
  mentorados, 5 cursos, 4 setores, 1 usuário) continuam intactos.
- Todo `where` do Prisma carrega `session.organizationId`.
- Registro invisível ou de outro tenant responde **404**, nunca 403.
- Cores por variável CSS de tema. Nenhum hex fixo de interface.
- `@hello-pangea/dnd` continua sendo a biblioteca de arrastar.
- Dinheiro em `Decimal`, nunca `Float`.
- Commit ao final de cada tarefa. `tsc --noEmit` limpo antes de cada commit.

---

## Tarefa 1 — Migração e schema

**Arquivos:** criar `prisma/migrations/f3-inbox/migration.sql`; modificar
`prisma/schema.prisma`.

**Produz:** `departments.is_default_inbox`; unique `(organization_id, name)` em
departments; três índices em `conversations`.

- [ ] Escrever `migration.sql` com os 8 statements da §13 da spec, todos
      idempotentes (`IF NOT EXISTS`, `DO $$ ... EXCEPTION WHEN duplicate_object`).
- [ ] Conferir antes: `SELECT count(*)` em members, courses, departments, users.
- [ ] `npm run db:migrate f3-inbox`
- [ ] Conferir depois: mesmas contagens; `\d departments` mostra a coluna nova;
      exatamente um setor com `is_default_inbox = true`.
- [ ] Atualizar `schema.prisma`: `isDefaultInbox` em `Department`,
      `@@unique([organizationId, name])`, novos `@@index` em `Conversation`.
- [ ] `npx prisma generate` e `npx tsc --noEmit`.
- [ ] Commit: `feat(inbox): add default sector column and inbox indexes`

---

## Tarefa 2 — Parser do payload da Evolution

**Arquivos:** criar `lib/crm/inbound.ts`, `lib/crm/inbound.test.ts`.

**Consome:** `phoneFromWhatsAppJid` de `lib/crm/phone.ts`.

**Produz:**

```ts
export type InboundKind = 'MESSAGE' | 'CONNECTION' | 'QRCODE' | 'IGNORED' | 'UNKNOWN';

export interface InboundMessage {
  kind: 'MESSAGE';
  externalId: string;          // key.id — chave de idempotência
  jid: string;                 // key.remoteJid
  phone: string;               // E.164 sem "+"
  pushName: string | null;
  fromMe: boolean;
  contentType: 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT' | 'LOCATION' | 'STICKER';
  content: string;
  mediaUrl: string | null;
  timestamp: Date;
}

export type InboundEvent =
  | InboundMessage
  | { kind: 'CONNECTION'; state: string }
  | { kind: 'QRCODE' }
  | { kind: 'IGNORED'; reason: string }
  | { kind: 'UNKNOWN'; event: string };

export function parseEvolutionEvent(payload: unknown): InboundEvent;
```

Função pura, sem I/O. Reaproveita a extração de conteúdo que já existe em
`app/api/webhook/whatsapp/route.ts` (seis formatos), acrescentando `mediaUrl` e
`contentType`.

- [ ] Escrever os testes primeiro: texto simples (`conversation`),
      `extendedTextMessage`, imagem com legenda, vídeo, áudio, documento; grupo
      `@g.us` → `IGNORED`; `status@broadcast` → `IGNORED`; `fromMe: true`
      preservado; payload vazio → `UNKNOWN`; evento sem `key.id` → `IGNORED`.
- [ ] Rodar: devem falhar por módulo inexistente.
- [ ] Implementar `parseEvolutionEvent`.
- [ ] Rodar: verde.
- [ ] Commit: `feat(inbox): add pure parser for evolution webhook payloads`

---

## Tarefa 3 — Setor e distribuição

**Arquivos:** criar `lib/crm/routing.ts`, `lib/crm/routing.test.ts`.

**Consome:** `hasAtLeastRole` de `lib/auth/roles.ts`.

**Produz:**

```ts
export interface RoutingCandidate {
  id: string;
  role: DbRole;
  status: string;
  lastActiveAt: Date | null;
  openConversations: number;
  lastAssignedAt: Date | null;
}

/** Rank de Editor para cima e status ATIVO. */
export function canAttend(role: DbRole, status: string): boolean;

/** Menos ocupado entre quem esteve ativo na janela; null devolve a conversa à fila. */
export function pickAgent(
  candidates: RoutingCandidate[],
  now: Date,
  onlineWindowMs?: number      // padrão 15 min
): string | null;

/** Setor de entrada da organização. I/O — não coberto por teste unitário. */
export async function defaultDepartmentId(organizationId: string): Promise<string | null>;

/** Monta os candidatos e chama pickAgent. I/O. */
export async function routeConversation(
  organizationId: string,
  departmentId: string | null
): Promise<{ departmentId: string | null; assignedUserId: string | null }>;
```

`pickAgent` é pura de propósito: é a regra que precisa ser demonstrável.

- [ ] Testes primeiro: escolhe o de menor carga; empate resolve por
      `lastAssignedAt` mais antigo; empate duplo resolve por menor id; ignora
      quem está fora da janela de 15 min; ignora CLIENTE e USUARIO; ignora
      INATIVO; lista vazia devolve `null`; todos offline devolve `null`.
- [ ] Rodar: falham.
- [ ] Implementar `canAttend` e `pickAgent`.
- [ ] Rodar: verde.
- [ ] Implementar `defaultDepartmentId` e `routeConversation` sobre o Prisma,
      com `groupBy` para contar conversas abertas e `max(createdAt)` para a
      última atribuição.
- [ ] `npx tsc --noEmit`
- [ ] Commit: `feat(inbox): route new conversations to the least busy agent online`

---

## Tarefa 4 — Camada de conversas e mensagens

**Arquivos:** criar `lib/crm/inbox-types.ts`, `lib/crm/conversations.ts`,
`lib/crm/messages.ts`, `lib/crm/conversations.test.ts`.

**Consome:** `routeConversation` (Tarefa 3); `findOrCreateByPhone` de
`lib/crm/contacts.ts`; `SessionPayload`.

**Produz:**

```ts
// inbox-types.ts
export type MessageDirection = 'INBOUND' | 'OUTBOUND' | 'INTERNAL';
export type ConversationStatus = 'OPEN' | 'PENDING' | 'CLOSED';
export interface MessageDTO { id; direction; contentType; content; mediaUrl;
  transcription; status; isFromBot; userId; userName; createdAt }
export interface ConversationDTO { id; contactId; dealCardId; assignedUserId;
  assignedUserName; departmentId; departmentName; channel; status; unreadCount;
  lastMessageAt; lastMessagePreview; contact; createdAt; updatedAt }
export interface ConversationDetailDTO extends ConversationDTO { messages: MessageDTO[] }

// conversations.ts
export function conversationVisibilityFilter(session, userDepartmentId): Prisma.ConversationWhereInput;
export async function listConversations(session, filters): Promise<ConversationDTO[]>;
export async function getConversation(session, id): Promise<ConversationDetailDTO | null>;
export async function findOrCreateConversation(organizationId, contactId, channel, jid): Promise<{ id: string; created: boolean }>;
export async function assignConversation(session, id, userId | null): Promise<...>;
export async function setConversationStatus(session, id, status): Promise<...>;
export async function markAsRead(session, id): Promise<void>;
export async function touchPresence(userId): Promise<void>;   // throttle de 60s

// messages.ts
export async function recordInboundMessage(organizationId, conversationId, parsed): Promise<{ duplicated: boolean }>;
export async function sendCustomerMessage(session, conversationId, text): Promise<MessageDTO>;
export async function addInternalNote(session, conversationId, text): Promise<MessageDTO>;
export function buildSignature(userName: string): string;     // "*Marcio*\n"
```

`messages.ts` importa `lib/evolution/server.ts` só dentro de
`sendCustomerMessage`. `addInternalNote` não tem acesso ao cliente da Evolution.

- [ ] Testes primeiro: `conversationVisibilityFilter` para Master (sem OR),
      Administrador (sem OR), Editor com setor (própria + fila do setor + fila
      sem setor), Editor sem setor; `buildSignature` com nome composto, nome
      único e nome com espaços sobrando.
- [ ] Rodar: falham. Implementar. Rodar: verde.
- [ ] Implementar o restante da camada.
- [ ] `recordInboundMessage` captura `P2002` do índice
      `messages_org_external_key` e devolve `{ duplicated: true }` em vez de
      propagar erro.
- [ ] `sendCustomerMessage`: grava com `status: 'PENDING'`, envia, atualiza para
      `SENT` com `externalId`, ou `FAILED` se a Evolution recusar.
- [ ] `npx tsc --noEmit`
- [ ] Commit: `feat(inbox): add conversation and message service layer`

---

## Tarefa 5 — Cliente Evolution de servidor e webhook

**Arquivos:** criar `lib/evolution/server.ts`; reescrever
`app/api/webhook/whatsapp/route.ts`.

**Produz:**

```ts
// lib/evolution/server.ts
export interface EvolutionServerEnv { serverUrl: string; apiKey: string; instanceName: string }
export function readEvolutionEnv(): EvolutionServerEnv | null;
export async function sendText(phone: string, text: string):
  Promise<{ ok: true; externalId: string | null } | { ok: false; error: string }>;
export function verifyWebhookToken(request: Request): boolean;   // timingSafeEqual
```

- [ ] Extrair `readEvolutionEnv` de `app/api/evolution/proxy/route.ts` para
      `lib/evolution/server.ts` e fazer o proxy importar de lá — uma definição só.
- [ ] Implementar `sendText` batendo direto em
      `POST {serverUrl}/message/sendText/{instance}` com header `apikey`.
- [ ] Implementar `verifyWebhookToken`: lê `x-webhook-token` ou `?token=`,
      compara com `EVOLUTION_WEBHOOK_TOKEN` por `crypto.timingSafeEqual` sobre
      buffers de tamanho igualado. Variável ausente → sempre falso.
- [ ] Reescrever o webhook seguindo o fluxo da §4 da spec. Token inválido → 401.
      Variável ausente → 503. Payload ruim → 200 com log, nunca 5xx.
- [ ] Adicionar `EVOLUTION_WEBHOOK_TOKEN` ao `.env` local com um valor gerado, e
      ao `.env.example` sem valor.
- [ ] `npx tsc --noEmit`
- [ ] Commit: `feat(inbox): authenticate the webhook and persist incoming messages`

---

## Tarefa 6 — Rotas da API

**Arquivos:** criar `app/api/crm/conversations/route.ts`,
`app/api/crm/conversations/[id]/route.ts`,
`app/api/crm/conversations/[id]/messages/route.ts`,
`app/api/crm/conversations/[id]/notes/route.ts`,
`app/api/crm/inbox/updates/route.ts`.

Todas passam por `withAuth` + `requireSession`, como as rotas da F1.

| Rota | Método | Faz |
|---|---|---|
| `/api/crm/conversations` | GET | Lista visível, filtros `status`, `scope=mine\|queue\|all`, `q` |
| `/api/crm/conversations/[id]` | GET | Detalhe com mensagens; marca como lida |
| `/api/crm/conversations/[id]` | PATCH | `assignedUserId`, `status`, `departmentId` |
| `/api/crm/conversations/[id]/messages` | POST | Responde ao cliente (envia) |
| `/api/crm/conversations/[id]/notes` | POST | Nota interna (não envia) |
| `/api/crm/inbox/updates` | GET | Cursor: conversas e mensagens novas |

- [ ] Implementar as cinco rotas.
- [ ] `/updates` chama `touchPresence(session.userId)` — é o batimento que
      alimenta a distribuição da Tarefa 3.
- [ ] Reatribuição só para rank de Administrador para cima; atendente pode
      **assumir** conversa da fila (`assignedUserId = null → eu`), não tomar a de
      outro. Fora disso, 403.
- [ ] `npx tsc --noEmit`
- [ ] Commit: `feat(inbox): add conversation, message and cursor routes`

---

## Tarefa 7 — Interface

**Arquivos:** criar `lib/crm/use-inbox.ts`, seis componentes em
`components/crm/inbox/`, `app/(dashboard)/inbox/page.tsx`; modificar
`components/sidebar.tsx`.

**Consome:** os DTOs da Tarefa 4 e as rotas da Tarefa 6.

- [ ] `use-inbox.ts`: estado + polling adaptativo (2 s em foco, 15 s em segundo
      plano via `document.visibilityState`), cursor com sobreposição de 1 s,
      deduplicação por id, `handleUnauthorized(401)` redirecionando para
      `/login` — mesmo contrato de `use-crm.ts`.
- [ ] `conversation-item.tsx`: avatar, nome, prévia, tempo relativo, contador de
      não lidas, `ChannelBadge` em variante `dot`, etiqueta do setor.
- [ ] `conversation-list.tsx`: abas Minhas / Fila / Todas, busca, contador na aba
      da fila.
- [ ] `message-bubble.tsx`: três tratamentos distintos — entrada à esquerda,
      saída à direita com nome do autor, **nota interna em faixa âmbar com
      borda tracejada e o rótulo "só a equipe vê"**. A nota interna precisa ser
      impossível de confundir com uma mensagem enviada; é o único lugar onde a
      interface grita.
- [ ] `message-thread.tsx`: rolagem, separadores de data, âncora no fim.
- [ ] `composer.tsx`: alternância Responder / Nota interna que muda cor, ícone e
      texto do botão. Contato sem telefone desabilita Responder com explicação.
- [ ] `contact-panel.tsx`: dados do contato, oportunidade vinculada (ou botão
      "Criar oportunidade"), responsável, setor, encerrar atendimento.
- [ ] `page.tsx`: três colunas, responsivo (em telas estreitas, lista e conversa
      alternam).
- [ ] Sidebar: item "Inbox (Atendimento)" após CRM, ícone `MessagesSquare`,
      `permissionKey: 'viewCRM'`.
- [ ] `npx tsc --noEmit` e `npm run build`
- [ ] Commit: `feat(inbox): add the three-column attendant inbox`

---

## Tarefa 8 — Verificação ponta a ponta

- [ ] `npx vitest run` — todos verdes, incluindo os 52 anteriores.
- [ ] `npx tsc --noEmit` limpo. `npm run build` passando.
- [ ] Subir o dev server e exercitar contra o banco real:
  - [ ] `POST /api/webhook/whatsapp` sem token → 401, nada gravado.
  - [ ] Com token e payload de texto → contato, conversa e mensagem criados.
  - [ ] Reenviar o mesmo payload → nenhuma duplicata (contar antes e depois).
  - [ ] Payload de grupo `@g.us` → 200, nada gravado.
  - [ ] `GET /api/crm/conversations` sem sessão → 401; com sessão → a conversa.
  - [ ] `POST .../notes` → mensagem `INTERNAL` gravada; conferir no banco que
        nenhuma chamada saiu para a Evolution.
  - [ ] `GET /api/crm/inbox/updates?since=<antes>` → devolve a mensagem nova.
  - [ ] Distribuição: com o Master online, conversa nova cai nele; com ninguém
        ativo há 15 min, cai na fila.
  - [ ] Visibilidade: conversa atribuída ao Master não aparece para o Editor.
  - [ ] `/inbox` responde 200.
- [ ] Registrar no relatório o que **não** foi verificado — renderização visual,
      porque não há navegador aqui, e o envio real pela Evolution, que depende
      de instância conectada.
- [ ] Commit final e relatório consolidado.
