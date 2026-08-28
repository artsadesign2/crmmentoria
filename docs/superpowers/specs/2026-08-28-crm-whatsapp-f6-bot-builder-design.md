# F6 — Bot Builder e motor de execução

**Data:** 2026-08-28
**Fases anteriores:** [F0](2026-08-26-crm-whatsapp-f0-auth-servidor-design.md) · [F1](2026-08-27-crm-whatsapp-f1-fundacao-dados-design.md) · [F2](2026-08-27-crm-whatsapp-f2-kanban-real-design.md) · [F3](2026-08-27-crm-whatsapp-f3-inbox-multiatendente-design.md) · [F4](2026-08-27-crm-whatsapp-f4-copiloto-gemini-design.md) · [F5](2026-08-27-crm-whatsapp-f5-disparo-fila-design.md)

---

## 1. Objetivo

Dar à organização um construtor visual de fluxos de atendimento e um motor que
os executa sobre as conversas do WhatsApp. É a última fase do módulo, e a
única em que **o sistema fala com o cliente sem uma pessoa no meio**.

Três fases guardaram promessas para cá:

| Fase | O que deixou pendente |
|---|---|
| F1 | `contacts.custom_fields` existe e está vazio — "o Nó de Captura do bot (F6) grava aqui" |
| F3 | "Bot builder, atendimento automático, menu de setor — F6. Na F3 nenhum robô responde" |
| F3 | "Mensagem de robô (F6) nunca recebe assinatura" |
| F4 | "Bot que responde sozinho — F6. Aqui a IA só rascunha" |

---

## 2. O que existe hoje

Nada de bot. Mas o terreno está preparado, e isso decide o desenho:

| Peça | Fase | Como a F6 usa |
|---|---|---|
| `POST /api/webhook/whatsapp` | F3 | Ponto de entrada; o motor roda aqui |
| `recordInboundMessage` devolve `duplicated` | F3 | Idempotência: reenvio não executa o bot de novo |
| `routeConversation`, `Department.isDefaultInbox` | F3 | Alvos do nó de Transferência |
| `Message.isFromBot` | F1 | Coluna pronta, hoje sempre `false` |
| `contacts.custom_fields` | F1 | Destino do nó de Captura |
| `renderTemplate` (`{{nome}}`, `{{empresa}}`) | F5 | Interpolação do texto dos nós |
| `generate()` do Gemini, `AiSettings.knowledgeBase` | F4 | Nó de IA |
| `sendText` | F3 | Saída das mensagens do bot |

Nenhuma dessas peças precisa mudar de forma. A F6 se pendura nelas.

---

## 3. Duas decisões que foram do usuário

**Escopo: completo, como o PRD.** Motor de execução e canvas React Flow, com os
sete tipos de nó. As tarefas são ordenadas para o bot **já funcionar** — menu de
triagem rodando no motor — antes de o canvas existir. Se a fase parar no meio,
o que estiver de pé é utilizável.

**Autonomia da IA: responde, com trava e saída.** O nó de IA responde ao cliente
sem revisão humana, mas fundamentado apenas na base de conhecimento, com teto
de trocas e queda para humano em dúvida, pedido de pessoa ou assunto sensível.

A segunda decisão quebra deliberadamente a regra que as fases F3, F4 e F5
mantiveram — "quem envia é sempre uma pessoa". A quebra é o ponto da fase, e é
por isso que a seção 6 existe.

---

## 4. Arquitetura: motor puro, executor sujo

```
step(grafo, sessao, entrada) → { proximaSessao, acoes[] }
```

O motor não fala com banco, nem com a Evolution, nem com o Gemini. Recebe o
grafo, o estado da sessão e a mensagem que chegou; devolve o próximo estado e
uma lista de **ações**:

```ts
type BotAction =
  | { tipo: 'ENVIAR'; texto: string }
  | { tipo: 'CAPTURAR'; campo: string; valor: string }
  | { tipo: 'TRANSFERIR'; departmentId: string | null; motivo: string }
  | { tipo: 'PERGUNTAR_IA'; pergunta: string }
  | { tipo: 'ENCERRAR'; motivo: string };
```

O executor realiza as ações contra o mundo real.

**Por que assim.** Um bot testado só ponta a ponta se testa mandando mensagem
para alguém. Com o motor puro, cem caminhos de ramificação são testados em
milissegundos, e o simulador da seção 8 sai de graça: simular é rodar o motor
sem executor. É a mesma escolha de `policy.ts`, `template.ts` e `optout.ts`,
pelo mesmo motivo.

A ação `PERGUNTAR_IA` é assíncrona e o motor não a resolve: ele para, o
executor chama o Gemini, e realimenta o resultado como uma nova entrada. Isso
mantém o motor síncrono e puro mesmo com um nó que depende de rede.

---

## 5. Onde o motor roda

Dentro do webhook, logo depois de a mensagem ser gravada. **Não** numa fila: o
cliente espera resposta em segundos, e uma fila acrescentaria infraestrutura e
atraso sem resolver nada que o webhook não resolva.

```
Evolution → webhook → token ok → grava a mensagem
                                      │
                        duplicated? ──┴──▶ sim: retorna, o bot NÃO roda
                                      │
                                      ▼
                        descadastro ("PARE") — F5
                                      │
                                      ▼
                        há sessão de bot ou conversa nova sem dono?
                                      │
                     não ─────────────┴──── sim ──▶ motor + executor
                      │                                    │
                      ▼                                    ▼
              cai para humano                    envia, captura, transfere
                                      │
                                      ▼
                              responde 200, sempre
```

**Reenvio não executa o bot duas vezes.** A idempotência que a F3 criou para
não duplicar mensagem passa a proteger também o robô — e aqui ela importa mais,
porque uma mensagem duplicada no histórico é feia, e um bot executado duas
vezes manda o texto duas vezes para o cliente.

**Falha do motor nunca vira mensagem perdida.** O bloco é `try/catch`: se o
motor levantar, a mensagem já está gravada, a sessão é encerrada e a conversa
cai para um humano. A rota continua respondendo 200.

### Quando o bot atua

Atua quando existe sessão ativa, **ou** quando a conversa é nova, sem dono, e
há fluxo publicado marcado como gatilho.

Não atua — e encerra qualquer sessão — quando:

- um humano respondeu (`sendCustomerMessage`), inclusive do próprio celular
  (mensagem com `fromMe`);
- a conversa foi assumida ou transferida por uma pessoa;
- a sessão passou dos tetos da seção 6;
- o contato pediu para parar (o descadastro da F5 roda antes do bot).

Um atendente nunca disputa a conversa com o robô. Quem chega depois, ganha — e
quem chega depois é sempre a pessoa.

---

## 6. As travas

O maior risco desta fase não é o bot deixar de responder. É **responder
demais**: um ciclo no grafo manda mensagem em laço para uma pessoa real e queima
o número da empresa em minutos. Um bot silencioso é um chamado de suporte; um
bot em laço é um número bloqueado.

| Trava | Valor | O que impede |
|---|---|---|
| Nós percorridos por mensagem recebida | 25 | Ciclo infinito no grafo |
| Mensagens enviadas por mensagem recebida | 5 | Rajada de texto no cliente |
| Trocas com o nó de IA por sessão | 3 | Conversa infinita com a IA |
| Duração máxima da sessão | 24 h | Sessão órfã que nunca encerra |

Estourou qualquer teto: transfere para humano, grava o motivo na conversa e
encerra a sessão. Nunca fica em silêncio — silêncio é o modo de falha que
ninguém percebe.

### Validação antes de publicar

Publicar é o único momento em que dá para barrar um fluxo quebrado antes de ele
alcançar um cliente. O que impede a publicação:

- nó inalcançável a partir do início;
- nó de Pergunta sem opções, ou com opção sem aresta;
- aresta apontando para nó inexistente;
- ciclo sem saída alcançável (o cliente entraria e nunca sairia);
- fluxo sem nó de início, ou com mais de um.

### Mensagens do bot

Entram com `isFromBot: true`, `userId: null`, e **nunca assinadas** — a F3 já
prometeu isso, e a assinatura de uma pessoa num texto de robô é uma mentira
pequena que corrói a confiança no histórico inteiro.

---

## 7. O nó de IA

Responde o cliente sem revisão, dentro de um cercado estreito:

- **Fundamentado só na base de conhecimento** (`AiSettings.knowledgeBase`).
  Base vazia significa que o nó transfere em vez de inventar.
- **Teto de 3 trocas.** Na terceira, transfere com o histórico junto.
- **Cai para humano** quando: a IA declara que não sabe; o cliente pede uma
  pessoa; a mensagem toca assunto sensível (preço, contrato, cancelamento,
  reembolso, jurídico).
- **Herda as defesas da F4** contra injeção de prompt, já testadas naquela fase.
- A resposta passa pelo mesmo `generate()` da F4, que **nunca lança** — falha do
  Gemini vira transferência, não silêncio.

A decisão de deixar a IA falar é do usuário e está registrada na seção 3. O que
esta seção garante é que ela fale pouco, sobre pouca coisa, e saia de cena
depressa.

---

## 8. Editor e simulador

**Canvas React Flow** (`@xyflow/react`, dependência nova): paleta de nós,
ligação por arrasto, propriedades do nó selecionado, botão de publicar com o
resultado da validação.

**Simulador**, ao lado do canvas: conversa de mentira que roda o motor sem
executor. Nenhuma mensagem sai, nenhum registro é gravado. É onde se descobre
que a opção "3" não leva a lugar nenhum — antes de um cliente descobrir.

O simulador não é enfeite: ele é a razão de o motor ser puro, e sem ele testar
um fluxo significaria mandar mensagem para o próprio celular.

---

## 9. Dados

Quatro tabelas novas e **nenhuma coluna nova**: `Message.isFromBot` e
`contacts.custom_fields` existem desde a F1, vazios, esperando esta fase.

**`bot_flows`** — o rascunho. Nome, grafo em JSONB, gatilho, versão publicada
corrente.

**`bot_flow_versions`** — o que roda, congelado. Grafo imutável por versão.

**`bot_sessions`** — o estado de uma conversa dentro de um fluxo: nó corrente,
variáveis, contagem de trocas de IA, se está esperando resposta. Uma sessão
ativa por conversa.

**`bot_events`** — trilha do que o bot fez, por sessão. Sem ela, "o bot mandou
uma coisa estranha para o cliente" é impossível de investigar.

**Versão publicada é imutável.** Uma conversa em andamento termina na versão em
que começou. Sem isso, editar o fluxo às 14h faria quem está no meio de um
atendimento pular para um nó que não existe mais — e o sintoma seria um bot que
trava com clientes reais enquanto funciona no seu teste.

---

## 10. Fora de escopo

- **Bot que inicia conversa.** Só responde a quem escreveu. Iniciar é disparo, e
  disparo é a F5, com as travas dela.
- **Fechar venda ou cobrar.** O bot transfere.
- **Fluxo por canal que não seja WhatsApp.** O modelo não impede, a F6 não faz.
- **Testes A/B de fluxo, agendamento de publicação, biblioteca de modelos.**
- **Nó de espera por tempo** ("depois de 2 h, se não respondeu…"). Exige
  agendador por conversa; a F5 tem um endpoint de fila que serviria, mas isso é
  uma fase inteira, não um nó.

---

## 11. O que muda no que já existe

| Arquivo | Mudança |
|---|---|
| `app/api/webhook/whatsapp/route.ts` | Chama o motor depois do descadastro |
| `lib/crm/messages.ts` | `sendCustomerMessage` encerra a sessão do bot |
| `lib/crm/conversations.ts` | `assignConversation` e `transferConversation` encerram a sessão |
| `components/sidebar.tsx` | Item "Atendimento automático" |
| `package.json` | `@xyflow/react` |

Nenhuma migração destrutiva. Nenhuma coluna removida.

---

## 12. Retomada — o lead nunca fica sem atendimento

> Acrescentado depois da Tarefa 3, a pedido do usuário. Implementado na Tarefa
> 3.5 do plano.

### O buraco

A distribuição da F3 entrega a conversa nova ao atendente menos ocupado que
estiver online, e o executor recusa atuar onde já existe dono. As duas regras
são certas isoladamente e, juntas, produzem dois defeitos:

1. **O robô fica inalcançável.** A conversa ganha dono na primeira mensagem, de
   modo que com qualquer atendente online o bot nunca roda. O menu de triagem —
   que existe para perguntar "com quem você quer falar" *antes* de escolher a
   pessoa — só atenderia de madrugada.

2. **O lead abandonado desaparece em silêncio.** A partir do instante em que a
   conversa ganha dono, ninguém mais olha para ela. Se esse dono entra de
   férias, muda de time ou esquece, o cliente espera para sempre, e o sistema
   não acusa nada: do ponto de vista dele, a conversa *está sendo atendida*. É o
   pior modo de falha possível num CRM — silencioso e caro.

### A regra

Duas situações devolvem o cliente ao robô. Elas não merecem o mesmo tratamento,
e tratá-las igual seria punir alguém por dormir:

| | ABANDONO | FORA_DE_HORARIO |
|---|---|---|
| Quando | cliente esperando resposta humana há mais de N horas (padrão 24) | mensagem chega fora do expediente |
| Devolve para a fila | sim | **não** |
| Avisa quem a deixou parada | sim | não |
| Trava anti-insistência | uma retomada por período | não se aplica |

`FORA_DE_HORARIO` não tira a conversa de ninguém porque o atendente não fez nada
errado: está fora do expediente. O robô cobre o intervalo e sai de cena na
primeira resposta humana.

### Duas sutilezas que decidem se isso funciona

**A espera é medida da mensagem mais antiga não respondida**, não da última
recebida. O webhook grava a mensagem antes de chamar o robô, então "última
mensagem do cliente" seria sempre *agora* e o abandono jamais dispararia.

**Mensagem de robô não conta como resposta.** A consulta filtra
`userId: { not: null }`, o que só é possível porque o executor grava as
mensagens dele sem autor. A disciplina de nunca assinar texto de robô com nome
de gente — tomada por honestidade no histórico — é o que permite distinguir
"foi atendido" de "recebeu um menu automático e continuou esperando".

### Quem dispara

O caminho normal é o cliente escrever de novo: roda no webhook, sem cron. Mas o
lead que escreveu uma vez, foi ignorado e desistiu de insistir nunca produz um
webhook — e é justamente o que mais importa recuperar. Uma varredura
(`/api/cron/bot-reengage`, mesmo segredo do disparo) o encontra. Ela só trata
`ABANDONO`: "fora de horário" numa varredura significaria acordar às duas da
manhã alguém que não perguntou nada.

Antes de o robô puxar assunto — e não antes de devolver para a fila, que é
interno e sempre seguro — valem o opt-out do contato e a janela de envio da F5.


### Por onde o aviso chega

WhatsApp primeiro, e-mail como reserva. A ordem não é preferência de estilo: o
atendente passa o dia no WhatsApp da empresa e entra no e-mail corporativo de
vez em quando. Um aviso que chega onde a pessoa não está é o mesmo que não
avisar, com o agravante de o sistema registrar que avisou. O e-mail cobre os
dois casos em que o WhatsApp não serve — atendente sem telefone cadastrado, ou
envio recusado pela Evolution. A rota usada fica registrada na trilha do
contato, para a pergunta que sempre vem depois ("e o atendente ficou sabendo?")
ter resposta no histórico.

O envio sai pelo **mesmo número central** que fala com os clientes, para o
número pessoal em `users.phone`. A distribuição entre atendentes não muda em
nada: continua sendo usuários do sistema disputando as conversas de um número
só.

### O filtro de número interno

Isto **precisou** vir junto, e não é um detalhe. A Evolution dispara
`messages.upsert` também para o que a própria instância envia, e nesse evento o
`remoteJid` é o **destinatário**. Enquanto o sistema só falava com clientes isso
era inofensivo. A partir do momento em que ele avisa o atendente, sem filtro o
primeiro aviso criaria um contato com o nome do atendente, uma conversa
entrando na distribuição e o menu de triagem sendo oferecido à própria equipe —
o funil da empresa se encheria de gente da empresa.

`isNumeroInterno` descarta o evento antes de gravar qualquer coisa, e cobre
também a resposta: quem responder "ok" ao aviso não vira lead. A comparação
atravessa o nono dígito, porque o mesmo celular aparece com e sem o 9 conforme
quem escreveu o cadastro.

**Consequência assumida:** um atendente não pode ser cliente da empresa pelo
mesmo número.

### Configuração

Tabela `bot_settings`, separada de `dispatch_settings` de propósito: a janela do
disparo responde "quando é aceitável incomodar um desconhecido"; a do expediente
responde "quando existe gente trabalhando". Perguntas diferentes, que mudam por
motivos diferentes.

### Grau de dependência do bot

A parte que garante atendimento — devolver para a fila e avisar quem deixou
parado — **não depende de existir fluxo publicado**. Sem bot nenhum, o lead
abandonado ainda volta a ficar visível para a equipe inteira e alguém recebe um
e-mail. O robô, quando existe, é o que impede o cliente de ficar no vácuo
enquanto isso acontece.
