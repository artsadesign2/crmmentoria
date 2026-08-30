import { describe, expect, it } from 'vitest';
import { ALVO_CARACTERES, MAX_BOLHAS, quebrarEmBolhas } from '@/lib/bot/bubbles';

describe('quebrarEmBolhas', () => {
  it('texto curto sai inteiro, numa bolha só', () => {
    expect(quebrarEmBolhas('Claro, consigo te ajudar com isso.')).toEqual([
      'Claro, consigo te ajudar com isso.',
    ]);
  });

  it('vazio não vira bolha nenhuma', () => {
    expect(quebrarEmBolhas('')).toEqual([]);
    expect(quebrarEmBolhas('   \n  ')).toEqual([]);
  });

  it('quebra de parágrafo separa bolhas', () => {
    const bolhas = quebrarEmBolhas('Oi, tudo bem?\n\nMe conta o que você precisa.');

    expect(bolhas).toEqual(['Oi, tudo bem?', 'Me conta o que você precisa.']);
  });

  it('lista não é espalhada em várias mensagens', () => {
    // Cada linha só faz sentido ao lado das outras. Três bolhas aqui
    // transformariam informação em confusão.
    const lista = 'Atendemos assim:\nSegunda a sexta, 9h às 18h\nSábado, 9h às 13h';

    expect(quebrarEmBolhas(lista)).toEqual([lista]);
  });

  it('parágrafo longo é dividido em frases', () => {
    const longo =
      'A mentoria acontece em encontros semanais de uma hora. ' +
      'Você entra num grupo de no máximo oito pessoas, o que mantém o espaço para as suas perguntas. ' +
      'Entre um encontro e outro fica um canal aberto para dúvidas do dia a dia. ' +
      'A primeira conversa é sempre individual, para entender o seu momento.';

    const bolhas = quebrarEmBolhas(longo);

    expect(bolhas.length).toBeGreaterThan(1);
    expect(bolhas.join(' ')).toBe(longo);
  });

  it('não parte no meio de uma frase', () => {
    const frase = `Essa é uma única frase muito comprida ${'que continua sem ponto '.repeat(12)}e termina aqui.`;

    expect(quebrarEmBolhas(frase)).toEqual([frase]);
  });

  it('não quebra número com ponto decimal', () => {
    const texto =
      'O investimento fica em R$ 2.500 por mês, e o contrato é de 6 meses. ' +
      'Dá para começar pelo diagnóstico, que é gratuito e leva uns 40 minutos. ' +
      'Depois disso você decide sem compromisso nenhum, no seu tempo.';

    const bolhas = quebrarEmBolhas(texto);

    expect(bolhas.some((b) => b.includes('R$ 2.500'))).toBe(true);
    expect(bolhas.some((b) => b.trim() === '500 por mês, e o contrato é de 6 meses.')).toBe(false);
  });

  it('respeita o teto de bolhas', () => {
    const muitos = Array.from({ length: 9 }, (_, i) => `Parágrafo ${i + 1}.`).join('\n\n');

    expect(quebrarEmBolhas(muitos)).toHaveLength(MAX_BOLHAS);
  });

  it('nada é descartado ao passar do teto', () => {
    // Perder a metade final de uma resposta é pior que um parágrafo comprido.
    const muitos = Array.from({ length: 9 }, (_, i) => `Parágrafo ${i + 1}.`).join('\n\n');
    const bolhas = quebrarEmBolhas(muitos);

    expect(bolhas.join('\n\n')).toBe(muitos);
    expect(bolhas[MAX_BOLHAS - 1]).toContain('Parágrafo 9.');
  });

  it('as bolhas ficam perto do tamanho alvo', () => {
    const longo = Array.from(
      { length: 6 },
      (_, i) => `Esta é a frase número ${i + 1} e ela tem um tamanho bem parecido com as outras.`
    ).join(' ');

    const bolhas = quebrarEmBolhas(longo, 10);

    // Nenhuma bolha muito além do alvo, e nenhuma bolha de duas palavras.
    for (const bolha of bolhas) {
      expect(bolha.length).toBeLessThanOrEqual(ALVO_CARACTERES + 90);
      expect(bolha.length).toBeGreaterThan(10);
    }
  });

  it('teto de uma devolve o texto inteiro numa bolha', () => {
    const texto = 'Primeiro.\n\nSegundo.\n\nTerceiro.';

    expect(quebrarEmBolhas(texto, 1)).toEqual([texto]);
  });
});
