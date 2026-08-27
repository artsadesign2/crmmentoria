import { prisma } from '@/lib/prisma';
import { hasAtLeastRole, type DbRole } from '@/lib/auth/roles';

/**
 * Para quem vai a conversa que acabou de chegar.
 *
 * A regra é "menos ocupado entre quem está online", e não rodízio estrito.
 * Rodízio exige guardar um cursor e distribui mal quando as conversas duram
 * tempos diferentes: quem pegou três clientes difíceis continua recebendo no
 * mesmo ritmo de quem despachou três "obrigado, tchau". Contar conversas
 * abertas não guarda estado nenhum, se autocorrige sozinho e sobrevive a
 * alguém entrar de férias.
 *
 * `pickAgent` é pura de propósito: é a regra que precisa ser demonstrável.
 */

/** Presença é "teve a tela do Inbox aberta há pouco" — ver touchPresence. */
export const JANELA_ONLINE_MS = 15 * 60_000;

export interface RoutingCandidate {
  id: string;
  role: DbRole;
  status: string;
  lastActiveAt: Date | null;
  openConversations: number;
  lastAssignedAt: Date | null;
}

/** Rank de Editor para cima e cadastro ATIVO. Cliente e Usuário nunca atendem. */
export function canAttend(role: DbRole, status: string): boolean {
  return status === 'ATIVO' && hasAtLeastRole(role, 'Editor');
}

/**
 * Devolve o id de quem recebe a conversa, ou `null` para deixá-la na fila.
 *
 * Deixar na fila quando ninguém está online é deliberado. Atribuir a uma pessoa
 * ausente equivale a arquivar a mensagem: ela sai da fila de todo mundo e
 * ninguém responde. Fila visível ao setor inteiro é melhor do que caixa de
 * entrada de quem foi almoçar.
 */
export function pickAgent(
  candidates: RoutingCandidate[],
  now: Date,
  onlineWindowMs: number = JANELA_ONLINE_MS
): string | null {
  const limite = now.getTime() - onlineWindowMs;

  const elegiveis = candidates.filter(
    (c) => canAttend(c.role, c.status) && c.lastActiveAt !== null && c.lastActiveAt.getTime() >= limite
  );

  if (elegiveis.length === 0) return null;

  // Nunca ter recebido conversa conta como "há mais tempo possível": quem
  // acabou de entrar na equipe entra na frente de quem já está rodando.
  const ultimaAtribuicao = (c: RoutingCandidate) => c.lastAssignedAt?.getTime() ?? -Infinity;

  const ordenados = [...elegiveis].sort(
    (a, b) =>
      a.openConversations - b.openConversations ||
      ultimaAtribuicao(a) - ultimaAtribuicao(b) ||
      // Desempate final por id: sem ele, a ordem de chegada do banco decidiria,
      // e a mesma entrada poderia produzir respostas diferentes.
      a.id.localeCompare(b.id)
  );

  return ordenados[0].id;
}

/** Setor por onde entram as conversas novas. Null quando a organização não tem setor. */
export async function defaultDepartmentId(organizationId: string): Promise<string | null> {
  const setor = await prisma.department.findFirst({
    where: { organizationId, isDefaultInbox: true },
    select: { id: true },
  });

  return setor?.id ?? null;
}

/**
 * Monta os candidatos do setor e aplica a regra.
 *
 * Quando o setor não tem ninguém que possa atender, a busca se abre para a
 * organização inteira — é preferível um atendente de outro setor a uma conversa
 * parada. O setor da conversa continua sendo o de entrada.
 */
export async function routeConversation(
  organizationId: string,
  departmentId: string | null
): Promise<{ departmentId: string | null; assignedUserId: string | null }> {
  const setor = departmentId ?? (await defaultDepartmentId(organizationId));

  let candidatos = await carregarCandidatos(organizationId, setor);
  if (candidatos.length === 0 && setor !== null) {
    candidatos = await carregarCandidatos(organizationId, null);
  }

  return {
    departmentId: setor,
    assignedUserId: pickAgent(candidatos, new Date()),
  };
}

async function carregarCandidatos(
  organizationId: string,
  departmentId: string | null
): Promise<RoutingCandidate[]> {
  const usuarios = await prisma.user.findMany({
    where: {
      organizationId,
      status: 'ATIVO',
      ...(departmentId ? { departmentId } : {}),
    },
    select: { id: true, role: true, status: true, lastActiveAt: true },
  });

  const atendentes = usuarios.filter((u) => canAttend(u.role as DbRole, u.status));
  if (atendentes.length === 0) return [];

  const ids = atendentes.map((u) => u.id);

  // Duas agregações no banco em vez de carregar as conversas: a contagem é a
  // única coisa que interessa, e ela cresce com a operação.
  const [cargas, ultimas] = await Promise.all([
    prisma.conversation.groupBy({
      by: ['assignedUserId'],
      where: { organizationId, status: 'OPEN', assignedUserId: { in: ids } },
      _count: { _all: true },
    }),
    prisma.conversation.groupBy({
      by: ['assignedUserId'],
      where: { organizationId, assignedUserId: { in: ids } },
      _max: { createdAt: true },
    }),
  ]);

  const cargaPor = new Map(cargas.map((c) => [c.assignedUserId, c._count._all]));
  const ultimaPor = new Map(ultimas.map((u) => [u.assignedUserId, u._max.createdAt]));

  return atendentes.map((u) => ({
    id: u.id,
    role: u.role as DbRole,
    status: u.status,
    lastActiveAt: u.lastActiveAt,
    openConversations: cargaPor.get(u.id) ?? 0,
    lastAssignedAt: ultimaPor.get(u.id) ?? null,
  }));
}
