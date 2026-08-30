'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Play, RotateCcw, Send, Sparkles } from 'lucide-react';
import { APARENCIA } from './bot-nodes';
import type { BotGraph, BotNodeType, BotSessionState } from '@/lib/bot/types';

/**
 * O simulador: uma conversa de mentira ao lado do canvas.
 *
 * Duas coisas o separam de um chat comum, e as duas são o motivo de ele
 * existir:
 *
 * 1. **Mostra o nó ativo a cada passo.** É assim que se descobre que a opção
 *    "3" não leva a lugar nenhum — sem isso, o operador vê o robô calar e não
 *    tem como saber se o problema é o texto, a aresta ou o menu.
 * 2. **Nada sai e nada é gravado.** A rota recebe o grafo, não o id do fluxo,
 *    então não existe caminho de código daqui até um cliente.
 *
 * O nó de IA não chama o Gemini aqui. Ele aparece como um passo com um campo
 * para escrever o que a IA responderia — testar o caminho do fluxo é o que
 * importa, e uma resposta diferente a cada rodada tornaria a simulação inútil
 * justamente para isso.
 */

interface Fala {
  de: 'ROBO' | 'CLIENTE' | 'SISTEMA';
  texto: string;
  no?: { id: string; tipo: BotNodeType } | null;
}

type Acao =
  | { tipo: 'ENVIAR'; texto: string }
  | { tipo: 'CAPTURAR'; campo: string; valor: string }
  | { tipo: 'TRANSFERIR'; departmentId: string | null; motivo: string }
  | { tipo: 'PERGUNTAR_IA'; pergunta: string }
  | { tipo: 'ENCERRAR'; motivo: string };

export function FlowSimulator({ graph }: { graph: BotGraph }) {
  const [falas, setFalas] = useState<Fala[]>([]);
  const [sessao, setSessao] = useState<BotSessionState | null>(null);
  const [entrada, setEntrada] = useState('');
  const [respostaIa, setRespostaIa] = useState('');
  const [esperandoIa, setEsperandoIa] = useState(false);
  const [encerrado, setEncerrado] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  const fim = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fim.current?.scrollIntoView({ behavior: 'smooth' });
  }, [falas]);

  const rodar = useCallback(
    async (texto: string, estado: BotSessionState | null, ia?: string) => {
      setOcupado(true);

      try {
        const resposta = await fetch('/api/crm/bot/simulate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            graph,
            texto,
            ...(estado ? { sessao: estado } : {}),
            ...(ia === undefined ? {} : { respostaIa: ia }),
            contato: { nome: 'Cliente de teste', empresa: 'Empresa Exemplo' },
          }),
        });

        const corpo = await resposta.json();

        if (!resposta.ok || !corpo.ok) {
          setFalas((f) => [
            ...f,
            { de: 'SISTEMA', texto: corpo.error ?? 'Falha ao simular.' },
          ]);
          return;
        }

        const acoes = corpo.acoes as Acao[];
        const proxima = corpo.sessao as BotSessionState;
        const noAtual = graph.nodes.find((n) => n.id === proxima.currentNodeId) ?? null;

        const novas: Fala[] = [];

        for (const acao of acoes) {
          if (acao.tipo === 'ENVIAR') {
            novas.push({
              de: 'ROBO',
              texto: acao.texto,
              no: noAtual ? { id: noAtual.id, tipo: noAtual.type } : null,
            });
          } else if (acao.tipo === 'CAPTURAR') {
            novas.push({ de: 'SISTEMA', texto: `Guardou ${acao.campo} = "${acao.valor}"` });
          } else if (acao.tipo === 'TRANSFERIR') {
            novas.push({ de: 'SISTEMA', texto: `Entregue a uma pessoa — ${acao.motivo}` });
          } else if (acao.tipo === 'ENCERRAR') {
            novas.push({ de: 'SISTEMA', texto: `Conversa encerrada — ${acao.motivo}` });
          } else if (acao.tipo === 'PERGUNTAR_IA') {
            novas.push({
              de: 'SISTEMA',
              texto: `Aqui o assistente responderia a: "${acao.pergunta}"`,
            });
          }
        }

        setFalas((f) => [...f, ...novas]);
        setSessao(proxima);
        setEsperandoIa(acoes.some((a) => a.tipo === 'PERGUNTAR_IA'));
        setEncerrado(corpo.status !== 'RUNNING');
      } catch {
        setFalas((f) => [...f, { de: 'SISTEMA', texto: 'Falha de rede ao simular.' }]);
      } finally {
        setOcupado(false);
      }
    },
    [graph]
  );

  const comecar = () => {
    setFalas([]);
    setSessao(null);
    setEncerrado(false);
    setEsperandoIa(false);
    setRespostaIa('');
    void rodar('', null);
  };

  const enviar = () => {
    const texto = entrada.trim();
    if (!texto || encerrado) return;

    setFalas((f) => [...f, { de: 'CLIENTE', texto }]);
    setEntrada('');
    void rodar(texto, sessao);
  };

  const responderPelaIa = () => {
    const texto = respostaIa.trim();
    if (!texto) return;

    setRespostaIa('');
    void rodar('', sessao, texto);
  };

  const naoComecou = falas.length === 0 && sessao === null;

  return (
    <div className="flex h-full flex-col">
      <header
        className="flex items-center gap-2 border-b px-4 py-2.5"
        style={{ borderColor: 'var(--theme-border)' }}
      >
        <h3 className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
          Simulador
        </h3>
        <span className="text-[11px]" style={{ color: 'var(--theme-text-secondary)' }}>
          nada é enviado nem gravado
        </span>
        <button
          type="button"
          onClick={comecar}
          disabled={ocupado}
          className="ml-auto flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] transition-colors disabled:opacity-40"
          style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text-secondary)' }}
        >
          {naoComecou ? <Play size={11} /> : <RotateCcw size={11} />}
          {naoComecou ? 'Começar' : 'Recomeçar'}
        </button>
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {naoComecou && (
          <p
            className="px-2 py-8 text-center text-xs leading-relaxed"
            style={{ color: 'var(--theme-text-secondary)' }}
          >
            Clique em <strong>Começar</strong> para conversar com este fluxo
            como se você fosse o cliente.
          </p>
        )}

        {falas.map((f, i) => {
          if (f.de === 'SISTEMA') {
            return (
              <p
                key={i}
                className="rounded-lg px-3 py-1.5 text-center text-[11px] italic"
                style={{ background: 'var(--theme-badge-bg)', color: 'var(--theme-text-secondary)' }}
              >
                {f.texto}
              </p>
            );
          }

          const doRobo = f.de === 'ROBO';
          const aparencia = f.no ? APARENCIA[f.no.tipo] : null;

          return (
            <div key={i} className={doRobo ? 'mr-6' : 'ml-6'}>
              <div
                className="rounded-xl px-3 py-2 text-sm leading-snug"
                style={{
                  background: doRobo ? 'var(--theme-surface)' : 'var(--primary-color)',
                  color: doRobo ? 'var(--theme-text-primary)' : '#0A0F1A',
                  border: doRobo ? '1px solid var(--theme-border)' : undefined,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {f.texto}
              </div>

              {/* Qual bloco falou. É por isto que o simulador existe. */}
              {doRobo && f.no && aparencia && (
                <p
                  className="mt-1 flex items-center gap-1 text-[10px]"
                  style={{ color: aparencia.cor }}
                >
                  <aparencia.Icone size={10} />
                  {f.no.id}
                </p>
              )}
            </div>
          );
        })}

        <div ref={fim} />
      </div>

      {esperandoIa && !encerrado && (
        <div
          className="border-t p-3"
          style={{ borderColor: 'var(--theme-border)', background: '#8B5CF60D' }}
        >
          <p className="mb-1.5 flex items-center gap-1 text-[11px]" style={{ color: '#A78BFA' }}>
            <Sparkles size={11} /> Escreva o que o assistente responderia
          </p>
          <div className="flex gap-1.5">
            <input
              className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none"
              style={{
                background: 'var(--theme-bg)',
                borderColor: 'var(--theme-border)',
                color: 'var(--theme-text-primary)',
              }}
              value={respostaIa}
              onChange={(e) => setRespostaIa(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && responderPelaIa()}
              placeholder="Abrimos das 9h às 18h."
            />
            <button
              type="button"
              onClick={responderPelaIa}
              disabled={ocupado}
              className="rounded-lg px-3 disabled:opacity-40"
              style={{ background: '#8B5CF6', color: '#fff' }}
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}

      {!naoComecou && !esperandoIa && (
        <div className="border-t p-3" style={{ borderColor: 'var(--theme-border)' }}>
          {encerrado ? (
            <p className="text-center text-[11px]" style={{ color: 'var(--theme-text-secondary)' }}>
              A conversa terminou. Recomece para testar outro caminho.
            </p>
          ) : (
            <div className="flex gap-1.5">
              <input
                className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none"
                style={{
                  background: 'var(--theme-bg)',
                  borderColor: 'var(--theme-border)',
                  color: 'var(--theme-text-primary)',
                }}
                value={entrada}
                onChange={(e) => setEntrada(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && enviar()}
                placeholder="Responda como o cliente…"
                disabled={ocupado}
              />
              <button
                type="button"
                onClick={enviar}
                disabled={ocupado || !entrada.trim()}
                className="rounded-lg px-3 disabled:opacity-40"
                style={{ background: 'var(--primary-color)', color: '#0A0F1A' }}
              >
                <Send size={14} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
