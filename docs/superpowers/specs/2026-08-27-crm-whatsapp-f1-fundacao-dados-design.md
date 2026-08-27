# F1 — Fundação de Dados do CRM

**Data:** 2026-08-27
**Status:** Proposta
**Fase:** F1 (depende da F0; base para F2–F6)
**Spec anterior:** [F0 — Autenticação de Servidor](2026-08-26-crm-whatsapp-f0-auth-servidor-design.md)

---

## 1. O que muda em relação ao planejado

O roadmap previa que a F1 migrasse a tabela `crm_leads` para os models novos. **Essa
migração não existe mais:** a introspecção do banco durante a F0 mostrou que `crm_leads`
não estava entre as 19 tabelas reais.

*(Nota posterior: a tabela passou a existir, vazia, durante a verificação da F0 — o teste
de fumaça chamou `GET /api/crm`, e `ensureLeadsTable()` em `lib/crm-db.ts` executa
`CREATE TABLE IF NOT EXISTS` a cada primeira leitura. Ela tem 0 linhas, então a conclusão
não muda: não há dado algum a migrar.*

*Ela **não** é removida na F1: `ensureLeadsTable()` a recriaria na requisição seguinte.
Some sozinha quando a F2 aposentar `lib/crm-db.ts` e a rota `/api/crm` antiga. Até lá fica
vazia e inofensiva.)*

Consequência: a tela `/crm` (1117 linhas) roda hoje inteiramente sobre `MOCK_LEADS`, um
array em `lib/mock-data.ts`. **Não há um único lead real no sistema.** A F1 fica menor e
sem risco de perda de dados, e a decisão "unificar no Prisma migrando `crm_leads`" que você
aprovou se resolve sozinha — não há o que migrar.

O que a F1 entrega é a camada de dados sobre a qual a F2 reescreve a tela.

---

## 2. Escopo

### Dentro

- Nove models novos no Prisma, criados por migração idempotente escrita à mão.
- Um pipeline padrão com as etapas que a interface já usa hoje.
- Camada de acesso a dados em `lib/crm/`, escopada por organização.
- Rotas REST sob `/api/crm/*`, todas autenticadas.
- Regra de privacidade do Módulo 3 do PRD aplicada já na consulta.

### Fora

- Qualquer alteração visual. A tela `/crm` continua em `MOCK_LEADS` até a F2.
- Inbox, mensagens em tempo real e webhooks de entrada (F3).
- Copiloto e resumo por IA (F4).
- Disparos e fila (F5).
- Bot builder (F6).

### Explicitamente não faremos

**Não vamos semear `MOCK_LEADS` no banco.** São leads fictícios ("Dr. Fernando Albuquerque,
Clínica Albuquerque Dermatologia"). Inseri-los criaria oportunidades falsas num CRM de
produção, com valores e datas inventados, exatamente como os usuários de demonstração que
a F0 recusou criar. O CRM nasce vazio e recebe leads reais.

---

## 3. Modelagem

### 3.1. Correções ao schema do PRD

A Seção 5 do PRD original precisa de quatro ajustes para funcionar aqui:

| Problema no PRD | Correção |
|---|---|
| `Company` duplicaria `Organization` | Descartado. Tudo pendura em `Organization`, que já existe |
| `Contact.phone @unique` global | Vira `@@unique([organizationId, phone])` — o mesmo número pode ser lead de duas organizações |
| Não existe model de mensagem | Adicionados `Conversation` e `Message`, sem os quais a F3 não tem onde gravar o histórico |
| `ScheduledMessage` sem `organizationId` | Fica para a F5, e nascerá escopado |

### 3.2. Os nove models

**`Pipeline`** — funil. Uma organização pode ter mais de um (Vendas, Suporte).
**`Stage`** — etapa do funil, com `colorHex` e `order`. A barra colorida do topo da coluna.
**`Contact`** — a pessoa. Chave natural: `(organizationId, phone)`.
**`DealCard`** — a oportunidade. É o card do Kanban. Um contato pode ter vários ao longo do tempo.
**`Tag`** / **`ContactTag`** — segmentação com remoção em um clique.
**`ActivityLog`** — histórico do contato, incluindo o resumo de IA da F4.
**`Conversation`** — uma thread por contato e canal.
**`Message`** — cada mensagem trafegada, com direção, status e mídia.

### 3.3. Decisões de modelagem

**`dealValue` como `Decimal(12,2)`, não `Float`.** `FinancialTransaction` usa `Float` hoje,
o que é um erro para dinheiro — `0.1 + 0.2 !== 0.3` em ponto flutuante. Não vou propagar
isso. O PRD pedia `Decimal(10,2)`; uso `(12,2)` para acompanhar `member_deals`, que já é
`Decimal(12,2)`.

**Campos de qualificação em `Json`.** A `Lead` de `mock-data.ts` carrega nove campos
específicos de mentoria (`currentRevenue`, `mainBottleneck`, `targetGoal`, `hasPartners`,
`urgencyLevel`, `cityState`, `role`, `teamSize`, `lossReason`). Eles são do negócio, não do
CRM genérico, e o Nó de Captura do bot (F6) vai gravar campos novos sem migração. Ficam em
`DealCard.customFields`. Dados da pessoa ficam em `Contact.customFields`.

**Canal no `DealCard` e na `Conversation`.** Duplicação deliberada: o card mostra o badge do
canal de origem sem precisar carregar a conversa, e a conversa é sempre de um canal só.

**`isPrivate` no `DealCard`.** Combinado com a regra da seção 5, implementa a privacidade
por atendente do Módulo 3.

### 3.4. Convenções herdadas da F0

- Tabelas em snake_case, models em camelCase com `@map` — o banco foi criado por SQL cru.
- Enums como `VARCHAR`, não enums do PostgreSQL, pela mesma razão.
- `prisma db push` continua proibido. Migração à mão, idempotente, em
  `prisma/migrations/f1-crm/migration.sql`.

---

## 4. Pipeline padrão

O seed cria um funil "Comercial" com as seis etapas que `LEAD_STAGES` já define em
`lib/mock-data.ts`, preservando rótulos e cores para que a F2 não mude a aparência:

| Ordem | Nome | Cor |
|---|---|---|
| 0 | 1. Novos Leads | `#3B82F6` |
| 1 | 2. Em Qualificação | `#F59E0B` |
| 2 | 3. Proposta Enviada | `#A855F7` |
| 3 | 4. Negociação / Fechamento | `#F97316` |
| 4 | 5. Ganhos (Convertidos) | `#10B981` |
| 5 | 6. Perdidos | `#64748B` |

`LEAD_STAGES` tem cinco entradas, mas o tipo `Lead['stage']` admite `'perdido'` — a etapa
existe no domínio e faltava no array. O seed a cria.

---

## 5. Privacidade e escopo

Duas regras, aplicadas na consulta e não na interface:

1. **Escopo de organização.** Todo `where` carrega `organizationId: session.organizationId`.
2. **Privacidade por atendente.** Quem tem rank de Editor ou abaixo enxerga apenas cards
   atribuídos a si ou não atribuídos a ninguém. Administrador e Master veem tudo.

Concretamente, em `lib/crm/deals.ts`:

```ts
function visibilityFilter(session: SessionPayload) {
  if (hasAtLeastRole(session.role, 'Administrador')) {
    return { organizationId: session.organizationId };
  }
  return {
    organizationId: session.organizationId,
    OR: [{ assignedUserId: session.userId }, { assignedUserId: null }],
  };
}
```

Um card com `isPrivate: true` some para todos exceto o responsável e quem tem rank de
Administrador para cima.

---

## 6. Superfície de API

| Rota | Métodos | Função |
|---|---|---|
| `/api/crm/pipelines` | GET | Funis com etapas e agregados por coluna |
| `/api/crm/contacts` | GET, POST | Listar e criar contatos |
| `/api/crm/contacts/[id]` | GET, PATCH, DELETE | Contato com deals, tags e atividades |
| `/api/crm/deals` | GET, POST | Listar cards do funil e criar oportunidade |
| `/api/crm/deals/[id]` | PATCH, DELETE | Editar, mover de etapa, atribuir |
| `/api/crm/tags` | GET, POST, DELETE | Catálogo de tags |

`GET /api/crm/pipelines` devolve, por etapa, `cardCount` e `totalValue` já somados no banco
com `groupBy`. Somar no cliente exigiria transferir todos os cards só para calcular um
total de rodapé.

Mover um card entre etapas é `PATCH /api/crm/deals/[id]` com `{ stageId }`. A rota valida
que a etapa pertence a um funil da mesma organização — sem isso, um id de etapa de outro
tenant moveria o card para fora da organização.

---

## 7. Tratamento de erros

| Situação | Resposta |
|---|---|
| Sem sessão | 401 (middleware e `guard`) |
| Card ou contato de outra organização | 404, nunca 403 — 403 confirmaria que o id existe |
| Telefone já cadastrado na organização | 409, com o id do contato existente |
| `stageId` de outra organização | 400 |
| Editor tentando editar card de terceiro | 404, pela mesma razão do segundo caso |

---

## 8. Testes

**Unitários**, sem banco:
- `visibilityFilter` devolve filtro amplo para Master e Administrador
- `visibilityFilter` restringe Editor, Cliente e Usuário a `assignedUserId`
- Normalização de telefone: `(11) 98765-4321` e `+55 11 98765-4321` convergem para a mesma chave
- Agregação de coluna soma `Decimal` corretamente, inclusive com centavos

**Verificação real**, contra o servidor, como na F0:
- `/api/crm/*` sem cookie responde 401
- `POST /api/crm/contacts` cria e o `GET` seguinte devolve o registro
- Telefone duplicado na mesma organização responde 409
- Mover card para etapa inexistente responde 400
- `GET /api/crm/pipelines` traz as seis etapas com totais zerados

---

## 9. Critérios de conclusão

1. As nove tabelas existem e os dados anteriores continuam intactos (33 membros e o resto).
2. Existe um funil "Comercial" com seis etapas, cores idênticas às de `LEAD_STAGES`.
3. Nenhuma rota de CRM responde sem sessão.
4. Nenhuma consulta do CRM roda sem `organizationId` no `where`.
5. Um Editor não enxerga cards atribuídos a outro atendente.
6. `npm test`, `tsc --noEmit` e `npm run build` passam.
7. A tela `/crm` continua funcionando como está — a F1 não a toca.

---

## 10. O que a F2 herda

- `lib/crm/` pronto, com tipos gerados pelo Prisma.
- Totais por coluna vindos agregados do banco.
- Pipeline e etapas com as cores que a interface já usa.
- `Conversation` e `Message` prontos para a F3 gravar o que chega do webhook.
