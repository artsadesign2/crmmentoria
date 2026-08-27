import { describe, it, expect } from 'vitest';
import { isRetryable, buildRequestBody, MODEL_CHAIN, TRANSCRIBE_MODEL } from '@/lib/ai/gemini';

/**
 * O que se testa aqui é o que quebra em silêncio: retentar o que não deve ser
 * retentado queima cota contra um erro que nunca vai passar, e um corpo mal
 * montado faz a Gemini devolver texto solto onde o código espera JSON.
 *
 * A chamada de rede em si não é testada — é I/O contra um serviço externo, e
 * um teste que depende dele falha por motivo errado.
 */

describe('isRetryable', () => {
  it('congestionamento e limite de taxa valem a pena repetir', () => {
    expect(isRetryable(503)).toBe(true);
    expect(isRetryable(429)).toBe(true);
    expect(isRetryable(500)).toBe(true);
  });

  it('erro de requisicao ou de credencial nao se resolve repetindo', () => {
    expect(isRetryable(400)).toBe(false);
    expect(isRetryable(401)).toBe(false);
    expect(isRetryable(403)).toBe(false);
    expect(isRetryable(404)).toBe(false);
  });

  it('sucesso nao e retentado', () => {
    expect(isRetryable(200)).toBe(false);
  });
});

describe('MODEL_CHAIN', () => {
  it('comeca pelo modelo mais rapido medido', () => {
    expect(MODEL_CHAIN[0]).toBe('gemini-3.5-flash');
  });

  it('tem reserva, para um 503 nao virar falha', () => {
    expect(MODEL_CHAIN.length).toBeGreaterThan(1);
  });

  it('nao inclui o 3.7-flash: 166 segundos medidos sob carga', () => {
    expect(MODEL_CHAIN).not.toContain('gemini-3.7-flash');
  });

  it('a transcricao usa generalista: o modelo dedicado devolve vazio', () => {
    expect(TRANSCRIBE_MODEL).not.toBe('gemini-3.5-transcribe');
  });
});

describe('buildRequestBody', () => {
  it('texto simples vira uma parte de usuario', () => {
    const corpo = buildRequestBody({ parts: [{ text: 'oi' }] });

    expect(corpo.contents).toEqual([{ role: 'user', parts: [{ text: 'oi' }] }]);
    expect(corpo.systemInstruction).toBeUndefined();
  });

  it('instrucao de sistema vai para systemInstruction, nao para o conteudo', () => {
    const corpo = buildRequestBody({ system: 'voce e um copiloto', parts: [{ text: 'oi' }] });

    expect(corpo.systemInstruction).toEqual({ parts: [{ text: 'voce e um copiloto' }] });
    expect(JSON.stringify(corpo.contents)).not.toContain('copiloto');
  });

  it('pedir json liga o mime e o esquema juntos', () => {
    const esquema = { type: 'OBJECT', properties: { a: { type: 'STRING' } } };
    const corpo = buildRequestBody({ parts: [{ text: 'oi' }], json: { schema: esquema } });

    expect(corpo.generationConfig.responseMimeType).toBe('application/json');
    expect(corpo.generationConfig.responseSchema).toEqual(esquema);
  });

  it('sem pedir json, nenhum dos dois aparece', () => {
    const corpo = buildRequestBody({ parts: [{ text: 'oi' }] });

    expect(corpo.generationConfig.responseMimeType).toBeUndefined();
    expect(corpo.generationConfig.responseSchema).toBeUndefined();
  });

  it('audio embutido atravessa intacto', () => {
    const audio = { inlineData: { mimeType: 'audio/ogg', data: 'QUJD' } };
    const corpo = buildRequestBody({ parts: [{ text: 'transcreva' }, audio] });

    expect(corpo.contents[0].parts[1]).toEqual(audio);
  });

  it('temperatura e teto de saida tem padrao, e sao sobrescritiveis', () => {
    const padrao = buildRequestBody({ parts: [{ text: 'oi' }] });
    expect(padrao.generationConfig.temperature).toBeTypeOf('number');
    expect(padrao.generationConfig.maxOutputTokens).toBeGreaterThan(0);

    const custom = buildRequestBody({ parts: [{ text: 'oi' }], temperature: 0, maxOutputTokens: 99 });
    expect(custom.generationConfig.temperature).toBe(0);
    expect(custom.generationConfig.maxOutputTokens).toBe(99);
  });

  it('teto de saida generoso: os modelos gastam tokens pensando antes de responder', () => {
    // Medido: uma resposta de duas letras consumiu 118 tokens. Um teto apertado
    // faz o modelo esgotar o orcamento no raciocinio e devolver parte vazia.
    expect(buildRequestBody({ parts: [{ text: 'oi' }] }).generationConfig.maxOutputTokens)
      .toBeGreaterThanOrEqual(2000);
  });
});
