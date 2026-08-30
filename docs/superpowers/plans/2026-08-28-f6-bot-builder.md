# F6 — Bot Builder e motor de execução

**Spec:** [2026-08-28-crm-whatsapp-f6-bot-builder-design.md](../specs/2026-08-28-crm-whatsapp-f6-bot-builder-design.md)

**Objetivo:** construtor visual de fluxos de atendimento e o motor que os executa
sobre as conversas do WhatsApp.

**Arquitetura:** motor puro (`step(grafo, sessao, entrada) → { proximaSessao,
acoes[] }`) separado de um executor que realiza as ações contra banco, Evolution
e Gemini. Versão publicada é imutável; conversa em andamento termina na versão
em que começou.

**Ordem:** as tarefas 1 a 3 entregam um **bot funcionando** (menu de triagem
roteando para setores) antes de existir qualquer canvas. Se a fase parar no
meio, o que estiver de pé é utilizável.

---

## Restrições que valem para todas as tarefas

- Migração idempotente escrita à mão, aplicada por `prisma/migrate.ts`. Nunca
  `prisma db push`, `--force-reset` ou `--accept-data-loss`.
- Contar as linhas antes e depois de cada migração.
- Todo `where` do Prisma carrega `session.organizationId`. Registro invisível
  responde **404, nunca 403**.
- Testes em `lib/**/__tests__/**/*.test.ts` (ver `vitest.config.mts`).
- `npx tsc --noEmit; echo "tsc: $?"` — conferir o código de saída, não a saída.
- snake_case no banco, camelCase no Prisma via `@map`. VARCHAR, não enum.
- Mensagem do bot: `isFromBot: true`, `userId: null`, **nunca assinada**.
- Um servidor de desenvolvimento só. Instâncias concorrentes corrompem `.next`.

---

## Tarefa 1 — Tabelas e formato do grafo

**Arquivos:** criar `prisma/migrations/f6-bot/migration.sql`,
`lib/bot/types.ts`; modificar `prisma/schema.prisma`.

**Produz:**

```ts
export type BotNodeType =
  | 'START' | 'MESSAGE' | 'QUESTION' | 'CONDITION'
  | 'CAPTURE' | 'TRANSFER' | 'AI' | 'END';

export interface BotNode {
  id: string;
  type: BotNodeType;
  /** Posição no canvas. O motor ignora; só o editor usa. */
  position: { x: number; y: number };
  data: {
    label?: string;
    /** MESSAGE, QUESTION, END: texto enviado. Aceita {{nome}} e {{empresa}}. */
    text?: string;
    /** QUESTION: as opções oferecidas. `key` é o que o cliente digita. */
    options?: Array<{ key: string; label: string }>;
    /** CONDITION: variável comparada e valor esperado. */
    variable?: string;
    equals?: string;
    /** CAPTURE: nome do campo em contacts.custom_fields. */
    field?: string;
    /** TRANSFER: setor de destino. Nulo cai na fila padrão. */
    departmentId?: string | null;
  };
}

export interface BotEdge {
  id: string;
  source: string;
  target: string;
  /** QUESTION: a opção que leva por esta aresta. CONDITION: 'true' | 'false'. */
  sourceHandle?: string | null;
}

export interface BotGraph {
  nodes: BotNode[];
  edges: BotEdge[];
}

export type FlowStatus = 'DRAFT' | 'PUBLISHED';
export type SessionStatus = 'RUNNING' | 'HANDED_OFF' | 'DONE' | 'ABORTED';

export interface BotSessionState {
  currentNodeId: string | null;
  variables: Record<string, string>;
  aiTurns: number;
  awaitingInput: boolean;
}

export class BotError extends Error {}
```

- [ ] Escrever a migração com quatro tabelas, toda instrução idempotente
      (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`):
  - `bot_flows`: `id`, `organization_id`, `name VARCHAR(200)`,
    `graph JSONB NOT NULL DEFAULT '{"nodes":[],"edges":[]}'`,
    `status VARCHAR(20) DEFAULT 'DRAFT'`,
    `is_trigger BOOLEAN DEFAULT false`,
    `published_version INT`, `created_by_user_id`, `created_at`, `updated_at`.
  - `bot_flow_versions`: `id`, `flow_id`, `organization_id`, `version INT`,
    `graph JSONB NOT NULL`, `published_at`, `published_by_user_id`.
    Única `(flow_id, version)`.
  - `bot_sessions`: `id`, `conversation_id`, `organization_id`, `flow_id`,
    `version INT`, `current_node_id VARCHAR(80)`,
    `variables JSONB DEFAULT '{}'`, `ai_turns INT DEFAULT 0`,
    `awaiting_input BOOLEAN DEFAULT false`,
    `status VARCHAR(20) DEFAULT 'RUNNING'`, `started_at`, `updated_at`.
  - `bot_events`: `id`, `session_id`, `organization_id`, `node_id VARCHAR(80)`,
    `kind VARCHAR(30)`, `detail TEXT`, `created_at`.
- [ ] Índice único **parcial** garantindo uma sessão ativa por conversa:
      `CREATE UNIQUE INDEX IF NOT EXISTS bot_sessions_active_key
       ON bot_sessions (conversation_id) WHERE status = 'RUNNING';`
      O Prisma não sabe declarar índice parcial — ele vive só na migração, como
      o `departments_default_inbox_key` da F3. Documentar isso no schema.
- [ ] Índice único parcial garantindo um fluxo-gatilho por organização:
      `CREATE UNIQUE INDEX IF NOT EXISTS bot_flows_trigger_key
       ON bot_flows (organization_id) WHERE is_trigger;`
- [ ] Índices: `bot_events (session_id, created_at)`,
      `bot_flows (organization_id, status)`.
- [ ] Contar linhas antes: `contacts`, `conversations`, `messages`,
      `departments`, `users`. Aplicar. Contar depois. **Iguais.**
- [ ] Acrescentar os quatro modelos ao `schema.prisma` com as relações em
      `Organization`, `Conversation`, `User`. `npx prisma generate`.
- [ ] `npx tsc --noEmit`
- [ ] Commit: `feat(bot): add flow, version, session and event tables`

---

## Tarefa 2 — O motor puro

**Arquivos:** criar `lib/bot/engine.ts`, `lib/crm/__tests__/bot-engine.test.ts`.

**Consome:** `BotGraph`, `BotNode`, `BotSessionState` da Tarefa 1;
`renderTemplate` de `lib/dispatch/template.ts` (F5).

**Produz:**

```ts
export type BotAction =
  | { tipo: 'ENVIAR'; texto: string }
  | { tipo: 'CAPTURAR'; campo: string; valor: string }
  | { tipo: 'TRANSFERIR'; departmentId: string | null; motivo: string }
  | { tipo: 'PERGUNTAR_IA'; pergunta: string }
  | { tipo: 'ENCERRAR'; motivo: string };

export interface StepInput {
  /** Texto que o cliente mandou. Vazio na primeira execução da conversa. */
  texto: string;
  /** Resolve {{nome}} e {{empresa}} do texto dos nós. */
  contato: { nome: string; empresa: string | null };
  /** Resposta do Gemini realimentada pelo executor. */
  respostaIa?: string;
}

export interface StepResult {
  proximaSessao: BotSessionState;
  acoes: BotAction[];
  status: SessionStatus;
}

export const TETO_NOS = 25;
export const TETO_MENSAGENS = 5;
export const TETO_TROCAS_IA = 3;

/** Puro: sem I/O, sem Date.now, sem Math.random. */
export function step(grafo: BotGraph, sessao: BotSessionState, entrada: StepInput): StepResult;

/** O nó START do grafo, ou null se não houver exatamente um. */
export function nodeInicial(grafo: BotGraph): BotNode | null;

/** Estado zerado, apontando para o início. */
export function sessaoInicial(grafo: BotGraph): BotSessionState;
```

- [ ] Testes primeiro, todos sobre grafos montados à mão no próprio teste:
  - START → MESSAGE → END produz uma ação `ENVIAR` e status `DONE`.
  - MESSAGE resolve `{{nome}}` pelo contato da entrada.
  - QUESTION envia o texto **com as opções listadas**, marca
    `awaitingInput: true` e não avança.
  - Resposta "2" numa QUESTION segue a aresta de `sourceHandle === '2'`.
  - Resposta que não casa com nenhuma opção **repete a pergunta** e não avança
    (não pode cair em silêncio nem transferir na primeira confusão).
  - CONDITION com `variable` presente em `variables` segue `'true'`; ausente
    segue `'false'`.
  - CAPTURE grava em `variables` **e** emite `{ tipo: 'CAPTURAR' }`.
  - TRANSFER emite `TRANSFERIR` com o `departmentId` do nó e status
    `HANDED_OFF`.
  - **Ciclo infinito** (dois MESSAGE apontando um para o outro) para em
    `TETO_NOS`, emite `TRANSFERIR` com motivo e status `ABORTED` — nunca fica
    em laço nem em silêncio.
  - Grafo com mais de `TETO_MENSAGENS` nós MESSAGE em sequência para no teto e
    transfere.
  - Aresta apontando para nó inexistente transfere com motivo, não lança.
  - Grafo sem START devolve `nodeInicial === null` e `step` transfere.
- [x] Rodar: falham. Implementar. Rodar: verde.
- [ ] `npx tsc --noEmit`
- [ ] Commit: `feat(bot): add the pure execution engine`

---

## Tarefa 3 — Executor e menu de triagem funcionando

**Arquivos:** criar `lib/bot/sessions.ts`, `lib/bot/executor.ts`,
`lib/bot/seed-triagem.ts`; modificar `app/api/webhook/whatsapp/route.ts`,
`lib/crm/messages.ts`, `lib/crm/conversations.ts`.

**Consome:** `step`, `sessaoInicial`, `BotAction` da Tarefa 2; `sendText` de
`lib/evolution/server.ts` (F3); `findOrCreateConversation` (F3).

**Produz:**

```ts
// sessions.ts
export interface SessaoCarregada {
  id: string;
  conversationId: string;
  organizationId: string;
  flowId: string;
  version: number;
  /** Da versão publicada, nunca do rascunho. */
  grafo: BotGraph;
  estado: BotSessionState;
  startedAt: Date;
}

/** Teto de duração: sessão mais velha que isto é encerrada em vez de retomada. */
export const SESSAO_MAX_MS = 24 * 60 * 60 * 1000;

export async function sessaoAtiva(conversationId: string): Promise<SessaoCarregada | null>;
export async function abrirSessao(organizationId: string, conversationId: string):
  Promise<SessaoCarregada | null>;
export async function encerrarSessao(conversationId: string, motivo: string): Promise<void>;
export async function gravarEvento(sessionId: string, nodeId: string | null,
  kind: string, detail: string): Promise<void>;

// executor.ts
export async function executarBot(
  organizationId: string,
  conversationId: string,
  texto: string
): Promise<{ atuou: boolean; enviadas: number }>;

// seed-triagem.ts
export async function criarFluxoTriagem(organizationId: string, userId: string):
  Promise<string>;
```

- [ ] `encerrarSessao` é idempotente: chamar duas vezes não gera erro.
- [ ] `sessaoAtiva` encerra e devolve `null` para sessão mais velha que
      `SESSAO_MAX_MS`. O relógio mora aqui, não no motor — o motor é puro e não
      chama `Date.now`. Uma sessão órfã de meses retomando do nó 4 mandaria ao
      cliente a metade de uma conversa que ele não lembra de ter começado.
- [ ] `abrirSessao` só abre quando existe fluxo com `is_trigger` **publicado**;
      sem fluxo devolve `null` e o bot simplesmente não atua.
- [ ] A sessão guarda `version`, e o executor carrega o grafo de
      `bot_flow_versions` — **nunca** de `bot_flows.graph`. É o que faz a
      conversa em andamento terminar na versão em que começou.
- [ ] `executarBot` roda o laço: `step` → executa ações → se a sessão não está
      esperando entrada e ainda há nó, `step` de novo. Envia por `sendText` e
      grava cada mensagem com `isFromBot: true`, `userId: null`.
- [ ] `CAPTURAR` grava em `contacts.custom_fields`, mesclando com o que já
      existe (não substituir o objeto inteiro).
- [ ] `TRANSFERIR` usa `routeConversation` da F3 quando `departmentId` é nulo.
- [ ] Todo `step` grava um `bot_event`. Sem trilha, "o bot mandou uma coisa
      estranha" é impossível de investigar.
- [ ] Ligar no webhook, **depois** do descadastro da F5 e só quando
      `duplicated === false`:
      reenvio da Evolution não pode executar o bot duas vezes.
- [ ] Envolver a chamada em `try/catch`: falha do motor encerra a sessão, deixa
      a conversa para um humano e a rota continua respondendo 200.
- [ ] Encerrar a sessão em: `sendCustomerMessage` (F3), `assignConversation`,
      `transferConversation`, e mensagem de entrada com `fromMe`.
- [ ] `criarFluxoTriagem` monta o grafo do menu de setores a partir dos
      `departments` da organização e o publica como versão 1. É o que torna a
      fase utilizável antes de existir canvas.
- [ ] `npx tsc --noEmit`
- [ ] Commit: `feat(bot): run flows from the webhook with a triage menu`

---

## Tarefa 3.5 — Retomada: o lead nunca fica sem atendimento

> Acrescentada depois da Tarefa 3, a pedido, ao se descobrir que a distribuição
> automática da F3 deixava o robô inalcançável: a conversa nova ganha dono na
> primeira mensagem, e o executor recusava atuar onde havia dono. Com qualquer
> atendente online, o bot nunca rodaria.

**Arquivos:** criar `prisma/migrations/f6-retomada/migration.sql`,
`lib/bot/reengage.ts`, `lib/bot/settings.ts`, `lib/bot/reengage-service.ts`,
`lib/bot/sweep.ts`, `app/api/cron/bot-reengage/route.ts`,
`lib/crm/__tests__/bot-reengage.test.ts`; alterar `lib/bot/executor.ts`,
`lib/bot/sessions.ts`, `app/api/webhook/whatsapp/route.ts`, `vercel.json`,
`lib/email/templates.ts`, `prisma/schema.prisma`.

**A regra, em duas situações que não merecem o mesmo tratamento:**

| | ABANDONO | FORA_DE_HORARIO |
|---|---|---|
| Quando | cliente esperando resposta humana há mais de N horas (padrão 24) | mensagem chega fora do expediente configurado |
| Devolve para a fila | **sim** — qualquer um da equipe pode assumir | **não** — o atendente não fez nada errado |
| Avisa quem a deixou parada | **sim** | não |
| Trava anti-insistência | sim, uma por período | não — responder quem escreveu nunca é insistência |

- [x] Migração: `bot_flows.is_reengage` + índice único parcial
      `bot_flows_reengage_key`; tabela `bot_settings`; índices da varredura.
      Contar linhas antes e depois.
- [x] Testes de `decidirRetomada` e `dentroDoExpediente` primeiro — fuso da
      organização e não do servidor, hora de fim exclusiva, domingo fora,
      abandono vencendo fora-de-horário, trava de insistência. Rodar: falham.
- [x] Implementar `lib/bot/reengage.ts` **puro**. Rodar: verde.
- [x] `esperandoDesde` é a mensagem mais antiga do cliente que **nenhuma pessoa**
      respondeu — não a última recebida. O webhook grava antes de chamar o robô,
      então "última mensagem do cliente" seria sempre agora.
- [x] Mensagem de robô não conta como resposta: a consulta filtra
      `userId: { not: null }`. É a disciplina de não assinar texto de robô com
      nome de gente que faz isso funcionar.
- [x] `abrirSessao(org, conversa, papel)` com papel `TRIGGER | REENGAGE`. A
      retomada cai no fluxo-gatilho quando não há fluxo de retomada publicado.
- [x] `transferir` nunca tira o dono quando a distribuição devolve `null`: às
      duas da manhã ninguém está online, e o nó de transferência roubaria a
      conversa de quem a tinha durante o dia.
- [x] Varredura (`/api/cron/bot-reengage`, mesmo segredo do disparo) para o lead
      que escreveu uma vez e desistiu — esse nunca produz webhook. Só ABANDONO;
      respeita opt-out e a janela de envio antes de falar com o cliente.
- [x] Sem fluxo publicado, a devolução para a fila e o e-mail acontecem do mesmo
      jeito: a parte que garante atendimento não depende de existir bot.
- [x] Verificação contra o banco real: 26/26, Evolution apontada para porta
      morta, banco devolvido ao estado inicial.
- [x] Commit: `feat(bot): retomar lead abandonado e cobrir fora do expediente`
- [x] **Aviso pelo WhatsApp** (pedido depois): sai pelo número central para
      `users.phone`; o e-mail vira reserva, para quem não tem telefone ou
      quando a Evolution recusa. A rota usada entra na trilha do contato.
- [x] `isNumeroInterno` no webhook, **obrigatório junto com o aviso**: a
      Evolution ecoa o que a instância envia com o `remoteJid` do
      DESTINATÁRIO, então sem o filtro o primeiro aviso viraria um contato com
      o nome do atendente e o menu de triagem seria oferecido à equipe.
- [x] Verificação: 16/16 com uma Evolution falsa local, 8/8 na rota HTTP real.
- [x] Commit: `feat(bot): avisar o atendente pelo WhatsApp e ignorar numeros internos`

---

## Tarefa 4 — Validação e publicação imutável

**Arquivos:** criar `lib/bot/validate.ts`, `lib/bot/flows.ts`,
`lib/crm/__tests__/bot-validate.test.ts`.

**Produz:**

```ts
// validate.ts — puro
export interface ProblemaGrafo {
  nodeId: string | null;
  /** Frase pronta para a tela, dizendo o que fazer. */
  mensagem: string;
}
export function validateGraph(grafo: BotGraph): ProblemaGrafo[];

// flows.ts
export interface FlowDTO {
  id: string;
  name: string;
  status: FlowStatus;
  isTrigger: boolean;
  /** Fluxo de retomada (Tarefa 3.5). No máximo um por organização. */
  isReengage: boolean;
  publishedVersion: number | null;
  updatedAt: string;
  createdByName: string | null;
}

export interface FlowDetailDTO extends FlowDTO {
  /** O rascunho, que é o que o canvas edita. */
  graph: BotGraph;
  /** Problemas da validação corrente, para a tela avisar antes de publicar. */
  problemas: ProblemaGrafo[];
}

export async function listFlows(session): Promise<FlowDTO[]>;
export async function getFlow(session, id): Promise<FlowDetailDTO | null>;
export async function saveFlow(session, input: { id?: string; name: string;
  graph: BotGraph }): Promise<FlowDTO>;                      // Administrador+
export async function publishFlow(session, id): Promise<
  { ok: true; version: number } | { ok: false; problemas: ProblemaGrafo[] }>;
export async function setFlowRole(session, papel: PapelDoFluxo,
  flowId: string | null): Promise<void>;   // null tira o papel de todos
export async function deleteFlow(session, id): Promise<boolean>;
```

- [x] Testes de `validateGraph` primeiro:
  - grafo vazio → problema "sem nó de início";
  - dois START → problema;
  - nó inalcançável a partir do START → problema apontando o `nodeId`;
  - ~~QUESTION sem opções → problema~~ — **corrigido na execução**: o motor
    trata pergunta sem opções como campo livre de propósito (é assim que se
    pede um e-mail). O defeito é ela não levar a lugar nenhum, e é isso que a
    regra verifica;
  - QUESTION com opção sem aresta correspondente → problema;
  - aresta apontando para nó inexistente → problema;
  - ciclo sem saída alcançável → problema;
  - grafo do menu de triagem (o da Tarefa 3) → **zero problemas**.
- [x] Rodar: falham. Implementar. Rodar: verde. (16 testes)
- [x] `publishFlow` recusa publicar com problemas e devolve a lista — publicar é
      o único momento de barrar um fluxo quebrado antes de ele alcançar um
      cliente.
- [x] Publicar copia o grafo para `bot_flow_versions` com `version + 1` e nunca
      altera versão anterior.
- [x] `setFlowRole` desmarca o papel anterior na mesma transação: os índices
      parciais recusariam dois. Recusa pôr rascunho no ar — o robô filtra por
      PUBLISHED, então seria silêncio com aparência de sucesso.
- [x] `deleteFlow` recusa apagar fluxo no ar ou que já atendeu alguém: as FKs
      são CASCADE e levariam junto sessões e eventos.
- [x] Verificação contra o banco real: 29/29.
- [x] `npx tsc --noEmit`
- [x] Commit: `feat(bot): validate graphs and publish immutable versions`

---

## Tarefa 5 — Nó de IA com travas

**Arquivos:** criar `lib/bot/ai-node.ts`, `lib/crm/__tests__/bot-ai.test.ts`;
modificar `lib/bot/executor.ts`, `lib/ai/prompts.ts`.

**Consome:** `generate()` de `lib/ai/gemini.ts` (F4), `getAiSettings` (F4).

**Produz:**

```ts
export const PALAVRAS_SENSIVEIS: string[];   // preço, contrato, cancelamento…
export const MARCA_NAO_SEI = '[NAO_SEI]';

/** Puro. Verdadeiro quando a mensagem exige uma pessoa. */
export function exigeHumano(texto: string): boolean;

/** Puro. Decide o que fazer com o que o Gemini devolveu. */
export function avaliarRespostaIa(resposta: string, trocas: number):
  | { tipo: 'RESPONDER'; texto: string }
  | { tipo: 'TRANSFERIR'; motivo: string };

export function botSystemPrompt(base: string, tom: string): string;

export async function responderComIa(organizationId: string, conversationId: string,
  pergunta: string, trocas: number): Promise<
  { tipo: 'RESPONDER'; texto: string } | { tipo: 'TRANSFERIR'; motivo: string }>;
```

- [x] Testes primeiro, todos puros:
  - "quero falar com um atendente" → `exigeHumano` verdadeiro;
  - "qual o preço?" e "quero cancelar" → verdadeiro (palavra sensível);
  - "qual o horário de vocês?" → falso;
  - resposta contendo `MARCA_NAO_SEI` → `TRANSFERIR`;
  - `trocas >= TETO_TROCAS_IA` → `TRANSFERIR` mesmo com resposta boa;
  - resposta vazia → `TRANSFERIR`, nunca enviar vazio;
  - resposta normal na primeira troca → `RESPONDER`.
- [x] Rodar: falham. Implementar. Rodar: verde.
- [x] `botSystemPrompt` manda o modelo responder **só** com a base de
      conhecimento e escrever exatamente `[NAO_SEI]` quando não souber. Reusar
      a defesa contra injeção da F4 (`DEFESA_INJECAO` em `lib/ai/prompts.ts`).
- [x] Base de conhecimento vazia → transfere sem chamar o Gemini. Não gastar
      chamada para inventar resposta.
- [x] IA desligada em `AiSettings.enabled` → transfere.
- [x] Falha do Gemini → transfere. `generate()` nunca lança (F4).
- [x] `executarBot` incrementa `ai_turns` a cada troca e realimenta a resposta
      como `respostaIa` na próxima chamada de `step`.
- [x] `npx tsc --noEmit`
- [x] **Correção no motor, encontrada aqui:** depois de entregar a resposta da
      IA ele voltava a caminhar a partir do próprio nó de IA, com o texto do
      cliente ainda em mãos, e perguntava de novo — uma pergunta virava três
      respostas em rajada, e o teto de trocas virava o gatilho da metralhadora.
      Agora o nó de IA é uma conversa por turnos: uma mensagem, uma resposta.
- [x] `DEFESA_INJECAO` passou a ser exportada de `lib/ai/prompts.ts`.
- [x] Verificação contra o banco real: 21/21, incluindo duas chamadas reais ao
      Gemini (dentro e fora da base). Base de conhecimento restaurada.
- [x] Commit: `feat(bot): add the grounded AI node with handoff limits`

---

## Tarefa 6 — Rotas HTTP

**Arquivos:** criar `app/api/crm/bot/flows/route.ts`,
`app/api/crm/bot/flows/[id]/route.ts`,
`app/api/crm/bot/flows/[id]/publish/route.ts`,
`app/api/crm/bot/simulate/route.ts`.

**Consome:** `listFlows`, `saveFlow`, `publishFlow`, `setTriggerFlow`,
`deleteFlow` da Tarefa 4; `step` da Tarefa 2.

- [ ] `GET /api/crm/bot/flows` — lista. Qualquer papel com `viewCRM`.
- [ ] `POST /api/crm/bot/flows` — cria. Administrador+.
- [ ] `GET|PATCH|DELETE /api/crm/bot/flows/[id]` — 404 quando não existe **ou**
      é de outra organização.
- [ ] `POST /api/crm/bot/flows/[id]/publish` — publica; **422** com a lista de
      problemas quando a validação recusa (não é erro do servidor, e não é
      "não autorizado": é o fluxo que está quebrado).
- [ ] `POST /api/crm/bot/simulate` — roda `step` sobre um grafo enviado no
      corpo, **sem tocar no banco e sem enviar nada**. É o que alimenta o
      simulador da Tarefa 8.
- [ ] A rota de simulação não aceita `flowId`: recebe o grafo. Assim ela nunca
      pode, por engano, executar sobre uma conversa real.
- [ ] `npx tsc --noEmit`
- [ ] Commit: `feat(bot): add flow and simulation endpoints`

---

## Tarefa 7 — Canvas

**Arquivos:** criar `components/crm/bot/flow-canvas.tsx`,
`components/crm/bot/node-palette.tsx`, `components/crm/bot/node-inspector.tsx`,
`components/crm/bot/bot-nodes.tsx`; modificar `package.json`.

- [ ] `npm install @xyflow/react`. Conferir que o build continua passando —
      é a primeira dependência de UI pesada do projeto.
- [ ] Um componente de nó por tipo, no design escuro/dourado existente
      (`var(--primary-color)`, `var(--theme-surface)`, `var(--theme-border)`).
      Cada tipo com ícone e cor próprios: num canvas, forma e cor são como se
      lê o fluxo de longe.
- [ ] Alças de saída nomeadas: QUESTION uma por opção, CONDITION duas
      (`true`/`false`). O `sourceHandle` da aresta é o que o motor lê.
- [ ] `node-inspector` edita o nó selecionado: texto, opções, campo de captura,
      setor de destino.
- [ ] Salvar posição junto com o grafo — o motor ignora `position`, o editor
      precisa dela.
- [ ] Botão publicar mostrando os problemas da validação **ancorados no nó**,
      não uma lista solta: um problema que não diz onde é um problema que
      ninguém conserta.
- [ ] `npx tsc --noEmit` e `npm run build`
- [ ] Commit: `feat(bot): add the React Flow canvas and node inspector`

---

## Tarefa 8 — Tela, simulador e sidebar

**Arquivos:** criar `app/(dashboard)/atendimento-automatico/page.tsx`,
`components/crm/bot/flow-simulator.tsx`, `components/crm/bot/flow-list.tsx`;
modificar `components/sidebar.tsx`.

- [ ] Tela com lista de fluxos à esquerda e canvas à direita.
- [ ] Simulador: conversa de mentira ao lado do canvas, chamando
      `/api/crm/bot/simulate`. Nenhuma mensagem sai, nada é gravado.
- [ ] O simulador mostra **qual nó está ativo** a cada passo — é assim que se
      descobre que a opção "3" não leva a lugar nenhum.
- [ ] Marcar um fluxo como gatilho exige confirmação dizendo o que muda: a
      partir dali o robô fala com clientes reais. O mesmo vale para marcá-lo
      como fluxo de **retomada**.
- [ ] Configuração da retomada (Tarefa 3.5) na tela: interruptor, horas até
      considerar abandono, dias e horário de expediente, fuso, aviso por
      e-mail. Chama `saveBotSettings`.
- [ ] Sidebar: "Atendimento automático" depois de "Disparos",
      `permissionKey: 'viewCRM'`, ícone `Bot`.
- [ ] Estado vazio com um botão "criar menu de triagem", chamando
      `criarFluxoTriagem` da Tarefa 3.
- [ ] `npx tsc --noEmit` e `npm run build`
- [ ] Commit: `feat(bot): add the automation screen and flow simulator`

---

## Tarefa 9 — Verificação ponta a ponta

- [ ] `npx vitest run` — verdes, incluindo os 205 anteriores.
- [ ] `tsc --noEmit` código de saída 0, `npm run build` passando.
- [ ] **Um dev server só.**
- [ ] Contra o banco real, com a Evolution apontada para porta morta (nenhuma
      mensagem sai da máquina, como na F5):
  - [ ] Webhook de contato novo → bot abre sessão e envia o menu.
  - [ ] Resposta "2" → transfere para o setor certo e **encerra a sessão**.
  - [ ] Resposta inválida ("abc") → repete o menu, não transfere, não cala.
  - [ ] Reenvio do mesmo `externalId` → `duplicated`, bot **não** executa de
        novo; nenhuma mensagem a mais.
  - [ ] Nó de captura grava em `contacts.custom_fields` sem apagar o que havia.
  - [ ] Resposta humana (`sendCustomerMessage`) encerra a sessão; a mensagem
        seguinte do cliente **não** aciona o bot.
  - [ ] Grafo com ciclo → para em `TETO_NOS`, transfere, grava o motivo. Contar
        as mensagens enviadas: no máximo `TETO_MENSAGENS`.
  - [ ] Editar e republicar o fluxo com uma sessão em andamento → a sessão
        continua na versão antiga.
  - [ ] Publicar fluxo inválido → 422 com problemas, nada publicado.
  - [ ] Toda mensagem do bot tem `isFromBot: true` e **nenhuma assinatura**.
  - [ ] Nó de IA com base vazia → transfere sem chamar o Gemini.
  - [ ] Nó de IA com base preenchida e pergunta sensível ("qual o preço?") →
        transfere.
  - [ ] `/atendimento-automatico` responde.
- [ ] Remover os dados de verificação e conferir as contagens.
- [ ] Registrar o que **não** foi verificado.
- [ ] Commit final e relatório consolidado.
