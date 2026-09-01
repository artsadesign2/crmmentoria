'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useTheme } from '@/lib/theme-context';

/**
 * O botão que abre e fecha o menu no celular.
 *
 * Três traços que viram um X — e não dois ícones trocados. A diferença importa:
 * trocar `<Menu/>` por `<X/>` é um corte, e um corte não diz que os dois
 * estados são o mesmo controle. O traço que gira mostra que abrir e fechar são
 * a mesma coisa em dois sentidos, e é o que faz o botão parecer que responde ao
 * dedo em vez de apenas mudar.
 *
 * 44px de área de toque nos dois formatos. É o alvo do guia da Apple e o
 * mínimo do WCAG 2.5.5 — e era justamente o que faltava na barra inferior, com
 * botões de 26px que exigem mira.
 */

const TRACO = 'absolute h-[2px] rounded-full';

export function MenuToggle({
  aberto,
  onClick,
  variante = 'boxed',
  rotulo = 'Menu',
}: {
  aberto: boolean;
  onClick: () => void;
  /** `boxed` na barra superior; `bar` na navegação inferior, com legenda. */
  variante?: 'boxed' | 'bar';
  rotulo?: string;
}) {
  const { isLightMode, activePalette } = useTheme();
  const semMovimento = useReducedMotion();

  const primaria = activePalette.tokens.primary;
  const cor = aberto ? primaria : isLightMode ? '#334155' : '#CBD5E1';

  // Sem movimento: o X ainda aparece, só que sem a rotação. Quem desligou
  // animação continua precisando saber em que estado o botão está.
  const mola = semMovimento
    ? { duration: 0 }
    : ({ type: 'spring', stiffness: 500, damping: 30 } as const);

  const glifo = (
    <span className="relative block h-[18px] w-[18px]" aria-hidden="true">
      <motion.span
        className={TRACO}
        style={{ backgroundColor: cor, width: 18, left: 0 }}
        initial={false}
        animate={aberto ? { top: 8, rotate: 45 } : { top: 3, rotate: 0 }}
        transition={mola}
      />
      <motion.span
        className={TRACO}
        style={{ backgroundColor: cor, top: 8, left: 0 }}
        initial={false}
        // Encolhe para o centro em vez de só sumir: o traço do meio "entra" nos
        // outros dois, o que faz o X parecer montado e não substituído.
        animate={aberto ? { opacity: 0, width: 0, x: 9 } : { opacity: 1, width: 18, x: 0 }}
        transition={semMovimento ? { duration: 0 } : { duration: 0.18 }}
      />
      <motion.span
        className={TRACO}
        style={{ backgroundColor: cor, width: 18, left: 0 }}
        initial={false}
        animate={aberto ? { top: 8, rotate: -45 } : { top: 13, rotate: 0 }}
        transition={mola}
      />
    </span>
  );

  if (variante === 'bar') {
    return (
      <motion.button
        type="button"
        onClick={onClick}
        whileTap={semMovimento ? undefined : { scale: 0.9 }}
        className="relative flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-0.5 rounded-2xl px-3"
        aria-expanded={aberto}
        aria-label={aberto ? 'Fechar menu' : 'Abrir menu'}
      >
        {/* O halo só existe com o menu aberto, e é o que dá ao botão o peso de
            "controle ativo" sem precisar de moldura permanente. */}
        <motion.span
          className="absolute inset-x-1 inset-y-0 rounded-2xl"
          initial={false}
          animate={{ opacity: aberto ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          style={{
            background: `radial-gradient(circle at 50% 35%, ${primaria}2E 0%, transparent 70%)`,
          }}
        />
        <span className="relative flex h-[18px] items-center justify-center">{glifo}</span>
        <span
          className="relative text-[10px] tracking-tight"
          style={{ color: aberto ? primaria : activePalette.tokens.textSecondary }}
        >
          {rotulo}
        </span>
      </motion.button>
    );
  }

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={semMovimento ? undefined : { scale: 0.92 }}
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors lg:hidden ${
        isLightMode
          ? 'border-slate-300 bg-slate-100 hover:bg-slate-200'
          : 'border-[#1F293D] bg-[#111728] hover:bg-[#1A2234]'
      }`}
      style={aberto ? { borderColor: `${primaria}66` } : undefined}
      aria-expanded={aberto}
      aria-label={aberto ? 'Fechar menu' : 'Abrir menu'}
    >
      {glifo}
    </motion.button>
  );
}
