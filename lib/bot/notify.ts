import { prisma } from '@/lib/prisma';
import { sendText } from '@/lib/evolution/server';
import { sendEmail } from '@/lib/email';
import { leadParadoEmail } from '@/lib/email/templates';
import { formatPhoneBr, normalizePhone } from '@/lib/crm/phone';
import { textoLeadParado } from './notify-text';

/**
 * Avisar quem deixou o lead parado.
 *
 * WhatsApp primeiro, e-mail como reserva. A ordem não é preferência de estilo:
 * o atendente passa o dia no WhatsApp da empresa e entra no e-mail corporativo
 * de vez em quando. Um aviso que chega onde a pessoa não está é o mesmo que
 * não avisar, com o agravante de o sistema registrar que avisou.
 *
 * O e-mail continua existindo para os dois casos em que o WhatsApp não serve:
 * o atendente não cadastrou telefone, ou a Evolution recusou o envio. Um aviso,
 * duas rotas, nunca silêncio — e a rota usada volta para quem chamou, para
 * ficar registrada na trilha do contato.
 *
 * O envio sai pelo **número central da empresa**, o mesmo que fala com os
 * clientes. Não há outro, e é o certo: o atendente reconhece o número.
 */

export type RotaAviso = 'WHATSAPP' | 'EMAIL' | 'NENHUMA';

export interface AvisoAtendente {
  organizationId: string;
  /** Quem estava com a conversa. */
  userId: string;
  contato: { name: string; phone: string | null };
  horasParado: number;
}

export async function avisarAtendente(aviso: AvisoAtendente): Promise<RotaAviso> {
  const atendente = await prisma.user.findFirst({
    where: { id: aviso.userId, organizationId: aviso.organizationId },
    select: { name: true, email: true, phone: true, status: true },
  });

  // Cadastro inativo é metade do motivo de a conversa ter parado. Avisar quem
  // saiu da empresa não recupera lead nenhum.
  if (!atendente || atendente.status !== 'ATIVO') return 'NENHUMA';

  const config = await prisma.botSettings.findUnique({
    where: { organizationId: aviso.organizationId },
    select: { notifyByWhatsapp: true, notifyByEmail: true },
  });

  const porWhatsapp = config?.notifyByWhatsapp ?? true;
  const porEmail = config?.notifyByEmail ?? true;

  const telefoneAtendente = normalizePhone(atendente.phone ?? '');
  const url = linkDoInbox();

  if (porWhatsapp && telefoneAtendente) {
    const texto = textoLeadParado({
      contato: aviso.contato.name,
      telefone: aviso.contato.phone ? formatPhoneBr(aviso.contato.phone) : null,
      horasParado: aviso.horasParado,
      url,
    });

    const envio = await sendText(telefoneAtendente, texto);
    if (envio.ok) return 'WHATSAPP';

    console.warn(`[retomada] aviso por WhatsApp falhou (${envio.error}); tentando e-mail.`);
  }

  if (porEmail) {
    const conteudo = leadParadoEmail({
      atendente: atendente.name,
      contato: aviso.contato.name,
      telefone: aviso.contato.phone ? formatPhoneBr(aviso.contato.phone) : null,
      horasParado: aviso.horasParado,
      url,
    });

    const envio = await sendEmail({ to: atendente.email, ...conteudo });
    if (envio.ok) return 'EMAIL';
  }

  console.warn(`[retomada] nenhum aviso chegou ao atendente ${aviso.userId}.`);
  return 'NENHUMA';
}

/**
 * O link do Inbox, ou vazio.
 *
 * Vazio omite a linha inteira do aviso: mandar `http://localhost:3000/inbox`
 * para o celular de alguém é pior que não mandar link nenhum.
 */
function linkDoInbox(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!base || base.includes('localhost') || base.includes('127.0.0.1')) return '';

  return `${base.replace(/\/$/, '')}/inbox`;
}
