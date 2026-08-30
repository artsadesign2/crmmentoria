import { prisma } from '@/lib/prisma';
import { sendText } from '@/lib/evolution/server';
import { routeConversation } from '@/lib/crm/routing';
import { step, type BotAction, type StepInput } from './engine';
import { aplicarRetomada, avaliarRetomada } from './reengage-service';
import { responderComIa } from './ai-node';
import type { MotivoRetomada } from './reengage';
import {
  abrirSessao,
  encerrarSessao,
  gravarEvento,
  salvarEstado,
  sessaoAtiva,
  type PapelDoFluxo,
  type SessaoCarregada,
} from './sessions';

/**
 * O executor: realiza no mundo real as ações que o motor decidiu.
 *
 * A divisão é o ponto da fase. O motor decide e não pode causar dano; o
 * executor causa efeito e não decide nada. Toda a lógica de ramificação está
 * testada sem banco, e o que sobra aqui é encanamento — enviar, gravar,
 * transferir.
 */

/**
 * Passadas do motor numa mesma mensagem recebida.
 *
 * O motor já tem teto de nós; este é o teto do **laço externo**, que existe por
 * causa do nó de IA: cada resposta do Gemini realimenta uma nova passada. Sem
 * ele, IA e motor poderiam se alimentar mutuamente.
 */
const TETO_PASSADAS = 4;

export interface ResultadoBot {
  /** Falso quando não havia fluxo, ou a conversa já era de um humano. */
  atuou: boolean;
  enviadas: number;
  /** Preenchido quando o robô voltou a uma conversa que já tinha dono. */
  retomada: MotivoRetomada | null;
}

const NAO_ATUOU: ResultadoBot = { atuou: false, enviadas: 0, retomada: null };

/**
 * Roda o bot sobre uma mensagem que acabou de chegar.
 *
 * Nunca lança: quem chama é o webhook, que precisa responder 200 mesmo quando
 * tudo dá errado. Falha aqui encerra a sessão e deixa a conversa para uma
 * pessoa — nunca deixa o cliente falando sozinho.
 */
export async function executarBot(
  organizationId: string,
  conversationId: string,
  texto: string,
  /**
   * `REENGAGE` é a varredura falando: ela já devolveu a conversa para a fila,
   * então o robô não veria mais dono nenhum aqui e cairia no fluxo de
   * boas-vindas — dando "olá, seja bem-vindo" a quem espera resposta há dois
   * dias. O papel viaja junto para isso não acontecer.
   */
  papelInicial: PapelDoFluxo = 'TRIGGER'
): Promise<ResultadoBot> {
  try {
    return await rodar(organizationId, conversationId, texto, papelInicial);
  } catch (error) {
    console.error(`[bot] falha ao executar na conversa ${conversationId}:`, error);
    await encerrarSessao(conversationId, 'Falha do robô; conversa entregue a um atendente.').catch(
      () => undefined
    );
    return NAO_ATUOU;
  }
}

async function rodar(
  organizationId: string,
  conversationId: string,
  texto: string,
  papelInicial: PapelDoFluxo
): Promise<ResultadoBot> {
  const conversa = await prisma.conversation.findFirst({
    where: { id: conversationId, organizationId },
    select: {
      id: true,
      assignedUserId: true,
      departmentId: true,
      contact: { select: { id: true, name: true, company: true, phone: true } },
    },
  });

  if (!conversa) return NAO_ATUOU;

  let sessao = await sessaoAtiva(conversationId);
  let papel: PapelDoFluxo = papelInicial;
  let motivo: MotivoRetomada | null = null;

  /**
   * Conversa com dono é de um humano — até deixar de ser.
   *
   * A distribuição da F3 dá dono à conversa na primeira mensagem. Sem exceção
   * nenhuma aqui, um atendente que entrasse de férias levaria os leads dele
   * junto: o sistema não acusaria nada, porque do ponto de vista dele a
   * conversa está sendo atendida. `avaliarRetomada` é essa exceção, e ela é
   * estreita — devolve `null`, e o robô cala, em todos os casos normais.
   *
   * Sessão já viva numa conversa com dono é o robô cobrindo o intervalo:
   * qualquer resposta humana a encerra (`sendCustomerMessage`), então ela só
   * existe enquanto ninguém respondeu. Segue pelo caminho normal.
   */
  if (conversa.assignedUserId && !sessao) {
    const retomada = await avaliarRetomada(organizationId, conversationId, conversa.assignedUserId);
    if (!retomada) return NAO_ATUOU;

    await aplicarRetomada(organizationId, conversationId, retomada);
    papel = 'REENGAGE';
    motivo = retomada.motivo;
  }

  if (!sessao) {
    sessao = await abrirSessao(organizationId, conversationId, papel);

    // Sem fluxo publicado o robô não fala. Mas se houve retomada, a conversa já
    // voltou para a fila e quem a deixou parada já foi avisado — a parte que
    // garante atendimento não depende de existir bot.
    if (!sessao) return { atuou: motivo !== null, enviadas: 0, retomada: motivo };

    // O rótulo sai de `papel`, não de `motivo`. Quando é a varredura que abre a
    // sessão, ela já devolveu a conversa para a fila antes de chamar aqui — o
    // dono sumiu, a avaliação acima nem roda, e `motivo` fica nulo. Rotular
    // pelo motivo faria a trilha dizer "sessão iniciada" justamente no caso que
    // alguém vai querer investigar depois.
    await gravarEvento(
      sessao.id,
      sessao.estado.currentNodeId,
      'ENTER',
      papel === 'REENGAGE'
        ? `Sessão retomada${motivo ? ` (${motivo})` : ''}.`
        : 'Sessão iniciada.'
    );
  }

  const contato = {
    nome: conversa.contact.name,
    empresa: conversa.contact.company,
  };

  let entrada: StepInput = { texto, contato };
  let enviadas = 0;

  for (let passada = 0; passada < TETO_PASSADAS; passada++) {
    const resultado = step(sessao.grafo, sessao.estado, entrada);

    const efeitos = await realizar(
      sessao,
      conversa.contact.phone,
      conversa.departmentId,
      resultado.acoes
    );

    enviadas += efeitos.enviadas;
    sessao = { ...sessao, estado: resultado.proximaSessao };

    await salvarEstado(sessao.id, resultado.proximaSessao, resultado.status);

    if (resultado.status !== 'RUNNING') return { atuou: true, enviadas, retomada: motivo };

    // O motor parou pedindo a IA e o executor conseguiu a resposta: outra
    // passada, agora com ela em mãos.
    if (efeitos.respostaIa !== undefined) {
      entrada = { texto, contato, respostaIa: efeitos.respostaIa };
      continue;
    }

    // Pediu a IA e não houve resposta — porque o cliente pediu uma pessoa,
    // porque a base não cobre o assunto, porque o teto de trocas acabou ou
    // porque o Gemini falhou. Entregar a um humano agora, com o motivo, em vez
    // de dar voltas até estourar o laço externo.
    if (efeitos.precisaIa) {
      await transferir(
        sessao,
        conversa.departmentId,
        efeitos.motivoIa ?? 'O fluxo chegou ao nó de IA e ela não está disponível.'
      );
      return { atuou: true, enviadas, retomada: motivo };
    }

    // Parou esperando o cliente. É aqui que a maioria das passadas termina.
    return { atuou: true, enviadas, retomada: motivo };
  }

  // Estourou o laço externo: transferir é a saída honesta.
  await transferir(sessao, conversa.departmentId, 'O robô não conseguiu concluir o atendimento.');
  return { atuou: true, enviadas, retomada: motivo };
}

interface Efeitos {
  enviadas: number;
  /** Definida quando o executor conseguiu uma resposta da IA. */
  respostaIa?: string;
  /** Verdadeiro quando o nó de IA foi alcançado e não há como respondê-lo. */
  precisaIa: boolean;
  /** Por que a IA não respondeu, para a transferência dizer a verdade. */
  motivoIa?: string;
}

async function realizar(
  sessao: SessaoCarregada,
  telefone: string | null,
  departmentIdAtual: string | null,
  acoes: BotAction[]
): Promise<Efeitos> {
  const efeitos: Efeitos = { enviadas: 0, precisaIa: false };

  for (const acao of acoes) {
    switch (acao.tipo) {
      case 'ENVIAR': {
        const ok = await enviarMensagem(sessao, telefone, acao.texto);
        if (ok) efeitos.enviadas += 1;
        break;
      }

      case 'CAPTURAR':
        await capturar(sessao, acao.campo, acao.valor);
        break;

      case 'TRANSFERIR':
        await transferir(sessao, acao.departmentId ?? departmentIdAtual, acao.motivo);
        break;

      case 'PERGUNTAR_IA': {
        const decisao = await responderComIa(
          sessao.organizationId,
          sessao.conversationId,
          acao.pergunta,
          sessao.estado.aiTurns
        );

        if (decisao.tipo === 'RESPONDER') {
          // Realimenta o motor, que envia o texto e conta a troca. O executor
          // não envia por conta própria: quem decide o que sai é o motor, e
          // essa divisão é o que mantém o teto de trocas confiável.
          efeitos.respostaIa = decisao.texto;
          await gravarEvento(
            sessao.id,
            sessao.estado.currentNodeId,
            'AI',
            `P: ${acao.pergunta}\nR: ${decisao.texto}`
          );
        } else {
          efeitos.precisaIa = true;
          efeitos.motivoIa = decisao.motivo;
          await gravarEvento(
            sessao.id,
            sessao.estado.currentNodeId,
            'AI',
            `P: ${acao.pergunta}\nSem resposta: ${decisao.motivo}`
          );
        }
        break;
      }

      case 'ENCERRAR':
        await gravarEvento(sessao.id, sessao.estado.currentNodeId, 'ENTER', acao.motivo);
        break;
    }
  }

  return efeitos;
}

/**
 * Envia e grava, nessa ordem de gravação: a `Message` nasce `PENDING` e vira
 * `SENT` ou `FAILED`. É a mesma disciplina de `sendCustomerMessage` (F3) —
 * gravar antes de enviar, para o pior caso ser uma linha `FAILED` visível em
 * vez de uma mensagem que o cliente recebeu e o sistema não registrou.
 *
 * `isFromBot: true` e `userId: null`, **sem assinatura**: assinar um texto de
 * robô com o nome de uma pessoa é uma mentira pequena que corrói a confiança
 * no histórico inteiro.
 */
async function enviarMensagem(
  sessao: SessaoCarregada,
  telefone: string | null,
  texto: string
): Promise<boolean> {
  if (!telefone) {
    await gravarEvento(sessao.id, sessao.estado.currentNodeId, 'SEND', 'Contato sem telefone.');
    return false;
  }

  const gravada = await prisma.message.create({
    data: {
      organizationId: sessao.organizationId,
      conversationId: sessao.conversationId,
      userId: null,
      direction: 'OUTBOUND',
      contentType: 'TEXT',
      content: texto,
      status: 'PENDING',
      isFromBot: true,
    },
    select: { id: true },
  });

  const envio = await sendText(telefone, texto);
  const agora = new Date();

  await prisma.message.update({
    where: { id: gravada.id },
    data: envio.ok ? { status: 'SENT', externalId: envio.externalId } : { status: 'FAILED' },
  });

  await prisma.conversation.update({
    where: { id: sessao.conversationId },
    data: { lastMessageAt: agora, updatedAt: agora },
  });

  await gravarEvento(
    sessao.id,
    sessao.estado.currentNodeId,
    'SEND',
    envio.ok ? texto : `FALHOU: ${envio.error}`
  );

  return envio.ok;
}

/**
 * Grava a captura em `contacts.custom_fields`.
 *
 * Mesclando, nunca substituindo o objeto inteiro: um fluxo que pergunta o
 * e-mail não pode apagar o CPF que outro fluxo guardou semana passada.
 */
async function capturar(sessao: SessaoCarregada, campo: string, valor: string): Promise<void> {
  const conversa = await prisma.conversation.findUnique({
    where: { id: sessao.conversationId },
    select: { contactId: true },
  });

  if (!conversa) return;

  const contato = await prisma.contact.findUnique({
    where: { id: conversa.contactId },
    select: { customFields: true },
  });

  const atuais = (contato?.customFields as Record<string, string> | null) ?? {};

  await prisma.contact.update({
    where: { id: conversa.contactId },
    data: { customFields: { ...atuais, [campo]: valor } },
  });

  await gravarEvento(sessao.id, sessao.estado.currentNodeId, 'CAPTURE', `${campo} = ${valor}`);
}

/**
 * Entrega a conversa a um humano e fecha a sessão.
 *
 * `departmentId` nulo cai na distribuição da F3, que escolhe o atendente menos
 * ocupado entre os que estão online — a mesma regra de uma conversa que
 * chegasse sem bot nenhum.
 */
async function transferir(
  sessao: SessaoCarregada,
  departmentId: string | null,
  motivo: string
): Promise<void> {
  const destino = await routeConversation(sessao.organizationId, departmentId);

  const atual = await prisma.conversation.findUnique({
    where: { id: sessao.conversationId },
    select: { assignedUserId: true },
  });

  await prisma.conversation.update({
    where: { id: sessao.conversationId },
    data: {
      departmentId: destino.departmentId,
      // A distribuição devolve `null` quando ninguém está online — o que é o
      // normal às duas da manhã, exatamente quando o robô de retomada está
      // trabalhando. Sem o `??`, o nó de transferência tiraria a conversa do
      // atendente que a tinha durante o dia, por não achar ninguém acordado
      // para substituí-lo.
      assignedUserId: destino.assignedUserId ?? atual?.assignedUserId ?? null,
      status: 'OPEN',
      updatedAt: new Date(),
    },
  });

  await gravarEvento(sessao.id, sessao.estado.currentNodeId, 'TRANSFER', motivo);

  await prisma.botSession.updateMany({
    where: { id: sessao.id, status: 'RUNNING' },
    data: { status: 'HANDED_OFF', awaitingInput: false, updatedAt: new Date() },
  });
}
