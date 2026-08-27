import { prisma } from '@/lib/prisma';
import type { SessionPayload } from '@/lib/auth/jwt';
import { dealVisibilityFilter } from './visibility';
import type { PipelineDTO, StageDTO } from './types';

/**
 * Funis da organização, com contagem e somatório por etapa.
 *
 * Os totais vêm agregados do banco. Somar no cliente exigiria transferir todos
 * os cards de todas as colunas só para calcular o número do rodapé — com 5.000
 * mensagens numa coluna, como o PRD prevê, isso derruba a tela.
 *
 * Os agregados respeitam a visibilidade do usuário: um Editor vê o total do
 * que ele enxerga, não o total da empresa. Mostrar um somatório que não bate
 * com os cards visíveis confundiria mais do que informaria.
 */
export async function listPipelines(session: SessionPayload): Promise<PipelineDTO[]> {
  const pipelines = await prisma.pipeline.findMany({
    where: { organizationId: session.organizationId },
    include: { stages: { orderBy: { position: 'asc' } } },
    orderBy: { position: 'asc' },
  });

  if (pipelines.length === 0) return [];

  const stageIds = pipelines.flatMap((p) => p.stages.map((s) => s.id));
  if (stageIds.length === 0) {
    return pipelines.map((p) => ({
      id: p.id,
      name: p.name,
      isDefault: p.isDefault,
      position: p.position,
      stages: [],
    }));
  }

  const aggregates = await prisma.dealCard.groupBy({
    by: ['stageId'],
    where: { ...dealVisibilityFilter(session), stageId: { in: stageIds } },
    _count: { _all: true },
    _sum: { dealValue: true },
  });

  const byStage = new Map(
    aggregates.map((row) => [
      row.stageId,
      { count: row._count._all, total: Number(row._sum.dealValue ?? 0) },
    ])
  );

  return pipelines.map((pipeline) => ({
    id: pipeline.id,
    name: pipeline.name,
    isDefault: pipeline.isDefault,
    position: pipeline.position,
    stages: pipeline.stages.map<StageDTO>((stage) => {
      const agg = byStage.get(stage.id);
      return {
        id: stage.id,
        name: stage.name,
        colorHex: stage.colorHex,
        position: stage.position,
        isWon: stage.isWon,
        isLost: stage.isLost,
        cardCount: agg?.count ?? 0,
        totalValue: agg?.total ?? 0,
      };
    }),
  }));
}

/**
 * Confirma que a etapa pertence a um funil da organização da sessão.
 *
 * Sem esta verificação, um `stageId` de outro tenant moveria o card para fora
 * da organização — o escopo do `where` sozinho não impede isso, porque o id da
 * etapa vem do corpo da requisição.
 */
export async function stageBelongsToOrg(
  organizationId: string,
  stageId: string
): Promise<boolean> {
  const stage = await prisma.stage.findFirst({
    where: { id: stageId, pipeline: { organizationId } },
    select: { id: true },
  });
  return stage !== null;
}

/** Etapa inicial do funil padrão, usada quando um card nasce sem etapa definida. */
export async function defaultStageId(organizationId: string): Promise<string | null> {
  const stage = await prisma.stage.findFirst({
    where: { pipeline: { organizationId } },
    orderBy: [{ pipeline: { position: 'asc' } }, { position: 'asc' }],
    select: { id: true },
  });
  return stage?.id ?? null;
}
