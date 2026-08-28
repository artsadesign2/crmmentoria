import { describe, it, expect } from 'vitest';
import { isOptOutMessage, normalizarComando, PALAVRAS_SAIDA } from '@/lib/dispatch/optout';

/**
 * O descadastro tem dois jeitos de errar, e os dois são caros.
 *
 * Deixar de reconhecer "PARE" mantém mensagens indo para quem pediu para parar
 * — é o caminho curto para denúncia e bloqueio do número. Reconhecer demais é
 * pior de perceber: um cliente que escreve "não quero parar de receber" sai da
 * lista em silêncio e ninguém descobre até ele reclamar de não receber nada.
 *
 * Por isso a regra é casar a mensagem *inteira* normalizada, nunca substring.
 */

describe('normalizarComando', () => {
  it('remove acento, pontuacao, caixa e espaco em volta', () => {
    expect(normalizarComando('  CANCELÁR!  ')).toBe('cancelar');
  });

  it('colapsa espaco interno', () => {
    expect(normalizarComando('sair   da   lista')).toBe('sair da lista');
  });

  it('emoji vira separador, nao sujeira', () => {
    expect(normalizarComando('🛑 PARE')).toBe('pare');
  });
});

describe('isOptOutMessage', () => {
  it('reconhece os comandos da tarefa, em qualquer caixa', () => {
    for (const texto of ['PARE', 'pare', 'Parar', 'SAIR', 'sair.', ' CANCELAR ', 'STOP']) {
      expect(isOptOutMessage(texto), texto).toBe(true);
    }
  });

  it('acento e pontuacao nao atrapalham', () => {
    expect(isOptOutMessage('cancelar!')).toBe(true);
    expect(isOptOutMessage('cancelár')).toBe(true);
    expect(isOptOutMessage('SAIR!!!')).toBe(true);
  });

  it('frase que contem a palavra NAO descadastra', () => {
    // O caso que justifica a regra inteira: aqui a substring "parar" aparece
    // dentro de um pedido para continuar recebendo.
    expect(isOptOutMessage('não quero parar de receber')).toBe(false);
    expect(isOptOutMessage('pare de mandar mensagem')).toBe(false);
    expect(isOptOutMessage('quero cancelar meu pedido, não as mensagens')).toBe(false);
  });

  it('palavra que apenas comeca igual nao descadastra', () => {
    expect(isOptOutMessage('sairei amanhã')).toBe(false);
    expect(isOptOutMessage('parece bom')).toBe(false);
    expect(isOptOutMessage('parabéns')).toBe(false);
  });

  it('vazio, espaco e emoji sozinho nao descadastram', () => {
    expect(isOptOutMessage('')).toBe(false);
    expect(isOptOutMessage('   ')).toBe(false);
    expect(isOptOutMessage('👍')).toBe(false);
  });

  it('a lista nao tem entrada vazia: uma entrada vazia casaria com qualquer coisa', () => {
    for (const palavra of PALAVRAS_SAIDA) {
      expect(palavra.length).toBeGreaterThan(0);
      // Já normalizadas: senão a comparação nunca casaria.
      expect(normalizarComando(palavra)).toBe(palavra);
    }
  });
});
