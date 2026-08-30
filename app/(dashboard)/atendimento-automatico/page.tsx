'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  Loader2,
  MessageSquareWarning,
  Radio,
  RotateCcw,
  Settings2,
  Trash2,
  Upload,
} from 'lucide-react';
import { FlowCanvas } from '@/components/crm/bot/flow-canvas';
import { FlowList } from '@/components/crm/bot/flow-list';
import { FlowSimulator } from '@/components/crm/bot/flow-simulator';
import { NodeInspector, type SetorOpcao } from '@/components/crm/bot/node-inspector';
import { NodePalette } from '@/components/crm/bot/node-palette';
import { ReengageSettings } from '@/components/crm/bot/reengage-settings';
import { useAuth } from '@/lib/auth-context';
import { validateGraph, type ProblemaGrafo } from '@/lib/bot/validate';
import type { FlowDTO, FlowDetailDTO } from '@/lib/bot/flows';
import type { BotGraph, BotNodeData, BotNodeType } from '@/lib/bot/types';

/**
 * Atendimento automático.
 *
 * A tela tem três colunas porque o trabalho tem três perguntas: *qual fluxo*
 * (lista), *como ele é* (canvas) e *o que o cliente vê* (simulador). Separá-las
 * é o que permite desenhar e testar sem trocar de página — e testar sem trocar
 * de página é o que faz alguém realmente testar.
 *
 * O rascunho salva sozinho, com atraso. Um construtor de fluxos com botão
 * "salvar" perde trabalho: a pessoa arrasta dez nós, fecha a aba e descobre
 * que nada ficou. Publicar continua sendo explícito, porque é ele que faz o
 * robô falar com clientes reais.
 */

/** Atraso do salvamento automático. Curto o bastante para não perder trabalho. */
const ATRASO_SALVAR_MS = 1200;

type Estado = 'carregando' | 'pronto' | 'erro';

export default function AtendimentoAutomaticoPage() {
  const { currentUser } = useAuth();
  const podeEditar = currentUser.role === 'Master' || currentUser.role === 'Administrador';

  const [estado, setEstado] = useState<Estado>('carregando');
  const [erro, setErro] = useState<string | null>(null);
  const [flows, setFlows] = useState<FlowDTO[]>([]);
  const [setores, setSetores] = useState<SetorOpcao[]>([]);

  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [detalhe, setDetalhe] = useState<FlowDetailDTO | null>(null);
  const [grafo, setGrafo] = useState<BotGraph>({ nodes: [], edges: [] });
  const [noSelecionado, setNoSelecionado] = useState<string | null>(null);

  const [ocupado, setOcupado] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [publicando, setPublicando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [problemasPublicacao, setProblemasPublicacao] = useState<ProblemaGrafo[]>([]);
  const [configAberta, setConfigAberta] = useState(false);

  const timerSalvar = useRef<ReturnType<typeof setTimeout> | null>(null);
  const grafoSalvo = useRef<string>('');

  /**
   * A validação roda no navegador, não no servidor.
   *
   * É a mesma função pura que o `publishFlow` usa, então não há duas verdades:
   * o que a tela acende em vermelho é exatamente o que vai barrar a publicação.
   * Rodando aqui, ela responde a cada arrasto em vez de a cada requisição.
   */
  const problemas = useMemo(() => validateGraph(grafo), [grafo]);

  const carregarLista = useCallback(async () => {
    try {
      const [rf, rs] = await Promise.all([
        fetch('/api/crm/bot/flows'),
        fetch('/api/crm/departments'),
      ]);

      const cf = await rf.json();
      const cs = await rs.json();

      if (!rf.ok || !cf.ok) {
        setErro(cf.error ?? 'Não foi possível carregar os fluxos.');
        setEstado('erro');
        return;
      }

      setFlows(cf.flows as FlowDTO[]);
      if (cs.ok) setSetores(cs.departments as SetorOpcao[]);
      setEstado('pronto');
    } catch {
      setErro('Falha de rede ao carregar os fluxos.');
      setEstado('erro');
    }
  }, []);

  useEffect(() => {
    void carregarLista();
  }, [carregarLista]);

  const abrir = useCallback(async (id: string) => {
    setSelecionadoId(id);
    setNoSelecionado(null);
    setProblemasPublicacao([]);
    setMensagem(null);

    const resposta = await fetch(`/api/crm/bot/flows/${id}`);
    const corpo = await resposta.json();

    if (!resposta.ok || !corpo.ok) {
      setErro(corpo.error ?? 'Fluxo não encontrado.');
      return;
    }

    const flow = corpo.flow as FlowDetailDTO;
    setDetalhe(flow);
    setGrafo(flow.graph);
    grafoSalvo.current = JSON.stringify(flow.graph);
  }, []);

  /** Salva o rascunho sozinho, com atraso, e nunca a versão publicada. */
  const agendarSalvamento = useCallback(
    (proximo: BotGraph) => {
      if (!selecionadoId || !podeEditar) return;
      if (timerSalvar.current) clearTimeout(timerSalvar.current);

      timerSalvar.current = setTimeout(async () => {
        const serializado = JSON.stringify(proximo);
        if (serializado === grafoSalvo.current) return;

        setSalvando(true);
        try {
          const resposta = await fetch(`/api/crm/bot/flows/${selecionadoId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ graph: proximo }),
          });

          if (resposta.ok) grafoSalvo.current = serializado;
          else setMensagem('Não foi possível salvar o rascunho.');
        } catch {
          setMensagem('Falha de rede ao salvar o rascunho.');
        } finally {
          setSalvando(false);
        }
      }, ATRASO_SALVAR_MS);
    },
    [selecionadoId, podeEditar]
  );

  const mudarGrafo = useCallback(
    (proximo: BotGraph) => {
      setGrafo(proximo);
      agendarSalvamento(proximo);
    },
    [agendarSalvamento]
  );

  const adicionarNo = (tipo: BotNodeType) => {
    const id = `${tipo.toLowerCase()}-${Date.now().toString(36)}`;

    // Abaixo do nó mais baixo: nasce visível e sem cobrir nada.
    const y = grafo.nodes.reduce((max, n) => Math.max(max, n.position.y), 0) + 140;

    mudarGrafo({
      ...grafo,
      nodes: [...grafo.nodes, { id, type: tipo, position: { x: 40, y }, data: {} }],
    });
    setNoSelecionado(id);
  };

  const alterarNo = (data: BotNodeData) => {
    if (!noSelecionado) return;
    mudarGrafo({
      ...grafo,
      nodes: grafo.nodes.map((n) => (n.id === noSelecionado ? { ...n, data } : n)),
    });
  };

  const removerNo = () => {
    if (!noSelecionado) return;
    mudarGrafo({
      nodes: grafo.nodes.filter((n) => n.id !== noSelecionado),
      // As arestas que tocavam o nó vão junto. Deixá-las viraria "aponta para
      // um nó que não existe" — que o motor trata como grafo quebrado.
      edges: grafo.edges.filter((e) => e.source !== noSelecionado && e.target !== noSelecionado),
    });
    setNoSelecionado(null);
  };

  const criar = async (rota: string) => {
    setOcupado(true);
    setMensagem(null);

    try {
      const resposta = await fetch(rota, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rota.endsWith('/flows') ? { name: 'Fluxo sem nome' } : {}),
      });
      const corpo = await resposta.json();

      if (!resposta.ok || !corpo.ok) {
        setMensagem(corpo.error ?? 'Não foi possível criar o fluxo.');
        return;
      }

      await carregarLista();
      await abrir((corpo.flow as FlowDTO).id);
    } catch {
      setMensagem('Falha de rede ao criar o fluxo.');
    } finally {
      setOcupado(false);
    }
  };

  const publicar = async () => {
    if (!selecionadoId) return;

    // O rascunho pendente primeiro: publicar o que está na tela, e não o que
    // estava há um segundo, é o mínimo que se espera do botão.
    if (timerSalvar.current) clearTimeout(timerSalvar.current);
    await fetch(`/api/crm/bot/flows/${selecionadoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ graph: grafo }),
    });
    grafoSalvo.current = JSON.stringify(grafo);

    setPublicando(true);
    setMensagem(null);
    setProblemasPublicacao([]);

    try {
      const resposta = await fetch(`/api/crm/bot/flows/${selecionadoId}/publish`, {
        method: 'POST',
      });
      const corpo = await resposta.json();

      if (resposta.status === 422) {
        setProblemasPublicacao(corpo.problemas as ProblemaGrafo[]);
        setMensagem(corpo.error as string);
        return;
      }

      if (!resposta.ok || !corpo.ok) {
        setMensagem(corpo.error ?? 'Não foi possível publicar.');
        return;
      }

      setMensagem(`Publicado como versão ${corpo.version}.`);
      await carregarLista();
      await abrir(selecionadoId);
    } catch {
      setMensagem('Falha de rede ao publicar.');
    } finally {
      setPublicando(false);
    }
  };

  const trocarPapel = async (papel: 'TRIGGER' | 'REENGAGE', ativo: boolean) => {
    if (!selecionadoId || !detalhe) return;

    if (ativo) {
      const aviso =
        papel === 'TRIGGER'
          ? 'A partir de agora, este fluxo vai atender toda conversa nova de clientes reais no WhatsApp da empresa. Confirma?'
          : 'A partir de agora, este fluxo vai falar com leads que ficaram sem resposta ou que escreverem fora do expediente. Confirma?';

      if (!window.confirm(aviso)) return;
    }

    setOcupado(true);
    setMensagem(null);

    try {
      const resposta = await fetch(`/api/crm/bot/flows/${selecionadoId}/role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ papel, ativo }),
      });
      const corpo = await resposta.json();

      if (!resposta.ok || !corpo.ok) {
        setMensagem(corpo.error ?? 'Não foi possível mudar o estado do fluxo.');
        return;
      }

      await carregarLista();
      await abrir(selecionadoId);
    } finally {
      setOcupado(false);
    }
  };

  const apagar = async () => {
    if (!selecionadoId || !detalhe) return;
    if (!window.confirm(`Apagar "${detalhe.name}"? Não dá para desfazer.`)) return;

    setOcupado(true);

    try {
      const resposta = await fetch(`/api/crm/bot/flows/${selecionadoId}`, { method: 'DELETE' });
      const corpo = await resposta.json();

      if (!resposta.ok || !corpo.ok) {
        setMensagem(corpo.error ?? 'Não foi possível apagar.');
        return;
      }

      setSelecionadoId(null);
      setDetalhe(null);
      setGrafo({ nodes: [], edges: [] });
      await carregarLista();
    } finally {
      setOcupado(false);
    }
  };

  const no = grafo.nodes.find((n) => n.id === noSelecionado) ?? null;
  const listaProblemas = problemasPublicacao.length > 0 ? problemasPublicacao : problemas;

  const problemasDoNo = noSelecionado
    ? listaProblemas.filter((p) => p.nodeId === noSelecionado).map((p) => p.mensagem)
    : [];

  if (estado === 'carregando') {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <Loader2 className="animate-spin" size={24} style={{ color: 'var(--primary-color)' }} />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-3">
      <header className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Bot size={20} style={{ color: 'var(--primary-color)' }} />
          <h1 className="text-lg font-semibold" style={{ color: 'var(--theme-text-primary)' }}>
            Atendimento automático
          </h1>
        </div>

        <button
          type="button"
          onClick={() => setConfigAberta(true)}
          className="ml-auto flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-colors"
          style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text-secondary)' }}
        >
          <Settings2 size={13} /> Retomada automática
        </button>
      </header>

      {erro && (
        <p
          className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs"
          style={{ background: '#EF444414', borderColor: '#EF444455', color: '#FCA5A5' }}
        >
          <AlertCircle size={14} /> {erro}
        </p>
      )}

      <div className="flex min-h-0 flex-1 gap-3">
        <aside
          className="w-64 shrink-0 rounded-xl border"
          style={{ background: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
        >
          <FlowList
            flows={flows}
            selecionadoId={selecionadoId}
            ocupado={ocupado || !podeEditar}
            onSelecionar={(id) => void abrir(id)}
            onCriar={() => void criar('/api/crm/bot/flows')}
            onCriarTriagem={() => void criar('/api/crm/bot/triagem')}
          />
        </aside>

        {!detalhe ? (
          <div
            className="flex flex-1 flex-col items-center justify-center rounded-xl border text-center"
            style={{ background: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
          >
            <Bot size={32} style={{ color: 'var(--theme-text-secondary)' }} />
            <p className="mt-3 text-sm" style={{ color: 'var(--theme-text-primary)' }}>
              Escolha um fluxo à esquerda, ou crie um.
            </p>
            <p
              className="mt-1 max-w-sm text-xs leading-relaxed"
              style={{ color: 'var(--theme-text-secondary)' }}
            >
              O <strong>menu de triagem pronto</strong> monta um fluxo com os
              setores que já existem na empresa — dá para publicar e usar sem
              desenhar nada.
            </p>
          </div>
        ) : (
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div
              className="flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2"
              style={{ background: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
            >
              <input
                className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none"
                style={{ color: 'var(--theme-text-primary)' }}
                value={detalhe.name}
                disabled={!podeEditar}
                onChange={(e) => setDetalhe({ ...detalhe, name: e.target.value })}
                onBlur={async () => {
                  await fetch(`/api/crm/bot/flows/${detalhe.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: detalhe.name }),
                  });
                  await carregarLista();
                }}
              />

              <span
                className="flex items-center gap-1 text-[11px]"
                style={{ color: 'var(--theme-text-secondary)' }}
              >
                {salvando ? (
                  <>
                    <Loader2 className="animate-spin" size={11} /> salvando
                  </>
                ) : (
                  'rascunho salvo'
                )}
              </span>

              {podeEditar && (
                <>
                  <button
                    type="button"
                    onClick={publicar}
                    disabled={publicando}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                    style={{ background: 'var(--primary-color)', color: '#0A0F1A' }}
                  >
                    {publicando ? (
                      <Loader2 className="animate-spin" size={12} />
                    ) : (
                      <Upload size={12} />
                    )}
                    Publicar
                  </button>

                  <BotaoPapel
                    ativo={detalhe.isTrigger}
                    cor="#22C55E"
                    Icone={Radio}
                    rotulo="Atende conversa nova"
                    onClick={() => void trocarPapel('TRIGGER', !detalhe.isTrigger)}
                  />

                  <BotaoPapel
                    ativo={detalhe.isReengage}
                    cor="#F97316"
                    Icone={RotateCcw}
                    rotulo="Retoma lead parado"
                    onClick={() => void trocarPapel('REENGAGE', !detalhe.isReengage)}
                  />

                  <button
                    type="button"
                    onClick={apagar}
                    className="rounded-lg border p-1.5 transition-colors hover:bg-red-500/10"
                    style={{ borderColor: 'var(--theme-border)' }}
                    aria-label="Apagar fluxo"
                  >
                    <Trash2 size={13} style={{ color: '#EF4444' }} />
                  </button>
                </>
              )}
            </div>

            {mensagem && (
              <p
                className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs"
                style={{
                  background: problemasPublicacao.length > 0 ? '#EF444414' : '#22C55E14',
                  borderColor: problemasPublicacao.length > 0 ? '#EF444455' : '#22C55E55',
                  color: problemasPublicacao.length > 0 ? '#FCA5A5' : '#86EFAC',
                }}
              >
                {problemasPublicacao.length > 0 ? (
                  <MessageSquareWarning size={14} />
                ) : (
                  <CheckCircle2 size={14} />
                )}
                {mensagem}
              </p>
            )}

            <div className="flex min-h-0 flex-1 gap-3">
              {podeEditar && (
                <div className="w-40 shrink-0 overflow-y-auto">
                  <NodePalette onAdicionar={adicionarNo} desabilitado={!podeEditar} />
                </div>
              )}

              <div
                className="min-w-0 flex-1 overflow-hidden rounded-xl border"
                style={{ borderColor: 'var(--theme-border)' }}
              >
                <FlowCanvas
                  graph={grafo}
                  problemas={listaProblemas}
                  selecionadoId={noSelecionado}
                  somenteLeitura={!podeEditar}
                  onChange={mudarGrafo}
                  onSelecionar={setNoSelecionado}
                />
              </div>

              {no ? (
                <NodeInspector
                  node={no}
                  setores={setores}
                  problemas={problemasDoNo}
                  somenteLeitura={!podeEditar}
                  onAlterar={alterarNo}
                  onRemover={removerNo}
                  onFechar={() => setNoSelecionado(null)}
                />
              ) : (
                <aside
                  className="w-80 shrink-0 rounded-xl border"
                  style={{ background: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
                >
                  <FlowSimulator graph={grafo} />
                </aside>
              )}
            </div>
          </div>
        )}
      </div>

      {configAberta && (
        <ReengageSettings podeEditar={podeEditar} onFechar={() => setConfigAberta(false)} />
      )}
    </div>
  );
}

function BotaoPapel({
  ativo,
  cor,
  Icone,
  rotulo,
  onClick,
}: {
  ativo: boolean;
  cor: string;
  Icone: typeof Radio;
  rotulo: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={rotulo}
      className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-colors"
      style={{
        background: ativo ? `${cor}1A` : 'transparent',
        borderColor: ativo ? cor : 'var(--theme-border)',
        color: ativo ? cor : 'var(--theme-text-secondary)',
      }}
    >
      <Icone size={12} />
      {ativo ? 'No ar' : rotulo}
    </button>
  );
}
