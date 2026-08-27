# F3 — Inbox multiatendente

**Data:** 2026-08-27
**Fases anteriores:** [F0 — auth de servidor](2026-08-26-crm-whatsapp-f0-auth-servidor-design.md) · [F1 — fundação de dados](2026-08-27-crm-whatsapp-f1-fundacao-dados-design.md) · [F2 — Kanban real](2026-08-27-crm-whatsapp-f2-kanban-real-design.md)

---

## 1. Objetivo

Fazer o WhatsApp chegar. Hoje o webhook da Evolution API recebe as mensagens,
interpreta o payload e **não grava nada** — devolve um eco e o conteúdo se perde
no log. A F3 fecha esse circuito nos dois sentidos: o que o cliente manda vira
histórico persistido, e o que o atendente escreve sai pelo número central da
empresa.

Três atendentes precisam trabalhar na mesma caixa sem pisar um no outro. Isso
exige distribuição, setorização e uma regra de visibilidade que já existe para
oportunidades e passa a valer para conversas.

Ao final da F3 a operação atende pelo sistema. Sem IA, sem bot, sem disparo em
massa — só atendimento humano, registrado.

---

## 2. Ponto de partida

A F1 construiu mais alicerce do que a F2 consumiu. O que já está pronto:

| Existe | Onde | Estado |
|---|---|---|
| `Conversation`, `Message` | `prisma/migrations/f1-crm/` | Tabelas criadas, **zero linhas** |
| Idempotência de webhook | índice `messages_org_external_key` | Pronto, nunca exercitado |
| Uma conversa por número | índice `conversations_org_external_key` | Pronto — ver §7 |
| Proxy da Evolution autenticado | `app/api/evolution/proxy/route.ts` | Fecha SSRF, exige sessão |
| Normalização E.164 | `lib/crm/phone.ts` | `phoneFromWhatsAppJid` já existe |
| Contato por telefone | `lib/crm/contacts.ts` | `findOrCreateByPhone` já existe |
| Regra de visibilidade | `lib/crm/visibility.ts` | Só cobre oportunidades |
| Papéis e ranking | `lib/auth/roles.ts` | `hasAtLeastRole` serve para "quem atende" |

O webhook em `app/api/webhook/whatsapp/route.ts` já extrai telefone, `pushName`,
`fromMe` e texto de seis formatos diferentes de mensagem. Esse trabalho de parse
é aproveitado, extraído para um módulo puro e testado.

### O que está errado hoje

**O webhook não tem autenticação.** Ele está isento da sessão no middleware —
correto, porque a Evolution não tem cookie — mas não coloca nada no lugar. Hoje
isso é inofensivo: a rota não escreve no banco. A partir da F3 ela escreve, e um
endpoint de escrita aberto na internet é como se envenena uma caixa de entrada.

**`departments.name` é único global.** O comentário no schema diz, com todas as
letras, "corrigir quando a F3 usar setorização". É agora.

---

## 3. Fora de escopo

Deliberadamente ausentes, cada um com dono:

- **Copiloto de IA, sugestão de resposta, transcrição de áudio** — F4. Áudio
  entra como `[Mensagem de áudio]` com a mídia registrada; a transcrição é uma
  coluna já existente e vazia.
- **Disparo em massa, respostas rápidas, anti-ban, fila** — F5.
- **Bot builder, atendimento automático, menu de setor** — F6. Na F3 nenhum robô
  responde; toda conversa nasce para um humano.
- **Chat de equipe separado** — decidido fora de escopo: o "chat interno" do PRD
  vira nota interna dentro da conversa (§9).
- **Card automático no Kanban** — decidido fora de escopo: mensagem de número
  desconhecido cria contato e conversa, nunca card (§6).

---

## 4. Fluxo de entrada

```
Evolution API
   │  POST /api/webhook/whatsapp?token=<EVOLUTION_WEBHOOK_TOKEN>
   ▼
verifica token (comparação de tempo constante)  ──── falha ──▶ 401, nada gravado
   │
   ▼
parseEvolutionEvent(payload)          lib/crm/inbound.ts — função pura
   │  descarta: grupos (@g.us), status@broadcast, evento sem texto e sem mídia
   ▼
findOrCreateByPhone(org, telefone, pushName)      contato
   │
   ▼
findOrCreateConversation(org, contato, canal)     conversa
   │      nova? ──▶ routeConversation()  §8
   ▼
createInboundMessage(...)  externalId = key.id
   │      já existe esse externalId? ──▶ encerra em silêncio (reenvio do gateway)
   ▼
conversation.lastMessageAt = agora
conversation.unreadCount += 1
conversation.updatedAt = agora            ← é o que o polling observa
   │
   ▼
dealCard vinculado? ──▶ lastMessageText, lastMessageAt
   │
   ▼
200 OK
```

### Por que 200 mesmo quando o payload é ruim

A Evolution reenvia webhooks que não recebem 2xx. Um payload que não sabemos
interpretar, respondido com 500, vira uma tempestade de retentativas sobre a
mesma mensagem defeituosa. O único caso que responde erro é token inválido —
aí a retentativa é justamente o que não queremos alimentar.

Tudo o que for descartado é registrado no log do servidor com o motivo.

---

## 5. Autenticação do webhook

`EVOLUTION_WEBHOOK_TOKEN` no ambiente do servidor. A rota aceita o token por
header `x-webhook-token` ou por query `?token=`, comparados com
`crypto.timingSafeEqual` sobre buffers de tamanho igualado — comparação com
`===` vaza o prefixo correto pelo tempo de resposta.

**Falha fechada.** Variável ausente, a rota responde 503 e não grava. Não existe
modo permissivo: um webhook de escrita sem segredo é o mesmo que não ter
segredo. O custo é uma linha de configuração no painel da Evolution, e ela está
no relatório de entrega.

---

## 6. O que a entrada cria — e o que não cria

Toda mensagem cria **Contato** e **Conversa**. Nunca cria card no funil.

O Inbox é onde o volume mora: engano de número, disparo de lista, cliente antigo
tirando dúvida, spam. O Kanban é curadoria comercial — se cada número novo
virasse card, alguém teria que limpar o quadro toda manhã, e um quadro que
precisa de faxina para de ser lido.

A promoção é explícita: o botão **"Criar oportunidade"** no painel de contato do
Inbox cria o `DealCard` na primeira etapa do funil e o vincula à conversa
(`conversation.dealCardId`). Daí em diante as duas telas compartilham histórico:
a última mensagem aparece no card, e o card aparece no Inbox.

Contato que já existe pelo telefone é reaproveitado, com o `pushName` do
WhatsApp preenchendo o nome apenas se o contato ainda não tiver um nome próprio
— um contato cadastrado como "Dra. Helena Braga" não deve virar "helena 💅✨"
porque foi assim que ela se nomeou no aparelho.

---

## 7. Uma conversa por número

O índice `conversations_org_external_key` é único sobre
`(organization_id, channel, external_id)`. Como `external_id` guarda o JID do
WhatsApp, o banco já decidiu: **existe no máximo uma conversa por número por
canal, para sempre.**

Portanto, mensagem que chega numa conversa `CLOSED` **reabre** a conversa
(`status = OPEN`, `closedAt = null`) e volta para a distribuição. Não se cria uma
segunda thread.

Isso é bom e ruim, e vale registrar os dois lados. Bom: o histórico do cliente é
contínuo e ninguém precisa caçar atendimentos anteriores. Ruim: não existe o
conceito de "ticket" com começo e fim, então métricas do tipo "tempo médio de
atendimento" não têm onde se apoiar. Se isso passar a importar, a saída é uma
tabela `attendances` marcando janelas dentro da conversa — não fragmentar a
conversa.

### Os três estados

| Status | Significado | Como se chega |
|---|---|---|
| `OPEN` | Ativa. Com responsável, ou **na fila** se `assignedUserId` é nulo | Padrão de toda conversa nova ou reaberta |
| `PENDING` | Em espera deliberada ("aguardando o cliente decidir") | Só por ação do atendente |
| `CLOSED` | Encerrada | Só por ação do atendente |

"Na fila" não é um quarto status — é `OPEN` sem responsável. Um estado a menos
para manter coerente.

---

## 8. Setorização e distribuição

### Setor

Com um número central e sem bot, não há como perguntar ao cliente com quem ele
quer falar. Toda conversa nova entra no **setor padrão da organização**, e o
atendente transfere se for o caso.

Isso exige uma coluna: `departments.is_default_inbox`. Um setor padrão por
organização, garantido por índice único parcial. A migração marca o primeiro
setor existente (ordem determinística por `created_at`, depois `id`).

Na mesma migração, `departments.name` deixa de ser único global e passa a ser
único por organização — a dívida que o schema já apontava.

### Escolha do atendente

Quem pode atender: rank de **Editor para cima** (`hasAtLeastRole(role, 'Editor')`),
com `status = 'ATIVO'`. Cliente e Usuário nunca recebem conversa.

O algoritmo é **menos ocupado, entre quem está online**:

```
candidatos = usuários ATIVO do setor,
             com rank ≥ Editor,
             ativos nos últimos 15 minutos

se candidatos vazio  ──▶  deixa na fila (assignedUserId = null, status OPEN)

senão                ──▶  o de menor número de conversas OPEN
                          empate: o que recebeu conversa há mais tempo
                          empate: menor id (determinístico)
```

**Por que "menos ocupado" e não rodízio estrito.** Rodízio exige uma coluna de
cursor e distribui mal quando as conversas têm durações diferentes: quem pegou
três clientes difíceis continua recebendo no mesmo ritmo de quem despachou três
"obrigado, tchau". Contar conversas abertas não guarda estado nenhum, se
autocorrige e sobrevive a alguém sair de férias.

**Por que "entre quem está online".** Atribuir a uma pessoa ausente é como
arquivar a mensagem: ela some da fila de todo mundo e ninguém responde. Fila
visível ao setor inteiro é melhor do que caixa de entrada de quem foi almoçar.
Qualquer atendente do setor pode assumir uma conversa da fila com um clique.

**Como sabemos quem está online.** `users.last_active_at`, atualizado pelo
próprio polling do Inbox (§11) — quem está com a tela aberta está online, por
definição. A escrita é limitada a uma por minuto por atendente com um
`updateMany` condicional; sem isso seriam trinta escritas por minuto por pessoa.

---

## 9. Nota interna

O "chat interno" do PRD é uma nota dentro da conversa do cliente: a equipe lê, o
cliente nunca recebe. É onde o contexto de fato mora — "já é aluno desde 2024",
"passei pro Marcio, ele conhece o caso" — e é o que inbox omnichannel quer dizer
com a expressão.

Implementação: `Message.direction = 'INTERNAL'`. A coluna é `VARCHAR(10)` e
cabe. Nota interna tem `userId`, nunca conta em `unreadCount` e **nunca toca a
Evolution API**.

Essa última garantia não é comentário, é estrutura: enviar e anotar são duas
rotas e duas funções distintas, e a função de nota não importa o cliente da
Evolution. Não existe caminho de código em que um `if` errado publica uma nota
interna para o cliente.

```
POST /api/crm/conversations/[id]/messages   → responde ao cliente (envia)
POST /api/crm/conversations/[id]/notes      → anota para a equipe (não envia)
```

Menção a colega (`@fulano` notificando) fica fora: exige camada de notificação e
a F3 já é larga.

---

## 10. Assinatura do atendente

Mensagem enviada por humano sai prefixada com `*Primeiro nome*` e uma quebra de
linha. Cliente atendido por três pessoas diferentes precisa saber com quem está
falando; sem isso o número central vira uma entidade sem rosto.

Ligada por padrão, desligável em `Organization.features.agentSignature = false`
— o campo `features` já é um JSON existente, então isto não custa migração.
Mensagem de robô (F6) nunca recebe assinatura.

**A assinatura é aplicada no fio, não no banco.** `Message.content` guarda o que
o atendente digitou; `Message.userId` já registra quem foi. Guardar o texto
assinado faria toda bolha da interface repetir "*Marcio*" ao lado do nome do
Marcio. O custo é que a coluna não é literalmente o que trafegou — está
documentado no código, onde importa.

---

## 11. Tempo real

Não é SSE. A escolha original foi revista com um dado que não estava na mesa: na
Vercel, uma conexão SSE mantém uma função aberta, cobrando ~60 s de compute por
minuto **por atendente logado**. Polling com cursor custa ~1 s de compute por
minuto, e a diferença que o atendente percebe é de milissegundos.

```
GET /api/crm/inbox/updates?since=<ISO>&conversationId=<id?>

→ {
    now: ISO,                  // próximo cursor
    conversations: [...],      // visíveis a mim, com updatedAt > since
    messages: [...],           // da conversa aberta, com createdAt > since
    queueCount: n
  }
```

Cadência adaptativa no cliente: **2 s** com a aba em foco, **15 s** em segundo
plano (`document.visibilityState`). Ninguém precisa de latência de dois segundos
numa aba que não está sendo olhada.

**Sobreposição de um segundo no cursor.** O cursor é um instante, e duas linhas
podem ser gravadas no mesmo milissegundo, ou o relógio do banco pode divergir do
da função. Perder uma mensagem por isso seria um defeito difícil de reproduzir e
grave quando acontecesse. O cliente consulta a partir de `since - 1s` e descarta
duplicados por id — barato, e não perde linha.

Tudo isso fica atrás de `useInboxStream()`. O componente não sabe se por baixo
há polling, SSE ou websocket; trocar depois é um arquivo.

---

## 12. Visibilidade das conversas

Espelha `dealVisibilityFilter`, com o setor no lugar do sigilo:

```
Administrador ou acima  →  tudo da organização

Editor                  →  conversas atribuídas a mim
                        OU conversas na fila do meu setor
                        OU conversas na fila sem setor
```

Um Editor sem setor definido é generalista: enxerga a fila sem setor. Um Editor
do Comercial não enxerga a fila do Suporte — é para isso que setor existe.

Como na F2, a regra vive na cláusula `where`, não na interface. Registro fora do
alcance responde **404**, nunca 403: 403 confirma que o registro existe.

---

## 13. Migração `f3-inbox`

Idempotente, como as anteriores. Roda por `npm run db:migrate f3-inbox`.

| # | Statement | Motivo |
|---|---|---|
| 1 | `departments` ganha `is_default_inbox boolean not null default false` | Setor de entrada (§8) |
| 2 | Remove o unique global de `departments.name` | Dívida registrada no schema da F0 |
| 3 | Unique `(organization_id, name)` em `departments` | O que deveria ter sido desde o início |
| 4 | Unique parcial `(organization_id) where is_default_inbox` | Um setor padrão por organização, garantido pelo banco |
| 5 | Marca o setor padrão de cada organização que ainda não tem | Backfill determinístico |
| 6 | Índice `conversations (organization_id, assigned_user_id, status)` | Caixa de um atendente e contagem do balanceamento |
| 7 | Índice `conversations (organization_id, updated_at DESC)` | Cursor do polling (§11) |
| 8 | Índice `conversations (organization_id, contact_id)` | `findOrCreateConversation` |

Nenhum `DROP TABLE`, nenhuma coluna removida, nenhum dado destruído. Os 33
mentorados, 5 cursos e 4 setores existentes continuam intactos — verificado
antes e depois, como nas fases anteriores.

---

## 14. Estrutura de arquivos

```
lib/crm/
  inbound.ts          parse do payload da Evolution — função pura, sem I/O
  routing.ts          setor padrão e escolha de atendente
  conversations.ts    visibilidade, listagem, atribuir, transferir, encerrar
  messages.ts         gravar entrada, responder, anotar
  inbox-types.ts      DTOs do Inbox
  use-inbox.ts        hook de estado + polling

lib/evolution/
  server.ts           envio server-to-server; credenciais do ambiente

app/api/
  webhook/whatsapp/route.ts                  reescrita: autentica e grava
  crm/conversations/route.ts                 GET lista
  crm/conversations/[id]/route.ts            GET detalhe · PATCH atribuir/status/lida
  crm/conversations/[id]/messages/route.ts   POST responde ao cliente
  crm/conversations/[id]/notes/route.ts      POST nota interna
  crm/inbox/updates/route.ts                 GET cursor

components/crm/inbox/
  conversation-list.tsx   fila + minhas conversas, com filtros
  conversation-item.tsx   linha da lista: avatar, prévia, não lidas, setor
  message-thread.tsx      histórico rolável
  message-bubble.tsx      entrada · saída · nota interna (três tratamentos)
  composer.tsx            caixa de texto com alternância responder/anotar
  contact-panel.tsx       dados do contato, oportunidade vinculada, ações

app/(dashboard)/inbox/page.tsx               três colunas
```

`lib/evolution/server.ts` existe porque `lib/evolution-api.ts` é `'use client'` e
fala com o proxy — o servidor não deve dar a volta pelo próprio proxy para
alcançar a Evolution.

### Interface

Três colunas, o padrão do gênero, pelo motivo de sempre: a conversa precisa de
largura, a lista precisa estar sempre visível e o contexto do contato não pode
custar um clique. Sem invenção de layout aqui.

Componentes da F2 reaproveitados sem alteração: `ChannelBadge`, `SlaLabel`,
`relativeTime`. Cores por variável de tema, como o resto do app.

Na barra lateral, **"Inbox (Atendimento)"** logo abaixo de CRM, com
`permissionKey: 'viewCRM'`. Não criei chave de permissão nova: o Inbox é parte do
módulo de CRM, e uma chave nova exigiria migração da matriz de permissões para
entregar exatamente a mesma resposta.

---

## 15. Casos de borda

| Situação | Comportamento |
|---|---|
| Mensagem de grupo (`@g.us`) | Descartada com log. Atendimento em grupo é outro produto |
| `status@broadcast` | Descartada com log |
| Reenvio do mesmo `key.id` | Índice único barra; encerra em silêncio, sem erro |
| Mensagem enviada pelo celular (`fromMe`) | Gravada como `OUTBOUND` sem `userId` — foi alguém pelo aparelho, não pelo sistema |
| Áudio, imagem, documento | Gravados com `contentType` e `mediaUrl`; `content` recebe o rótulo. Transcrição é F4 |
| Nenhum atendente online | Fica na fila, visível ao setor. Nada se perde |
| Evolution fora do ar no envio | `Message` gravada com `status = 'FAILED'`; a interface mostra e oferece reenviar |
| Envio sem `EVOLUTION_API_URL` | 503 com mensagem explícita; nada é gravado como enviado |
| Conversa de outra organização | 404 |
| Atendente tenta abrir conversa de outro setor | 404 |
| Contato sem telefone | Não pode receber resposta; o compositor explica em vez de falhar no envio |

---

## 16. Testes

Unitários (Vitest), sobre o que é lógica pura e o que quebra em silêncio:

- `inbound.ts` — os seis formatos de mensagem que o webhook atual conhece, mais
  grupo, broadcast, `fromMe` e payload vazio.
- `routing.ts` — menos ocupado; empate por tempo; ninguém online devolve fila;
  Cliente e Usuário nunca entram nos candidatos.
- `conversations.ts` — a cláusula de visibilidade para Master, Administrador,
  Editor com setor e Editor sem setor.
- Assinatura — aplicada no fio, ausente no `content`, ausente em nota interna,
  ausente quando `features.agentSignature === false`.

Verificação ponta a ponta contra o banco real, como nas fases anteriores:
webhook sem token → 401; com token → grava contato, conversa e mensagem; reenvio
do mesmo `key.id` → nenhuma duplicata; nota interna não sai; conversa de outra
organização → 404; polling devolve a mensagem nova dentro da janela.

---

## 17. Riscos e dívidas

**Registradas nesta fase:**

- Sem métrica de "tempo de atendimento" enquanto não existir conceito de ticket
  (§7). Consequência aceita da conversa perpétua.
- Mídia é referenciada pela URL que a Evolution devolve, não copiada para
  armazenamento próprio. Se a instância for recriada, imagens antigas quebram.
  Copiar mídia exige um bucket e entra quando houver um.
- Presença é "teve a tela aberta nos últimos 15 minutos", não presença real.
  Suficiente para não atribuir a quem foi embora.
- Nota interna não notifica ninguém. Quem não abrir a conversa não fica sabendo.

**Herdadas, ainda abertas:**

- `lib/neon-db.ts:57` — `queryNeon` engole erro de banco e devolve `[]`.
- Sem limite de tentativas de login, apesar de `login_attempts` existir.
- Código de recuperação de senha vai para o log do servidor, não para e-mail.
- `crm_leads` (vazia) sobrevive até a F4 aposentar `lib/crm-db.ts`.
- `lib/crm/adapters.ts` sai quando a F4 reescrever o drawer do lead.

---

## 18. Critérios de conclusão

- [ ] Mensagem enviada ao número da empresa aparece no Inbox em até 2 s.
- [ ] Resposta do atendente chega ao WhatsApp do cliente, assinada.
- [ ] Reenvio do mesmo webhook não duplica mensagem.
- [ ] Webhook sem token não grava nada.
- [ ] Conversa nova vai para quem tem menos conversas abertas e está online.
- [ ] Sem ninguém online, a conversa fica na fila e pode ser assumida.
- [ ] Nota interna aparece para a equipe e não trafega para o cliente.
- [ ] Editor não enxerga conversa de outro atendente nem fila de outro setor.
- [ ] "Criar oportunidade" gera o card e vincula à conversa.
- [ ] `tsc --noEmit` limpo, build de produção passando, testes verdes.
- [ ] Os dados existentes continuam intactos.
