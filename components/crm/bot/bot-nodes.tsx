'use client';

import { Handle, Position, type NodeProps } from '@xyflow/react';
import {
  AlertTriangle,
  GitBranch,
  HelpCircle,
  MessageSquare,
  Play,
  Save,
  Sparkles,
  Square,
  UserCheck,
} from 'lucide-react';
import type { BotNodeData, BotNodeType } from '@/lib/bot/types';

/**
 * Um componente por tipo de nó.
 *
 * Forma e cor não são enfeite aqui: num canvas com vinte nós, é por elas que
 * se lê o fluxo de longe, antes de ler uma palavra. Quem procura "onde isso
 * vira gente" acha o laranja sem ler nada.
 *
 * As alças de saída são a parte que precisa estar certa. O `id` da alça vira o
 * `sourceHandle` da aresta, e é exatamente isso que o motor lê para escolher o
 * caminho — uma alça com o id errado é um menu cuja opção 2 leva ao lugar da
 * opção 1, e nada no editor denuncia.
 */

interface Aparencia {
  cor: string;
  Icone: typeof Play;
  titulo: string;
}

export const APARENCIA: Record<BotNodeType, Aparencia> = {
  START: { cor: '#22C55E', Icone: Play, titulo: 'Início' },
  MESSAGE: { cor: '#3B82F6', Icone: MessageSquare, titulo: 'Mensagem' },
  QUESTION: { cor: '#EAB308', Icone: HelpCircle, titulo: 'Pergunta' },
  CONDITION: { cor: '#A855F7', Icone: GitBranch, titulo: 'Condição' },
  CAPTURE: { cor: '#06B6D4', Icone: Save, titulo: 'Captura' },
  TRANSFER: { cor: '#F97316', Icone: UserCheck, titulo: 'Transferir' },
  AI: { cor: '#8B5CF6', Icone: Sparkles, titulo: 'Assistente (IA)' },
  END: { cor: '#EF4444', Icone: Square, titulo: 'Fim' },
};

/** O que o canvas injeta em `data` só para desenhar. Nunca é salvo. */
export interface DadosDesenho extends BotNodeData {
  __problemas?: string[];
}

const ESTILO_ALCA = {
  width: 10,
  height: 10,
  background: 'var(--theme-surface)',
  border: '2px solid var(--theme-border)',
};

function Moldura({
  tipo,
  data,
  selected,
  children,
}: {
  tipo: BotNodeType;
  data: DadosDesenho;
  selected?: boolean;
  children?: React.ReactNode;
}) {
  const { cor, Icone, titulo } = APARENCIA[tipo];
  const problemas = data.__problemas ?? [];
  const temProblema = problemas.length > 0;

  return (
    <div
      className="rounded-xl border-2 shadow-lg transition-all"
      style={{
        minWidth: 200,
        maxWidth: 260,
        background: 'var(--theme-surface)',
        // O problema vence a seleção na cor da borda: um nó quebrado precisa
        // continuar gritando mesmo enquanto está sendo editado.
        borderColor: temProblema ? '#EF4444' : selected ? cor : 'var(--theme-border)',
        boxShadow: selected ? `0 0 0 3px ${cor}33` : undefined,
      }}
    >
      <div
        className="flex items-center gap-2 rounded-t-lg px-3 py-2"
        style={{ background: `${cor}1A`, borderBottom: '1px solid var(--theme-border)' }}
      >
        <Icone size={14} style={{ color: cor }} />
        <span className="text-xs font-semibold" style={{ color: cor }}>
          {data.label?.trim() || titulo}
        </span>
        {temProblema && (
          <AlertTriangle size={13} className="ml-auto shrink-0" style={{ color: '#EF4444' }} />
        )}
      </div>

      <div className="px-3 py-2">{children}</div>

      {temProblema && (
        <p
          className="rounded-b-lg px-3 py-2 text-[11px] leading-snug"
          style={{ background: '#EF444414', color: '#FCA5A5' }}
        >
          {problemas[0]}
        </p>
      )}
    </div>
  );
}

function Texto({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="line-clamp-3 text-xs leading-snug"
      style={{ color: 'var(--theme-text-secondary)' }}
    >
      {children}
    </p>
  );
}

/** Placeholder de campo em branco. Itálico e apagado: é falta, não conteúdo. */
function EmBranco({ children }: { children: React.ReactNode }) {
  return (
    <span className="italic" style={{ color: '#EF4444AA' }}>
      {children}
    </span>
  );
}

export function NoInicio({ selected, data }: NodeProps) {
  return (
    <Moldura tipo="START" data={data as DadosDesenho} selected={selected}>
      <Texto>Por aqui começa toda conversa nova.</Texto>
      <Handle type="source" position={Position.Bottom} style={ESTILO_ALCA} />
    </Moldura>
  );
}

export function NoMensagem({ selected, data }: NodeProps) {
  const d = data as DadosDesenho;

  return (
    <Moldura tipo="MESSAGE" data={d} selected={selected}>
      <Handle type="target" position={Position.Top} style={ESTILO_ALCA} />
      <Texto>{d.text?.trim() || <EmBranco>Sem texto</EmBranco>}</Texto>
      <Handle type="source" position={Position.Bottom} style={ESTILO_ALCA} />
    </Moldura>
  );
}

export function NoPergunta({ selected, data }: NodeProps) {
  const d = data as DadosDesenho;
  const opcoes = d.options ?? [];

  return (
    <Moldura tipo="QUESTION" data={d} selected={selected}>
      <Handle type="target" position={Position.Top} style={ESTILO_ALCA} />
      <Texto>{d.text?.trim() || <EmBranco>Sem texto</EmBranco>}</Texto>

      {opcoes.length === 0 ? (
        <p className="mt-2 text-[11px]" style={{ color: 'var(--theme-text-secondary)' }}>
          Campo livre — o cliente escreve o que quiser.
        </p>
      ) : (
        <ul className="mt-2 space-y-1">
          {opcoes.map((o) => (
            <li
              key={o.key}
              className="relative flex items-center gap-1.5 rounded px-1.5 py-1 text-[11px]"
              style={{ background: '#EAB3081A', color: '#FDE68A' }}
            >
              <span className="font-mono font-bold">{o.key}</span>
              <span className="truncate">{o.label}</span>
              {/* Uma alça por opção. O id é a tecla que o cliente digita. */}
              <Handle
                id={o.key}
                type="source"
                position={Position.Right}
                style={{ ...ESTILO_ALCA, position: 'absolute', right: -16, top: '50%' }}
              />
            </li>
          ))}
        </ul>
      )}

      {opcoes.length === 0 && (
        <Handle type="source" position={Position.Bottom} style={ESTILO_ALCA} />
      )}
    </Moldura>
  );
}

export function NoCondicao({ selected, data }: NodeProps) {
  const d = data as DadosDesenho;

  return (
    <Moldura tipo="CONDITION" data={d} selected={selected}>
      <Handle type="target" position={Position.Top} style={ESTILO_ALCA} />
      <Texto>
        {d.variable?.trim() ? (
          <>
            <span className="font-mono">{d.variable}</span> = &quot;{d.equals ?? ''}&quot;
          </>
        ) : (
          <EmBranco>Sem variável</EmBranco>
        )}
      </Texto>

      <div className="mt-2 flex justify-between text-[10px] font-semibold">
        <span style={{ color: '#22C55E' }}>verdadeiro</span>
        <span style={{ color: '#EF4444' }}>falso</span>
      </div>

      <Handle
        id="true"
        type="source"
        position={Position.Bottom}
        style={{ ...ESTILO_ALCA, left: '25%' }}
      />
      <Handle
        id="false"
        type="source"
        position={Position.Bottom}
        style={{ ...ESTILO_ALCA, left: '75%' }}
      />
    </Moldura>
  );
}

export function NoCaptura({ selected, data }: NodeProps) {
  const d = data as DadosDesenho;

  return (
    <Moldura tipo="CAPTURE" data={d} selected={selected}>
      <Handle type="target" position={Position.Top} style={ESTILO_ALCA} />
      <Texto>
        {d.field?.trim() ? (
          <>
            Guarda em <span className="font-mono">{d.field}</span>
          </>
        ) : (
          <EmBranco>Sem campo</EmBranco>
        )}
      </Texto>
      <Handle type="source" position={Position.Bottom} style={ESTILO_ALCA} />
    </Moldura>
  );
}

export function NoTransferir({ selected, data }: NodeProps) {
  const d = data as DadosDesenho;

  return (
    <Moldura tipo="TRANSFER" data={d} selected={selected}>
      <Handle type="target" position={Position.Top} style={ESTILO_ALCA} />
      <Texto>
        {d.departmentId
          ? 'Entrega ao setor escolhido.'
          : 'Entrega ao atendente menos ocupado que estiver online.'}
      </Texto>
    </Moldura>
  );
}

export function NoIa({ selected, data }: NodeProps) {
  const d = data as DadosDesenho;

  return (
    <Moldura tipo="AI" data={d} selected={selected}>
      <Handle type="target" position={Position.Top} style={ESTILO_ALCA} />
      <Texto>
        Responde pela base de conhecimento. Sai para um atendente quando não
        souber, em assunto sensível, ou depois de 3 trocas.
      </Texto>
      <Handle type="source" position={Position.Bottom} style={ESTILO_ALCA} />
    </Moldura>
  );
}

export function NoFim({ selected, data }: NodeProps) {
  const d = data as DadosDesenho;

  return (
    <Moldura tipo="END" data={d} selected={selected}>
      <Handle type="target" position={Position.Top} style={ESTILO_ALCA} />
      <Texto>{d.text?.trim() || 'Encerra sem enviar nada.'}</Texto>
    </Moldura>
  );
}

/** O mapa que o React Flow usa. As chaves são os `BotNodeType`. */
export const TIPOS_DE_NO = {
  START: NoInicio,
  MESSAGE: NoMensagem,
  QUESTION: NoPergunta,
  CONDITION: NoCondicao,
  CAPTURE: NoCaptura,
  TRANSFER: NoTransferir,
  AI: NoIa,
  END: NoFim,
};
