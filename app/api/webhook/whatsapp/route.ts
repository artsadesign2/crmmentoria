import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseEvolutionEvent } from '@/lib/crm/inbound';
import { findOrCreateConversation } from '@/lib/crm/conversations';
import { recordInboundMessage } from '@/lib/crm/messages';
import { findOrCreateByPhone } from '@/lib/crm/contacts';
import { formatPhoneBr } from '@/lib/crm/phone';
import { readEvolutionEnv, verifyWebhookToken } from '@/lib/evolution/server';
import { isOptOutMessage, optOutContact } from '@/lib/dispatch/optout';

/**
 * Recebe os eventos da Evolution API e grava o que for conversa.
 *
 * Antes da F3 esta rota interpretava o payload e devolvia um eco: o conteúdo
 * ia para o log e se perdia. Agora ela é a porta de entrada do histórico.
 *
 * Duas decisões que parecem estranhas e não são:
 *
 * 1. **Token obrigatório.** A rota é isenta da sessão no middleware, porque a
 *    Evolution não tem cookie. Enquanto não gravava nada, a ausência de
 *    autenticação era inofensiva. Gravando, um endpoint de escrita aberto na
 *    internet é como se envenena uma caixa de entrada.
 *
 * 2. **200 em quase tudo.** A Evolution reenvia webhooks que não recebem 2xx.
 *    Responder 500 a um payload que não sabemos interpretar produz uma
 *    tempestade de retentativas sobre a mesma mensagem defeituosa. O que é
 *    descartado vai para o log com o motivo; só token inválido responde erro,
 *    porque aí a retentativa é justamente o que não queremos alimentar.
 */

export const dynamic = 'force-dynamic';

/** Organização dona da instância. Com número central, é a instância que decide. */
async function organizacaoDaInstancia(): Promise<string | null> {
  // Uma instância por organização hoje. Quando houver várias, o vínculo passa a
  // ser uma coluna em `organizations` e esta função é o único lugar a mudar.
  const org = await prisma.organization.findFirst({
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  return org?.id ?? null;
}

export async function POST(request: Request) {
  // Só o token é exigido. As credenciais da Evolution servem para *enviar*;
  // condicionar o recebimento a elas faria a caixa parar de receber por causa
  // de uma variável de envio errada.
  if (!verifyWebhookToken(request)) {
    console.warn('[webhook] token invalido ou ausente; nada gravado.');
    return NextResponse.json({ ok: false, error: 'Não autorizado.' }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const evento = parseEvolutionEvent(payload);

  if (evento.kind !== 'MESSAGE') {
    if (evento.kind === 'IGNORED') console.log(`[webhook] descartado: ${evento.reason}`);
    if (evento.kind === 'UNKNOWN') console.log(`[webhook] evento nao tratado: ${evento.event}`);
    if (evento.kind === 'CONNECTION') console.log(`[webhook] conexao: ${evento.state}`);

    return NextResponse.json({ ok: true, handled: evento.kind });
  }

  try {
    const organizationId = await organizacaoDaInstancia();
    if (!organizationId) {
      console.error('[webhook] nenhuma organizacao cadastrada; evento descartado.');
      return NextResponse.json({ ok: true, handled: 'NO_ORG' });
    }

    const { contact } = await findOrCreateByPhone(
      organizationId,
      evento.phone,
      evento.pushName ?? undefined
    );

    await adotarPushName(contact.id, contact.name, contact.phone, evento.pushName);

    const conversa = await findOrCreateConversation(
      organizationId,
      contact.id,
      'WHATSAPP',
      evento.jid
    );

    const { duplicated } = await recordInboundMessage(organizationId, conversa.id, evento);

    if (duplicated) {
      console.log(`[webhook] reenvio de ${evento.externalId}; nada duplicado.`);
    }

    // O descadastro vem *depois* de gravar, nunca no lugar de gravar. Quem
    // escreve "PARE" continua com a mensagem no histórico e continua podendo
    // ser atendido: o pedido foi para sair do disparo em massa, e apagar o
    // pedido do histórico seria perder a prova de quando ele chegou.
    const descadastrou =
      !evento.fromMe && evento.contentType === 'TEXT' && isOptOutMessage(evento.content);

    if (descadastrou) {
      await optOutContact(contact.id, `Pediu para parar pelo WhatsApp: "${evento.content.trim()}"`);
      console.log(`[webhook] contato ${contact.id} descadastrado do disparo.`);
    }

    return NextResponse.json({
      ok: true,
      handled: 'MESSAGE',
      duplicated,
      optedOut: descadastrou,
      conversationId: conversa.id,
    });
  } catch (error) {
    // Log com o id externo para dar para reconstituir depois qual mensagem caiu.
    console.error(`[webhook] falha ao gravar ${evento.externalId}:`, error);
    return NextResponse.json({ ok: true, handled: 'ERROR' });
  }
}

/**
 * Adota o nome do WhatsApp só quando o contato ainda não tem nome próprio.
 *
 * `findOrCreateByPhone` nomeia o contato novo com o telefone formatado quando
 * nenhum nome chega junto. Se o nome depois aparecer, vale a pena trocar o
 * número por ele. O que nunca acontece é o contrário: um contato cadastrado
 * como "Dra. Helena Braga" não vira "helena 💅✨" porque foi assim que ela se
 * nomeou no aparelho.
 */
async function adotarPushName(
  contactId: string,
  nomeAtual: string,
  telefone: string | null,
  pushName: string | null
): Promise<void> {
  if (!pushName || !telefone) return;

  const ehPlaceholder = nomeAtual === formatPhoneBr(telefone) || nomeAtual === telefone;
  if (!ehPlaceholder) return;

  await prisma.contact.update({ where: { id: contactId }, data: { name: pushName } });
}

/** Verificação de saúde, usada pelo painel da Evolution ao configurar a URL. */
export async function GET() {
  return NextResponse.json({
    status: 'online',
    service: 'Rocket Club — receptor de webhook da Evolution API',
    version: '3.0.0',
    configured: readEvolutionEnv() !== null,
    supportedEvents: ['messages.upsert', 'connection.update', 'qrcode.updated'],
    timestamp: new Date().toISOString(),
  });
}
