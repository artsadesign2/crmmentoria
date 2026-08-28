# F5 — Disparo, fila e anti-bloqueio · Plano de implementação

**Spec:** [2026-08-27-crm-whatsapp-f5-disparo-fila-design.md](../specs/2026-08-27-crm-whatsapp-f5-disparo-fila-design.md)

**Objetivo:** tirar o disparo do navegador e colocá-lo numa fila no banco, com
anti-bloqueio de verdade; mais respostas rápidas e o e-mail de recuperação de
senha, dívida da F0.

**Arquitetura:** fila em Postgres reivindicada com `FOR UPDATE SKIP LOCKED`;
worker num endpoint protegido por segredo que qualquer agendador chama; política
anti-bloqueio em funções puras com aleatório injetável.

**Stack:** Next.js 15 · Prisma 6 · Neon Postgres · Vitest

## Restrições globais

- Migração idempotente por `npm run db:migrate f5-disparo`. Sem `DROP`.
- Todo `where` carrega `session.organizationId`. Invisível responde 404.
- **Cada envio grava `Conversation` + `Message` reais.** Sem exceção: é o que
  faz o disparo aparecer no Inbox e o descadastro ter onde chegar.
- **Descadastro casa a mensagem inteira, nunca substring.**
- O worker **nunca** é acessível sem `CRON_SECRET`.
- Falha de e-mail **não** altera a resposta de `/api/auth/forgot-password`.
- Aleatoriedade injetável em tudo que for testado.
- Commit ao fim de cada tarefa, `tsc --noEmit` limpo antes (conferir o código de
  saída, não só a saída de texto).

---

## Tarefa 1 — Migração e schema

**Arquivos:** criar `prisma/migrations/f5-disparo/migration.sql`; modificar
`prisma/schema.prisma`.

- [ ] Escrever os 8 statements da §11 da spec, idempotentes.
- [ ] Conferir contagens antes: users, departments, contacts, dealCards, stages.
- [ ] `npm run db:migrate f5-disparo`
- [ ] Conferir depois: mesmas contagens; as quatro tabelas novas existem; duas
      colunas novas em `contacts`.
- [ ] Atualizar `schema.prisma`: models `DispatchCampaign`, `DispatchTarget`,
      `DispatchSettings`, `QuickReply`; campos em `Contact`; relações com
      `Organization`.
- [ ] `npx prisma generate` e `npx tsc --noEmit`.
- [ ] Commit: `feat(dispatch): add campaign, target and quick reply tables`

---

## Tarefa 2 — Política anti-bloqueio

**Arquivos:** criar `lib/dispatch/policy.ts`, `lib/crm/__tests__/policy.test.ts`.

**Produz:**

```ts
export interface DispatchPolicy {
  minIntervalMs: number;   // padrão 4000
  jitterMs: number;        // padrão 3000
  maxPerMinute: number;    // padrão 12
  windowStartHour: number; // padrão 8
  windowEndHour: number;   // padrão 20
  dailyCap: number;        // padrão 300
  timeZone: string;        // padrão 'America/Sao_Paulo'
}

export const POLITICA_PADRAO: DispatchPolicy;

/** Puro. `rng` injetável — é a única forma de testar jitter. */
export function nextSendDelay(p: DispatchPolicy, rng?: () => number): number;

/** Puro. Usa o fuso da organização, não o do servidor (que roda em UTC). */
export function withinWindow(p: DispatchPolicy, now: Date): boolean;

/** Quantos ainda cabem neste minuto e neste dia. */
export function remainingQuota(
  p: DispatchPolicy,
  sentLastMinute: number,
  sentToday: number
): number;
```

- [ ] Testes primeiro: o atraso fica entre `minInterval` e
      `minInterval + jitter`; com `rng` fixo o valor é determinístico; dois
      `rng` diferentes dão atrasos diferentes (o jitter existe de fato);
      `jitterMs: 0` devolve exatamente o intervalo mínimo; 12h está na janela e
      3h não, no fuso de São Paulo; um instante que é 23h em São Paulo mas 2h em
      UTC fica **fora** da janela; janela que cruza a meia-noite; cota devolve 0
      quando o teto do minuto ou do dia foi atingido, e nunca número negativo.
- [ ] Rodar: falham. Implementar. Rodar: verde.
- [ ] `npx tsc --noEmit`
- [ ] Commit: `feat(dispatch): add anti-block pacing policy with jitter`

---

## Tarefa 3 — Descadastro

**Arquivos:** criar `lib/dispatch/optout.ts`, `lib/crm/__tests__/optout.test.ts`;
modificar `app/api/webhook/whatsapp/route.ts`.

**Produz:**

```ts
export const PALAVRAS_SAIDA: string[];

/** Puro. Casa a mensagem inteira normalizada, nunca substring. */
export function isOptOutMessage(texto: string): boolean;

export async function optOutContact(contactId: string, motivo: string): Promise<void>;
export async function optInContact(session, contactId): Promise<void>;
```

- [ ] Testes primeiro: "PARE", "pare", "Parar", "SAIR", "sair.", " CANCELAR "
      e "STOP" descadastram; **"não quero parar de receber" NÃO descadastra**;
      "pare de mandar mensagem" não descadastra (é frase, não comando);
      "sairei amanhã" não descadastra; string vazia não; acento e pontuação são
      normalizados ("cancelar!" e "cancelár" casam).
- [ ] Rodar: falham. Implementar. Rodar: verde.
- [ ] Ligar no webhook: mensagem de entrada que case marca o contato. A
      conversa **continua sendo gravada** — descadastro é de disparo, não de
      atendimento.
- [ ] `npx tsc --noEmit`
- [ ] Commit: `feat(dispatch): honour opt-out requests from inbound messages`

---

## Tarefa 4 — E-mail e a dívida da F0

**Arquivos:** criar `lib/email/index.ts`, `lib/email/resend.ts`,
`lib/email/templates.ts`; modificar `app/api/auth/forgot-password/route.ts`;
`.env.example`.

**Produz:**

```ts
export type EmailResult = { ok: true } | { ok: false; error: string };
export function isEmailConfigured(): boolean;
export async function sendEmail(msg: {
  to: string; subject: string; html: string; text: string;
}): Promise<EmailResult>;
export function passwordResetEmail(code: string, nome: string):
  { subject: string; html: string; text: string };
```

- [ ] Implementar `resend.ts` com `fetch` contra `api.resend.com/emails`. Sem
      SDK: uma dependência a menos e nada de build nativo.
- [ ] `index.ts` escolhe o driver: com `RESEND_API_KEY`, Resend; sem ela, log
      **com aviso alto**, nunca em silêncio.
- [ ] Ligar em `forgot-password`, e **conferir que a resposta não muda**:
      falha de envio vai para o log, a rota devolve a mesma mensagem genérica.
      Mudar a resposta reabriria o oráculo de e-mails cadastrados que a F0
      fechou.
- [ ] Acrescentar `RESEND_API_KEY` e `EMAIL_FROM` ao `.env.example`.
- [ ] `npx tsc --noEmit`
- [ ] Commit: `feat(auth): send the password reset code by email`

---

## Tarefa 5 — Campanhas e worker

**Arquivos:** criar `lib/dispatch/types.ts`, `lib/dispatch/campaigns.ts`,
`lib/dispatch/worker.ts`, `app/api/cron/dispatch/route.ts`,
`app/api/crm/campaigns/route.ts`, `app/api/crm/campaigns/[id]/route.ts`,
`vercel.json`.

**Produz:**

```ts
// campaigns.ts
export async function createCampaign(session, input: {
  name: string; message: string; contactIds: string[]; scheduledAt?: string;
}): Promise<CampaignDTO>;
export async function listCampaigns(session): Promise<CampaignDTO[]>;
export async function getCampaign(session, id): Promise<CampaignDetailDTO | null>;
export async function setCampaignStatus(session, id, status): Promise<CampaignDTO | null>;

// worker.ts
export async function drainQueue(limite?: number): Promise<{
  processed: number; sent: number; failed: number; skipped: number; remaining: number;
}>;
```

- [ ] `createCampaign` monta os destinatários já filtrando: sem telefone,
      descadastrado, e número repetido na mesma campanha. Cada exclusão grava
      `skip_reason`, para a tela poder explicar por que 200 contatos viraram 187.
- [ ] `drainQueue` reivindica o lote com `$queryRaw` usando
      `FOR UPDATE SKIP LOCKED`, respeita janela e cotas, envia, grava
      `Conversation` + `Message`, atualiza contadores.
- [ ] `SENDING` com `claimed_at` de mais de 5 minutos volta para `PENDING`.
- [ ] Rota do worker: 401 sem `CRON_SECRET`, comparado em tempo constante como
      o webhook da F3.
- [ ] `vercel.json` com cron diário de retaguarda — funciona em qualquer plano.
- [ ] Rotas de campanha: `withAuth`, criar/iniciar só Administrador+.
- [ ] `npx tsc --noEmit`
- [ ] Commit: `feat(dispatch): add campaign queue and the worker endpoint`

---

## Tarefa 6 — Respostas rápidas

**Arquivos:** criar `lib/crm/quick-replies.ts`,
`app/api/crm/quick-replies/route.ts`,
`app/api/crm/quick-replies/[id]/route.ts`; teste em
`lib/crm/__tests__/quick-replies.test.ts`.

**Produz:**

```ts
export interface QuickReplyDTO { id; shortcut; title; content; }

/** Puro: só {{nome}} e {{empresa}}. */
export function interpolateQuickReply(
  content: string,
  vars: { nome: string; empresa?: string | null }
): string;

export async function listQuickReplies(session): Promise<QuickReplyDTO[]>;
export async function saveQuickReply(session, input): Promise<QuickReplyDTO>;   // Editor+
export async function deleteQuickReply(session, id): Promise<boolean>;
```

- [ ] Testes primeiro: `{{nome}}` e `{{empresa}}` são substituídos; empresa
      ausente vira algo apresentável, não "undefined"; chave desconhecida fica
      literal, sem quebrar; conteúdo sem chave passa intacto; a mesma chave
      repetida é substituída em todas as ocorrências.
- [ ] Rodar: falham. Implementar. Rodar: verde.
- [ ] Atalho único por organização; conflito responde 409 explicando.
- [ ] `npx tsc --noEmit`
- [ ] Commit: `feat(inbox): add database-backed quick replies`

---

## Tarefa 7 — Interface

**Arquivos:** criar `components/crm/dispatch/campaign-list.tsx`,
`new-campaign-modal.tsx`, `campaign-progress.tsx`,
`components/crm/inbox/quick-reply-picker.tsx`,
`app/(dashboard)/disparos/page.tsx`; modificar
`components/crm/inbox/composer.tsx`, `components/sidebar.tsx`,
`app/(dashboard)/events/page.tsx`, `app/(dashboard)/settings/page.tsx`.

- [ ] Tela `/disparos`: lista de campanhas, progresso, criar, pausar, cancelar.
- [ ] A tela mantém o worker rodando enquanto estiver aberta, e **avisa quando
      há campanha parada** sem ninguém para drenar — é a consequência honesta de
      serverless sem processo residente, e esconder isso faria a fila parecer
      quebrada.
- [ ] `campaign-progress.tsx` mostra enviados, falhas e **pulados com o motivo**.
- [ ] `quick-reply-picker.tsx`: digitar `/` no compositor abre a lista; escolher
      insere o texto interpolado, que **continua editável**.
- [ ] Sidebar: "Disparos" após Inbox, `permissionKey: 'viewCRM'`.
- [ ] Tela de eventos: trocar `sendWhatsAppBroadcastToAll` por criar campanha.
      Sem isso eu entrego uma fila e deixo o laço quebrado rodando ao lado.
- [ ] Configurações: editor de respostas rápidas e dos parâmetros anti-bloqueio.
- [ ] `npx tsc --noEmit` e `npm run build`
- [ ] Commit: `feat(dispatch): add the campaign screen and quick reply picker`

---

## Tarefa 8 — Verificação ponta a ponta

- [ ] `npx vitest run` — verdes, incluindo os 153 anteriores.
- [ ] `tsc --noEmit` limpo (código de saída 0), `npm run build` passando.
- [ ] **Um dev server só.** Matar os demais antes: instâncias concorrentes
      corrompem `.next` e produzem 404 falso, como aconteceu na F4.
- [ ] Contra o banco real:
  - [ ] Worker sem `CRON_SECRET` → 401; com segredo errado → 401.
  - [ ] Campanha com 5 contatos de teste → 5 `dispatch_targets` PENDING.
  - [ ] Contato descadastrado na lista → `SKIPPED` com motivo, não enviado.
  - [ ] Contato sem telefone → `SKIPPED` com motivo.
  - [ ] Duas chamadas simultâneas ao worker → nenhum destinatário processado
        duas vezes (contar `SENT` e comparar com o total).
  - [ ] Cada envio gerou `Conversation` e `Message` reais.
  - [ ] Fora da janela de horário → worker devolve sem enviar.
  - [ ] Atrasos entre envios **variam** — registrar os valores observados.
  - [ ] Webhook com "PARE" → contato descadastrado; com "não quero parar de
        receber" → **não** descadastrado.
  - [ ] Descadastrado ainda recebe atendimento individual.
  - [ ] Nova campanha não inclui o descadastrado.
  - [ ] Resposta rápida com `{{nome}}` resolve pelo contato.
  - [ ] `forgot-password` sem `RESEND_API_KEY` → aviso no log, resposta genérica.
  - [ ] `/disparos`, `/inbox`, `/crm` respondem 200.
- [ ] Remover dados de verificação e conferir contagens.
- [ ] Registrar o que **não** foi verificado.
- [ ] Commit final e relatório consolidado.
