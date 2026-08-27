# F0 — Autenticação de Servidor e Unificação de Papéis

**Data:** 2026-08-26
**Status:** Proposta, aguardando revisão
**Fase:** F0 (pré-requisito de F1–F6 do módulo de CRM Omnichannel WhatsApp)

---

## 1. Por que esta fase existe

O PRD do módulo de CRM Omnichannel não previa esta fase. Ela surgiu de uma auditoria do código atual, que revelou que a aplicação **não possui autenticação de servidor**.

Três fatos verificados no repositório:

1. **Usuários vivem no navegador.** `lib/auth-context.tsx` persiste `rocket_system_users`, `rocket_active_user_id` e `rocket_role_permissions` no `localStorage`. A tabela `User` do Prisma, que já tem `passwordHash`, nunca é lida nem escrita pelo fluxo de login.
2. **O cookie de sessão não é assinado.** `rocket_session` é escrito por JavaScript (`lib/auth-context.tsx:175`) e contém apenas o id do usuário em texto claro. O `middleware.ts:20` verifica somente se o cookie *existe*. Qualquer pessoa pode digitar `document.cookie = "rocket_session=usr-master-1"` no DevTools e obter acesso Master.
3. **Nenhuma rota de API é protegida.** O `matcher` do middleware exclui `api/` (`middleware.ts:38`), portanto o middleware nunca roda nelas. `GET /api/crm` devolve todos os leads a qualquer requisição não autenticada.

Há ainda um quarto problema, de escalação de privilégio: `switchRoleSimulation` (`lib/auth-context.tsx:184`) permite que **qualquer** usuário fabrique um `SystemUser` com o papel que quiser, incluindo `Master`, e grave o cookie correspondente. Não existe verificação de quem chamou.

### O que isso bloqueia

O módulo de CRM exige, no Módulo 3 do PRD, que "o Atendente visualize apenas seus leads atribuídos" e que os dados sejam isolados por organização. Ambos são impossíveis de garantir sem identidade confiável no servidor: `DealCard.isPrivate` e o escopo por `organizationId` seriam validados apenas no cliente, onde o usuário controla o código. Na F3, o Inbox passa a carregar conversas reais de clientes — expor essas rotas seria um incidente de dados.

Construir F1–F6 sobre a base atual significaria reescrever todas as rotas depois. Por isso a F0 vem primeiro.

---

## 2. Escopo

### Dentro do escopo

- Migrar os usuários de `localStorage` para a tabela `User` do Prisma.
- Login real: verificação de senha com hash, sessão assinada em cookie `httpOnly`.
- Proteger todas as rotas `/api/*`, com exceção explícita dos webhooks.
- Unificar os três sistemas de papéis hoje desalinhados em uma única fonte de verdade.
- Fechar a escalação de privilégio de `switchRoleSimulation`.
- Corrigir a exposição da chave da Evolution API ao navegador.
- Manter funcionando, sem regressão visual: login, recuperação de senha, sidebar, topbar, tela de configurações e a matriz de permissões.

### Fora do escopo

- Qualquer model ou tela do CRM (é a F1 em diante).
- OAuth, SSO, 2FA, magic link.
- Rate limiting e proteção contra força bruta (registrado como dívida na seção 9).
- Redesenho visual de qualquer tela.

---

## 3. Estado atual, em detalhe

### 3.1. Os três sistemas de papéis

| Origem | Valores | Onde é usado |
|---|---|---|
| Enum `Role` do Prisma | `SUPER_ADMIN`, `ORG_ADMIN`, `MENTOR`, `MEMBER` | Declarado em `prisma/schema.prisma:10`; **não consumido por nenhum código** |
| `UserRole` de `lib/permissions.ts` | `Master`, `Administrador`, `Editor`, `Cliente`, `Usuário` | Toda a UI: `ROLE_HIERARCHIES`, `DEFAULT_ROLE_PERMISSIONS` (46 chaves), sidebar, topbar, settings |
| `DEFAULT_TENANT` de `lib/tenant.ts` | `AccessLevel[]` fixo em código | `hasFeature()`, contexto de organização |

O sistema de `permissions.ts` é o único realmente em uso e o único que a interface conhece. Ele tem 46 chaves de permissão granulares, uma hierarquia numérica de ranks (1–5) e regras de quem pode excluir ou editar quem. Descartá-lo custaria caro e não traria ganho.

**Decisão: `permissions.ts` vira a fonte de verdade.** O enum do Prisma é realinhado a ele, e não o contrário.

### 3.2. Superfície a preservar

`grep` por `switchUser|rocket_session` encontra seis arquivos que dependem do contrato atual do `AuthContext`:

- `app/layout.tsx` — monta o `AuthProvider`
- `app/page.tsx` — decide o destino inicial
- `app/login/page.tsx` — 516 linhas, inclui o fluxo de recuperação de senha com código de 6 dígitos, construído recentemente (commit `869862d`)
- `components/sidebar.tsx`, `components/topbar.tsx` — leem `currentUser` e `canAccessModule`
- `app/(dashboard)/settings/page.tsx` — CRUD de usuários e matriz de permissões

A interface `AuthContextType` expõe 13 membros. **O contrato público será mantido**: os componentes existentes não precisam mudar. O que muda é a implementação por trás — as operações passam a chamar a API em vez de mexer no `localStorage`.

---

## 4. Desenho proposto

### 4.1. Papéis: um enum, um vocabulário

O enum do Prisma passa a espelhar os cinco papéis da UI:

```prisma
enum Role {
  MASTER
  ADMINISTRADOR
  EDITOR
  CLIENTE
  USUARIO
}
```

Um par de funções puras em `lib/auth/roles.ts` converte entre o enum do banco e o rótulo da UI, para que `permissions.ts` continue funcionando sem alteração:

```ts
export function roleToLabel(role: Role): UserRole
export function labelToRole(label: UserRole): Role
```

`Usuário` (com acento, na UI) mapeia para `USUARIO` (sem acento, no banco) — enums do PostgreSQL não aceitam acentuação de forma confiável entre drivers.

Trocar os valores de um enum já existente no PostgreSQL não é uma alteração automática: a migration precisa criar o tipo novo, converter a coluna e descartar o antigo. No nosso caso é indolor, porque a tabela `users` não tem linhas em uso — o login nunca escreveu nela. A migration será escrita explicitamente, não gerada por `db push`.

O `DEFAULT_TENANT` de `lib/tenant.ts` deixa de ser fixo: `getTenant()` passa a resolver a `Organization` do usuário da sessão.

### 4.2. Sessão: JWT assinado, cookie httpOnly

A escolha do mecanismo é ditada por uma restrição do Next.js: **o middleware roda no runtime Edge**, onde `bcrypt` e o cliente Prisma não funcionam. A divisão fica:

| Camada | Runtime | Responsabilidade |
|---|---|---|
| `middleware.ts` | Edge | Verificar a assinatura do JWT e redirecionar. Sem acesso ao banco. |
| Route Handlers `/api/*` | Node | Hash de senha, consultas Prisma, autorização por papel |

Biblioteca: **`jose`** para assinar e verificar o JWT (funciona em Edge e Node) e **`bcryptjs`** para o hash de senha (JS puro, sem compilação nativa — evita problemas de build na Vercel).

Formato do cookie `rocket_session`:

```
httpOnly: true          // JavaScript não lê mais o cookie
secure: true            // apenas em produção
sameSite: 'lax'
path: '/'
maxAge: 60 * 60 * 24 * 7
```

Payload do JWT — deliberadamente mínimo, apenas o que é estável e barato de validar:

```ts
{ sub: userId, org: organizationId, role: Role, iat, exp }
```

Nome e avatar **não** entram no token: mudariam sem invalidar a sessão. A UI busca esses dados em `/api/auth/me`.

Segredo em `AUTH_SECRET` (variável de servidor, sem `NEXT_PUBLIC_`). Na ausência dela, a aplicação **falha ao iniciar** em produção, em vez de cair silenciosamente num segredo padrão.

### 4.3. Superfície de API

Cinco rotas novas em `app/api/auth/`:

| Rota | Método | Função |
|---|---|---|
| `/api/auth/login` | POST | Valida e-mail e senha, emite o cookie de sessão |
| `/api/auth/logout` | POST | Limpa o cookie |
| `/api/auth/me` | GET | Devolve o usuário da sessão e suas permissões efetivas |
| `/api/auth/forgot-password` | POST | Gera o código de 6 dígitos (mantém o fluxo já construído) |
| `/api/auth/reset-password` | POST | Valida o código e grava a nova senha |

### 4.4. O helper `requireSession()`

Peça central da fase. Fica em `lib/auth/session.ts` e é a única forma de uma rota de API saber quem está chamando:

```ts
export async function requireSession(): Promise<Session>
// Lança UnauthorizedError se não houver sessão válida.

export async function requireRole(minimum: UserRole): Promise<Session>
// Lança ForbiddenError se o rank do papel for inferior ao mínimo.
```

`Session` carrega `userId`, `organizationId` e `role`. **Toda consulta Prisma nas fases seguintes usa `session.organizationId` no `where`** — nunca um id vindo do corpo da requisição ou de query string. Essa é a regra que torna o isolamento entre organizações real.

Um `withAuth()` envolve o handler e converte as exceções em respostas 401 e 403, para que as rotas não repitam try/catch.

### 4.5. Middleware

O `matcher` passa a incluir `/api/`, com exceções explícitas:

- `/api/auth/login`, `/api/auth/forgot-password`, `/api/auth/reset-password` — públicas por natureza
- `/api/webhook/*` e `/api/webhooks/*` — chamadas por Evolution API, Stripe e Asaas, que não têm cookie. Continuam autenticadas pelo seu próprio mecanismo (assinatura ou token), não por sessão.

O middleware passa a **verificar a assinatura** do JWT, não apenas a presença do cookie. Token inválido ou expirado redireciona para `/login` e limpa o cookie.

### 4.6. `AuthProvider` reescrito por dentro

O contrato de 13 membros é preservado. O que muda:

| Antes | Depois |
|---|---|
| Estado inicial lido de `localStorage` | `/api/auth/me` na montagem |
| `switchUser` grava cookie via JS | Removido do fluxo normal; vira ação Master (4.7) |
| `addUser`/`updateUser`/`deleteUser` mexem em array local | `POST`/`PATCH`/`DELETE` em `/api/users` |
| `rolePermissions` em `localStorage` | Tabela `RolePermission`, escopada por organização |
| Retorno síncrono `{ success, error }` | Continua `{ success, error }`, agora `Promise` |

Os chamadores em `settings/page.tsx` já tratam o retorno `{ success, error }`; a mudança para `Promise` exige `await` nesses pontos.

### 4.7. Fechando a escalação de privilégio

`switchRoleSimulation` é útil para testar a matriz de permissões e será mantido — mas reconstruído com três garantias:

1. Só um usuário com papel `MASTER` pode invocá-lo; a verificação é **no servidor**, em `/api/auth/simulate`.
2. O JWT emitido carrega `simulatedBy: <masterUserId>` e validade de 1 hora.
3. A UI exibe uma faixa persistente de "modo simulação" com botão de saída — impossível esquecer que está simulando.

Sem esses três pontos, a função é uma porta aberta para qualquer visitante virar Master.

### 4.8. Correção da chave da Evolution API

Fora do tema de sessão, mas é a mesma classe de problema e a mesma fase.

`NEXT_PUBLIC_EVOLUTION_API_KEY` expõe a credencial do WhatsApp a qualquer visitante do site — basta abrir o bundle. A correção:

- Renomear para `EVOLUTION_API_KEY`, `EVOLUTION_API_URL`, `EVOLUTION_INSTANCE_NAME`, sem o prefixo público.
- `lib/evolution-api.ts` deixa de ler `process.env` no cliente e passa a chamar `/api/evolution/proxy`, que já existe.
- O proxy passa a exigir `requireSession()`.
- `getEvolutionConfig`/`saveEvolutionConfig`, que hoje guardam credenciais em `localStorage`, passam a operar sobre configuração no banco, escopada por organização.

A mesma regra vale para `GEMINI_API_KEY`, já presente no `.env` sem prefixo público — correto como está, e assim deve permanecer na F4.

---

## 5. Modelo de dados

### 5.1. Alterações em models existentes

`User` ganha os campos que hoje só existem no `SystemUser` do `localStorage`:

```prisma
model User {
  // ... campos atuais preservados
  role            Role        @default(USUARIO)   // enum realinhado
  phone           String?
  avatarUrl       String?
  status          UserStatus  @default(ATIVO)
  isPrimaryMaster Boolean     @default(false)
  lastActiveAt    DateTime?
  departmentId    String?
  department      Department? @relation(fields: [departmentId], references: [id])

  @@index([organizationId, role])
}

enum UserStatus {
  ATIVO
  INATIVO
  BLOQUEADO
}
```

`Department` hoje declara apenas `wikiArticles` e não tem lado inverso para `User`. O Prisma exige as duas pontas de toda relação, então `Department` recebe `users User[]` — campo que a distribuição round-robin por setor da F3 vai consumir.

`User.email` hoje é `@unique` globalmente. Passa a `@@unique([organizationId, email])`: em um SaaS multi-organização, o mesmo e-mail pode legitimamente existir em duas organizações distintas. *(A mesma correção se aplica a `Contact.phone` na F1, que o PRD trazia como `@unique` global.)*

### 5.2. Models novos

```prisma
model PasswordResetToken {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  codeHash  String              // o código de 6 dígitos nunca é gravado em texto claro
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime @default(now())

  @@index([userId, expiresAt])
}

model RolePermission {
  id             String       @id @default(uuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  role           Role
  permissions    Json         // as 46 chaves de RolePermissions

  @@unique([organizationId, role])
}
```

`RolePermission.permissions` fica como `Json` de propósito: são 46 booleanos que a tela de configurações edita em bloco, e o PRD prevê que cresçam a cada módulo. Uma tabela com 46 colunas exigiria migração a cada permissão nova.

### 5.3. Seed e migração de dados

Script `prisma/seed-auth.ts`, idempotente:

1. Cria a `Organization` padrão do Rocket Club, se não existir.
2. Converte os cinco `INITIAL_SYSTEM_USERS` de `lib/permissions.ts` em linhas de `User`, preservando ids, nomes, e-mails, papéis e departamentos.
3. Atribui a cada um uma senha inicial vinda de `SEED_DEFAULT_PASSWORD` — obrigatória, sem valor padrão em código.
4. Grava `DEFAULT_ROLE_PERMISSIONS` como cinco linhas de `RolePermission`.
5. Marca `usr-master-1` com `isPrimaryMaster: true`.

Não há dados de usuário em produção a migrar: eles existem apenas no `localStorage` de cada navegador. O seed reconstrói o conjunto conhecido.

---

## 6. Fluxo de dados

**Login**

```
/login → POST /api/auth/login {email, senha}
  → Prisma busca User por (organizationId, email)
  → bcrypt.compare(senha, passwordHash)
  → status !== ATIVO ? 403
  → jose.SignJWT({sub, org, role}) → Set-Cookie httpOnly
  → 200 → cliente navega para /dashboard
```

**Requisição autenticada**

```
GET /api/crm
  → middleware (Edge): verifica assinatura → passa
  → withAuth: requireSession() → Session
  → prisma.dealCard.findMany({ where: { organizationId: session.organizationId } })
```

**Recuperação de senha** — o fluxo visual de 516 linhas já construído é preservado; muda o que está por trás: o código de 6 dígitos passa a ser gerado no servidor, gravado como hash com validade de 15 minutos e uso único.

---

## 7. Tratamento de erros

| Situação | Resposta | Comportamento na UI |
|---|---|---|
| Sem cookie em rota protegida | 401 | Redireciona para `/login?callbackUrl=...` |
| JWT expirado ou adulterado | 401 + limpa cookie | Idem |
| Papel insuficiente | 403 | Toast "Sem permissão", permanece na página |
| Credenciais inválidas | 401, mensagem genérica | "E-mail ou senha inválidos" |
| Usuário `INATIVO`/`BLOQUEADO` | 403 | Mensagem específica de conta bloqueada |
| `AUTH_SECRET` ausente em produção | Falha no boot | Erro explícito no log de deploy |

A mensagem de credenciais é **genérica de propósito**: distinguir "e-mail não existe" de "senha errada" entrega ao atacante uma lista de e-mails válidos.

---

## 8. Testes

O projeto não tem infraestrutura de testes hoje. A F0 introduz **Vitest**, escolhido por funcionar sem configuração adicional com o TypeScript já presente na cadeia de build.

**Unitários** — `lib/auth/`:
- `roleToLabel`/`labelToRole` são inversas para os cinco papéis
- JWT assinado com o segredo correto verifica; com segredo errado, falha
- Token expirado é rejeitado
- Hierarquia: `requireRole('Administrador')` aceita Master, rejeita Editor

**Integração** — rotas:
- Login com senha correta emite cookie `httpOnly`
- Login com senha errada devolve 401 e nenhum cookie
- Rota protegida sem cookie devolve 401
- Rota protegida com cookie de outra organização **não** enxerga os dados da primeira
- `/api/auth/simulate` chamado por Editor devolve 403

**Verificação manual** — o que teste automatizado não cobre bem:
- Login, navegação e logout no fluxo real
- Recuperação de senha ponta a ponta
- Sidebar e topbar exibem o usuário correto
- Matriz de permissões persiste após recarregar
- `document.cookie` no DevTools **não** revela mais o `rocket_session`

---

## 9. Riscos e dívidas assumidas

| Risco | Mitigação |
|---|---|
| Quebrar o login recém-construído | Contrato do `AuthContext` preservado; verificação manual do fluxo antes do commit final |
| Sessões atuais invalidadas no deploy | Esperado e desejável: os cookies antigos são forjáveis. Todos precisarão entrar de novo |
| `prisma db push` sem histórico de migrations | A F0 introduz `prisma migrate` propriamente; a F1 depende disso para a migração de `crm_leads` |
| Ausência de rate limiting no login | Dívida consciente. Força bruta continua possível. Registrado para a F5, onde a fila e o Cron já existirão |
| Simulação de papel mal usada | Faixa visual persistente, expiração de 1 hora e `simulatedBy` no token |

---

## 10. Critérios de conclusão

A F0 está pronta quando:

1. Nenhuma rota `/api/*` responde com dados sem sessão válida, exceto os webhooks.
2. Forjar `rocket_session` no DevTools não concede acesso.
3. `document.cookie` não expõe o cookie de sessão.
4. Nenhuma chave de API sobrevive com prefixo `NEXT_PUBLIC_`.
5. Existe um único vocabulário de papéis entre banco, servidor e interface.
6. Login, recuperação de senha, sidebar, topbar e matriz de permissões funcionam como antes.
7. `requireSession()` está disponível e documentado para a F1 consumir.
8. A suíte Vitest passa.

---

## 11. O que a F1 herda

- `requireSession()` e `withAuth()` prontos, com `organizationId` confiável.
- `prisma migrate` funcionando, para migrar `crm_leads` com segurança.
- Um enum `Role` único, sobre o qual a distribuição por setor da F3 será construída.
- Proxy da Evolution API autenticado, pronto para receber os webhooks de mensagem da F3.
