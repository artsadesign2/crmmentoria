'use client';

import { useEffect, useMemo, useState } from 'react';
import { X, Search, Loader2, AlertTriangle, Users } from 'lucide-react';
import { renderTemplate, placeholdersDesconhecidos } from '@/lib/dispatch/template';
import type { ContactDTO } from '@/lib/crm/types';

/**
 * Criação de campanha.
 *
 * A prévia não é enfeite: ela mostra a mensagem já resolvida para o primeiro
 * destinatário, que é a única forma de perceber um `{{nome}}` escrito errado
 * antes de ele sair para trezentas pessoas.
 */

interface NewCampaignModalProps {
  onClose: () => void;
  onCreate: (input: {
    name: string;
    message: string;
    contactIds: string[];
    scheduledAt?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
}

export function NewCampaignModal({ onClose, onCreate }: NewCampaignModalProps) {
  const [nome, setNome] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [busca, setBusca] = useState('');
  const [contatos, setContatos] = useState<ContactDTO[]>([]);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;

    void fetch('/api/crm/contacts?take=500')
      .then((r) => (r.ok ? r.json() : null))
      .then((corpo) => {
        if (!ativo) return;
        setContatos((corpo?.contacts as ContactDTO[]) ?? []);
        setCarregando(false);
      })
      .catch(() => {
        if (!ativo) return;
        setErro('Não foi possível carregar os contatos.');
        setCarregando(false);
      });

    return () => {
      ativo = false;
    };
  }, []);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return contatos;

    return contatos.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.company ?? '').toLowerCase().includes(q) ||
        (c.phone ?? '').includes(q)
    );
  }, [busca, contatos]);

  const primeiro = useMemo(
    () => contatos.find((c) => c.id === selecionados[0]) ?? null,
    [contatos, selecionados]
  );

  const previa = useMemo(() => {
    if (!mensagem.trim()) return '';
    return renderTemplate(mensagem, {
      nome: primeiro?.name ?? 'Ana Paula',
      empresa: primeiro?.company ?? null,
    });
  }, [mensagem, primeiro]);

  const desconhecidos = useMemo(() => placeholdersDesconhecidos(mensagem), [mensagem]);

  const alternar = (id: string) => {
    setSelecionados((atual) =>
      atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id]
    );
  };

  const submeter = async () => {
    if (salvando) return;
    setErro(null);
    setSalvando(true);

    const resultado = await onCreate({
      name: nome,
      message: mensagem,
      contactIds: selecionados,
    });

    setSalvando(false);
    if (!resultado.ok) {
      setErro(resultado.error ?? 'Não foi possível criar a campanha.');
      return;
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Nova campanha"
    >
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] sm:rounded-2xl">
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--theme-border)] px-4 py-3">
          <h2 className="text-sm font-black text-[var(--theme-text-primary)]">Nova campanha</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-lg p-1 text-[var(--theme-text-secondary)] transition-colors hover:text-[var(--theme-text-primary)]"
          >
            <X size={16} />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-wide text-[var(--theme-text-secondary)]">
              Nome da campanha
            </span>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Convite — Encontro de outubro"
              className="mt-1 w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 py-2 text-xs text-[var(--theme-text-primary)] outline-none placeholder:text-[var(--theme-text-secondary)]"
            />
            <span className="mt-1 block text-[10px] text-[var(--theme-text-secondary)]">
              Só aparece aqui. O cliente não vê.
            </span>
          </label>

          <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-wide text-[var(--theme-text-secondary)]">
              Mensagem
            </span>
            <textarea
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              rows={4}
              placeholder="Oi {{nome}}, tudo bem? Temos novidade para você…"
              className="mt-1 w-full resize-y rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] p-3 text-xs leading-relaxed text-[var(--theme-text-primary)] outline-none placeholder:text-[var(--theme-text-secondary)]"
            />
            <span className="mt-1 block text-[10px] text-[var(--theme-text-secondary)]">
              Use {'{{nome}}'} e {'{{empresa}}'} para personalizar cada envio.
            </span>
          </label>

          {desconhecidos.length > 0 && (
            <p className="flex items-start gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] font-semibold text-amber-300">
              <AlertTriangle size={13} className="mt-px shrink-0" />
              <span>
                {desconhecidos.map((d) => `{{${d}}}`).join(', ')} não será substituído — vai sair
                assim mesmo na mensagem.
              </span>
            </p>
          )}

          {previa && (
            <div className="rounded-xl border border-[var(--theme-border)] p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--theme-text-secondary)]">
                Como {primeiro?.name ?? 'o primeiro contato'} vai receber
              </p>
              <p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-[var(--theme-text-primary)]">
                {previa}
              </p>
            </div>
          )}

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wide text-[var(--theme-text-secondary)]">
                Destinatários
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-black text-[var(--primary-color)]">
                <Users size={12} />
                {selecionados.length} selecionado{selecionados.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="relative mb-2">
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--theme-text-secondary)]"
              />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome, empresa ou telefone"
                className="w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] py-2 pl-8 pr-3 text-xs text-[var(--theme-text-primary)] outline-none placeholder:text-[var(--theme-text-secondary)]"
              />
            </div>

            {carregando ? (
              <p className="flex items-center gap-2 py-4 text-xs text-[var(--theme-text-secondary)]">
                <Loader2 size={14} className="animate-spin" />
                Carregando contatos…
              </p>
            ) : (
              <ul className="max-h-56 overflow-y-auto rounded-xl border border-[var(--theme-border)]">
                {filtrados.map((contato) => {
                  const marcado = selecionados.includes(contato.id);

                  return (
                    <li key={contato.id}>
                      <label className="flex cursor-pointer items-center gap-2.5 border-b border-[var(--theme-border)] px-3 py-2 last:border-b-0">
                        <input
                          type="checkbox"
                          checked={marcado}
                          onChange={() => alternar(contato.id)}
                          className="size-3.5 accent-[var(--primary-color)]"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[11px] font-bold text-[var(--theme-text-primary)]">
                            {contato.name}
                          </span>
                          <span className="block truncate text-[10px] text-[var(--theme-text-secondary)]">
                            {[contato.company, contato.phoneFormatted].filter(Boolean).join(' · ') ||
                              'Sem telefone cadastrado'}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}

                {filtrados.length === 0 && (
                  <li className="px-3 py-4 text-center text-[11px] text-[var(--theme-text-secondary)]">
                    Nenhum contato encontrado.
                  </li>
                )}
              </ul>
            )}
          </div>

          {erro && <p className="text-[11px] font-bold text-red-400">{erro}</p>}
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-2 border-t border-[var(--theme-border)] px-4 py-3">
          <span className="text-[10px] text-[var(--theme-text-secondary)]">
            A campanha nasce como rascunho. Nada sai antes de você iniciar.
          </span>

          <button
            type="button"
            onClick={() => void submeter()}
            disabled={salvando || !nome.trim() || !mensagem.trim() || selecionados.length === 0}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-black transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: 'var(--primary-color)', color: '#0B0F17' }}
          >
            {salvando && <Loader2 size={13} className="animate-spin" />}
            Criar campanha
          </button>
        </footer>
      </div>
    </div>
  );
}
