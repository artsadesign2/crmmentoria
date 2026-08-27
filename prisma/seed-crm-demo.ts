/**
 * Dados de demonstração do funil — opcional e reversível.
 *
 * Cria quatro oportunidades que exercitam os três estados do filete de SLA,
 * três canais diferentes, tags e progresso de tarefas. Serve para conferir o
 * Kanban visualmente antes de existirem leads reais.
 *
 * NÃO é chamado por nenhum outro seed, de propósito: os seeds de produção
 * (`db:seed` e `db:seed:crm`) nunca inserem contato fictício. Este aqui só roda
 * quando você pede, e sai inteiro com um comando.
 *
 *   npm run db:seed:crm:demo          cria
 *   npm run db:seed:crm:demo -- undo  remove tudo o que criou
 *
 * Os registros são marcados com source "Demo CRM", que é como a remoção os
 * encontra sem tocar em nada que você tenha cadastrado.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const MARCA = 'Demo CRM';

const LEADS = [
  {
    nome: 'Dra. Helena Braga',
    telefone: '5511981112233',
    empresa: 'Clínica Braga',
    valor: 32000,
    etapa: 0,
    prioridade: 'HIGH',
    canal: 'WHATSAPP',
    mensagem: 'Vi o material, quero entender o formato das imersões',
    tags: ['Alta prioridade'],
    /** Prazo folgado: filete verde. */
    slaHoras: 20,
    lembrete: false,
  },
  {
    nome: 'Rafael Nogueira',
    telefone: '5521992223344',
    empresa: 'Nogueira Odonto',
    valor: 18500,
    etapa: 1,
    prioridade: 'MEDIUM',
    canal: 'INSTAGRAM',
    mensagem: 'Recebi a proposta, vou avaliar com minha sócia',
    tags: ['Indicação'],
    /** Prazo próximo: filete âmbar. */
    slaHoras: 1.5,
    lembrete: false,
  },
  {
    nome: 'Camila Ferraz',
    telefone: '5531983334455',
    empresa: 'Ferraz Estética',
    valor: 47000,
    etapa: 2,
    prioridade: 'URGENT',
    canal: 'WHATSAPP',
    mensagem: 'Consigo fechar essa semana se o parcelamento ajudar',
    tags: ['Alta prioridade', 'Fechamento'],
    /** Prazo vencido: filete vermelho. */
    slaHoras: -1,
    lembrete: false,
  },
  {
    nome: 'Bruno Tavares',
    telefone: '5541994445566',
    empresa: 'Tavares Fisio',
    valor: 25000,
    etapa: 3,
    prioridade: 'HIGH',
    canal: 'VOIP',
    mensagem: 'Podemos ajustar o cronograma de início?',
    tags: [],
    /** Sem prazo: o filete não aparece. */
    slaHoras: null,
    lembrete: true,
  },
];

const CORES_TAG: Record<string, string> = {
  'Alta prioridade': '#EF4444',
  Fechamento: '#10B981',
  Indicação: '#A855F7',
};

async function remover(organizationId: string) {
  const contatos = await prisma.contact.findMany({
    where: { organizationId, source: MARCA },
    select: { id: true },
  });
  const ids = contatos.map((c) => c.id);

  const deals = await prisma.dealCard.deleteMany({ where: { contactId: { in: ids } } });
  const removidos = await prisma.contact.deleteMany({ where: { id: { in: ids } } });

  console.log(`Removidos: ${deals.count} oportunidade(s), ${removidos.count} contato(s) de demonstracao.`);
}

async function criar(organizationId: string) {
  const usuario = await prisma.user.findFirst({
    where: { organizationId, role: 'MASTER' },
    select: { id: true },
  });

  const etapas = await prisma.stage.findMany({
    where: { pipeline: { organizationId } },
    orderBy: { position: 'asc' },
  });

  if (etapas.length === 0) {
    throw new Error('Nenhuma etapa encontrada. Rode antes: npm run db:seed:crm');
  }

  const agora = Date.now();

  for (const [i, lead] of LEADS.entries()) {
    const contato = await prisma.contact.create({
      data: {
        organizationId,
        name: lead.nome,
        company: lead.empresa,
        phone: lead.telefone,
        type: 'LEAD',
        source: MARCA,
      },
    });

    for (const nomeTag of lead.tags) {
      const tag = await prisma.tag.upsert({
        where: { organizationId_name: { organizationId, name: nomeTag } },
        update: {},
        create: { organizationId, name: nomeTag, colorHex: CORES_TAG[nomeTag] ?? '#64748B' },
      });
      await prisma.contactTag.create({ data: { contactId: contato.id, tagId: tag.id } });
    }

    await prisma.dealCard.create({
      data: {
        organizationId,
        contactId: contato.id,
        stageId: etapas[Math.min(lead.etapa, etapas.length - 1)].id,
        assignedUserId: usuario?.id ?? null,
        title: `Mentoria — ${lead.empresa}`,
        dealValue: lead.valor,
        priority: lead.prioridade,
        channel: lead.canal,
        position: i,
        lastMessageText: lead.mensagem,
        lastMessageAt: new Date(agora - (i + 1) * 37 * 60_000),
        totalTasks: 12,
        completedTasks: i + 1,
        slaDueAt: lead.slaHoras === null ? null : new Date(agora + lead.slaHoras * 3_600_000),
        reminderAt: lead.lembrete ? new Date(agora + 86_400_000) : null,
        customFields: {
          produto: i % 2 === 0 ? 'Plano Anual' : 'Imersão',
          currentRevenue: 'R$ 180.000/mês',
        },
      },
    });
  }

  console.log(`Criadas ${LEADS.length} oportunidades de demonstracao.`);
  console.log('Para remover: npm run db:seed:crm:demo -- undo');
}

async function main() {
  const org = await prisma.organization.findFirstOrThrow({ where: { slug: 'rocket-club' } });

  if (process.argv.includes('undo')) {
    await remover(org.id);
    return;
  }

  // Recria do zero, para rodar duas vezes não duplicar.
  await remover(org.id);
  await criar(org.id);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
