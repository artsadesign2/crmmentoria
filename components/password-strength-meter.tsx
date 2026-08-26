'use client';

import React from 'react';
import { ShieldCheck, ShieldAlert, Check, X, Sparkles, KeyRound } from 'lucide-react';

export interface PasswordCriteria {
  label: string;
  met: boolean;
}

export function evaluatePassword(password: string) {
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasUpperAndLower = hasUpper && hasLower;
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const isLong = password.length >= 12;

  const criteria: PasswordCriteria[] = [
    { label: 'Mínimo de 8 caracteres', met: hasMinLength },
    { label: 'Letras maiúsculas e minúsculas', met: hasUpperAndLower },
    { label: 'Pelo menos um número (0-9)', met: hasNumber },
    { label: 'Caractere especial (@, #, $, %, etc.)', met: hasSpecial },
  ];

  let points = 0;
  if (hasMinLength) points += 1;
  if (hasUpperAndLower) points += 1;
  if (hasNumber) points += 1;
  if (hasSpecial) points += 1;
  if (isLong && points >= 3) points += 1;

  let level: {
    score: number;
    label: string;
    color: string;
    textColor: string;
    borderColor: string;
    bgBadge: string;
    percent: number;
    description: string;
  };

  if (!password) {
    level = {
      score: 0,
      label: 'Não informada',
      color: 'bg-slate-600',
      textColor: 'text-slate-400',
      borderColor: 'border-slate-700',
      bgBadge: 'bg-slate-800 text-slate-400',
      percent: 0,
      description: 'Digite uma senha para analisar o nível de proteção.',
    };
  } else if (points <= 1) {
    level = {
      score: 1,
      label: 'Fraca',
      color: 'bg-red-500',
      textColor: 'text-red-400',
      borderColor: 'border-red-500/40',
      bgBadge: 'bg-red-500/15 text-red-400',
      percent: 25,
      description: 'Senha vulnerável a ataques básicos. Sugerimos adicionar números e símbolos.',
    };
  } else if (points === 2) {
    level = {
      score: 2,
      label: 'Regular',
      color: 'bg-amber-500',
      textColor: 'text-amber-400',
      borderColor: 'border-amber-500/40',
      bgBadge: 'bg-amber-500/15 text-amber-300',
      percent: 50,
      description: 'Segurança intermediária. Adicione caracteres especiais para torná-la robusta.',
    };
  } else if (points === 3) {
    level = {
      score: 3,
      label: 'Boa',
      color: 'bg-yellow-400',
      textColor: 'text-yellow-300',
      borderColor: 'border-yellow-500/40',
      bgBadge: 'bg-yellow-500/15 text-yellow-300',
      percent: 75,
      description: 'Boa segurança! Recomendada para uso diário.',
    };
  } else {
    level = {
      score: 4,
      label: 'Forte & Blindada',
      color: 'bg-emerald-500',
      textColor: 'text-emerald-400',
      borderColor: 'border-emerald-500/40',
      bgBadge: 'bg-emerald-500/15 text-emerald-300',
      percent: 100,
      description: 'Excelente! Senha de alto padrão e difícil de quebrar.',
    };
  }

  return { criteria, level, points };
}

interface PasswordStrengthMeterProps {
  password: string;
  isLightMode?: boolean;
  showSuggestions?: boolean;
}

export function PasswordStrengthMeter({
  password,
  isLightMode = false,
  showSuggestions = true,
}: PasswordStrengthMeterProps) {
  if (!password) return null;

  const { criteria, level } = evaluatePassword(password);

  return (
    <div
      className={`p-3.5 rounded-2xl border transition-all duration-200 space-y-3 ${
        isLightMode
          ? 'bg-slate-50 border-slate-200'
          : 'bg-[#0B0F17]/90 border-[#1F293D]'
      }`}
    >
      {/* Header with Level & Badge */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-bold">
          {level.score >= 3 ? (
            <ShieldCheck size={16} className={level.textColor} />
          ) : (
            <ShieldAlert size={16} className={level.textColor} />
          )}
          <span className={isLightMode ? 'text-slate-700' : 'text-slate-300'}>
            Força da Senha:
          </span>
          <span className={`font-black ${level.textColor}`}>{level.label}</span>
        </div>

        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${level.bgBadge} ${level.borderColor}`}
        >
          {level.percent}% Seguro
        </span>
      </div>

      {/* Progress Bars (4 segments) */}
      <div className="grid grid-cols-4 gap-1.5">
        {[1, 2, 3, 4].map((step) => {
          const isActive = level.score >= step;
          return (
            <div
              key={step}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                isActive
                  ? level.color
                  : isLightMode
                  ? 'bg-slate-200'
                  : 'bg-slate-800'
              }`}
              style={{
                boxShadow: isActive ? `0 0 8px currentColor` : 'none',
              }}
            />
          );
        })}
      </div>

      {/* Description */}
      <p className={`text-[11px] leading-tight ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
        {level.description}
      </p>

      {/* Criteria Checklist */}
      {showSuggestions && (
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 space-y-1.5">
          <div className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1 text-slate-400">
            <Sparkles size={11} className="text-amber-400" />
            <span>Sugestões de Segurança (Opcional):</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
            {criteria.map((c, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors ${
                  c.met
                    ? isLightMode
                      ? 'text-emerald-700 bg-emerald-50'
                      : 'text-emerald-400 bg-emerald-950/20'
                    : isLightMode
                    ? 'text-slate-500 bg-slate-100/80'
                    : 'text-slate-500 bg-slate-900/40'
                }`}
              >
                {c.met ? (
                  <Check size={12} className="text-emerald-400 shrink-0 font-black" />
                ) : (
                  <X size={12} className="text-slate-500 shrink-0" />
                )}
                <span className={c.met ? 'font-medium' : ''}>{c.label}</span>
              </div>
            ))}
          </div>

          <p className="text-[10px] text-slate-500 italic pt-1">
            * Não há bloqueio para salvar, mas recomendamos uma senha mais forte para proteger sua conta.
          </p>
        </div>
      )}
    </div>
  );
}
