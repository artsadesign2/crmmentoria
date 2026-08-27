import { describe, it, expect } from 'vitest';
import {
  formatConversation,
  suggestSystemPrompt,
  qualifySystemPrompt,
  LIMITE_MENSAGENS,
  QUALIFY_SCHEMA,
} from '@/lib/ai/prompts';
import type { MessageDTO } from '@/lib/crm/inbox-types';

/**
 * O prompt é a única barreira entre o que o cliente digita e o que o modelo
 * entende como ordem. Um erro aqui não dá exceção: dá uma resposta errada com
 * cara de certa, na frente do cliente.
 */

function msg(over: Partial<MessageDTO> & { id: string }): MessageDTO {
  return {
    direction: 'INBOUND',
    contentType: 'TEXT',
    content: 'oi',
    mediaUrl: null,
    transcription: null,
    status: 'DELIVERED',
    isFromBot: false,
    userId: null,
    userName: null,
    createdAt: '2026-08-27T12:00:00.000Z',
    ...over,
  };
}

describe('formatConversation', () => {
  it('rotula cada linha por quem falou', () => {
    const texto = formatConversation([
      msg({ id: '1', direction: 'INBOUND', content: 'quanto custa?' }),
      msg({ id: '2', direction: 'OUTBOUND', content: 'ja te falo', userName: 'Marcio' }),
    ]);

    expect(texto).toContain('CLIENTE: quanto custa?');
    expect(texto).toContain('ATENDENTE');
    expect(texto).toContain('ja te falo');
  });

  it('marca a nota interna como interna', () => {
    const texto = formatConversation([
      msg({ id: '1', direction: 'INTERNAL', content: 'ja e aluna, sem desconto', userName: 'Ana' }),
    ]);

    expect(texto).toContain('NOTA INTERNA');
    expect(texto).toContain('ja e aluna, sem desconto');
  });

  it('usa a transcricao quando o audio tem uma', () => {
    const texto = formatConversation([
      msg({
        id: '1',
        contentType: 'AUDIO',
        content: '[Mensagem de áudio]',
        transcription: 'quero saber o valor',
      }),
    ]);

    expect(texto).toContain('quero saber o valor');
    // O rótulo genérico não acrescenta nada ao modelo quando há transcrição.
    expect(texto).not.toContain('[Mensagem de áudio]');
  });

  it('audio sem transcricao aparece como audio, e nao some', () => {
    const texto = formatConversation([
      msg({ id: '1', contentType: 'AUDIO', content: '[Mensagem de áudio]' }),
    ]);

    expect(texto).toContain('áudio');
  });

  it('corta as antigas e mantem as recentes', () => {
    const muitas = Array.from({ length: LIMITE_MENSAGENS + 10 }, (_, i) =>
      msg({ id: String(i), content: `mensagem ${i}` })
    );

    const texto = formatConversation(muitas);

    expect(texto).toContain(`mensagem ${LIMITE_MENSAGENS + 9}`);
    expect(texto).not.toContain('mensagem 0\n');
    expect(texto.split('\n').filter(Boolean)).toHaveLength(LIMITE_MENSAGENS);
  });

  it('conversa vazia devolve string vazia, sem quebrar', () => {
    expect(formatConversation([])).toBe('');
  });

  it('mensagem sem conteudo nao vira linha fantasma', () => {
    const texto = formatConversation([msg({ id: '1', content: null, contentType: 'TEXT' })]);
    expect(texto.trim()).toBe('');
  });
});

describe('suggestSystemPrompt', () => {
  const contato = { nome: 'Helena', empresa: 'Clínica Braga', etapa: 'Proposta Enviada' };

  it('declara que mensagem de cliente e dado, nunca ordem', () => {
    const p = suggestSystemPrompt({ knowledgeBase: 'Plano anual: R$ 24.000', tone: '' }, contato);

    expect(p.toLowerCase()).toContain('nunca');
    expect(p.toLowerCase()).toMatch(/instru|ordem|comando/);
  });

  it('inclui a base de conhecimento', () => {
    const p = suggestSystemPrompt({ knowledgeBase: 'Plano anual: R$ 24.000', tone: '' }, contato);
    expect(p).toContain('R$ 24.000');
  });

  it('base vazia manda nao afirmar fato comercial', () => {
    const p = suggestSystemPrompt({ knowledgeBase: '', tone: '' }, contato);

    expect(p.toLowerCase()).toContain('não afirme');
    expect(p.toLowerCase()).toMatch(/pre[çc]o|valor/);
  });

  it('proibe repetir nota interna ao cliente', () => {
    const p = suggestSystemPrompt({ knowledgeBase: 'x', tone: '' }, contato);
    expect(p.toUpperCase()).toContain('NOTA INTERNA');
  });

  it('leva o contexto do contato', () => {
    const p = suggestSystemPrompt({ knowledgeBase: 'x', tone: '' }, contato);

    expect(p).toContain('Helena');
    expect(p).toContain('Clínica Braga');
    expect(p).toContain('Proposta Enviada');
  });

  it('o tom da empresa entra quando existe', () => {
    const p = suggestSystemPrompt({ knowledgeBase: 'x', tone: 'direto e sem formalidade' }, contato);
    expect(p).toContain('direto e sem formalidade');
  });
});

describe('qualifySystemPrompt e QUALIFY_SCHEMA', () => {
  it('manda usar "nao informado" em vez de inventar', () => {
    const p = qualifySystemPrompt().toLowerCase();

    expect(p).toContain('não informado');
    expect(p).toMatch(/invent|deduz|supon/);
  });

  it('o esquema exige os seis campos', () => {
    const esquema = QUALIFY_SCHEMA as { required: string[] };

    expect(esquema.required).toEqual(
      expect.arrayContaining(['faturamento', 'gargalo', 'meta', 'objecao', 'temperatura', 'resumo'])
    );
  });

  it('temperatura e inteira', () => {
    const esquema = QUALIFY_SCHEMA as { properties: Record<string, { type: string }> };
    expect(esquema.properties.temperatura.type).toBe('INTEGER');
  });
});
