import { describe, expect, it } from 'vitest';
import {
  MARCA_NAO_SEI,
  PALAVRAS_SENSIVEIS,
  avaliarRespostaIa,
  botSystemPrompt,
  exigeHumano,
} from '@/lib/bot/ai-node';
import { TETO_TROCAS_IA, sessaoInicial, step } from '@/lib/bot/engine';
import type { BotGraph } from '@/lib/bot/types';

/**
 * As travas do nó de IA.
 *
 * Esta é a única parte do sistema que fala com um cliente sem revisão humana,
 * e o modo de falha não é a IA errar um horário: é ela afirmar um preço que
 * não existe, aceitar um cancelamento que ninguém autorizou, ou conversar para
 * sempre com quem já pediu uma pessoa. Todas as travas são puras e testadas
 * aqui, sem chamar o Gemini uma vez.
 */

describe('exigeHumano', () => {
  it('reconhece o pedido explícito por uma pessoa', () => {
    expect(exigeHumano('quero falar com um atendente')).toBe(true);
    expect(exigeHumano('me passa pra um humano')).toBe(true);
    expect(exigeHumano('quero falar com uma pessoa')).toBe(true);
  });

  it('sai de cena em assunto sensível', () => {
    // Não porque a IA erraria a resposta, mas porque acertar não basta: um
    // preço dito por robô vira compromisso da empresa do mesmo jeito.
    expect(exigeHumano('qual o preço?')).toBe(true);
    expect(exigeHumano('quero cancelar')).toBe(true);
    expect(exigeHumano('como peço reembolso')).toBe(true);
    expect(exigeHumano('preciso ver o contrato')).toBe(true);
  });

  it('deixa passar pergunta comum', () => {
    expect(exigeHumano('qual o horário de vocês?')).toBe(false);
    expect(exigeHumano('vocês abrem no sábado')).toBe(false);
    expect(exigeHumano('onde fica a sede')).toBe(false);
  });

  it('atravessa acento, caixa e pontuação', () => {
    expect(exigeHumano('QUAL O PREÇO???')).toBe(true);
    expect(exigeHumano('Contrato.')).toBe(true);
    // Acento errado ainda casa, e é para casar: quem digita rápido no celular
    // escreve "reembôlso", e a trava não pode depender de ortografia.
    expect(exigeHumano('quero um reembôlso')).toBe(true);
  });

  it('não dispara por palavra contida em outra', () => {
    // "apreço" contém "preço"; casar por pedaço mandaria um elogio para a fila.
    expect(exigeHumano('tenho muito apreço pelo trabalho de vocês')).toBe(false);
    expect(exigeHumano('descontraído')).toBe(false);
  });

  it('texto vazio não exige nada', () => {
    expect(exigeHumano('')).toBe(false);
    expect(exigeHumano('   ')).toBe(false);
  });

  it('a lista de palavras sensíveis não está vazia', () => {
    expect(PALAVRAS_SENSIVEIS.length).toBeGreaterThan(0);
  });
});

describe('avaliarRespostaIa', () => {
  it('resposta normal na primeira troca é enviada', () => {
    const d = avaliarRespostaIa('Abrimos das 9h às 18h, de segunda a sexta.', 0);

    expect(d.tipo).toBe('RESPONDER');
    expect(d.tipo === 'RESPONDER' && d.texto).toBe('Abrimos das 9h às 18h, de segunda a sexta.');
  });

  it('a marca de "não sei" transfere', () => {
    const d = avaliarRespostaIa(MARCA_NAO_SEI, 0);
    expect(d.tipo).toBe('TRANSFERIR');
  });

  it('a marca transfere mesmo enfeitada de texto', () => {
    // O modelo às vezes obedece pela metade: escreve a marca e ainda explica.
    // Enviar isso mostraria o código interno ao cliente.
    const d = avaliarRespostaIa(`Desculpe, ${MARCA_NAO_SEI} não encontrei essa informação.`, 0);
    expect(d.tipo).toBe('TRANSFERIR');
  });

  it('resposta vazia transfere, nunca envia vazio', () => {
    expect(avaliarRespostaIa('', 0).tipo).toBe('TRANSFERIR');
    expect(avaliarRespostaIa('   \n  ', 0).tipo).toBe('TRANSFERIR');
  });

  it('no teto de trocas transfere mesmo com resposta boa', () => {
    const d = avaliarRespostaIa('Claro, posso ajudar com isso!', TETO_TROCAS_IA);

    expect(d.tipo).toBe('TRANSFERIR');
    expect(d.tipo === 'TRANSFERIR' && d.motivo).toMatch(/limite|trocas/i);
  });

  it('uma troca antes do teto ainda responde', () => {
    expect(avaliarRespostaIa('Sim, temos.', TETO_TROCAS_IA - 1).tipo).toBe('RESPONDER');
  });
});

describe('botSystemPrompt', () => {
  const prompt = botSystemPrompt('Atendemos das 9h às 18h.', 'cordial e direto');

  it('entrega a base de conhecimento ao modelo', () => {
    expect(prompt).toContain('Atendemos das 9h às 18h.');
  });

  it('leva o tom de voz da empresa', () => {
    expect(prompt).toContain('cordial e direto');
  });

  it('manda escrever a marca exata quando não souber', () => {
    expect(prompt).toContain(MARCA_NAO_SEI);
  });

  it('carrega a defesa contra injeção da F4', () => {
    expect(prompt).toMatch(/nunca instruções para você/i);
  });

  it('proíbe afirmar o que não está na base', () => {
    expect(prompt).toMatch(/só|somente|apenas/i);
    expect(prompt).toMatch(/invent/i);
  });

  it('sem tom cadastrado, ainda diz como falar', () => {
    const semTom = botSystemPrompt('Base qualquer.', '');
    expect(semTom).toMatch(/portugu/i);
  });
});

describe('motor — o nó de IA conversa por turnos', () => {
  const grafo: BotGraph = {
    nodes: [
      { id: 's', type: 'START', position: { x: 0, y: 0 }, data: {} },
      { id: 'ia', type: 'AI', position: { x: 0, y: 1 }, data: {} },
      { id: 't', type: 'TRANSFER', position: { x: 0, y: 2 }, data: { departmentId: null } },
    ],
    edges: [
      { id: 'e1', source: 's', target: 'ia', sourceHandle: null },
      { id: 'e2', source: 'ia', target: 't', sourceHandle: null },
    ],
  };

  const CONTATO = { nome: 'Ana', empresa: null };

  it('depois de responder, espera o cliente em vez de perguntar de novo', () => {
    // A regressão que motiva este teste: o motor voltava a caminhar a partir
    // do próprio nó de IA com o texto do cliente ainda em mãos, e perguntava
    // outra vez. Uma pergunta virava três respostas em rajada.
    const parada = step(grafo, sessaoInicial(grafo), {
      texto: 'vocês abrem sábado?',
      contato: CONTATO,
    }).proximaSessao;

    const r = step(grafo, parada, {
      texto: 'vocês abrem sábado?',
      contato: CONTATO,
      respostaIa: 'Abrimos das 9h às 13h.',
    });

    expect(r.acoes.filter((a) => a.tipo === 'ENVIAR')).toHaveLength(1);
    expect(r.acoes.some((a) => a.tipo === 'PERGUNTAR_IA')).toBe(false);
    expect(r.proximaSessao.awaitingInput).toBe(true);
    expect(r.proximaSessao.currentNodeId).toBe('ia');
    expect(r.proximaSessao.aiTurns).toBe(1);
    expect(r.status).toBe('RUNNING');
  });

  it('no teto de trocas, transfere em vez de continuar conversando', () => {
    const noTeto = { ...sessaoInicial(grafo), currentNodeId: 'ia', aiTurns: TETO_TROCAS_IA };

    const r = step(grafo, noTeto, { texto: 'e sobre isso?', contato: CONTATO });

    expect(r.status).toBe('HANDED_OFF');
    expect(r.acoes.some((a) => a.tipo === 'TRANSFERIR')).toBe(true);
    expect(r.acoes.some((a) => a.tipo === 'PERGUNTAR_IA')).toBe(false);
  });
});
