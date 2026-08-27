# F2 — Kanban Real sobre Prisma

**Data:** 2026-08-27
**Status:** Proposta
**Fase:** F2 (depende da F1)
**Specs anteriores:** [F0 — Auth](2026-08-26-crm-whatsapp-f0-auth-servidor-design.md) · [F1 — Dados](2026-08-27-crm-whatsapp-f1-fundacao-dados-design.md)

---

## 1. Objetivo

Reescrever `/crm` para consumir a camada real da F1, com o card de cinco linhas do
Módulo 1 do PRD, **sem perder nenhum recurso que a tela já tem**.

O que existe hoje em `app/(dashboard)/crm/page.tsx` — 1117 linhas, um único componente:

| Recurso | Destino na F2 |
|---|---|
| Kanban com arrastar-e-soltar (`@hello-pangea/dnd`) | Preservado, agora persistindo no banco |
| 5 métricas executivas do topo | Preservadas, alimentadas pelos agregados do servidor |
| Filtros: busca, origem, prioridade, etapa | Preservados |
| Alternância Kanban / Tabela | Preservada |
| `LeadSheet` (drawer do lead) | Preservado **sem alteração**, via adaptador |
| Modal de WhatsApp rápido | Preservado |
| Converter em Mentorado (`POST /api/members`) | Preservado — é regra de negócio real |
| Banner do agente de IA | Preservado |

---

## 2. A tensão de design, e como resolvo

**O PRD §3.1 descreve um design system claro:** fundo `#F8FAFC`, cards brancos com borda
`#E2E8F0`, badges de canal em `Green-100` sobre texto `Green-700`.

**O rocket-club é escuro e dourado**, e tem quatro paletas trocáveis
(`rocket-gold`, `hyper-emerald`, `galactic-indigo`, `rose-luxury` — esta última clara),
aplicadas por variáveis CSS que o script inline de `app/layout.tsx` injeta.

Seguir o PRD ao pé da letra colocaria cards brancos sobre `#0B0F17`. **A direção visual do
projeto vence**: a F2 usa as variáveis de tema existentes (`--theme-surface`,
`--theme-border`, `--primary-color`) e não introduz cor fixa de fundo.

### Badges de canal

A intenção do PRD aqui é semântica, não cromática: cada canal precisa ser reconhecível de
relance. Preservo o **matiz** de cada canal — que é a cor da marca, e é o que carrega o
significado — e troco a **luminosidade** conforme o tema:

| Canal | Matiz | Tema escuro | Tema claro (PRD) |
|---|---|---|---|
| WhatsApp | verde `#22C55E` | fundo `rgba(34,197,94,.14)`, texto `#4ADE80` | fundo `#DCFCE7`, texto `#15803D` |
| Instagram | rosa `#E1306C` | fundo `rgba(225,48,108,.14)`, texto `#F472B6` | fundo `#FCE7F3`, texto `#BE185D` |
| Carrinho | laranja `#EA580C` | fundo `rgba(234,88,12,.14)`, texto `#FB923C` | fundo `#FFEDD5`, texto `#C2410C` |
| VoIP | ciano `#06B6D4` | fundo `rgba(6,182,212,.14)`, texto `#22D3EE` | fundo `#CFFAFE`, texto `#0E7490` |

No tema claro os valores são exatamente os do PRD. No escuro, o mesmo matiz em alfa baixo.
Um só componente, `<ChannelBadge>`, escolhe pelo `isLightMode` do `useTheme`.

---

## 3. Anatomia do card

As cinco linhas do PRD, mapeadas para os dados que a F1 entrega:

```
┌────────────────────────────────────────────────┐
│ ▏[avatar+badge] Nome do contato        18:46   │  1  identidade e horário
│ ▏ Última mensagem recebida, com retic…         │  2  snippet
│ ▏ R$ 270,00 · Marcio Araujo · Nike AirMax      │  3  valor, responsável, produto
│ ▏ [Airmax ✕] [Favoritos ✕]                     │  4  tags, remoção em 1 clique
│ ▏ 💬 📞 ✉  ▸ 1/12    1h    🔔                  │  5  ações, tarefas, SLA, lembrete
└────────────────────────────────────────────────┘
  ▲
  filete de SLA
```

O **filete de SLA** na borda esquerda é o único elemento novo que proponho. Ele codifica
informação real: a fração de tempo já consumida entre a última mensagem e o `slaDueAt`.
Verde enquanto sobra folga, âmbar perto do limite, vermelho quando estourou. Sem SLA
definido, some — não fica um trilho cinza decorativo em cada card.

É a peça onde gasto ousadia; o resto do card segue o vocabulário visual já estabelecido.

**Origem de cada campo:** linha 1 `contact.name` + `channel` + `lastMessageAt`; linha 2
`lastMessageText`; linha 3 `dealValue` + `assignedUserName` + `customFields.produto`;
linha 4 `contact.tags`; linha 5 `contact.phone` + `completedTasks`/`totalTasks` +
`slaDueAt` + `reminderAt`.

---

## 4. Decomposição

O arquivo de 1117 linhas vira uma página fina mais componentes com uma responsabilidade
cada — os nomes são os que o PRD usa:

| Arquivo | Responsabilidade |
|---|---|
| `app/(dashboard)/crm/page.tsx` | Composição e estado de filtros. Alvo: menos de 300 linhas |
| `components/crm/kanban-board.tsx` | `DragDropContext`, orquestra colunas, trata o drop |
| `components/crm/kanban-column.tsx` | Cabeçalho com cor, contador, somatório, recolher |
| `components/crm/deal-card.tsx` | O card de cinco linhas |
| `components/crm/channel-badge.tsx` | Badge de canal, ciente do tema |
| `components/crm/sla-indicator.tsx` | Filete e rótulo de SLA |
| `components/crm/crm-metrics.tsx` | As cinco métricas do topo |
| `components/crm/crm-filters.tsx` | Busca e filtros |
| `lib/crm/use-crm.ts` | Hook: carrega, move, cria, atualiza; trata otimismo e erro |
| `lib/crm/adapters.ts` | `DealCardDTO` → `Lead`, para o que já existe seguir funcionando |

### O adaptador, e por que ele existe

`LeadSheet` (drawer), o modal de WhatsApp e a conversão em mentorado esperam o tipo `Lead`
de `lib/mock-data.ts`. Reescrever os três junto com o Kanban tornaria esta fase grande
demais para revisar de uma vez.

`dealToLead(deal)` traduz o DTO para aquele formato. É dívida deliberada e anotada: some
quando a F4 reescrever o drawer com o histórico real de conversa. Documentado no próprio
arquivo para não virar um mistério em três meses.

---

## 5. Dados e interação

**Carga:** `GET /api/crm/pipelines` (etapas + agregados) e `GET /api/crm/deals` em paralelo.

**Mover card:** atualização otimista — o card muda de coluna na hora, e só então sai o
`PATCH /api/crm/deals/[id]`. Falhou, o card volta para a coluna de origem e aparece um erro
dizendo o que aconteceu. Esperar a rede antes de mover deixaria o arrasto com uma trava
perceptível a cada solta.

**Métricas:** somadas a partir dos agregados de `/api/crm/pipelines`, que já respeitam a
visibilidade do usuário. Recalcular no cliente daria números diferentes dos rodapés das
colunas — um Editor veria o total da empresa num lugar e o dele em outro.

**Estado vazio:** o CRM nasce sem nenhum lead. A tela vazia precisa convidar à ação, não
mostrar "nenhum resultado" — é o primeiro contato de um usuário novo com o módulo.

---

## 6. Erros

| Situação | Comportamento |
|---|---|
| Falha ao carregar | Estado de erro com botão "Tentar de novo"; não deixar a tela em branco |
| Falha ao mover | Card volta; toast com a mensagem do servidor |
| Sessão expirada (401) | Redireciona para `/login` |
| Sem permissão (403) | Toast, sem tirar o usuário da tela |
| Sem funil configurado | Aviso com instrução de rodar `npm run db:seed:crm` |

---

## 7. Testes

**Unitários**, sem rede:
- `dealToLead` preserva id, nome, valor e telefone formatado
- `dealToLead` mapeia prioridade e canal para o vocabulário do `Lead`
- `slaState(slaDueAt, agora)` devolve `ok`, `warning` ou `overdue` nos limiares certos
- Sem `slaDueAt`, `slaState` devolve `none` — o filete não aparece

**Verificação real:** criar contato e card pela API, abrir `/crm`, arrastar entre colunas,
recarregar e confirmar que a posição persistiu.

---

## 8. Critérios de conclusão

1. `/crm` lê e escreve no banco; `MOCK_LEADS` não é mais importado pela página.
2. Todos os recursos da tabela da seção 1 continuam funcionando.
3. O card mostra as cinco linhas com dados reais.
4. Badges de canal legíveis nas quatro paletas.
5. Arrastar persiste; recarregar mantém a posição.
6. Somatório da coluna bate com o rodapé e com as métricas do topo.
7. A página fica abaixo de 300 linhas.
8. `npm test`, `tsc --noEmit` e `npm run build` passam.
