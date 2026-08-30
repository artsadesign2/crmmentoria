import { esperaLegivel } from '@/lib/crm/sla';

/**
 * O texto do aviso que chega no WhatsApp do atendente.
 *
 * Puro, e separado do envio, porque é a parte que se lê. Um aviso mal escrito
 * é pior que nenhum: quem recebe "Alerta: SLA excedido na conversa
 * a3f9-…" três vezes por semana aprende a ignorar, e aí o mecanismo inteiro
 * deixou de existir sem que nada acuse falha.
 *
 * As regras do texto:
 *
 * - **Nome e tempo primeiro.** É o que aparece na notificação da tela de
 *   bloqueio, e na maioria das vezes é tudo que a pessoa vai ler.
 * - **Diz o que já foi feito**, para ninguém entrar em pânico achando que o
 *   cliente está esperando neste segundo.
 * - **Sem cobrança.** Quem esqueceu uma conversa raramente esqueceu por
 *   descaso; esqueceu porque o Inbox tem trinta e essa desceu.
 * - **Sem jargão.** "SLA", "lead", "reengajamento" e "sessão" não aparecem.
 */

export interface AvisoLeadParado {
  contato: string;
  telefone: string | null;
  horasParado: number;
  /** Link do Inbox. Vazio quando NEXT_PUBLIC_APP_URL não está definida. */
  url: string;
}

export function textoLeadParado(aviso: AvisoLeadParado): string {
  const espera = esperaLegivel(aviso.horasParado);
  const telefone = aviso.telefone ? ` — ${aviso.telefone}` : '';

  const linhas = [
    `*${aviso.contato}*${telefone} está sem resposta há ${espera}.`,
    '',
    'Assumi a conversa para o cliente não ficar no vácuo, e ela voltou para a fila do setor. Qualquer pessoa da equipe pode pegar.',
  ];

  if (aviso.url) {
    linhas.push('', `Abrir o Inbox: ${aviso.url}`);
  }

  return linhas.join('\n');
}
