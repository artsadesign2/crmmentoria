import { prisma } from '@/lib/prisma';
import { mesmoTelefone, normalizePhone } from './phone';

/**
 * Números que pertencem à própria equipe.
 *
 * Existe por causa de um detalhe da Evolution que não é óbvio e estraga tudo:
 * ela dispara `messages.upsert` também para o que a própria instância **envia**,
 * e nesse evento o `remoteJid` é o **destinatário**, não o remetente.
 *
 * Enquanto o sistema só falava com clientes isso era inofensivo — o
 * destinatário era mesmo um contato. Desde que o robô avisa o atendente pelo
 * WhatsApp, o primeiro aviso criaria um contato com o nome do atendente, uma
 * conversa entrando na distribuição, e o menu de triagem sendo oferecido à
 * própria equipe. O funil da empresa se encheria de gente da empresa.
 *
 * O mesmo filtro cobre a resposta: o atendente que responder "ok" ao aviso não
 * vira lead. Ele age no sistema, não no fio do WhatsApp.
 *
 * **Consequência assumida:** um atendente não pode ser cliente da empresa pelo
 * mesmo número. É o preço, e é barato perto do estrago do contrário.
 */

/** Uma consulta por mensagem recebida; o índice `users_org_phone_idx` a cobre. */
export async function isNumeroInterno(organizationId: string, telefone: string): Promise<boolean> {
  const alvo = normalizePhone(telefone);
  if (!alvo) return false;

  const equipe = await prisma.user.findMany({
    where: { organizationId, phone: { not: null } },
    select: { phone: true },
  });

  return equipe.some((u) => mesmoTelefone(u.phone, alvo));
}

/**
 * O telefone de um atendente, pronto para enviar. `null` quando não cadastrou.
 *
 * Sem telefone o aviso cai no e-mail — o que é bem melhor do que descobrir
 * meses depois que ninguém nunca foi avisado.
 */
export async function telefoneDoAtendente(
  organizationId: string,
  userId: string
): Promise<string | null> {
  const usuario = await prisma.user.findFirst({
    where: { id: userId, organizationId },
    select: { phone: true },
  });

  const numero = normalizePhone(usuario?.phone ?? '');
  return numero || null;
}
