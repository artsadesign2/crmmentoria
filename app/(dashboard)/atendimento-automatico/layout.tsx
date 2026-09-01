import { notFound } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { hasAtLeastRole } from '@/lib/auth/roles';

/**
 * O construtor de fluxos é exclusivo do Master.
 *
 * Quem edita um fluxo escreve o que a empresa inteira responde no WhatsApp:
 * um nó trocado muda a mensagem de todos os atendimentos, sem revisão e sem
 * rastro visível na conversa. É poder de configuração, não de atendimento —
 * por isso não acompanha `viewCRM`, que um Editor tem.
 *
 * A resposta é 404, e não 403, pela mesma regra que vale para registros de
 * outra organização: um 403 confirma que a tela existe. Para quem não é
 * Master, ela simplesmente não está lá.
 */
export default async function AtendimentoAutomaticoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session || !hasAtLeastRole(session.role, 'Master')) {
    notFound();
  }

  return <>{children}</>;
}
