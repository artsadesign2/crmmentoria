'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { LogOut, ShieldCheck } from 'lucide-react';
import { NAVIGATION_ITEMS } from '@/components/sidebar';
import { MenuToggle } from '@/components/menu-toggle';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import { ROLE_HIERARCHIES } from '@/lib/permissions';

/**
 * A gaveta de navegação do celular.
 *
 * Existe separada da `Sidebar` de propósito. Antes as duas eram o mesmo
 * elemento, o que trazia dois problemas juntos: a barra lateral do desktop
 * carregava estados que só o celular usa, e a gaveta herdava a densidade de uma
 * barra desenhada para mouse — linhas de 34px, que no dedo exigem mira.
 *
 * Sobre a animação de saída: o painel anterior desmontava assim que
 * `mobileOpen` virava falso (`{aberto && <div/>}`), então entrava com fade e
 * **sumia num corte**. É o defeito mais comum de gaveta em React, e o mais
 * visível: fechar parecia um erro de renderização. `AnimatePresence` segura o
 * elemento no DOM até a animação de saída terminar, e é a única razão pela qual
 * este arquivo importa framer-motion.
 */

/** Entrada com mola; saída sem. Mola na saída faz o painel "titubear" ao sair. */
const ENTRADA = { type: 'spring', stiffness: 380, damping: 38, mass: 0.9 } as const;
const SAIDA = { duration: 0.22, ease: [0.4, 0, 1, 1] } as const;

export function MobileNav({ aberto, onFechar }: { aberto: boolean; onFechar: () => void }) {
  const pathname = usePathname();
  const { currentUser, currentRole, canAccessModule, isMaster, logout } = useAuth();
  const { isLightMode, activePalette } = useTheme();
  const semMovimento = useReducedMotion();

  const painel = useRef<HTMLDivElement>(null);
  const focoAnterior = useRef<HTMLElement | null>(null);

  const primaria = activePalette.tokens.primary;
  const papel = ROLE_HIERARCHIES[currentRole] ?? ROLE_HIERARCHIES['Usuário'];

  /**
   * Trava a rolagem do corpo enquanto a gaveta está aberta.
   *
   * Sem isto, arrastar sobre o painel rola a página atrás dele — e ao fechar, o
   * usuário volta para um lugar da tela que não era onde ele estava. É o tipo
   * de coisa que ninguém reporta como bug e todo mundo sente.
   */
  useEffect(() => {
    if (!aberto) return;

    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = anterior;
    };
  }, [aberto]);

  /** Esc fecha, e o foco volta para quem abriu. */
  useEffect(() => {
    if (!aberto) return;

    focoAnterior.current = document.activeElement as HTMLElement | null;

    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFechar();
    };

    document.addEventListener('keydown', aoTeclar);
    const alvo = painel.current?.querySelector<HTMLElement>('a, button');
    alvo?.focus();

    return () => {
      document.removeEventListener('keydown', aoTeclar);
      focoAnterior.current?.focus?.();
    };
  }, [aberto, onFechar]);

  const itens = NAVIGATION_ITEMS.filter(
    (i) => (canAccessModule(i.permissionKey) || isMaster) && (!i.somenteMaster || isMaster)
  );

  return (
    <AnimatePresence>
      {aberto && (
        <div className="lg:hidden">
          {/* Fundo escurecido */}
          <motion.button
            type="button"
            aria-label="Fechar menu"
            onClick={onFechar}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: semMovimento ? 0 : 0.2 }}
          />

          {/* Painel */}
          <motion.div
            ref={painel}
            role="dialog"
            aria-modal="true"
            aria-label="Menu de navegação"
            className={`fixed inset-y-0 left-0 z-50 flex w-[85vw] max-w-[320px] flex-col border-r shadow-2xl ${
              isLightMode
                ? 'border-slate-200 bg-white text-slate-800'
                : 'border-[#1F293D] bg-[#131926] text-slate-100'
            }`}
            style={{ backgroundColor: activePalette.tokens.surface }}
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={semMovimento ? { duration: 0 } : aberto ? ENTRADA : SAIDA}
            // Arrastar para a esquerda fecha: no celular, o gesto é mais rápido
            // que mirar no botão, e quem usa o aparelho já espera que funcione.
            drag={semMovimento ? false : 'x'}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={{ left: 0.9, right: 0 }}
            onDragEnd={(_, info) => {
              if (info.offset.x < -70 || info.velocity.x < -450) onFechar();
            }}
          >
            {/* Cabeçalho */}
            <div
              className={`flex h-20 shrink-0 items-center gap-3 border-b px-4 ${
                isLightMode ? 'border-slate-200' : 'border-[#1F293D]'
              }`}
            >
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl font-black shadow-lg"
                style={{ backgroundColor: primaria, color: '#0A0F1A' }}
              >
                🚀
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black tracking-tight">Rocket Club</p>
                <p
                  className="truncate text-[11px]"
                  style={{ color: activePalette.tokens.textSecondary }}
                >
                  Mentoria &amp; CRM
                </p>
              </div>
              <MenuToggle aberto onClick={onFechar} variante="boxed" />
            </div>

            {/* Itens */}
            <nav className="flex-1 space-y-1 overflow-y-auto overscroll-contain p-3">
              {itens.map((item, i) => {
                const ativo = pathname === item.href || pathname.startsWith(item.href + '/');
                const Icone = item.icon;

                return (
                  <motion.div
                    key={item.href}
                    initial={semMovimento ? false : { opacity: 0, x: -14 }}
                    animate={{ opacity: 1, x: 0 }}
                    // Escalonado só na entrada. Escalonar a saída faria o menu
                    // demorar a fechar, e fechar precisa parecer instantâneo.
                    transition={{ delay: semMovimento ? 0 : 0.05 + i * 0.022, duration: 0.22 }}
                  >
                    <Link
                      href={item.href}
                      prefetch
                      onClick={onFechar}
                      aria-current={ativo ? 'page' : undefined}
                      className={`flex min-h-[48px] items-center gap-3.5 rounded-xl px-3.5 text-sm font-bold transition-colors ${
                        ativo
                          ? 'shadow-sm'
                          : isLightMode
                            ? 'text-slate-600 hover:bg-slate-100'
                            : 'text-slate-300 hover:bg-white/5'
                      }`}
                      style={
                        ativo
                          ? { backgroundColor: `${primaria}1F`, color: primaria }
                          : undefined
                      }
                    >
                      <Icone size={19} className="shrink-0" />
                      <span className="truncate">{item.name}</span>
                      {ativo && (
                        <motion.span
                          layoutId="trilho-mobile"
                          className="ml-auto h-5 w-1 rounded-full"
                          style={{ backgroundColor: primaria }}
                        />
                      )}
                    </Link>
                  </motion.div>
                );
              })}
            </nav>

            {/* Rodapé: quem está logado */}
            <div
              className={`flex shrink-0 items-center gap-3 border-t p-3 ${
                isLightMode ? 'border-slate-200' : 'border-[#1F293D]'
              }`}
            >
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-bold"
                style={{
                  backgroundColor: `${papel.color}25`,
                  color: papel.color,
                  border: `1px solid ${papel.color}60`,
                }}
              >
                {currentUser.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold">{currentUser.name}</p>
                <span
                  className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-bold"
                  style={{ color: papel.color }}
                >
                  <ShieldCheck size={10} /> {currentRole}
                </span>
              </div>
              <button
                type="button"
                onClick={() => void logout()}
                className="flex h-11 w-11 items-center justify-center rounded-xl text-red-400 transition-colors hover:bg-red-500/15"
                aria-label="Sair da conta"
              >
                <LogOut size={17} />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
