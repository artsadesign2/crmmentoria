# F0 — Autenticação de Servidor: Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir a autenticação client-side por sessão de servidor assinada, proteger todas as rotas `/api/*` e unificar os três sistemas de papéis em um só.

**Architecture:** JWT assinado com `jose` em cookie `httpOnly`, verificado no middleware (runtime Edge) e resolvido em `requireSession()` nos Route Handlers (runtime Node, com acesso ao Prisma). Usuários migram de `localStorage` para a tabela `User`. O contrato público do `AuthContext` é preservado para não quebrar as seis telas que dependem dele.

**Tech Stack:** Next.js 15 (App Router), Prisma 6, PostgreSQL (Neon), `jose`, `bcryptjs`, Vitest, TypeScript estrito.

**Spec:** [docs/superpowers/specs/2026-08-26-crm-whatsapp-f0-auth-servidor-design.md](../specs/2026-08-26-crm-whatsapp-f0-auth-servidor-design.md)

## Global Constraints

- **Nenhuma chave de API com prefixo `NEXT_PUBLIC_`.** Credenciais só existem no servidor.
- **Todo `where` do Prisma escopado por `session.organizationId`** — nunca por id vindo do corpo da requisição ou de query string.
- **O contrato de 13 membros de `AuthContextType` é preservado.** Componentes consumidores não mudam de assinatura.
- **`AUTH_SECRET` obrigatória.** Ausente em produção, a aplicação falha ao iniciar; nunca cair em segredo padrão.
- **Papéis no banco sem acento:** `MASTER`, `ADMINISTRADOR`, `EDITOR`, `CLIENTE`, `USUARIO`. Na UI seguem com acento via `roleToLabel`.
- **Middleware roda em Edge:** nada de `bcryptjs` nem Prisma dentro de `middleware.ts`.
- **Idioma:** mensagens de UI em português, código e commits em inglês.

---

### Task 1: Dependências e infraestrutura de testes

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `lib/auth/__tests__/setup.ts`
- Modify: `.env.example`

**Interfaces:**
- Consumes: nada
- Produces: comando `npm test` funcional; `jose`, `bcryptjs` disponíveis.

- [ ] **Step 1: Instalar dependências**

```bash
npm install jose bcryptjs
npm install -D vitest @types/bcryptjs dotenv
```

- [ ] **Step 2: Criar `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./lib/auth/__tests__/setup.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
});
```

- [ ] **Step 3: Criar `lib/auth/__tests__/setup.ts`**

```ts
process.env.AUTH_SECRET =
  process.env.AUTH_SECRET ?? 'test-secret-com-pelo-menos-32-caracteres!!';
```

- [ ] **Step 4: Adicionar script de teste em `package.json`**

Adicionar em `"scripts"`: `"test": "vitest run"` e `"test:watch": "vitest"`.

- [ ] **Step 5: Documentar variáveis novas em `.env.example`**

```bash
# Auth — segredo de assinatura da sessão (mínimo 32 caracteres)
AUTH_SECRET=<gerar com: openssl rand -base64 32>

# Senha inicial atribuída aos usuários criados pelo seed
SEED_DEFAULT_PASSWORD=<defina uma senha forte>

# Evolution API (servidor — sem prefixo NEXT_PUBLIC_)
EVOLUTION_API_URL=<url>
EVOLUTION_API_KEY=<chave>
EVOLUTION_INSTANCE_NAME=<instancia>

# Google Gemini (usado a partir da F4)
GEMINI_API_KEY=<chave>
```

- [ ] **Step 6: Verificar que a suíte roda**

Run: `npm test`
Expected: PASS sem testes ("No test files found" é aceitável neste passo).

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vitest.config.ts lib/auth/__tests__/setup.ts .env.example
git commit -m "chore(auth): add jose, bcryptjs and vitest test infrastructure"
```

---

### Task 2: Mapeamento de papéis

**Files:**
- Create: `lib/auth/roles.ts`
- Create: `lib/auth/__tests__/roles.test.ts`

**Interfaces:**
- Consumes: `UserRole`, `ROLE_HIERARCHIES` de `lib/permissions.ts`
- Produces: `DbRole` (union type), `roleToLabel(role: DbRole): UserRole`, `labelToRole(label: UserRole): DbRole`, `roleRank(role: DbRole): number`, `hasAtLeastRole(actual: DbRole, minimum: UserRole): boolean`

- [ ] **Step 1: Escrever o teste que falha**

```ts
import { describe, it, expect } from 'vitest';
import { roleToLabel, labelToRole, hasAtLeastRole } from '../roles';
import { ROLE_HIERARCHIES } from '@/lib/permissions';

describe('roles', () => {
  it('roleToLabel e labelToRole sao inversas para os cinco papeis', () => {
    for (const label of Object.keys(ROLE_HIERARCHIES) as (keyof typeof ROLE_HIERARCHIES)[]) {
      expect(roleToLabel(labelToRole(label))).toBe(label);
    }
  });

  it('mapeia Usuario com acento para USUARIO sem acento', () => {
    expect(labelToRole('Usuário')).toBe('USUARIO');
    expect(roleToLabel('USUARIO')).toBe('Usuário');
  });

  it('hasAtLeastRole respeita a hierarquia de ranks', () => {
    expect(hasAtLeastRole('MASTER', 'Administrador')).toBe(true);
    expect(hasAtLeastRole('ADMINISTRADOR', 'Administrador')).toBe(true);
    expect(hasAtLeastRole('EDITOR', 'Administrador')).toBe(false);
    expect(hasAtLeastRole('USUARIO', 'Cliente')).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar a falha**

Run: `npm test -- roles`
Expected: FAIL — "Cannot find module '../roles'".

- [ ] **Step 3: Implementar `lib/auth/roles.ts`**

```ts
import { ROLE_HIERARCHIES, type UserRole } from '@/lib/permissions';

export type DbRole = 'MASTER' | 'ADMINISTRADOR' | 'EDITOR' | 'CLIENTE' | 'USUARIO';

const DB_TO_LABEL: Record<DbRole, UserRole> = {
  MASTER: 'Master',
  ADMINISTRADOR: 'Administrador',
  EDITOR: 'Editor',
  CLIENTE: 'Cliente',
  USUARIO: 'Usuário',
};

const LABEL_TO_DB = Object.fromEntries(
  Object.entries(DB_TO_LABEL).map(([db, label]) => [label, db])
) as Record<UserRole, DbRole>;

export function roleToLabel(role: DbRole): UserRole {
  return DB_TO_LABEL[role] ?? 'Usuário';
}

export function labelToRole(label: UserRole): DbRole {
  return LABEL_TO_DB[label] ?? 'USUARIO';
}

export function roleRank(role: DbRole): number {
  return ROLE_HIERARCHIES[roleToLabel(role)]?.rank ?? 0;
}

export function hasAtLeastRole(actual: DbRole, minimum: UserRole): boolean {
  return roleRank(actual) >= (ROLE_HIERARCHIES[minimum]?.rank ?? 0);
}
```

- [ ] **Step 4: Rodar o teste e confirmar sucesso**

Run: `npm test -- roles`
Expected: PASS, 3 testes.

- [ ] **Step 5: Commit**

```bash
git add lib/auth/roles.ts lib/auth/__tests__/roles.test.ts
git commit -m "feat(auth): add role mapping between db enum and ui labels"
```

---

### Task 3: Assinatura e verificação de JWT

**Files:**
- Create: `lib/auth/jwt.ts`
- Create: `lib/auth/__tests__/jwt.test.ts`

**Interfaces:**
- Consumes: `DbRole` de `lib/auth/roles.ts`
- Produces: `SessionPayload` (`{ userId, organizationId, role, simulatedBy? }`), `signSession(payload): Promise<string>`, `verifySession(token): Promise<SessionPayload | null>`, `SESSION_COOKIE = 'rocket_session'`, `SESSION_MAX_AGE`

- [ ] **Step 1: Escrever o teste que falha**

```ts
import { describe, it, expect } from 'vitest';
import { signSession, verifySession } from '../jwt';

const payload = { userId: 'u1', organizationId: 'org1', role: 'MASTER' as const };

describe('jwt', () => {
  it('token assinado e verificado devolve o mesmo payload', async () => {
    const token = await signSession(payload);
    const result = await verifySession(token);
    expect(result).toMatchObject(payload);
  });

  it('token adulterado e rejeitado', async () => {
    const token = await signSession(payload);
    expect(await verifySession(token.slice(0, -3) + 'aaa')).toBeNull();
  });

  it('token com segredo diferente e rejeitado', async () => {
    const token = await signSession(payload);
    const original = process.env.AUTH_SECRET;
    process.env.AUTH_SECRET = 'outro-segredo-com-32-caracteres-aqui!!';
    const result = await verifySession(token);
    process.env.AUTH_SECRET = original;
    expect(result).toBeNull();
  });

  it('token expirado e rejeitado', async () => {
    const token = await signSession(payload, -10);
    expect(await verifySession(token)).toBeNull();
  });

  it('lixo nao e aceito como token', async () => {
    expect(await verifySession('nao-e-um-jwt')).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar a falha**

Run: `npm test -- jwt`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Implementar `lib/auth/jwt.ts`**

```ts
import { SignJWT, jwtVerify } from 'jose';
import type { DbRole } from './roles';

export const SESSION_COOKIE = 'rocket_session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 dias

export interface SessionPayload {
  userId: string;
  organizationId: string;
  role: DbRole;
  simulatedBy?: string;
}

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'AUTH_SECRET ausente ou com menos de 32 caracteres. Defina-a no ambiente.'
    );
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(
  payload: SessionPayload,
  maxAgeSeconds: number = SESSION_MAX_AGE
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({
    org: payload.organizationId,
    role: payload.role,
    ...(payload.simulatedBy ? { sim: payload.simulatedBy } : {}),
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.userId)
    .setIssuedAt(now)
    .setExpirationTime(now + maxAgeSeconds)
    .sign(getSecret());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ['HS256'] });
    if (!payload.sub || typeof payload.org !== 'string' || typeof payload.role !== 'string') {
      return null;
    }
    return {
      userId: payload.sub,
      organizationId: payload.org,
      role: payload.role as DbRole,
      ...(typeof payload.sim === 'string' ? { simulatedBy: payload.sim } : {}),
    };
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Rodar o teste e confirmar sucesso**

Run: `npm test -- jwt`
Expected: PASS, 5 testes.

- [ ] **Step 5: Commit**

```bash
git add lib/auth/jwt.ts lib/auth/__tests__/jwt.test.ts
git commit -m "feat(auth): add signed jwt session tokens with jose"
```

---

### Task 4: Schema Prisma, migration e seed

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/seed-auth.ts`
- Modify: `package.json` (script `db:seed`)

**Interfaces:**
- Consumes: `labelToRole` de `lib/auth/roles.ts`, `INITIAL_SYSTEM_USERS` e `DEFAULT_ROLE_PERMISSIONS` de `lib/permissions.ts`
- Produces: tabelas `users` (ampliada), `password_reset_tokens`, `role_permissions`; enum `Role` realinhado; enum `UserStatus`.

- [ ] **Step 1: Substituir o enum `Role` em `prisma/schema.prisma`**

```prisma
enum Role {
  MASTER
  ADMINISTRADOR
  EDITOR
  CLIENTE
  USUARIO
}

enum UserStatus {
  ATIVO
  INATIVO
  BLOQUEADO
}
```

- [ ] **Step 2: Ampliar o model `User`**

Substituir o bloco `model User` por:

```prisma
model User {
  id              String       @id @default(uuid())
  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  email           String
  passwordHash    String
  name            String
  role            Role         @default(USUARIO)
  phone           String?
  avatarUrl       String?
  status          UserStatus   @default(ATIVO)
  isPrimaryMaster Boolean      @default(false)
  lastActiveAt    DateTime?
  departmentId    String?
  department      Department?  @relation(fields: [departmentId], references: [id], onDelete: SetNull)
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  wikiArticles        WikiArticle[]
  academyComments     AcademyComment[]
  passwordResetTokens PasswordResetToken[]

  @@unique([organizationId, email])
  @@index([organizationId, role])
  @@map("users")
}
```

- [ ] **Step 3: Adicionar o lado inverso em `Department`**

No model `Department`, adicionar a linha `users User[]` junto de `wikiArticles`. Sem isso o Prisma não valida a relação.

- [ ] **Step 4: Adicionar os models novos**

```prisma
model PasswordResetToken {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  codeHash  String
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime @default(now())

  @@index([userId, expiresAt])
  @@map("password_reset_tokens")
}

model RolePermission {
  id             String       @id @default(uuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  role           Role
  permissions    Json

  @@unique([organizationId, role])
  @@map("role_permissions")
}
```

- [ ] **Step 5: Registrar as relações novas em `Organization`**

Adicionar `rolePermissions RolePermission[]` na lista de relações de `Organization`.

- [ ] **Step 6: Validar e aplicar o schema**

Run: `npx prisma validate` — Expected: "The schema is valid".
Run: `npx prisma db push` — Expected: sincronizado sem perda (a tabela `users` está vazia).
Run: `npx prisma generate` — Expected: client gerado.

- [ ] **Step 7: Escrever `prisma/seed-auth.ts`**

```ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { INITIAL_SYSTEM_USERS, DEFAULT_ROLE_PERMISSIONS } from '../lib/permissions';
import { labelToRole } from '../lib/auth/roles';

const prisma = new PrismaClient();
const ORG_ID = 'org-rocket-club';

async function main() {
  const password = process.env.SEED_DEFAULT_PASSWORD;
  if (!password || password.length < 8) {
    throw new Error('Defina SEED_DEFAULT_PASSWORD (min. 8 caracteres) antes de rodar o seed.');
  }
  const passwordHash = await bcrypt.hash(password, 10);

  const org = await prisma.organization.upsert({
    where: { id: ORG_ID },
    update: {},
    create: { id: ORG_ID, name: 'Rocket Club', slug: 'rocket-club' },
  });

  for (const u of INITIAL_SYSTEM_USERS) {
    await prisma.user.upsert({
      where: { organizationId_email: { organizationId: org.id, email: u.email } },
      update: { name: u.name, role: labelToRole(u.role), phone: u.phone ?? null },
      create: {
        id: u.id,
        organizationId: org.id,
        email: u.email,
        name: u.name,
        passwordHash,
        role: labelToRole(u.role),
        phone: u.phone ?? null,
        status: u.status,
        isPrimaryMaster: Boolean(u.isPrimaryMaster),
      },
    });
  }

  for (const [label, perms] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    const role = labelToRole(label as keyof typeof DEFAULT_ROLE_PERMISSIONS);
    await prisma.rolePermission.upsert({
      where: { organizationId_role: { organizationId: org.id, role } },
      update: { permissions: perms as object },
      create: { organizationId: org.id, role, permissions: perms as object },
    });
  }

  console.log(`Seed concluido: ${INITIAL_SYSTEM_USERS.length} usuarios, 5 papeis.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 8: Adicionar o script e rodar o seed**

Adicionar em `package.json`: `"db:seed": "node --env-file=.env -r ts-node/register prisma/seed-auth.ts"` — ou, se `ts-node` não estiver disponível, `"db:seed": "npx tsx prisma/seed-auth.ts"` com `npm i -D tsx`.

Run: `npm run db:seed`
Expected: "Seed concluido: 5 usuarios, 5 papeis."

- [ ] **Step 9: Commit**

```bash
git add prisma/schema.prisma prisma/seed-auth.ts package.json package-lock.json
git commit -m "feat(auth): align role enum, extend user model and seed auth data"
```

---

### Task 5: `requireSession()` e `withAuth()`

**Files:**
- Create: `lib/auth/session.ts`
- Create: `lib/auth/errors.ts`
- Create: `lib/auth/__tests__/session.test.ts`

**Interfaces:**
- Consumes: `verifySession`, `SESSION_COOKIE` de `lib/auth/jwt.ts`; `hasAtLeastRole` de `lib/auth/roles.ts`
- Produces: `UnauthorizedError`, `ForbiddenError`, `getSession(): Promise<SessionPayload | null>`, `requireSession(): Promise<SessionPayload>`, `requireRole(minimum: UserRole): Promise<SessionPayload>`, `withAuth(handler)`

- [ ] **Step 1: Escrever o teste que falha**

```ts
import { describe, it, expect } from 'vitest';
import { UnauthorizedError, ForbiddenError } from '../errors';
import { assertRole } from '../session';

describe('assertRole', () => {
  const base = { userId: 'u1', organizationId: 'o1' } as const;

  it('aceita papel igual ao minimo', () => {
    expect(() => assertRole({ ...base, role: 'ADMINISTRADOR' }, 'Administrador')).not.toThrow();
  });

  it('aceita papel superior', () => {
    expect(() => assertRole({ ...base, role: 'MASTER' }, 'Administrador')).not.toThrow();
  });

  it('rejeita papel inferior com ForbiddenError', () => {
    expect(() => assertRole({ ...base, role: 'EDITOR' }, 'Administrador')).toThrow(ForbiddenError);
  });

  it('erros carregam o status http correto', () => {
    expect(new UnauthorizedError().status).toBe(401);
    expect(new ForbiddenError().status).toBe(403);
  });
});
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npm test -- session`
Expected: FAIL — módulo não encontrado.

- [ ] **Step 3: Implementar `lib/auth/errors.ts`**

```ts
export class UnauthorizedError extends Error {
  readonly status = 401;
  constructor(message = 'Sessão inválida ou expirada.') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  readonly status = 403;
  constructor(message = 'Você não tem permissão para esta ação.') {
    super(message);
    this.name = 'ForbiddenError';
  }
}
```

- [ ] **Step 4: Implementar `lib/auth/session.ts`**

```ts
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySession, type SessionPayload } from './jwt';
import { hasAtLeastRole } from './roles';
import type { UserRole } from '@/lib/permissions';
import { ForbiddenError, UnauthorizedError } from './errors';

export function assertRole(session: SessionPayload, minimum: UserRole): void {
  if (!hasAtLeastRole(session.role, minimum)) throw new ForbiddenError();
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? verifySession(token) : null;
}

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new UnauthorizedError();
  return session;
}

export async function requireRole(minimum: UserRole): Promise<SessionPayload> {
  const session = await requireSession();
  assertRole(session, minimum);
  return session;
}

type Handler<C> = (request: Request, context: C) => Promise<Response> | Response;

export function withAuth<C>(handler: Handler<C>): Handler<C> {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
        return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
      }
      console.error('[withAuth] erro nao tratado:', error);
      return NextResponse.json({ ok: false, error: 'Erro interno.' }, { status: 500 });
    }
  };
}
```

- [ ] **Step 5: Rodar e confirmar sucesso**

Run: `npm test -- session`
Expected: PASS, 4 testes.

- [ ] **Step 6: Commit**

```bash
git add lib/auth/session.ts lib/auth/errors.ts lib/auth/__tests__/session.test.ts
git commit -m "feat(auth): add requireSession, requireRole and withAuth helpers"
```

---

### Task 6: Rotas de autenticação

**Files:**
- Create: `app/api/auth/login/route.ts`
- Create: `app/api/auth/logout/route.ts`
- Create: `app/api/auth/me/route.ts`
- Create: `lib/auth/permissions-db.ts`

**Interfaces:**
- Consumes: `signSession`, `SESSION_COOKIE`, `SESSION_MAX_AGE`; `requireSession`, `withAuth`; `roleToLabel`
- Produces: `getEffectivePermissions(organizationId, role)`; `SessionUserDTO` (`{ id, name, email, role, phone, avatar, status, department, isPrimaryMaster }`) devolvido por `/api/auth/me`

- [ ] **Step 1: Implementar `lib/auth/permissions-db.ts`**

```ts
import { prisma } from '@/lib/prisma';
import { DEFAULT_ROLE_PERMISSIONS, type RolePermissions } from '@/lib/permissions';
import { roleToLabel, type DbRole } from './roles';

export async function getEffectivePermissions(
  organizationId: string,
  role: DbRole
): Promise<RolePermissions> {
  const row = await prisma.rolePermission.findUnique({
    where: { organizationId_role: { organizationId, role } },
  });
  return (row?.permissions as RolePermissions | undefined) ?? DEFAULT_ROLE_PERMISSIONS[roleToLabel(role)];
}
```

- [ ] **Step 2: Implementar `app/api/auth/login/route.ts`**

```ts
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { signSession, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/auth/jwt';
import type { DbRole } from '@/lib/auth/roles';

const INVALID = 'E-mail ou senha incorretos. Por favor, verifique suas credenciais.';

export async function POST(request: Request) {
  const { email, password } = await request.json().catch(() => ({}));

  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    return NextResponse.json({ ok: false, error: INVALID }, { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: { email: email.trim().toLowerCase() },
    include: { department: true },
  });

  // Compara sempre, mesmo sem usuario, para nao vazar quais e-mails existem
  const hash = user?.passwordHash ?? '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvali';
  const valid = await bcrypt.compare(password, hash);

  if (!user || !valid) {
    return NextResponse.json({ ok: false, error: INVALID }, { status: 401 });
  }

  if (user.status !== 'ATIVO') {
    return NextResponse.json(
      { ok: false, error: 'Esta conta está inativa ou bloqueada. Fale com um administrador.' },
      { status: 403 }
    );
  }

  const token = await signSession({
    userId: user.id,
    organizationId: user.organizationId,
    role: user.role as DbRole,
  });

  await prisma.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } });

  const response = NextResponse.json({ ok: true, userId: user.id });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
  return response;
}
```

- [ ] **Step 3: Implementar `app/api/auth/logout/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/auth/jwt';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  return response;
}
```

- [ ] **Step 4: Implementar `app/api/auth/me/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession, withAuth } from '@/lib/auth/session';
import { getEffectivePermissions } from '@/lib/auth/permissions-db';
import { roleToLabel, type DbRole } from '@/lib/auth/roles';

export const GET = withAuth(async () => {
  const session = await requireSession();

  const user = await prisma.user.findFirst({
    where: { id: session.userId, organizationId: session.organizationId },
    include: { department: true },
  });

  if (!user) {
    return NextResponse.json({ ok: false, error: 'Usuário não encontrado.' }, { status: 401 });
  }

  const permissions = await getEffectivePermissions(session.organizationId, user.role as DbRole);

  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: roleToLabel(user.role as DbRole),
      phone: user.phone ?? undefined,
      avatar: user.avatarUrl ?? undefined,
      status: user.status,
      department: user.department?.name ?? undefined,
      isPrimaryMaster: user.isPrimaryMaster,
    },
    permissions,
    simulatedBy: session.simulatedBy ?? null,
  });
});
```

- [ ] **Step 5: Verificar compilação**

Run: `npx tsc --noEmit`
Expected: sem erros nas rotas novas.

- [ ] **Step 6: Commit**

```bash
git add app/api/auth lib/auth/permissions-db.ts
git commit -m "feat(auth): add login, logout and me routes"
```

---

### Task 7: Middleware com verificação de assinatura

**Files:**
- Modify: `middleware.ts`

**Interfaces:**
- Consumes: `verifySession`, `SESSION_COOKIE`
- Produces: proteção de `/api/*` e das páginas

- [ ] **Step 1: Reescrever `middleware.ts`**

```ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/auth/jwt';

// Rotas de API que nao exigem sessao de usuario.
const PUBLIC_API = [
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
];

// Webhooks sao autenticados pelo proprio emissor (assinatura/token), nao por cookie.
const WEBHOOK_PREFIXES = ['/api/webhook', '/api/webhooks'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (WEBHOOK_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next();
  if (PUBLIC_API.includes(pathname)) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;
  const isApi = pathname.startsWith('/api/');
  const isLoginPage = pathname === '/login';

  if (!session) {
    if (isApi) {
      return NextResponse.json(
        { ok: false, error: 'Sessão inválida ou expirada.' },
        { status: 401 }
      );
    }
    if (isLoginPage) return NextResponse.next();

    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/') loginUrl.searchParams.set('callbackUrl', pathname);
    const redirect = NextResponse.redirect(loginUrl);
    if (token) redirect.cookies.set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
    return redirect;
  }

  if (isLoginPage) return NextResponse.redirect(new URL('/dashboard', request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.[^/]+$).*)'],
};
```

- [ ] **Step 2: Verificar compilação**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add middleware.ts
git commit -m "feat(auth): verify jwt signature in middleware and protect api routes"
```

---

### Task 8: CRUD de usuários e matriz de permissões

**Files:**
- Create: `app/api/users/route.ts`
- Create: `app/api/users/[id]/route.ts`
- Create: `app/api/role-permissions/route.ts`

**Interfaces:**
- Consumes: `requireSession`, `requireRole`, `withAuth`, `roleToLabel`, `labelToRole`, `roleRank`, `getEffectivePermissions`
- Produces: `GET/POST /api/users`, `PATCH/DELETE /api/users/[id]`, `GET/PATCH/DELETE /api/role-permissions`

- [ ] **Step 1: Implementar `app/api/users/route.ts`**

```ts
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { requireSession, requireRole, withAuth } from '@/lib/auth/session';
import { roleToLabel, labelToRole, roleRank, type DbRole } from '@/lib/auth/roles';
import type { UserRole } from '@/lib/permissions';
import { ForbiddenError } from '@/lib/auth/errors';

export const GET = withAuth(async () => {
  const session = await requireSession();
  const users = await prisma.user.findMany({
    where: { organizationId: session.organizationId },
    include: { department: true },
    orderBy: { createdAt: 'asc' },
  });
  return NextResponse.json({
    ok: true,
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: roleToLabel(u.role as DbRole),
      phone: u.phone ?? undefined,
      avatar: u.avatarUrl ?? undefined,
      status: u.status,
      department: u.department?.name ?? undefined,
      isPrimaryMaster: u.isPrimaryMaster,
    })),
  });
});

export const POST = withAuth(async (request: Request) => {
  const session = await requireRole('Administrador');
  const body = await request.json().catch(() => ({}));
  const { name, email, password, role, phone } = body as Record<string, string>;

  if (!name || !email || !password || !role) {
    return NextResponse.json({ ok: false, error: 'Preencha todos os campos obrigatórios.' }, { status: 400 });
  }

  const targetRole = labelToRole(role as UserRole);
  if (roleRank(targetRole) > roleRank(session.role)) {
    throw new ForbiddenError('Você não pode criar um usuário com papel superior ao seu.');
  }

  const exists = await prisma.user.findUnique({
    where: { organizationId_email: { organizationId: session.organizationId, email: email.toLowerCase() } },
  });
  if (exists) {
    return NextResponse.json({ ok: false, error: 'Já existe um usuário com este e-mail.' }, { status: 409 });
  }

  const user = await prisma.user.create({
    data: {
      organizationId: session.organizationId,
      name,
      email: email.toLowerCase(),
      passwordHash: await bcrypt.hash(password, 10),
      role: targetRole,
      phone: phone ?? null,
    },
  });

  return NextResponse.json({ ok: true, id: user.id }, { status: 201 });
});
```

- [ ] **Step 2: Implementar `app/api/users/[id]/route.ts`**

```ts
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { requireRole, withAuth } from '@/lib/auth/session';
import { labelToRole, roleRank, type DbRole } from '@/lib/auth/roles';
import type { UserRole } from '@/lib/permissions';
import { ForbiddenError } from '@/lib/auth/errors';

type Ctx = { params: Promise<{ id: string }> };

async function loadTarget(organizationId: string, id: string) {
  const target = await prisma.user.findFirst({ where: { id, organizationId } });
  if (!target) throw new ForbiddenError('Usuário não encontrado nesta organização.');
  return target;
}

export const PATCH = withAuth(async (request: Request, { params }: Ctx) => {
  const session = await requireRole('Administrador');
  const { id } = await params;
  const target = await loadTarget(session.organizationId, id);

  if (roleRank(target.role as DbRole) > roleRank(session.role)) {
    throw new ForbiddenError('Você não pode editar um usuário de papel superior.');
  }

  const body = await request.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (typeof body.name === 'string') data.name = body.name;
  if (typeof body.phone === 'string') data.phone = body.phone;
  if (typeof body.status === 'string') data.status = body.status;
  if (typeof body.password === 'string' && body.password) {
    data.passwordHash = await bcrypt.hash(body.password, 10);
  }
  if (typeof body.role === 'string') {
    const newRole = labelToRole(body.role as UserRole);
    if (roleRank(newRole) > roleRank(session.role)) {
      throw new ForbiddenError('Você não pode atribuir um papel superior ao seu.');
    }
    if (target.isPrimaryMaster && newRole !== 'MASTER') {
      throw new ForbiddenError('O Master principal não pode ter o papel alterado.');
    }
    data.role = newRole;
  }

  await prisma.user.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
});

export const DELETE = withAuth(async (_request: Request, { params }: Ctx) => {
  const session = await requireRole('Administrador');
  const { id } = await params;
  const target = await loadTarget(session.organizationId, id);

  if (target.isPrimaryMaster) {
    throw new ForbiddenError('O Master principal não pode ser excluído.');
  }
  if (target.id === session.userId) {
    throw new ForbiddenError('Você não pode excluir a própria conta.');
  }
  if (roleRank(target.role as DbRole) > roleRank(session.role)) {
    throw new ForbiddenError('Você não pode excluir um usuário de papel superior.');
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
```

- [ ] **Step 3: Implementar `app/api/role-permissions/route.ts`**

```ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession, requireRole, withAuth } from '@/lib/auth/session';
import { labelToRole, roleToLabel, type DbRole } from '@/lib/auth/roles';
import { DEFAULT_ROLE_PERMISSIONS, type UserRole } from '@/lib/permissions';

export const GET = withAuth(async () => {
  const session = await requireSession();
  const rows = await prisma.rolePermission.findMany({
    where: { organizationId: session.organizationId },
  });
  const result = { ...DEFAULT_ROLE_PERMISSIONS };
  for (const row of rows) {
    result[roleToLabel(row.role as DbRole)] = row.permissions as never;
  }
  return NextResponse.json({ ok: true, rolePermissions: result });
});

export const PATCH = withAuth(async (request: Request) => {
  const session = await requireRole('Master');
  const { role, permissions } = await request.json().catch(() => ({}));
  if (typeof role !== 'string' || typeof permissions !== 'object' || !permissions) {
    return NextResponse.json({ ok: false, error: 'Payload inválido.' }, { status: 400 });
  }
  const dbRole = labelToRole(role as UserRole);
  await prisma.rolePermission.upsert({
    where: { organizationId_role: { organizationId: session.organizationId, role: dbRole } },
    update: { permissions },
    create: { organizationId: session.organizationId, role: dbRole, permissions },
  });
  return NextResponse.json({ ok: true });
});

export const DELETE = withAuth(async () => {
  const session = await requireRole('Master');
  for (const [label, perms] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    const dbRole = labelToRole(label as UserRole);
    await prisma.rolePermission.upsert({
      where: { organizationId_role: { organizationId: session.organizationId, role: dbRole } },
      update: { permissions: perms as object },
      create: { organizationId: session.organizationId, role: dbRole, permissions: perms as object },
    });
  }
  return NextResponse.json({ ok: true });
});
```

- [ ] **Step 4: Verificar compilação**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add app/api/users app/api/role-permissions
git commit -m "feat(auth): add user crud and role permission matrix routes"
```

---

### Task 9: Simulação de papel com verificação de servidor

**Files:**
- Create: `app/api/auth/simulate/route.ts`

**Interfaces:**
- Consumes: `requireRole`, `signSession`, `SESSION_COOKIE`
- Produces: `POST /api/auth/simulate` (entra em simulação), `DELETE /api/auth/simulate` (sai)

- [ ] **Step 1: Implementar a rota**

```ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, requireSession, withAuth } from '@/lib/auth/session';
import { signSession, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/auth/jwt';
import { labelToRole, type DbRole } from '@/lib/auth/roles';
import type { UserRole } from '@/lib/permissions';

const SIMULATION_MAX_AGE = 60 * 60; // 1 hora

export const POST = withAuth(async (request: Request) => {
  const session = await requireRole('Master');
  if (session.simulatedBy) {
    return NextResponse.json({ ok: false, error: 'Já está em modo simulação.' }, { status: 409 });
  }

  const { role } = await request.json().catch(() => ({}));
  if (typeof role !== 'string') {
    return NextResponse.json({ ok: false, error: 'Papel inválido.' }, { status: 400 });
  }
  const targetRole = labelToRole(role as UserRole);

  const target = await prisma.user.findFirst({
    where: { organizationId: session.organizationId, role: targetRole, status: 'ATIVO' },
  });
  if (!target) {
    return NextResponse.json(
      { ok: false, error: `Nenhum usuário ativo com o papel ${role} nesta organização.` },
      { status: 404 }
    );
  }

  const token = await signSession(
    {
      userId: target.id,
      organizationId: target.organizationId,
      role: target.role as DbRole,
      simulatedBy: session.userId,
    },
    SIMULATION_MAX_AGE
  );

  const response = NextResponse.json({ ok: true, simulating: role });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SIMULATION_MAX_AGE,
  });
  return response;
});

export const DELETE = withAuth(async () => {
  const session = await requireSession();
  if (!session.simulatedBy) {
    return NextResponse.json({ ok: false, error: 'Não está em modo simulação.' }, { status: 409 });
  }

  const master = await prisma.user.findFirst({
    where: { id: session.simulatedBy, organizationId: session.organizationId },
  });
  if (!master) {
    return NextResponse.json({ ok: false, error: 'Conta original não encontrada.' }, { status: 404 });
  }

  const token = await signSession({
    userId: master.id,
    organizationId: master.organizationId,
    role: master.role as DbRole,
  });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
  return response;
});
```

- [ ] **Step 2: Verificar compilação**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add app/api/auth/simulate
git commit -m "feat(auth): gate role simulation behind server-side master check"
```

---

### Task 10: Recuperação de senha no servidor

**Files:**
- Create: `app/api/auth/forgot-password/route.ts`
- Create: `app/api/auth/reset-password/route.ts`

**Interfaces:**
- Consumes: `prisma`, `bcryptjs`
- Produces: `POST /api/auth/forgot-password` `{email}`, `POST /api/auth/reset-password` `{email, code, password}`

- [ ] **Step 1: Implementar `forgot-password`**

```ts
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

const CODE_TTL_MS = 15 * 60 * 1000;

export async function POST(request: Request) {
  const { email } = await request.json().catch(() => ({}));
  if (typeof email !== 'string' || !email) {
    return NextResponse.json({ ok: false, error: 'Informe um e-mail.' }, { status: 400 });
  }

  const user = await prisma.user.findFirst({ where: { email: email.trim().toLowerCase() } });

  // Resposta sempre igual: nao revela se o e-mail existe.
  const generic = NextResponse.json({
    ok: true,
    message: 'Se este e-mail estiver cadastrado, o código de verificação foi enviado.',
  });
  if (!user) return generic;

  const code = String(Math.floor(100000 + Math.random() * 900000));
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      codeHash: await bcrypt.hash(code, 10),
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    },
  });

  // Envio de e-mail entra numa fase posterior; por ora o codigo sai no log do servidor.
  console.log(`[forgot-password] codigo para ${user.email}: ${code}`);
  return generic;
}
```

- [ ] **Step 2: Implementar `reset-password`**

```ts
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

const INVALID = 'Código inválido ou expirado.';

export async function POST(request: Request) {
  const { email, code, password } = await request.json().catch(() => ({}));

  if (typeof email !== 'string' || typeof code !== 'string' || typeof password !== 'string') {
    return NextResponse.json({ ok: false, error: 'Payload inválido.' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { ok: false, error: 'A senha deve ter ao menos 8 caracteres.' },
      { status: 400 }
    );
  }

  const user = await prisma.user.findFirst({ where: { email: email.trim().toLowerCase() } });
  if (!user) return NextResponse.json({ ok: false, error: INVALID }, { status: 400 });

  const tokens = await prisma.passwordResetToken.findMany({
    where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  let matched: string | null = null;
  for (const token of tokens) {
    if (await bcrypt.compare(code, token.codeHash)) {
      matched = token.id;
      break;
    }
  }
  if (!matched) return NextResponse.json({ ok: false, error: INVALID }, { status: 400 });

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(password, 10) },
    }),
    prisma.passwordResetToken.update({ where: { id: matched }, data: { usedAt: new Date() } }),
    prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Verificar compilação**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add app/api/auth/forgot-password app/api/auth/reset-password
git commit -m "feat(auth): move password reset flow to server with hashed single-use codes"
```

---

### Task 11: `AuthProvider` sobre a API

**Files:**
- Modify: `lib/auth-context.tsx`
- Modify: `app/layout.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `/api/auth/me`, `/api/auth/logout`, `/api/users`, `/api/role-permissions`, `/api/auth/simulate`
- Produces: `AuthContextType` com os 13 membros preservados, acrescido de `isLoading`, `simulatedBy`, `logout()`, `refresh()`. Métodos de escrita passam a devolver `Promise<{ success, error? }>`.

- [ ] **Step 1: Reescrever `lib/auth-context.tsx`**

Substituir a leitura de `localStorage` por `fetch('/api/auth/me')` na montagem. Pontos obrigatórios:

- `currentUser` parte de um placeholder e é preenchido pela resposta de `/api/auth/me`.
- `addUser`/`updateUser`/`deleteUser` chamam `/api/users` e, em caso de sucesso, refazem a listagem.
- `toggleRolePermission`/`resetRolePermissions` chamam `/api/role-permissions`.
- `switchRoleSimulation` chama `POST /api/auth/simulate` e recarrega a página.
- `switchUser` deixa de escrever cookie e passa a ser um alias de simulação por id.
- Nenhuma escrita em `document.cookie` permanece no arquivo.

- [ ] **Step 2: Corrigir o script de tema em `app/layout.tsx`**

O script inline lê `rocket_session` via `document.cookie` para escolher a paleta. Com o cookie `httpOnly`, isso deixa de funcionar. O layout já lê o cookie no servidor — passe o id do usuário para o script como literal:

Substituir, dentro do template do script:

```js
var sessionMatch = document.cookie.match(/(?:^|;\s*)rocket_session=([^;]+)/);
var user = sessionMatch ? decodeURIComponent(sessionMatch[1]).trim() : (localStorage.getItem('rocket_active_user_id') || '').trim();
```

por:

```js
var user = ${JSON.stringify(themeUserId ?? '')};
```

E, acima do `return`, resolver `themeUserId` a partir do token:

```ts
const token = cookieStore.get('rocket_session')?.value ?? null;
const session = token ? await verifySession(token) : null;
const themeUserId = session?.userId ?? null;
```

Trocar também `<AuthProvider initialUserId={sessionUser}>` por `<AuthProvider initialUserId={themeUserId}>`.

- [ ] **Step 3: Atualizar `app/page.tsx`**

```ts
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';

export default async function RootPage() {
  const session = await getSession();
  redirect(session ? '/dashboard' : '/login');
}
```

- [ ] **Step 4: Verificar compilação**

Run: `npx tsc --noEmit`
Expected: sem erros. Ajustar `await` nos chamadores de `settings/page.tsx` que agora recebem `Promise`.

- [ ] **Step 5: Commit**

```bash
git add lib/auth-context.tsx app/layout.tsx app/page.tsx
git commit -m "feat(auth): back AuthProvider with server session api"
```

---

### Task 12: Login real na interface

**Files:**
- Modify: `app/login/page.tsx`
- Modify: `components/forgot-password-modal.tsx`

**Interfaces:**
- Consumes: `POST /api/auth/login`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`
- Produces: fluxo de login autenticado de verdade

- [ ] **Step 1: Substituir a validação client-side**

Remover o bloco que compara senha no cliente (`const validPass = matchedUser.password || '123456'`, por volta de `app/login/page.tsx:127`) e trocar por:

```ts
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: cleanEmail, password: cleanPassword }),
});
const data = await response.json();

if (!response.ok || !data.ok) {
  setErrorMessage(data.error ?? 'Não foi possível entrar. Tente novamente.');
  setIsLoading(false);
  return;
}

const callbackUrl = new URLSearchParams(window.location.search).get('callbackUrl');
window.location.href = callbackUrl ?? '/dashboard';
```

`window.location.href` em vez de `router.push` é intencional: força um carregamento completo para que o layout do servidor releia o cookie recém-emitido.

- [ ] **Step 2: Ligar o modal de recuperação às rotas reais**

Em `components/forgot-password-modal.tsx`, trocar a simulação do código de 6 dígitos por `POST /api/auth/forgot-password` no envio e `POST /api/auth/reset-password` na confirmação. Preservar toda a UI e as transições existentes.

- [ ] **Step 3: Verificar compilação**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add app/login/page.tsx components/forgot-password-modal.tsx
git commit -m "feat(auth): wire login and password reset screens to server routes"
```

---

### Task 13: Fechar a exposição da chave da Evolution API

**Files:**
- Modify: `lib/evolution-api.ts`
- Modify: `app/api/evolution/proxy/route.ts`
- Modify: `.env.local` (renomear variáveis — instrução manual)

**Interfaces:**
- Consumes: `requireSession`, `withAuth`
- Produces: proxy autenticado; nenhuma credencial no bundle do cliente

- [ ] **Step 1: Proteger o proxy**

Em `app/api/evolution/proxy/route.ts`, envolver os handlers com `withAuth` e chamar `requireSession()` como primeira linha. Ler as credenciais de `process.env.EVOLUTION_API_URL`, `EVOLUTION_API_KEY` e `EVOLUTION_INSTANCE_NAME` (sem prefixo).

- [ ] **Step 2: Remover a leitura de env do cliente**

Em `lib/evolution-api.ts`, `getEvolutionConfig()` deixa de ler `process.env.NEXT_PUBLIC_EVOLUTION_*`. Todas as funções que hoje chamam a Evolution diretamente passam a chamar `/api/evolution/proxy`.

- [ ] **Step 3: Confirmar que nenhuma chave sobrou**

Run: `grep -rn "NEXT_PUBLIC_EVOLUTION" lib app components`
Expected: nenhum resultado.

- [ ] **Step 4: Renomear as variáveis no ambiente**

Em `.env.local`, renomear `NEXT_PUBLIC_EVOLUTION_API_URL` → `EVOLUTION_API_URL`, `NEXT_PUBLIC_EVOLUTION_API_KEY` → `EVOLUTION_API_KEY`, `NEXT_PUBLIC_EVOLUTION_INSTANCE_NAME` → `EVOLUTION_INSTANCE_NAME`. Repetir na Vercel, em Settings → Environment Variables.

- [ ] **Step 5: Commit**

```bash
git add lib/evolution-api.ts app/api/evolution/proxy/route.ts
git commit -m "fix(security): stop exposing evolution api key to the browser"
```

---

### Task 14: Proteger as rotas de API existentes e verificação final

**Files:**
- Modify: `app/api/crm/route.ts`
- Modify: `app/api/members/**`, `app/api/financial/**`, `app/api/events/**`, `app/api/wiki/**`, `app/api/academy/**`, `app/api/ai/**`, `app/api/export-pdf/**`

**Interfaces:**
- Consumes: `requireSession`, `withAuth`
- Produces: superfície de API inteiramente autenticada

- [ ] **Step 1: Envolver cada rota**

Para cada `route.ts` fora de `app/api/auth` e `app/api/webhook*`, envolver os handlers exportados com `withAuth` e chamar `requireSession()` no início.

- [ ] **Step 2: Confirmar que nenhuma rota ficou aberta**

Run: `grep -rLn "requireSession" app/api --include=route.ts`
Expected: apenas `app/api/auth/login`, `logout`, `forgot-password`, `reset-password` e os webhooks.

- [ ] **Step 3: Rodar a suíte e a compilação**

Run: `npm test` — Expected: PASS.
Run: `npx tsc --noEmit` — Expected: sem erros.
Run: `npm run build` — Expected: build concluído.

- [ ] **Step 4: Verificação manual**

- Entrar com e-mail e senha reais; confirmar redirecionamento para `/dashboard`.
- No DevTools, confirmar que `document.cookie` **não** mostra `rocket_session`.
- Apagar o cookie e chamar `/api/crm` — deve responder 401.
- Forjar `rocket_session=usr-master-1` — deve redirecionar para `/login`.
- Recuperação de senha ponta a ponta (código sai no log do servidor).
- Sidebar, topbar e matriz de permissões funcionando; matriz persiste após recarregar.

- [ ] **Step 5: Commit**

```bash
git add app/api
git commit -m "feat(auth): require authenticated session on all data api routes"
```
