import { describe, expect, it } from 'vitest';
import { TIPOS_DE_PASSO, gerarFluxo, limparCerca, promptDoFluxo } from '@/lib/bot/gerar';

describe('promptDoFluxo', () => {
  const setores = [
    { id: 'dep-comercial', name: 'Comercial' },
    { id: 'dep-suporte', name: 'Suporte' },
  ];

  it('leva os ids reais dos setores, porque é o que a IA não pode inventar', () => {
    const p = promptDoFluxo(setores, '');

    expect(p).toContain('dep-comercial');
    expect(p).toContain('Comercial');
    expect(p).toContain('Nunca invente um departmentId');
  });

  it('sem setor cadastrado, manda deixar vazio em vez de improvisar', () => {
    const p = promptDoFluxo([], '');

    expect(p).toContain('nenhum setor cadastrado');
    expect(p).toContain('departmentId vazio');
  });

  it('a persona configurada é quem escreve as falas', () => {
    expect(promptDoFluxo(setores, 'Marina')).toContain('como Marina');
    // Sem persona, ninguém é nomeado — e nada de "como , a pessoa".
    expect(promptDoFluxo(setores, '')).not.toContain('como ,');
  });

  it('carrega as regras que o validador cobra depois', () => {
    // Se o prompt não pedir o que validate.ts exige, toda geração volta com
    // erro e a funcionalidade não serve para nada.
    const p = promptDoFluxo(setores, '');

    expect(p).toContain('Exatamente um START');
    expect(p).toContain('alcançável');
    expect(p).toContain('sourceHandle igual à key');
    expect(p).toContain('termina em TRANSFER ou END');
  });

  it('repete as regras de escrita humana da F6', () => {
    const p = promptDoFluxo(setores, '');

    expect(p).toContain('prezado');
    expect(p).toContain('bom dia');
    expect(p).toContain('{{nome}}');
    // Preço dito pelo robô vira compromisso da empresa.
    expect(p).toContain('Não prometa preço');
  });
});

describe('TIPOS_DE_PASSO', () => {
  it('é a mesma lista que a importação aceita', () => {
    // Divergir daqui gera fluxos que a IA monta e a importação recusa.
    expect([...TIPOS_DE_PASSO].sort()).toEqual(
      ['AI', 'CAPTURE', 'CONDITION', 'END', 'MESSAGE', 'QUESTION', 'START', 'TRANSFER'].sort()
    );
  });

  it('o prompt descreve cada um deles', () => {
    const p = promptDoFluxo([], '');
    for (const tipo of TIPOS_DE_PASSO) expect(p).toContain(`- ${tipo}:`);
  });
});

describe('limparCerca', () => {
  it('JSON puro passa intacto', () => {
    expect(limparCerca('{"nodes":[]}')).toBe('{"nodes":[]}');
  });

  it('tira a cerca de código, que aparece por não usarmos esquema', () => {
    expect(limparCerca('```json\n{"nodes":[]}\n```')).toBe('{"nodes":[]}');
    expect(limparCerca('```\n{"nodes":[]}\n```')).toBe('{"nodes":[]}');
  });

  it('tira também o texto que o modelo escreve em volta', () => {
    expect(limparCerca('Claro! Segue:\n```json\n{"nodes":[]}\n```\nAbraço')).toBe('{"nodes":[]}');
  });
});

describe('gerarFluxo', () => {
  it('descrição curta demais nem chega à IA', async () => {
    // Sem esta porta, "menu" gastaria uma chamada para voltar um fluxo
    // inventado do nada.
    const r = await gerarFluxo('menu', []);

    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erro).toContain('mais de detalhe');
  });
});
