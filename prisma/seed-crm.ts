/**
 * Cria o funil padrão da organização, com as seis etapas que a interface já usa.
 *
 * As cinco primeiras vêm de LEAD_STAGES em lib/mock-data.ts, com nome e cor
 * preservados para que a F2 reescreva a tela sem mudar a aparência. A sexta,
 * "Perdidos", existe no tipo `Lead['stage']` mas faltava naquele array.
 *
 * Deliberadamente NÃO semeia MOCK_LEADS. São leads fictícios ("Dr. Fernando
 * Albuquerque, Clínica Albuquerque Dermatologia"); inseri-los criaria
 * oportunidades falsas, com valores e datas inventados, num CRM de produção.
 * O CRM nasce vazio e recebe leads reais.
 *
 * Idempotente: rodar de novo apenas reescreve nomes, cores e posições.
 *
 * Uso: npm run db:seed:crm
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const ORG_SLUG = 'rocket-club';
const PIPELINE_NAME = 'Comercial';

/** Espelha LEAD_STAGES de lib/mock-data.ts, mais a etapa de perdidos. */
const STAGES = [
  { name: '1. Novos Leads', colorHex: '#3B82F6', isWon: false, isLost: false },
  { name: '2. Em Qualificação', colorHex: '#F59E0B', isWon: false, isLost: false },
  { name: '3. Proposta Enviada', colorHex: '#A855F7', isWon: false, isLost: false },
  { name: '4. Negociação / Fechamento', colorHex: '#F97316', isWon: false, isLost: false },
  { name: '5. Ganhos (Convertidos)', colorHex: '#10B981', isWon: true, isLost: false },
  { name: '6. Perdidos', colorHex: '#64748B', isWon: false, isLost: true },
];

async function main() {
  const org = await prisma.organization.findUnique({ where: { slug: ORG_SLUG } });
  if (!org) {
    throw new Error(
      `Organizacao "${ORG_SLUG}" nao encontrada. Rode antes: npm run db:migrate f0-auth`
    );
  }

  let pipeline = await prisma.pipeline.findFirst({
    where: { organizationId: org.id, name: PIPELINE_NAME },
  });

  if (!pipeline) {
    pipeline = await prisma.pipeline.create({
      data: { organizationId: org.id, name: PIPELINE_NAME, isDefault: true, position: 0 },
    });
    console.log(`Funil "${PIPELINE_NAME}" criado.`);
  } else {
    console.log(`Funil "${PIPELINE_NAME}" ja existia; etapas serao reconciliadas.`);
  }

  for (const [position, stage] of STAGES.entries()) {
    const existing = await prisma.stage.findFirst({
      where: { pipelineId: pipeline.id, name: stage.name },
    });

    if (existing) {
      await prisma.stage.update({
        where: { id: existing.id },
        data: { ...stage, position },
      });
    } else {
      await prisma.stage.create({
        data: { ...stage, position, pipelineId: pipeline.id },
      });
    }
  }

  const total = await prisma.stage.count({ where: { pipelineId: pipeline.id } });
  const cards = await prisma.dealCard.count({ where: { organizationId: org.id } });

  console.log(`Seed do CRM concluido: ${total} etapas em "${PIPELINE_NAME}".`);
  console.log(`Oportunidades na organizacao: ${cards} (nenhuma criada por este seed).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
