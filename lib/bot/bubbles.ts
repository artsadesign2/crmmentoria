/**
 * Quebra o texto do robô em mensagens do tamanho que uma pessoa manda.
 *
 * No WhatsApp, gente escreve em rajadas curtas: manda uma linha, pensa, manda
 * outra. Parágrafo único e bem pontuado é formato de e-mail — e chega como um
 * bloco que ninguém digitou de uma vez. É o segundo tell mais alto depois da
 * resposta instantânea, e o mais fácil de corrigir, porque não exige reescrever
 * texto nenhum: o mesmo conteúdo, servido em três pedaços, já lê como pessoa.
 *
 * Duas coisas que este módulo se recusa a fazer:
 *
 * - **Não quebra conteúdo estruturado.** Um bloco com quebra de linha dentro é
 *   uma lista, um endereço, um horário de funcionamento. Espalhar isso em três
 *   mensagens transforma informação em confusão.
 * - **Não descarta nada.** Passando do teto de bolhas, o excedente é juntado na
 *   última. Perder a metade final de uma resposta seria pior que um parágrafo
 *   comprido.
 *
 * Puro: recebe texto, devolve textos.
 */

/**
 * Quantas mensagens seguidas o robô pode mandar de uma vez.
 *
 * Quatro já parece nervosismo, e cada bolha custa uma pausa do orçamento de
 * ritmo — que é tempo do webhook parado.
 */
export const MAX_BOLHAS = 3;

/** Tamanho que uma mensagem de WhatsApp tem quando é gente escrevendo. */
export const ALVO_CARACTERES = 170;

/**
 * Abaixo disto não se quebra nada.
 *
 * Uma frase de 180 caracteres é uma mensagem legítima. Partir tudo o que passa
 * do alvo produziria bolhas de duas palavras, que lêem como robô com soluço.
 */
export const MINIMO_PARA_QUEBRAR = 220;

/** Divide em frases: fim de pontuação seguido de espaço. */
const FIM_DE_FRASE = /(?<=[.!?…])\s+/;

export function quebrarEmBolhas(texto: string, maximo: number = MAX_BOLHAS): string[] {
  const limpo = (texto ?? '').trim().replace(/\n{3,}/g, '\n\n');
  if (!limpo) return [];
  if (maximo < 1) return [limpo];

  const blocos = limpo
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  const bolhas = blocos.flatMap(quebrarBloco);

  return juntarExcedente(bolhas, maximo);
}

/**
 * Um bloco vira uma ou mais bolhas.
 *
 * Bloco com quebra de linha interna sai inteiro: é lista, endereço ou horário,
 * e cada linha só faz sentido ao lado das outras.
 */
function quebrarBloco(bloco: string): string[] {
  if (bloco.includes('\n')) return [bloco];
  if (bloco.length < MINIMO_PARA_QUEBRAR) return [bloco];

  const frases = bloco.split(FIM_DE_FRASE).filter((f) => f.trim());
  if (frases.length < 2) return [bloco];

  // Agrupa frases enquanto couberem no alvo. Frase sozinha maior que o alvo
  // fica sozinha: partir no meio de uma frase é pior que uma bolha comprida.
  const grupos: string[] = [];
  let atual = '';

  for (const frase of frases) {
    const candidato = atual ? `${atual} ${frase}` : frase;

    if (atual && candidato.length > ALVO_CARACTERES) {
      grupos.push(atual);
      atual = frase;
    } else {
      atual = candidato;
    }
  }

  if (atual) grupos.push(atual);

  return grupos;
}

/**
 * Passando do teto, o resto é juntado na última bolha.
 *
 * Com quebra de parágrafo, porque o excedente veio de blocos ou frases
 * distintas e emendar tudo numa linha só produziria um texto sem respiro.
 */
function juntarExcedente(bolhas: string[], maximo: number): string[] {
  if (bolhas.length <= maximo) return bolhas;

  const inicio = bolhas.slice(0, maximo - 1);
  const resto = bolhas.slice(maximo - 1).join('\n\n');

  return [...inicio, resto];
}
