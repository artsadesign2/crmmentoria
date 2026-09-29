'use client';

import React from 'react';

export interface MaterialSvgIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  color?: string;
  className?: string;
}

/**
 * Componente base para SVGs customizados seguindo as especificações do Material Design
 * (viewBox 0 0 24 24, grid 24dp, cantos suaves, estilo preenchido / linear harmonizado).
 */
export function MaterialSvg({
  children,
  size = 24,
  color = 'currentColor',
  className = '',
  viewBox = '0 0 24 24',
  ...props
}: MaterialSvgIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox={viewBox}
      fill={color}
      className={`shrink-0 transition-transform ${className}`}
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

/**
 * Ícone customizado de Foguete / Launch no padrão Material Design 24dp
 */
export function MdRocketCustom(props: MaterialSvgIconProps) {
  return (
    <MaterialSvg {...props}>
      <path d="M12 2.5c-2.8 0-6.2 3.1-6.2 7.8 0 3.3 1.8 6.5 4.2 8.4V21c0 .6.4 1 1 1h2c.6 0 1-.4 1-1v-2.3c2.4-1.9 4.2-5.1 4.2-8.4 0-4.7-3.4-7.8-6.2-7.8zm0 2c1.7 0 4.2 2.2 4.2 5.8 0 1.2-.3 2.5-.9 3.6l-3.3-3.3c-.4-.4-1-.4-1.4 0s-.4 1 0 1.4l3.3 3.3c-1.1.6-2.4.9-3.6.9-3.6 0-5.8-2.5-5.8-5.8 0-3.6 2.5-5.8 5.8-5.8zM4.5 14.5l-2.7 1.8c-.5.3-.6.9-.3 1.4l1.5 2.2c.3.5.9.6 1.4.3l2.8-1.9c-.9-1.2-1.8-2.5-2.7-3.8zm15 0c-.9 1.3-1.8 2.6-2.7 3.8l2.8 1.9c.5.3 1.1.2 1.4-.3l1.5-2.2c.3-.5.2-1.1-.3-1.4l-2.7-1.8z" />
    </MaterialSvg>
  );
}

/**
 * Ícone customizado de Mentoria / Coach ScaleMentors no padrão Material Design 24dp
 */
export function MdMentorshipCustom(props: MaterialSvgIconProps) {
  return (
    <MaterialSvg {...props}>
      <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
    </MaterialSvg>
  );
}

/**
 * Ícone customizado de IA / Smart Copilot no padrão Material Design 24dp
 */
export function MdCopilotSparkleCustom(props: MaterialSvgIconProps) {
  return (
    <MaterialSvg {...props}>
      <path d="M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z" />
    </MaterialSvg>
  );
}
