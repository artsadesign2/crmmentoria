/**
 * Semeia a matriz de permissões por papel da organização.
 *
 * Deliberadamente NÃO cria os INITIAL_SYSTEM_USERS de lib/permissions.ts: eles
 * são dados de demonstração ("Fernanda Lima (Editora)", "Carlos Eduardo Silva")
 * que existiam apenas no localStorage. Transformá-los em contas de login reais
 * neste banco criaria usuários fantasma com acesso ao sistema. Contas novas
 * devem ser criadas pela tela de configurações, por um Master.
 *
 * Idempotente: rodar mais de uma vez apenas reescreve as permissões padrão.
 *
 * Uso: npm run db:seed
 */
import { PrismaClient } from '@prisma/client';
import { DEFAULT_ROLE_PERMISSIONS, type UserRole } from '../lib/permissions';
import { labelToRole } from '../lib/auth/roles';

const prisma = new PrismaClient();
const ORG_SLUG = 'rocket-club';

async function main() {
  const org = await prisma.organization.findUnique({ where: { slug: ORG_SLUG } });
  if (!org) {
    throw new Error(
      `Organizacao "${ORG_SLUG}" nao encontrada. Rode a migracao antes: node --env-file=.env --import tsx prisma/migrate-f0.ts`
    );
  }

  let count = 0;
  for (const [label, permissions] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    const role = labelToRole(label as UserRole);
    await prisma.rolePermission.upsert({
      where: { organizationId_role: { organizationId: org.id, role } },
      update: { permissions: permissions as object },
      create: { organizationId: org.id, role, permissions: permissions as object },
    });
    count += 1;
  }

  const users = await prisma.user.count({ where: { organizationId: org.id } });
  console.log(`Seed concluido: ${count} papeis semeados em "${org.name}".`);
  console.log(`Usuarios existentes na organizacao: ${users} (nenhum criado por este seed).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
