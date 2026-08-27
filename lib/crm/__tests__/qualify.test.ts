import { describe, it, expect } from 'vitest';
import { parseQualification } from '@/lib/ai/qualify';

/**
 * A qualificação grava no funil. O modo de falha perigoso não é o erro
 * visível — é o dado plausível e inventado que entra no card e ninguém
 * questiona depois. Por isso nada é gravado antes de passar por aqui.
 */

const completo = {
  faturamento: '180 mil por mês',
  gargalo: 'depende só dele para vender',
  meta: 'escalar sem depender de si',
  objecao: 'achou caro',
  temperatura: 50,
  resumo: 'Cliente interessado, com objeção de preço.',
};

describe('parseQualification', () => {
  it('aceita a resposta completa', () => {
    const r = parseQualification(JSON.stringify(completo));

    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toEqual(completo);
  });

  it('JSON malformado devolve erro, sem lancar', () => {
    expect(() => parseQualification('{isso nao e json')).not.toThrow();
    expect(parseQualification('{isso nao e json').ok).toBe(false);
  });

  it('resposta vazia devolve erro', () => {
    expect(parseQualification('').ok).toBe(false);
    expect(parseQualification('   ').ok).toBe(false);
  });

  it('JSON que nao e objeto devolve erro', () => {
    expect(parseQualification('[1,2,3]').ok).toBe(false);
    expect(parseQualification('"texto"').ok).toBe(false);
    expect(parseQualification('null').ok).toBe(false);
  });

  it('descasca cerca de codigo, que o modelo as vezes acrescenta', () => {
    const r = parseQualification('```json\n' + JSON.stringify(completo) + '\n```');

    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.temperatura).toBe(50);
  });

  it('campo de texto faltando vira "nao informado", nao erro', () => {
    const { gargalo, ...semGargalo } = completo;
    const r = parseQualification(JSON.stringify(semGargalo));

    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.gargalo).toBe('não informado');
  });

  it('campo de texto vazio tambem vira "nao informado"', () => {
    const r = parseQualification(JSON.stringify({ ...completo, objecao: '   ' }));

    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.objecao).toBe('não informado');
  });

  it('temperatura fora da escala e recusada', () => {
    expect(parseQualification(JSON.stringify({ ...completo, temperatura: 150 })).ok).toBe(false);
    expect(parseQualification(JSON.stringify({ ...completo, temperatura: -5 })).ok).toBe(false);
  });

  it('temperatura em string numerica e convertida', () => {
    const r = parseQualification(JSON.stringify({ ...completo, temperatura: '72' }));

    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.temperatura).toBe(72);
  });

  it('temperatura ausente ou nao numerica e recusada', () => {
    const { temperatura, ...semTemp } = completo;

    expect(parseQualification(JSON.stringify(semTemp)).ok).toBe(false);
    expect(parseQualification(JSON.stringify({ ...completo, temperatura: 'morno' })).ok).toBe(false);
  });

  it('resumo ausente e recusado: e o unico campo sem substituto', () => {
    const { resumo, ...semResumo } = completo;
    expect(parseQualification(JSON.stringify(semResumo)).ok).toBe(false);
  });

  it('temperatura decimal e arredondada: a coluna e inteira', () => {
    const r = parseQualification(JSON.stringify({ ...completo, temperatura: 72.6 }));

    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.temperatura).toBe(73);
  });
});
