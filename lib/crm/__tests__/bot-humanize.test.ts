import { describe, expect, it } from 'vitest';
import {
  ENTREGA_PADRAO,
  REPERGUNTA_PADRAO,
  TETO_TENTATIVAS,
  casarOpcao,
  sessaoInicial,
  step,
  type StepInput,
} from '@/lib/bot/engine';
import type { BotEdge, BotGraph, BotNode } from '@/lib/bot/types';

/**
 * A humanização do motor: menu em linguagem corrida, resposta livre entendida,
 * repergunta que não se repete e uma frase antes de entregar a conversa.
 *
 * Nada disto produz exceção quando quebra. O sintoma de uma regressão aqui é o
 * cliente percebendo que fala com uma máquina — que ninguém reporta como bug.
 */

function no(id: string, type: BotNode['type'], data: BotNode['data'] = {}): BotNode {
  return { id, type, position: { x: 0, y: 0 }, data };
}

function aresta(source: string, target: string, sourceHandle: string | null = null): BotEdge {
  return { id: `${source}->${target}:${sourceHandle ?? ''}`, source, target, sourceHandle };
}

const CONTATO = { nome: 'Ana Paula', empresa: 'Clínica Vida' };

function entrada(texto = '', humanizado = true): StepInput {
  return { texto, contato: CONTATO, humanizado };
}

const OPCOES = [
  { key: '1', label: 'Comercial & Vendas' },
  { key: '2', label: 'Financeiro' },
  { key: '3', label: 'Suporte' },
];

/** START -> QUESTION com três setores, e um TRANSFER por opção. */
function grafoDeMenu(dataDaPergunta: BotNode['data'] = {}): BotGraph {
  return {
    nodes: [
      no('s', 'START'),
      no('menu', 'QUESTION', {
        text: 'Me conta, com quem você precisa falar?',
        options: OPCOES,
        ...dataDaPergunta,
      }),
      ...OPCOES.map((o) => no(`t${o.key}`, 'TRANSFER', { departmentId: `dep-${o.key}` })),
    ],
    edges: [
      aresta('s', 'menu'),
      ...OPCOES.map((o) => aresta('menu', `t${o.key}`, o.key)),
    ],
  };
}

/** Texto de todas as mensagens que o motor mandou enviar. */
function enviadas(acoes: Array<{ tipo: string; texto?: string }>): string[] {
  return acoes.filter((a) => a.tipo === 'ENVIAR').map((a) => a.texto ?? '');
}

// ---------------------------------------------------------------------------

describe('menu em linguagem natural', () => {
  it('humanizado não numera as opções', () => {
    const r = step(grafoDeMenu(), sessaoInicial(grafoDeMenu()), entrada());
    const texto = enviadas(r.acoes)[0];

    expect(texto).not.toMatch(/^\s*1\)/m);
    expect(texto).not.toContain('2)');
  });

  it('humanizado enumera em frase, com "ou" antes da última', () => {
    const r = step(grafoDeMenu(), sessaoInicial(grafoDeMenu()), entrada());

    expect(enviadas(r.acoes)[0]).toContain('Comercial & Vendas, Financeiro ou Suporte?');
  });

  it('sem humanização, a lista numerada continua exatamente como era', () => {
    const g = grafoDeMenu();
    const r = step(g, sessaoInicial(g), entrada('', false));

    expect(enviadas(r.acoes)[0]).toBe(
      'Me conta, com quem você precisa falar?\n\n1) Comercial & Vendas\n2) Financeiro\n3) Suporte'
    );
  });

  it('o nó manda mais que a configuração da organização', () => {
    // Um fluxo pode precisar de menu numerado — um IVR de ramal, por exemplo —
    // mesmo com a empresa inteira humanizada.
    const g = grafoDeMenu({ estilo: 'LISTA' });
    const r = step(g, sessaoInicial(g), entrada());

    expect(enviadas(r.acoes)[0]).toContain('1) Comercial & Vendas');
  });

  it('LIVRE não lista nada: a pergunta já diz quais são as respostas', () => {
    // Sem isto, "Você ainda precisa de ajuda, ou já resolveu?" sairia seguido
    // de "Ainda preciso ou Já resolvi?" — a mesma pergunta feita duas vezes.
    const g: BotGraph = {
      nodes: [
        no('s', 'START'),
        no('q', 'QUESTION', {
          text: 'Você ainda precisa de ajuda com aquilo, ou já conseguiu resolver?',
          estilo: 'LIVRE',
          options: [
            { key: '1', label: 'Ainda preciso' },
            { key: '2', label: 'Já resolvi' },
          ],
        }),
        no('t', 'TRANSFER'),
        no('f', 'END'),
      ],
      edges: [aresta('s', 'q'), aresta('q', 't', '1'), aresta('q', 'f', '2')],
    };

    const r = step(g, sessaoInicial(g), entrada());

    expect(enviadas(r.acoes)[0]).toBe(
      'Você ainda precisa de ajuda com aquilo, ou já conseguiu resolver?'
    );
  });

  it('LIVRE continua entendendo a resposta pelo rótulo', () => {
    // Não listar não é abrir mão de casar: as opções seguem valendo para o
    // roteamento, só não são recitadas ao cliente.
    const g: BotGraph = {
      nodes: [
        no('s', 'START'),
        no('q', 'QUESTION', {
          text: 'Ainda precisa, ou já resolveu?',
          estilo: 'LIVRE',
          options: [
            { key: '1', label: 'Ainda preciso' },
            { key: '2', label: 'Já resolvi' },
          ],
        }),
        no('t', 'TRANSFER'),
        no('f', 'END', { text: 'Que bom!' }),
      ],
      edges: [aresta('s', 'q'), aresta('q', 't', '1'), aresta('q', 'f', '2')],
    };

    const parada = step(g, sessaoInicial(g), entrada()).proximaSessao;

    expect(step(g, parada, entrada('já resolvi, obrigado')).status).toBe('DONE');
    expect(step(g, parada, entrada('ainda preciso sim')).status).toBe('HANDED_OFF');
  });

  it('pergunta que já cita os rótulos não recebe enumeração colada atrás', () => {
    // Reescrever por cima do que alguém redigiu à mão sempre sai pior.
    const g = grafoDeMenu({
      text: 'É sobre Comercial & Vendas, Financeiro ou Suporte?',
    });
    const r = step(g, sessaoInicial(g), entrada());
    const texto = enviadas(r.acoes)[0];

    expect(texto).toBe('É sobre Comercial & Vendas, Financeiro ou Suporte?');
    expect(texto.match(/Financeiro/g)).toHaveLength(1);
  });
});

describe('casarOpcao', () => {
  const casar = (resposta: string) => casarOpcao(OPCOES, resposta)?.key ?? null;

  it('entende o número', () => {
    expect(casar('2')).toBe('2');
  });

  it('entende o número com pontuação', () => {
    expect(casar('2.')).toBe('2');
  });

  it('entende o rótulo escrito por extenso', () => {
    expect(casar('Financeiro')).toBe('2');
  });

  it('entende o número dentro de uma frase curta', () => {
    expect(casar('quero a 2')).toBe('2');
    expect(casar('pode ser a 3')).toBe('3');
  });

  it('entende uma palavra do rótulo dentro da frase', () => {
    expect(casar('é sobre vendas')).toBe('1');
    expect(casar('preciso de suporte por favor')).toBe('3');
  });

  it('tolera plural e flexão curta', () => {
    expect(casar('venda')).toBe('1');
  });

  it('ignora acento e caixa', () => {
    expect(casar('FINANCEIRO')).toBe('2');
    expect(casar('comercial')).toBe('1');
  });

  it('número solto numa frase longa não é escolha de menu', () => {
    // "tenho 2 filhos" é dado do cliente. Ler como escolha mandaria a pessoa
    // para o setor errado, e o erro só apareceria depois de um humano perder
    // tempo com ele.
    expect(casar('olha, eu tenho 2 filhos e queria entender melhor a proposta')).toBeNull();
  });

  it('resposta ambígua entre dois setores devolve null', () => {
    const ambiguas = [
      { key: '1', label: 'Suporte Técnico' },
      { key: '2', label: 'Suporte Comercial' },
    ];

    expect(casarOpcao(ambiguas, 'suporte')).toBeNull();
  });

  it('palavra curta do rótulo não casa com qualquer frase', () => {
    const curtas = [
      { key: '1', label: 'RH' },
      { key: '2', label: 'Financeiro' },
    ];

    expect(casarOpcao(curtas, 'quero saber de uma coisa')).toBeNull();
  });

  it('resposta vazia devolve null', () => {
    expect(casar('   ')).toBeNull();
  });
});

describe('repergunta', () => {
  /** Deixa a sessão parada no menu, como se a pergunta já tivesse sido feita. */
  function paradaNoMenu(grafo: BotGraph) {
    const primeira = step(grafo, sessaoInicial(grafo), entrada());
    return primeira.proximaSessao;
  }

  it('a primeira confusão reformula em vez de repetir', () => {
    const g = grafoDeMenu();
    const r = step(g, paradaNoMenu(g), entrada('sei lá'));
    const texto = enviadas(r.acoes)[0];

    expect(r.status).toBe('RUNNING');
    expect(texto).toContain(REPERGUNTA_PADRAO);
    expect(texto).toContain('Comercial & Vendas, Financeiro ou Suporte?');
  });

  it('usa a reformulação escrita no nó quando existe', () => {
    const g = grafoDeMenu({ reperguntaTexto: 'Foi mal, deixa eu perguntar de outro jeito.' });
    const r = step(g, paradaNoMenu(g), entrada('???'));

    expect(enviadas(r.acoes)[0]).toContain('Foi mal, deixa eu perguntar de outro jeito.');
  });

  it('a segunda confusão entrega a conversa a uma pessoa', () => {
    // Quem não entendeu na segunda não vai entender na sétima — vai desistir.
    const g = grafoDeMenu();
    let sessao = paradaNoMenu(g);

    for (let i = 0; i < TETO_TENTATIVAS - 1; i++) {
      sessao = step(g, sessao, entrada('hein?')).proximaSessao;
    }

    const r = step(g, sessao, entrada('não entendi nada'));

    expect(r.status).toBe('HANDED_OFF');
    expect(enviadas(r.acoes)).toContain(ENTREGA_PADRAO);
  });

  it('acertar depois de errar zera a paciência para a próxima pergunta', () => {
    const g = grafoDeMenu();
    const errou = step(g, paradaNoMenu(g), entrada('???')).proximaSessao;
    const acertou = step(g, errou, entrada('financeiro'));

    expect(acertou.status).toBe('HANDED_OFF');
    expect(acertou.proximaSessao.variables.__tentativas).toBe('0');
  });

  it('sem humanização, a repergunta continua sendo o texto original', () => {
    const g = grafoDeMenu();
    const parada = step(g, sessaoInicial(g), entrada('', false)).proximaSessao;
    const r = step(g, parada, entrada('sei lá', false));

    expect(enviadas(r.acoes)[0]).not.toContain(REPERGUNTA_PADRAO);
    expect(enviadas(r.acoes)[0]).toContain('1) Comercial & Vendas');
  });
});

describe('entrega a uma pessoa', () => {
  it('o nó de transferência se despede antes de calar', () => {
    const g = grafoDeMenu();
    const parada = step(g, sessaoInicial(g), entrada()).proximaSessao;
    const r = step(g, parada, entrada('financeiro'));

    expect(r.status).toBe('HANDED_OFF');
    expect(enviadas(r.acoes)).toEqual([ENTREGA_PADRAO]);
  });

  it('a frase não menciona robô, setor nem transferência', () => {
    // Qualquer uma dessas palavras denunciaria a troca justamente no instante
    // em que ela precisa passar despercebida.
    expect(ENTREGA_PADRAO.toLowerCase()).not.toMatch(
      /transfer|setor|atendente|robô|robo|bot|departamento|fila/
    );
  });

  it('texto escrito no nó vence a frase padrão', () => {
    const g: BotGraph = {
      nodes: [
        no('s', 'START'),
        no('t', 'TRANSFER', { text: 'Já te respondo com isso, {{nome}}.' }),
      ],
      edges: [aresta('s', 't')],
    };

    const r = step(g, sessaoInicial(g), entrada());

    expect(enviadas(r.acoes)).toEqual(['Já te respondo com isso, Ana Paula.']);
  });

  it('texto escrito no nó vale mesmo sem humanização', () => {
    // Alguém redigiu aquilo de propósito; o interruptor não apaga texto do
    // autor, só desliga a frase que o motor inventa.
    const g: BotGraph = {
      nodes: [no('s', 'START'), no('t', 'TRANSFER', { text: 'Só um instante.' })],
      edges: [aresta('s', 't')],
    };

    expect(enviadas(step(g, sessaoInicial(g), entrada('', false)).acoes)).toEqual([
      'Só um instante.',
    ]);
  });

  it('sem humanização e sem texto, a entrega continua muda como antes', () => {
    const g = grafoDeMenu();
    const parada = step(g, sessaoInicial(g), entrada('', false)).proximaSessao;
    const r = step(g, parada, entrada('2', false));

    expect(r.status).toBe('HANDED_OFF');
    expect(enviadas(r.acoes)).toEqual([]);
  });

  it('fluxo quebrado também se despede em vez de sumir', () => {
    // O fluxo quebrou, mas quem está do outro lado não tem nada com isso.
    const g: BotGraph = {
      nodes: [no('s', 'START'), no('m', 'MESSAGE', { text: 'Oi!' })],
      edges: [aresta('s', 'm'), aresta('m', 'fantasma')],
    };

    const r = step(g, sessaoInicial(g), entrada());

    expect(r.status).toBe('ABORTED');
    expect(enviadas(r.acoes)).toEqual(['Oi!', ENTREGA_PADRAO]);
  });
});
