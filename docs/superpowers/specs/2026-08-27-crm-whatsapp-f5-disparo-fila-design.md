# F5 — Disparo, fila e anti-bloqueio

**Data:** 2026-08-27
**Fases anteriores:** [F0](2026-08-26-crm-whatsapp-f0-auth-servidor-design.md) · [F1](2026-08-27-crm-whatsapp-f1-fundacao-dados-design.md) · [F2](2026-08-27-crm-whatsapp-f2-kanban-real-design.md) · [F3](2026-08-27-crm-whatsapp-f3-inbox-multiatendente-design.md) · [F4](2026-08-27-crm-whatsapp-f4-copiloto-gemini-design.md)

---

## 1. Objetivo

Tirar o disparo em massa do navegador e colocá-lo numa fila no banco, com
proteção contra bloqueio do número. Junto vêm as respostas rápidas para o
atendente e o envio por e-mail do código de recuperação de senha — dívida que
a F0 registrou com o nome desta fase.

---

## 2. O que está errado hoje

Existe disparo em massa: `sendWhatsAppBroadcastToAll`, chamado pela tela de
eventos. Ele **roda no navegador**, em laço, com intervalo fixo de 1500 ms.

| Problema | Consequência |
|---|---|
| Roda no cliente | Fechar a aba mata o disparo no meio. Ninguém sabe onde parou |
| Não grava nada | Não há registro de quem recebeu o quê. O cliente responde e o atendente não sabe do que se trata |
| Intervalo fixo | Cadência perfeitamente regular **é** assinatura de robô. O anti-bloqueio atual aumenta o risco que pretende reduzir |
| Sem retomada | Uma falha de rede no meio perde o resto da lista |
| Sem descadastro | Quem pediu para parar continua recebendo |
| Sem janela de horário | Nada impede um disparo às 3 da manhã |

O que existe hoje não é uma implementação incompleta de fila; é o oposto de
uma fila. A F5 substitui.

---

## 3. Três decisões que eu tomei

O aplicativo reiniciou no meio da pergunta que eu faria. Escolhi, em cada caso,
a opção que **não prende** a decisão futura.

**Fila drenada por endpoint com segredo, não por cron específico.** O Vercel
Cron no plano Hobby roda no máximo uma vez por dia, o que é inútil para uma
fila. Em vez de exigir plano Pro, o worker é um endpoint protegido por
`CRON_SECRET` que qualquer agendador chama: Vercel Cron em qualquer plano, um
cron externo gratuito, ou a própria tela de disparo enquanto estiver aberta.
Trocar de agendador depois não muda uma linha de código.

**E-mail por camada neutra, com o driver escolhido por ambiente.** Sem
`RESEND_API_KEY` configurada, o código continua saindo no log — mas agora com
aviso alto, e não silenciosamente. Configurada, passa a sair por e-mail sem
mudança de código. Envio HTTP puro, sem SDK: uma dependência a menos.

**Descadastro automático.** Cliente que responde "PARE" ou "SAIR" para de
entrar em qualquer disparo, reversível na ficha. É exigência da LGPD, e
continuar mandando para quem pediu para parar é o caminho mais curto para
denúncia e bloqueio do número.

---

## 4. Fora de escopo

- **Bot que responde sozinho** — F6.
- **Migrar os modelos de mensagem do `localStorage`.** `lib/whatsapp-automations.ts`
  guarda modelos no navegador e é usado por três telas (eventos, configurações,
  ficha do mentorado). As respostas rápidas desta fase são um recurso novo, no
  banco, para o Inbox — que é o que "respostas rápidas" significa no PRD:
  respostas prontas à mão durante o atendimento. Converter as três telas é
  outro trabalho; fica registrado como dívida em §13.
- **SMTP.** A camada de e-mail tem interface de driver e ship com Resend (HTTP
  puro). Se a hospedagem oferecer só SMTP, é um arquivo a mais e uma
  dependência — não vou instalar algo que talvez nunca seja usado.
- **Agendamento recorrente** ("todo dia às 9h"). O disparo é agendável para um
  instante, não repetível.

---

## 5. O caminho de uma mensagem

```
Alguém monta a campanha na tela
   │  escolhe destinatários, escreve a mensagem, agenda ou dispara
   ▼
dispatch_campaigns (DRAFT → SCHEDULED | RUNNING)
dispatch_targets   (um por destinatário, PENDING)
   │  já nasce sem quem optou por sair, sem quem não tem telefone,
   │  e sem número repetido na mesma campanha
   ▼
worker  ← POST /api/cron/dispatch  (Vercel Cron, cron externo, ou a tela)
   │
   ├─ fora da janela de horário? devolve e não envia nada
   ├─ teto do minuto atingido? devolve o que falta para a próxima chamada
   │
   ├─ reivindica um lote com FOR UPDATE SKIP LOCKED
   │     (duas chamadas simultâneas não pegam o mesmo destinatário)
   │
   └─ para cada um:
         espera intervalo + jitter
         envia pela Evolution
         grava Conversation + Message reais
         marca SENT ou FAILED
   ▼
campanha termina quando não há mais PENDING
```

### Por que cada envio vira `Message` numa `Conversation`

É a diferença central em relação ao que existe hoje. O disparo aparece no
Inbox como qualquer outra mensagem; quando a pessoa responde, o atendente vê o
que ela recebeu. Sem isso, o cliente responde "quanto custa?" a uma mensagem
que ninguém sabe qual foi.

Também é o que torna o descadastro possível: a resposta "PARE" chega numa
conversa que existe.

---

## 6. Anti-bloqueio

Não é um recurso; é a razão de a fila existir. Cinco regras, todas
configuráveis por organização, com padrões conservadores.

| Regra | Padrão | Por quê |
|---|---|---|
| Intervalo mínimo | 4 s | 1,5 s é rápido demais para conversa humana |
| **Jitter** | ± 3 s | Cadência regular é assinatura de robô. Este é o item que falta hoje e o mais importante da lista |
| Teto por minuto | 12 | Limita o estrago de uma configuração errada |
| Janela de horário | 8h – 20h | Disparo às 3h é sinal de robô, e é falta de educação |
| Teto diário | 300 | Volume súbito num número morno é o gatilho clássico |

**O jitter é o item que o código atual não tem e mais importa.** Um envio a
cada 1500 ms exatos é mais suspeito que um envio a cada 4 s variando — o
padrão perfeito é justamente o que nenhum humano produz.

A janela de horário usa o fuso da organização, não o do servidor: função
serverless roda em UTC, e "20h" precisa significar 20h em São Paulo.

`nextSendDelay()` e `withinWindow()` são puras, com o gerador aleatório
injetável — é a única forma de testar jitter.

---

## 7. Descadastro

O webhook da F3 passa a reconhecer o pedido de saída.

Palavras: `PARE`, `PARAR`, `SAIR`, `CANCELAR`, `DESCADASTRAR`, `REMOVER`,
`STOP`, `UNSUBSCRIBE`.

**A mensagem inteira precisa ser a palavra**, depois de normalizada (minúsculas,
sem acento, sem pontuação). Casar por substring faria *"não quero parar de
receber"* descadastrar a pessoa — o oposto do que ela pediu. Este é o detalhe
que separa a implementação certa da errada.

Grava `contacts.opted_out_at` e `opted_out_reason`. O contato some de qualquer
campanha futura, aparece marcado na ficha, e um atendente pode reverter — às
vezes a pessoa se arrepende, e a saída não deve ser uma porta trancada.

Atendimento individual **continua funcionando**: o descadastro é de disparo em
massa, não de conversa. Quem escreveu "PARE" para uma campanha e depois
pergunta o preço deve ser respondido.

---

## 8. Respostas rápidas

Respostas prontas para o atendente usar no Inbox: `/preco`, `/endereco`,
`/horario`. Digitar a barra no compositor abre a lista; escolher insere o texto,
que continua editável.

```
quick_replies
  id, organization_id
  shortcut   VARCHAR(40)   -- "preco", único por organização
  title      VARCHAR(120)
  content    TEXT
  created_at, updated_at
```

Interpolação mínima: `{{nome}}` e `{{empresa}}` a partir do contato da conversa.
Nada além disso — um motor de template completo aqui seria complexidade sem
demanda.

Editáveis em Configurações, por rank de Editor para cima: quem atende sabe qual
resposta falta.

---

## 9. E-mail — fechando a dívida da F0

`app/api/auth/forgot-password/route.ts` gera o código e o imprime no log do
servidor, com um `TODO(F5)` explícito. Enquanto isso, recuperar senha exige
alguém abrir o log da Vercel.

```
lib/email/
  index.ts     send({ to, subject, html, text }) — escolhe o driver
  resend.ts    HTTP puro contra api.resend.com, sem SDK
  templates.ts o e-mail do código de recuperação
```

Sem `RESEND_API_KEY`, o driver é o log — **com aviso alto**, e não em silêncio.
Isso mantém o ambiente de desenvolvimento funcionando e deixa claro em produção
que falta configurar.

O envio **não pode alterar a resposta da rota**. Ela responde igual exista ou
não o e-mail, para não virar um oráculo de quais contas existem; um erro de
envio que mudasse a resposta reabriria esse buraco. Falha de e-mail é registrada
no log e a resposta continua a mesma.

---

## 10. Concorrência

Duas chamadas simultâneas ao worker — cron atrasado mais a tela aberta — não
podem enviar a mesma mensagem duas vezes.

```sql
UPDATE dispatch_targets SET status = 'SENDING', claimed_at = now()
WHERE id IN (
  SELECT id FROM dispatch_targets
  WHERE campaign_id = $1 AND status = 'PENDING'
  ORDER BY created_at
  FOR UPDATE SKIP LOCKED
  LIMIT $2
)
RETURNING *;
```

`FOR UPDATE SKIP LOCKED` é o que torna a fila segura: quem chegou depois pula
as linhas já reivindicadas em vez de esperar por elas. Vai por `$queryRaw` —
o Prisma não expressa isso.

`SENDING` com `claimed_at` antigo (mais de 5 minutos) volta para `PENDING`: é
como uma função que morreu no meio devolve o trabalho.

---

## 11. Migração `f5-disparo`

| # | Statement | Motivo |
|---|---|---|
| 1 | `dispatch_campaigns` | A campanha |
| 2 | `dispatch_targets` | Um por destinatário, com estado próprio |
| 3 | `dispatch_settings` | Regras anti-bloqueio por organização |
| 4 | `quick_replies` + unique `(organization_id, shortcut)` | §8 |
| 5 | `contacts.opted_out_at`, `opted_out_reason` | §7 |
| 6 | Índice `dispatch_targets (campaign_id, status, created_at)` | A consulta do worker |
| 7 | Índice `dispatch_campaigns (organization_id, status, scheduled_at)` | Campanhas a iniciar |
| 8 | Índice parcial `contacts (organization_id) WHERE opted_out_at IS NOT NULL` | Filtrar descadastrados |

Idempotente, sem `DROP`, sem coluna removida.

---

## 12. Estrutura de arquivos

```
lib/dispatch/
  policy.ts      janela, intervalo, jitter, tetos — puro e testável
  optout.ts      reconhecimento da palavra de saída — puro
  campaigns.ts   criar, iniciar, pausar, cancelar, listar
  worker.ts      reivindicar lote, enviar, gravar, contabilizar
  types.ts       DTOs

lib/email/
  index.ts · resend.ts · templates.ts

lib/crm/
  quick-replies.ts

app/api/
  cron/dispatch/route.ts              worker, protegido por CRON_SECRET
  crm/campaigns/route.ts              GET lista · POST cria
  crm/campaigns/[id]/route.ts         GET detalhe · PATCH iniciar/pausar/cancelar
  crm/quick-replies/route.ts          GET · POST
  crm/quick-replies/[id]/route.ts     PATCH · DELETE

components/crm/dispatch/
  campaign-list.tsx · new-campaign-modal.tsx · campaign-progress.tsx
components/crm/inbox/
  quick-reply-picker.tsx

app/(dashboard)/disparos/page.tsx
vercel.json                            cron diário de retaguarda
```

A tela de eventos passa a criar campanha em vez de rodar o laço no navegador.

---

## 13. Riscos e dívidas

**Desta fase:**

- **Sem a aba aberta ou um agendador, a fila não anda.** É consequência de
  serverless sem processo residente. A tela avisa quando há campanha parada
  esperando alguém drenar.
- **Os padrões anti-bloqueio são conservadores, não garantidos.** Nenhum
  parâmetro impede o WhatsApp de bloquear um número; eles reduzem o risco.
- **Dois sistemas de modelo de mensagem** (§4): `localStorage` para as
  automações de mentorado, banco para as respostas rápidas do Inbox. Unificar
  exige converter três telas.
- **Sem SMTP** (§4).

**Herdadas:**

- `lib/ai-copilot.ts` gera "diagnóstico" por regras, apresentado como IA.
- `lib/crm/adapters.ts` sai quando o drawer for reescrito.
- `lib/neon-db.ts:57` — `queryNeon` engole erro e devolve `[]`.
- Sem limite de tentativas de login, apesar de `login_attempts` existir.
- Mídia referenciada por URL do gateway, não copiada.
- Sem contabilização de custo da IA por organização.

---

## 14. Critérios de conclusão

- [ ] Campanha criada, iniciada e concluída sem a aba aberta o tempo todo.
- [ ] Cada envio aparece no Inbox como mensagem de uma conversa real.
- [ ] Duas chamadas simultâneas ao worker não duplicam envio.
- [ ] Intervalo entre envios varia; não é constante.
- [ ] Fora da janela de horário, nada é enviado.
- [ ] Quem respondeu "PARE" não entra em campanha nova; "não quero parar" não descadastra.
- [ ] Descadastrado continua podendo ser atendido individualmente.
- [ ] Worker sem `CRON_SECRET` responde 401.
- [ ] Resposta rápida insere texto no compositor, com `{{nome}}` resolvido.
- [ ] Código de recuperação sai por e-mail quando configurado, e por log com aviso quando não.
- [ ] A resposta de `/api/auth/forgot-password` é idêntica com e sem falha de e-mail.
- [ ] `tsc --noEmit` limpo, build passando, testes verdes.
- [ ] Dados existentes intactos.
