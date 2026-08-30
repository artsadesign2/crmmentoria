'use client';

import { useCallback, useMemo } from 'react';
import {
  addEdge,
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { TIPOS_DE_NO } from './bot-nodes';
import type { BotEdge, BotGraph, BotNode, BotNodeType } from '@/lib/bot/types';
import type { ProblemaGrafo } from '@/lib/bot/validate';

/**
 * O canvas.
 *
 * O React Flow trabalha com nós no mesmo formato do nosso grafo —
 * `{ id, type, position, data }` — o que torna a conversão quase identidade.
 * O "quase" é o que este arquivo existe para cuidar: a biblioteca acrescenta
 * campos próprios (`selected`, `dragging`, `measured`, `width`…) e gravá-los
 * no banco encheria a versão publicada de estado de interface, que muda a cada
 * clique e não significa nada para o motor.
 *
 * Por isso `paraGrafo` reduz cada nó aos quatro campos que importam. É o único
 * ponto de saída do canvas para o mundo.
 */

const CORES_DE_ARESTA = {
  normal: '#475569',
  selecionada: 'var(--primary-color)',
};

export function FlowCanvas({
  graph,
  problemas,
  selecionadoId,
  somenteLeitura,
  onChange,
  onSelecionar,
}: {
  graph: BotGraph;
  problemas: ProblemaGrafo[];
  selecionadoId: string | null;
  somenteLeitura: boolean;
  onChange: (graph: BotGraph) => void;
  onSelecionar: (id: string | null) => void;
}) {
  /** Os problemas de cada nó, injetados em `data` só para desenhar. */
  const porNo = useMemo(() => {
    const mapa = new Map<string, string[]>();
    for (const p of problemas) {
      if (!p.nodeId) continue;
      mapa.set(p.nodeId, [...(mapa.get(p.nodeId) ?? []), p.mensagem]);
    }
    return mapa;
  }, [problemas]);

  const nodes: Node[] = useMemo(
    () =>
      graph.nodes.map((n) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: { ...n.data, __problemas: porNo.get(n.id) },
        selected: n.id === selecionadoId,
        deletable: n.type !== 'START',
      })),
    [graph.nodes, porNo, selecionadoId]
  );

  const edges: Edge[] = useMemo(
    () =>
      graph.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle ?? null,
        animated: true,
        style: { stroke: CORES_DE_ARESTA.normal, strokeWidth: 2 },
      })),
    [graph.edges]
  );

  /** Do formato do React Flow de volta ao nosso, sem o estado de interface. */
  const paraGrafo = useCallback((ns: Node[], es: Edge[]): BotGraph => {
    const nodes: BotNode[] = ns.map((n) => {
      const { __problemas, ...data } = n.data as Record<string, unknown>;
      void __problemas;

      return {
        id: n.id,
        type: (n.type ?? 'MESSAGE') as BotNodeType,
        position: { x: Math.round(n.position.x), y: Math.round(n.position.y) },
        data,
      };
    });

    const edges: BotEdge[] = es.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle ?? null,
    }));

    return { nodes, edges };
  }, []);

  const aoMudarNos = useCallback(
    (mudancas: NodeChange[]) => {
      if (somenteLeitura) return;
      onChange(paraGrafo(applyNodeChanges(mudancas, nodes), edges));
    },
    [nodes, edges, onChange, paraGrafo, somenteLeitura]
  );

  const aoMudarArestas = useCallback(
    (mudancas: EdgeChange[]) => {
      if (somenteLeitura) return;
      onChange(paraGrafo(nodes, applyEdgeChanges(mudancas, edges)));
    },
    [nodes, edges, onChange, paraGrafo, somenteLeitura]
  );

  const aoConectar = useCallback(
    (conexao: Connection) => {
      if (somenteLeitura) return;

      /**
       * Uma saída, um destino.
       *
       * O motor lê a **primeira** aresta que casa com a alça e ignora as
       * outras. Deixar duas ligadas na mesma saída desenharia no canvas uma
       * bifurcação que não existe na execução — o operador veria dois caminhos
       * e o cliente andaria sempre por um. Trocar em vez de acumular faz o
       * desenho contar a verdade.
       */
      const semDuplicata = edges.filter(
        (e) =>
          !(e.source === conexao.source && (e.sourceHandle ?? null) === (conexao.sourceHandle ?? null))
      );

      const nova: Edge = {
        ...conexao,
        id: `e-${conexao.source}-${conexao.sourceHandle ?? 'saida'}-${conexao.target}`,
        animated: true,
        style: { stroke: CORES_DE_ARESTA.normal, strokeWidth: 2 },
      };

      onChange(paraGrafo(nodes, addEdge(nova, semDuplicata)));
    },
    [nodes, edges, onChange, paraGrafo, somenteLeitura]
  );

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={TIPOS_DE_NO}
        onNodesChange={aoMudarNos}
        onEdgesChange={aoMudarArestas}
        onConnect={aoConectar}
        onNodeClick={(_, no) => onSelecionar(no.id)}
        onPaneClick={() => onSelecionar(null)}
        nodesDraggable={!somenteLeitura}
        nodesConnectable={!somenteLeitura}
        elementsSelectable
        fitView
        proOptions={{ hideAttribution: false }}
        style={{ background: 'var(--theme-bg)' }}
      >
        <Background color="#1F293D" gap={20} />
        <Controls
          style={{
            background: 'var(--theme-surface)',
            border: '1px solid var(--theme-border)',
            borderRadius: 8,
          }}
        />
        <MiniMap
          pannable
          style={{ background: 'var(--theme-surface)', border: '1px solid var(--theme-border)' }}
          maskColor="rgba(10, 15, 26, 0.75)"
          nodeColor="#334155"
        />
      </ReactFlow>
    </div>
  );
}
