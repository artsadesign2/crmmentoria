import { prisma } from '@/lib/prisma';
import type { SessionPayload } from '@/lib/auth/jwt';

/**
 * Descadastro — quem pediu para parar, para de receber disparo.
 *
 * Exigência da LGPD, e antes disso um cuidado com o número: continuar mandando
 * para quem pediu para parar é o caminho mais curto para denúncia e bloqueio.
 *
 * Só vale para disparo em massa. Quem escreveu "PARE" e no dia seguinte
 * pergunta o preço continua sendo atendido normalmente no Inbox — descadastro
 * é de campanha, não de atendimento.
 */

/**
 * Comandos que descadastram, já normalizados.
 *
 * Só palavra isolada, de propósito. "pare de mandar mensagem" e "não quero
 * parar de receber" são frases: a primeira provavelmente quer sair, a segunda
 * claramente quer ficar, e nenhuma regra barata separa as duas. Diante da
 * dúvida, a mensagem vira atendimento humano — que é o que ela já é.
 */
export const PALAVRAS_SAIDA: string[] = [
  'pare',
  'parar',
  'para',
  'sair',
  'saia',
  'cancelar',
  'cancela',
  'descadastrar',
  'descadastro',
  'remover',
  'stop',
  'unsubscribe',
];

/**
 * Marcas de acento soltas depois do NFD (U+0300 a U+036F).
 *
 * Construída com escapes em vez de literal para o arquivo continuar legível em
 * qualquer editor: as marcas combinantes, sozinhas, não têm forma visível.
 */
const ACENTOS = new RegExp('[\u0300-\u036f]', 'g');

/**
 * Reduz a mensagem à sua forma comparável.
 *
 * Acento fora ("cancelár" é "cancelar"), caixa fora, pontuação e emoji viram
 * separador — "🛑 PARE" e "cancelar!" são o mesmo comando de sempre.
 */
export function normalizarComando(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(ACENTOS, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Verdadeiro quando a mensagem *inteira* é um comando de saída.
 *
 * Puro e sem I/O: é a regra que decide desligar alguém de todas as campanhas,
 * e precisa ser testável sem banco.
 */
export function isOptOutMessage(texto: string): boolean {
  if (!texto) return false;

  const normalizado = normalizarComando(texto);
  if (!normalizado) return false;

  return PALAVRAS_SAIDA.includes(normalizado);
}

/**
 * Marca o contato como descadastrado.
 *
 * Sem `organizationId` na assinatura porque quem chama já obteve este id de uma
 * busca escopada por organização (o webhook, via `findOrCreateByPhone`). Não é
 * rota: nenhum id chega aqui vindo direto do cliente.
 *
 * `optedOutAt: null` no filtro guarda a *primeira* vez que a pessoa pediu.
 * Repetir "PARE" não deve reescrever a data nem o motivo original.
 */
export async function optOutContact(contactId: string, motivo: string): Promise<void> {
  await prisma.contact.updateMany({
    where: { id: contactId, optedOutAt: null },
    data: { optedOutAt: new Date(), optedOutReason: motivo },
  });
}

/**
 * Recadastra o contato — só por ação humana no CRM.
 *
 * Nunca automático: uma resposta qualquer do cliente depois do "PARE" não pode
 * recolocá-lo na lista. Escopado por organização porque aqui o id vem da
 * interface, e contato de outra organização precisa ser invisível.
 */
export async function optInContact(session: SessionPayload, contactId: string): Promise<void> {
  await prisma.contact.updateMany({
    where: { id: contactId, organizationId: session.organizationId },
    data: { optedOutAt: null, optedOutReason: null },
  });
}
