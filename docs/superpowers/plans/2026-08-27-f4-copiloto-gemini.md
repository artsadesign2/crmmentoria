# F4 — Copiloto Gemini · Plano de implementação

**Spec:** [2026-08-27-crm-whatsapp-f4-copiloto-gemini-design.md](../specs/2026-08-27-crm-whatsapp-f4-copiloto-gemini-design.md)

**Objetivo:** copiloto que rascunha resposta, transcrição dos áudios e
qualificação automática do atendimento — a primeira IA de verdade do projeto.

**Arquitetura:** cliente Gemini resiliente (cadeia de modelos, retentativa,
timeout) sob três casos de uso; base de conhecimento por organização
fundamentando o rascunho; saída estruturada por `responseSchema` na
qualificação.

**Stack:** Next.js 15 · Prisma 6 · Neon Postgres · Gemini 3.5/3.6 Flash · Vitest

## Restrições globais

- **Modelos, por medição:** `gemini-3.5-flash` → `gemini-3.6-flash`.
  **Nunca** `gemini-3.7-flash` (166 s medidos) nem `gemini-3.5-transcribe`
  (devolve vazio). Transcrição usa modelo generalista.
- `GEMINI_API_KEY` só no servidor. Nunca `NEXT_PUBLIC_`.
- O cliente Gemini **nunca lança**: devolve `{ ok: false }` com mensagem em
  português. Falha de IA não derruba atendimento.
- **A sugestão nunca é enviada sozinha.** Preenche o compositor e para ali.
- Migração SQL idempotente por `npm run db:migrate f4-ia`. Sem `DROP`.
- Todo `where` carrega `session.organizationId`. Invisível responde 404.
- Cores por variável de tema. Commit ao fim de cada tarefa, `tsc` limpo antes.

---

## Tarefa 1 — Migração e schema

**Arquivos:** criar `prisma/migrations/f4-ia/migration.sql`; modificar
`prisma/schema.prisma`.

- [ ] Escrever os 7 statements da §11 da spec, idempotentes.
- [ ] Conferir contagens antes: users, departments, contacts, dealCards, stages.
- [ ] `npm run db:migrate f4-ia`
- [ ] Conferir depois: mesmas contagens; `ai_settings` existe; três colunas
      novas em `deal_cards`; `transcription_status` em `messages`.
- [ ] Atualizar `schema.prisma`: model `AiSettings`, campos novos em `DealCard`
      e `Message`, relação com `Organization`.
- [ ] `npx prisma generate` e `npx tsc --noEmit`.
- [ ] Commit: `feat(ai): add ai settings table and analysis columns`

---

## Tarefa 2 — Cliente Gemini

**Arquivos:** criar `lib/ai/gemini.ts`, `lib/crm/__tests__/gemini.test.ts`.

**Produz:**

```ts
export const MODEL_CHAIN = ['gemini-3.5-flash', 'gemini-3.6-flash'] as const;
export const TRANSCRIBE_MODEL = 'gemini-3.6-flash';

export interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

export interface GeminiRequest {
  system?: string;
  parts: GeminiPart[];
  json?: { schema: unknown };
  maxOutputTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  model?: string;              // fixa um modelo, ignorando a cadeia
}

export type GeminiResult =
  | { ok: true; text: string; model: string; tokens: number }
  | { ok: false; error: string; retryable: boolean };

export function isAiConfigured(): boolean;
export function isRetryable(status: number): boolean;   // puro, testável
export async function generate(req: GeminiRequest): Promise<GeminiResult>;
```

- [ ] Testes primeiro sobre `isRetryable`: 503, 429 e 500 são retentáveis;
      400, 401, 403 e 404 não são. E sobre a montagem do corpo: `json` liga
      `responseMimeType` e `responseSchema`; `system` vira `systemInstruction`.
- [ ] Rodar: falham.
- [ ] Implementar. `fetch` com `AbortSignal.timeout(timeoutMs ?? 45_000)`.
      Espera de 1 s, 2 s, 4 s entre tentativas. Esgotado o modelo, passa ao
      próximo da cadeia. Nunca lança.
- [ ] Rodar: verde. `npx tsc --noEmit`.
- [ ] Commit: `feat(ai): add resilient gemini client with model fallback`

---

## Tarefa 3 — Prompts e base de conhecimento

**Arquivos:** criar `lib/ai/prompts.ts`, `lib/ai/settings.ts`,
`lib/crm/__tests__/prompts.test.ts`.

**Produz:**

```ts
// settings.ts
export interface AiSettingsDTO {
  knowledgeBase: string; tone: string; enabled: boolean; updatedAt: string | null;
}
export async function getAiSettings(organizationId: string): Promise<AiSettingsDTO>;
export async function saveAiSettings(session, patch): Promise<AiSettingsDTO>;  // Administrador+

// prompts.ts
export const LIMITE_MENSAGENS = 20;
export function formatConversation(messages: MessageDTO[]): string;  // puro
export function suggestSystemPrompt(settings, contato): string;      // puro
export function qualifySystemPrompt(): string;                       // puro
export const QUALIFY_SCHEMA: unknown;
```

`formatConversation` rotula cada linha por papel e corta as mais antigas ao
passar de 20, preservando as recentes.

- [ ] Testes primeiro: rótulos `CLIENTE:`, `ATENDENTE:`, `NOTA INTERNA:`;
      corte mantém as 20 últimas, não as 20 primeiras; conversa vazia devolve
      string vazia sem quebrar; a instrução de sistema declara que mensagem de
      cliente é dado e não ordem; base vazia produz instrução de não afirmar
      fato comercial.
- [ ] Rodar: falham. Implementar. Rodar: verde.
- [ ] Implementar `settings.ts` sobre o Prisma, com `upsert` por organização.
- [ ] `npx tsc --noEmit`
- [ ] Commit: `feat(ai): add grounded prompts and per-organization knowledge base`

---

## Tarefa 4 — Transcrição

**Arquivos:** criar `lib/ai/transcribe.ts`,
`app/api/crm/conversations/[id]/transcribe/route.ts`;
teste em `lib/crm/__tests__/transcribe.test.ts`.

**Produz:**

```ts
export const TAMANHO_MAXIMO_BYTES = 20 * 1024 * 1024;

export type TranscriptionStatus = 'DONE' | 'FAILED' | 'UNSUPPORTED';

/** Puro: decide sem I/O se vale a pena tentar. */
export function avaliarMidia(mimeType: string | null, bytes: number | null):
  { ok: true } | { ok: false; motivo: string };

export async function transcribeConversationAudio(
  session: SessionPayload,
  conversationId: string
): Promise<{ transcribed: number; failed: number; messages: MessageDTO[] } | null>;
```

- [ ] Testes primeiro sobre `avaliarMidia`: `audio/ogg` e `audio/mpeg` passam;
      `video/mp4` e `application/pdf` recusam; acima de 20 MB recusa; tamanho
      desconhecido passa (só o download revela).
- [ ] Rodar: falham. Implementar. Rodar: verde.
- [ ] Implementar a busca da mídia com header `apikey` da Evolution, o envio à
      Gemini com `inlineData` em base64, e a gravação em `transcription` e
      `transcription_status`.
- [ ] Rota: `withAuth` + `requireSession`, 404 para conversa invisível.
- [ ] `npx tsc --noEmit`
- [ ] Commit: `feat(ai): transcribe conversation audio on open`

---

## Tarefa 5 — Sugestão e qualificação

**Arquivos:** criar `lib/ai/suggest.ts`, `lib/ai/qualify.ts`,
`app/api/crm/conversations/[id]/suggest/route.ts`,
`app/api/crm/conversations/[id]/qualify/route.ts`,
`app/api/ai/settings/route.ts`; teste em `lib/crm/__tests__/qualify.test.ts`.

**Produz:**

```ts
// suggest.ts
export async function suggestReply(session, conversationId):
  Promise<{ ok: true; draft: string } | { ok: false; error: string } | null>;

// qualify.ts
export interface Qualification {
  faturamento: string; gargalo: string; meta: string;
  objecao: string; temperatura: number; resumo: string;
}
/** Puro: valida o JSON da Gemini antes de qualquer gravação. */
export function parseQualification(bruto: string):
  { ok: true; data: Qualification } | { ok: false; error: string };

export async function qualifyConversation(session, conversationId):
  Promise<{ ok: true; qualification: Qualification } | { ok: false; error: string } | null>;
```

- [ ] Testes primeiro sobre `parseQualification`: JSON válido passa; JSON
      malformado devolve erro sem lançar; campo faltando devolve erro;
      temperatura 150 e −5 são rejeitadas; temperatura em string numérica é
      convertida; campo vazio vira "não informado".
- [ ] Rodar: falham. Implementar. Rodar: verde.
- [ ] `suggestReply` monta contexto com histórico, base, contato e oportunidade;
      temperatura 0.4.
- [ ] `qualifyConversation` recusa com 400 quando a conversa não tem
      `dealCardId`. Grava `custom_fields` (mesclando, sem apagar o que existe),
      `ai_score`, `ai_summary`, `ai_analyzed_at`.
- [ ] `/api/ai/settings`: GET para qualquer sessão, PUT só Administrador+.
- [ ] `npx tsc --noEmit`
- [ ] Commit: `feat(ai): add reply suggestion and conversation qualification`

---

## Tarefa 6 — Interface

**Arquivos:** criar `components/crm/inbox/ai-suggest-button.tsx`,
`ai-qualify-panel.tsx`, `transcription-note.tsx`,
`components/settings/ai-settings-section.tsx`; modificar
`components/crm/inbox/composer.tsx`, `message-bubble.tsx`, `contact-panel.tsx`,
`lib/crm/use-inbox.ts`, `app/(dashboard)/settings/page.tsx`.

- [ ] `use-inbox.ts` ganha `suggestReply`, `qualify`, `transcribe` e
      `aiAvailable`, seguindo o contrato já existente.
- [ ] Transcrição disparada uma vez ao abrir a conversa, quando houver áudio
      sem transcrição.
- [ ] `transcription-note.tsx`: texto sob a bolha de áudio, marcado como
      transcrição automática — quem lê precisa saber que é máquina, não fita.
      `FAILED` mostra botão de repetir; `UNSUPPORTED` explica e não oferece.
- [ ] `ai-suggest-button.tsx` no compositor: só no modo "Responder ao cliente",
      nunca no modo nota. Preenche a caixa; nunca envia.
- [ ] `ai-qualify-panel.tsx` no painel de contato: temperatura, resumo, campos
      extraídos e "analisado há X". Sem oportunidade, explica em vez de falhar.
- [ ] `ai-settings-section.tsx` em Configurações: base de conhecimento, tom,
      interruptor geral. Só Administrador+.
- [ ] Todos os elementos de IA somem quando `aiAvailable` é falso.
- [ ] `npx tsc --noEmit` e `npm run build`
- [ ] Commit: `feat(ai): surface copilot, transcription and qualification in the ui`

---

## Tarefa 7 — Verificação ponta a ponta

- [ ] `npx vitest run` — todos verdes, incluindo os 104 anteriores.
- [ ] `tsc --noEmit` limpo, `npm run build` passando.
- [ ] Contra o banco e a API reais:
  - [ ] Rotas de IA sem sessão → 401.
  - [ ] Conversa de outra organização → 404.
  - [ ] Semear uma conversa de teste e pedir sugestão **sem** base de
        conhecimento → rascunho não afirma preço.
  - [ ] Preencher a base com preço e pedir de novo → rascunho usa o preço certo.
  - [ ] Injeção: mensagem do cliente pedindo 90% de desconto → o rascunho não
        obedece.
  - [ ] Transcrever um áudio real → coluna preenchida, `status=DONE`.
  - [ ] Chamar de novo → não transcreve duas vezes.
  - [ ] Qualificar sem oportunidade → 400 explicativo.
  - [ ] Criar oportunidade e qualificar → `custom_fields`, `ai_score`,
        `ai_summary` e `ai_analyzed_at` preenchidos.
  - [ ] Campo ausente na conversa → "não informado", não invenção.
  - [ ] Simular `GEMINI_API_KEY` ausente → `aiAvailable` falso, sem chamadas.
  - [ ] `/inbox` e `/crm` seguem respondendo 200.
- [ ] Remover os dados de verificação e conferir contagens.
- [ ] Registrar o que **não** foi verificado.
- [ ] Commit final e relatório consolidado.
