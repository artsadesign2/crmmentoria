/**
 * O ritmo com que o robô responde.
 *
 * É a diferença perceptiva mais barata que existe entre um robô e uma pessoa.
 * O conteúdo pode estar perfeito: se a resposta chega em 300ms, quem está do
 * outro lado sabe. Ninguém lê uma pergunta, pensa e digita quatro linhas em
 * menos de um segundo — e o WhatsApp mostra o horário de cada mensagem, então
 * a evidência fica no histórico.
 *
 * Duas pausas diferentes, por motivos diferentes:
 *
 * - **Leitura** — o silêncio antes de o "digitando…" aparecer. É o tempo de ler
 *   o que chegou, e por isso cresce com o tamanho da mensagem **do cliente**.
 * - **Digitação** — o "digitando…" em si, proporcional ao que o robô vai
 *   escrever.
 *
 * Trocar a ordem das duas arruína o efeito: um "digitando…" que aparece no
 * mesmo instante em que a mensagem chega denuncia tanto quanto a resposta
 * instantânea, porque delata que não houve leitura.
 *
 * Puro de propósito. O executor é quem dorme e quem manda; aqui só se calcula.
 */

export interface RitmoConfig {
  /** Desligado, tudo sai em zero e o robô volta a responder instantaneamente. */
  habilitado: boolean;
  leituraPorCaractereMs: number;
  leituraPisoMs: number;
  leituraTetoMs: number;
  digitacaoPorCaractereMs: number;
  digitacaoPisoMs: number;
  digitacaoTetoMs: number;
}

/**
 * O ritmo padrão.
 *
 * Os números saem de uma pessoa digitando no celular, não de um datilógrafo:
 * ~28 caracteres por segundo é rápido demais para ser humano e lento demais
 * para ser máquina — que é exatamente onde queremos ficar. O piso de 900ms
 * existe porque mesmo "ok" leva um instante para ser digitado, e o teto de 6s
 * porque ninguém espera mais do que isso sem achar que a conversa morreu.
 */
export const RITMO_HUMANO: RitmoConfig = {
  habilitado: true,
  leituraPorCaractereMs: 14,
  leituraPisoMs: 500,
  leituraTetoMs: 2600,
  digitacaoPorCaractereMs: 36,
  digitacaoPisoMs: 900,
  digitacaoTetoMs: 6000,
};

/** Tudo em zero: o comportamento anterior à humanização. */
export const RITMO_IMEDIATO: RitmoConfig = {
  habilitado: false,
  leituraPorCaractereMs: 0,
  leituraPisoMs: 0,
  leituraTetoMs: 0,
  digitacaoPorCaractereMs: 0,
  digitacaoPisoMs: 0,
  digitacaoTetoMs: 0,
};

/**
 * Teto do que uma resposta inteira pode custar de espera.
 *
 * O webhook é síncrono: cada milissegundo aqui é um milissegundo que a
 * Evolution fica esperando o 200. Três bolhas caprichadas passariam de 15s
 * sozinhas, e a Evolution começaria a reenviar o mesmo evento — o robô
 * responderia duas vezes por parecer humano demais.
 *
 * Quando o orçamento acaba, as mensagens seguintes saem sem pausa. Sair rápido
 * é melhor que não sair.
 */
export const ORCAMENTO_TOTAL_MS = 11_000;

export interface PassoDeRitmo {
  texto: string;
  /** Silêncio antes de começar a "digitar". Só a primeira bolha costuma ter. */
  leituraMs: number;
  /** Quanto tempo o "digitando…" fica no ar antes desta mensagem. */
  digitacaoMs: number;
}

/**
 * Quanto tempo se leva para ler o que o cliente escreveu.
 *
 * Zero quando não chegou nada — é o caso da primeira mensagem de um fluxo
 * disparado pela varredura, em que não houve nada a ler.
 */
export function tempoDeLeitura(recebida: string, config: RitmoConfig = RITMO_HUMANO): number {
  if (!config.habilitado) return 0;

  const tamanho = (recebida ?? '').trim().length;
  if (tamanho === 0) return 0;

  return limitar(tamanho * config.leituraPorCaractereMs, config.leituraPisoMs, config.leituraTetoMs);
}

/** Quanto tempo se leva para digitar o que o robô vai mandar. */
export function tempoDeDigitacao(texto: string, config: RitmoConfig = RITMO_HUMANO): number {
  if (!config.habilitado) return 0;

  const tamanho = (texto ?? '').trim().length;
  if (tamanho === 0) return 0;

  return limitar(
    tamanho * config.digitacaoPorCaractereMs,
    config.digitacaoPisoMs,
    config.digitacaoTetoMs
  );
}

/**
 * O ritmo de uma sequência inteira de mensagens, já cortado pelo orçamento.
 *
 * Recebe as bolhas na ordem em que vão sair e a mensagem que as provocou.
 * Devolve, para cada uma, quanto silêncio e quanto "digitando…" vêm antes.
 *
 * O corte é progressivo, nunca proporcional: as primeiras bolhas ficam com o
 * ritmo inteiro e as últimas perdem o que faltar. Encolher todas por igual
 * deixaria a conversa uniformemente acelerada — que é justamente o defeito que
 * se está tentando corrigir.
 */
export function ritmoDaSequencia(
  textos: string[],
  recebida: string,
  config: RitmoConfig = RITMO_HUMANO,
  orcamentoMs: number = ORCAMENTO_TOTAL_MS
): PassoDeRitmo[] {
  const passos: PassoDeRitmo[] = [];
  let gasto = 0;

  const gastar = (quanto: number): number => {
    const disponivel = Math.max(0, orcamentoMs - gasto);
    const usado = Math.min(quanto, disponivel);
    gasto += usado;
    return usado;
  };

  textos.forEach((texto, i) => {
    // Só a primeira paga a leitura: a segunda bolha vem de alguém que já está
    // com a conversa na tela, escrevendo.
    const leituraMs = i === 0 ? gastar(tempoDeLeitura(recebida, config)) : 0;
    const digitacaoMs = gastar(tempoDeDigitacao(texto, config));

    passos.push({ texto, leituraMs, digitacaoMs });
  });

  return passos;
}

function limitar(valor: number, piso: number, teto: number): number {
  return Math.round(Math.min(Math.max(valor, piso), teto));
}
