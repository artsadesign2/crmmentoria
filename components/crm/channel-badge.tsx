'use client';

import { MessageCircle, Instagram, ShoppingCart, Phone, Globe, Webhook } from 'lucide-react';
import { useTheme } from '@/lib/theme-context';
import type { ChannelType } from '@/lib/crm/types';

/**
 * Badge de identificação do canal.
 *
 * O PRD §3.1 especifica estes badges em tokens de tema claro (fundo Green-100,
 * texto Green-700). O rocket-club é escuro por padrão e tem quatro paletas,
 * uma delas clara — usar os valores do PRD direto colocaria retângulos brancos
 * sobre um fundo #0B0F17.
 *
 * O que importa aqui é o matiz: verde é WhatsApp, rosa é Instagram. Ele é a
 * cor da marca e é o que carrega o significado, então é preservado. O que muda
 * conforme o tema é a luminosidade. No tema claro os valores são exatamente os
 * do PRD; no escuro, o mesmo matiz em alfa baixo.
 */

type BadgeSkin = { bg: string; text: string; icon: string };

const CHANNEL_SKINS: Record<
  ChannelType | 'CART',
  { label: string; dark: BadgeSkin; light: BadgeSkin }
> = {
  WHATSAPP: {
    label: 'WhatsApp',
    dark: { bg: 'rgba(34, 197, 94, 0.14)', text: '#4ADE80', icon: '#22C55E' },
    light: { bg: '#DCFCE7', text: '#15803D', icon: '#22C55E' },
  },
  INSTAGRAM: {
    label: 'Instagram',
    dark: { bg: 'rgba(225, 48, 108, 0.14)', text: '#F472B6', icon: '#E1306C' },
    light: { bg: '#FCE7F3', text: '#BE185D', icon: '#E1306C' },
  },
  CART: {
    label: 'Carrinho',
    dark: { bg: 'rgba(234, 88, 12, 0.14)', text: '#FB923C', icon: '#EA580C' },
    light: { bg: '#FFEDD5', text: '#C2410C', icon: '#EA580C' },
  },
  VOIP: {
    label: 'Chamada',
    dark: { bg: 'rgba(6, 182, 212, 0.14)', text: '#22D3EE', icon: '#06B6D4' },
    light: { bg: '#CFFAFE', text: '#0E7490', icon: '#06B6D4' },
  },
  WEBCHAT: {
    label: 'Webchat',
    dark: { bg: 'rgba(148, 163, 184, 0.14)', text: '#CBD5E1', icon: '#94A3B8' },
    light: { bg: '#F1F5F9', text: '#475569', icon: '#94A3B8' },
  },
  WEBHOOK: {
    label: 'Webhook',
    dark: { bg: 'rgba(168, 85, 247, 0.14)', text: '#C4B5FD', icon: '#A855F7' },
    light: { bg: '#F3E8FF', text: '#7E22CE', icon: '#A855F7' },
  },
};

const CHANNEL_ICONS = {
  WHATSAPP: MessageCircle,
  INSTAGRAM: Instagram,
  CART: ShoppingCart,
  VOIP: Phone,
  WEBCHAT: Globe,
  WEBHOOK: Webhook,
} as const;

interface ChannelBadgeProps {
  channel: ChannelType | 'CART';
  /** `dot` é a versão sobreposta ao avatar, sem rótulo. */
  variant?: 'full' | 'dot';
  className?: string;
}

export function ChannelBadge({ channel, variant = 'full', className = '' }: ChannelBadgeProps) {
  const { isLightMode } = useTheme();

  const config = CHANNEL_SKINS[channel] ?? CHANNEL_SKINS.WEBCHAT;
  const skin = isLightMode ? config.light : config.dark;
  const Icon = CHANNEL_ICONS[channel] ?? Globe;

  if (variant === 'dot') {
    return (
      <span
        title={config.label}
        aria-label={config.label}
        className={`flex h-4 w-4 items-center justify-center rounded-full ring-2 ring-[var(--theme-surface)] ${className}`}
        style={{ backgroundColor: skin.icon }}
      >
        <Icon size={9} className="text-white" strokeWidth={2.5} />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${className}`}
      style={{ backgroundColor: skin.bg, color: skin.text }}
    >
      <Icon size={10} style={{ color: skin.icon }} strokeWidth={2.5} />
      {config.label}
    </span>
  );
}
