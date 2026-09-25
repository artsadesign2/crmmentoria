import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export const DEFAULT_COLUMNS = [
  { name: 'A Fazer', colorHex: '#64748B', position: 0, isCompletedColumn: false },
  { name: 'Em Andamento', colorHex: '#3B82F6', position: 1, isCompletedColumn: false },
  { name: 'Em Revisão', colorHex: '#EAB308', position: 2, isCompletedColumn: false },
  { name: 'Concluído', colorHex: '#10B981', position: 3, isCompletedColumn: true },
];

/**
 * Garante que a organização possua pelo menos um projeto padrão e token de calendário.
 */
export async function ensureDefaultProject(organizationId: string, createdById?: string) {
  // 1. Garantir CalendarSetting
  let calendarSetting = await prisma.calendarSetting.findUnique({
    where: { organizationId },
  });

  if (!calendarSetting) {
    const feedToken = crypto.randomBytes(32).toString('hex');
    calendarSetting = await prisma.calendarSetting.create({
      data: {
        organizationId,
        feedToken,
      },
    });
  }

  // 2. Garantir pelo menos 1 Projeto
  let project = await prisma.taskProject.findFirst({
    where: { organizationId, isArchived: false },
    include: { columns: { orderBy: { position: 'asc' } } },
  });

  if (!project) {
    project = await prisma.taskProject.create({
      data: {
        organizationId,
        name: '🚀 Operações & Projetos Rocket',
        description: 'Espaço central de gestão de tarefas, sprints e demandas da equipe.',
        icon: 'rocket',
        colorHex: '#EAB308',
        createdById,
        columns: {
          create: DEFAULT_COLUMNS.map((col) => ({
            name: col.name,
            colorHex: col.colorHex,
            position: col.position,
            isCompletedColumn: col.isCompletedColumn,
          })),
        },
      },
      include: { columns: { orderBy: { position: 'asc' } } },
    });
  }

  return { project, calendarSetting };
}
