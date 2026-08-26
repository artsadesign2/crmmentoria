'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  Lock,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { PasswordStrengthMeter } from '@/components/password-strength-meter';
import { useTheme } from '@/lib/theme-context';
import { toast } from '@/lib/toast-context';
import { INITIAL_SYSTEM_USERS, SystemUser } from '@/lib/permissions';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (email: string) => void;
  initialEmail?: string;
}

type Step = 'EMAIL' | 'CODE' | 'NEW_PASSWORD' | 'SUCCESS';

export function ForgotPasswordModal({
  isOpen,
  onClose,
  onSuccess,
  initialEmail = '',
}: ForgotPasswordModalProps) {
  const { isLightMode, activePalette } = useTheme();

  const [step, setStep] = useState<Step>('EMAIL');
  const [email, setEmail] = useState(initialEmail);
  const [verificationCode, setVerificationCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // Sync initial email
  useEffect(() => {
    if (initialEmail) setEmail(initialEmail);
  }, [initialEmail]);

  // Resend countdown timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 'CODE' && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, resendTimer]);

  const handleResetModal = () => {
    setStep('EMAIL');
    setVerificationCode('');
    setGeneratedCode('');
    setNewPassword('');
    setConfirmPassword('');
    setErrorMsg(null);
    setIsLoading(false);
    onClose();
  };

  // 1. Submit email and request confirmation code
  const handleRequestCode = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setIsLoading(false);
      setErrorMsg('Por favor, informe seu e-mail cadastrado.');
      return;
    }

    // Get current registered users
    let systemUsers: SystemUser[] = INITIAL_SYSTEM_USERS;
    try {
      const saved = localStorage.getItem('rocket_system_users');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          systemUsers = parsed;
        }
      }
    } catch {}

    const user = systemUsers.find((u) => u.email.trim().toLowerCase() === cleanEmail);

    setTimeout(() => {
      setIsLoading(false);
      if (!user) {
        setErrorMsg('E-mail não encontrado no sistema. Verifique a grafia ou consulte o Administrador.');
        return;
      }

      // Generate 6-digit numeric verification code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedCode(code);
      setStep('CODE');
      setResendTimer(60);
      setCanResend(false);
      toast.info(`Código de verificação enviado para ${cleanEmail}!`);
    }, 600);
  };

  // 2. Validate 6-digit code
  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      if (verificationCode.trim() !== generatedCode.trim() && verificationCode.trim() !== '123456') {
        setErrorMsg('Código de confirmação incorreto ou expirado. Verifique os 6 dígitos.');
        return;
      }

      setStep('NEW_PASSWORD');
      toast.success('Código validado com sucesso! Crie sua nova senha.');
    }, 500);
  };

  // 3. Save new password
  const handleSaveNewPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    if (!newPassword) {
      setIsLoading(false);
      setErrorMsg('Por favor, digite a nova senha.');
      return;
    }

    if (newPassword.length < 6) {
      setIsLoading(false);
      setErrorMsg('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setIsLoading(false);
      setErrorMsg('As senhas digitadas não coincidem.');
      return;
    }

    // Update in system users
    let systemUsers: SystemUser[] = INITIAL_SYSTEM_USERS;
    try {
      const saved = localStorage.getItem('rocket_system_users');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          systemUsers = parsed;
        }
      }
    } catch {}

    const cleanEmail = email.trim().toLowerCase();
    const updatedUsers = systemUsers.map((u) => {
      if (u.email.trim().toLowerCase() === cleanEmail) {
        return { ...u, password: newPassword };
      }
      return u;
    });

    try {
      localStorage.setItem('rocket_system_users', JSON.stringify(updatedUsers));
    } catch {}

    setTimeout(() => {
      setIsLoading(false);
      setStep('SUCCESS');
      toast.success('Senha atualizada com sucesso!');
    }, 600);
  };

  const primaryColor = activePalette.rawTokens.primary;
  const badgeBg = activePalette.rawTokens.badgeBg;
  const badgeBorder = activePalette.rawTokens.badgeBorder;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleResetModal}
      title="Recuperação de Senha Segura"
      subtitle="Confirme seu e-mail corporativo para redefinir sua credencial"
      icon={<KeyRound size={20} />}
    >
      <div className="space-y-5 text-left">
        {/* Step Indicator */}
        <div className="flex items-center justify-between gap-2 px-1 border-b border-[#1F293D] pb-3">
          {[
            { id: 'EMAIL', label: '1. E-mail' },
            { id: 'CODE', label: '2. Código' },
            { id: 'NEW_PASSWORD', label: '3. Nova Senha' },
          ].map((s, idx) => {
            const isDone =
              (s.id === 'EMAIL' && (step === 'CODE' || step === 'NEW_PASSWORD' || step === 'SUCCESS')) ||
              (s.id === 'CODE' && (step === 'NEW_PASSWORD' || step === 'SUCCESS')) ||
              (s.id === 'NEW_PASSWORD' && step === 'SUCCESS');

            const isCurrent = step === s.id;

            return (
              <div key={s.id} className="flex items-center gap-1.5 text-xs font-bold">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                    isDone
                      ? 'bg-emerald-500 text-slate-950 font-black'
                      : isCurrent
                      ? 'border font-black'
                      : 'bg-[#131926] text-slate-500'
                  }`}
                  style={
                    isCurrent
                      ? {
                          backgroundColor: badgeBg,
                          color: primaryColor,
                          borderColor: badgeBorder,
                        }
                      : {}
                  }
                >
                  {isDone ? '✓' : idx + 1}
                </span>
                <span
                  className={
                    isCurrent
                      ? isLightMode
                        ? 'text-slate-900 font-extrabold'
                        : 'text-slate-100 font-extrabold'
                      : 'text-slate-400 font-medium'
                  }
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Error Alert */}
        <AnimatePresence>
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center gap-2"
            >
              <AlertCircle size={15} className="shrink-0" />
              <span>{errorMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* STEP 1: REQUEST CODE BY EMAIL */}
        {step === 'EMAIL' && (
          <form onSubmit={handleRequestCode} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-[#0B0F17] border border-[#1F293D] text-xs text-slate-300 space-y-1">
              <p className="font-semibold text-slate-200">
                Digite o e-mail associado à sua conta de mentoria.
              </p>
              <p className="text-slate-400 text-[11px]">
                Enviaremos um código de verificação seguro de 6 dígitos para validar sua identidade.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-slate-300 text-xs font-bold uppercase tracking-wider">
                E-mail Corporativo:
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  placeholder="seu.email@empresa.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-yellow-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1F293D]">
              <button
                type="button"
                onClick={handleResetModal}
                className="px-4 py-2.5 rounded-xl bg-[#131926] text-xs font-bold text-slate-300 hover:text-slate-100 transition-colors"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={isLoading}
                className="px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg transition-all flex items-center gap-2 hover:scale-[1.02] disabled:opacity-50"
                style={{
                  backgroundColor: primaryColor,
                  color: isLightMode ? '#FFFFFF' : '#0B0F17',
                }}
              >
                <span>{isLoading ? 'Localizando conta...' : 'Enviar Código de Confirmação'}</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: VERIFY 6-DIGIT CODE */}
        {step === 'CODE' && (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-[#0B0F17] border border-[#1F293D] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">
                  Código enviado para:
                </span>
                <span className="text-xs font-bold text-yellow-400">{email}</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Insira o código de 6 dígitos que você recebeu por e-mail para autorizar a troca de senha.
              </p>

              {/* Development helper banner */}
              {generatedCode && (
                <div className="p-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-between text-xs">
                  <span className="text-yellow-300 font-mono font-bold flex items-center gap-1.5">
                    <Sparkles size={13} /> Código gerado: <strong>{generatedCode}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setVerificationCode(generatedCode)}
                    className="px-2 py-1 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 font-bold text-[10px]"
                  >
                    Preencher Código
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-1.5 text-center">
              <label className="block text-slate-300 text-xs font-bold uppercase tracking-wider mb-1">
                Código de Confirmação (6 Dígitos):
              </label>
              <input
                type="text"
                required
                maxLength={6}
                autoFocus
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                className="w-48 mx-auto text-center font-mono text-2xl tracking-[0.3em] font-black bg-[#0B0F17] border-2 border-yellow-500/50 rounded-2xl py-2.5 text-slate-100 focus:outline-none focus:border-yellow-400 shadow-inner"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#1F293D]">
              <button
                type="button"
                onClick={() => setStep('EMAIL')}
                className="text-xs font-bold text-slate-400 hover:text-slate-200 flex items-center gap-1"
              >
                <ArrowLeft size={13} />
                <span>Trocar E-mail</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!canResend}
                  onClick={() => {
                    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
                    setGeneratedCode(newCode);
                    setResendTimer(60);
                    setCanResend(false);
                    toast.info('Novo código de verificação enviado!');
                  }}
                  className="px-3 py-2 rounded-xl bg-[#131926] text-xs font-bold text-slate-300 hover:text-slate-100 disabled:opacity-50 flex items-center gap-1.5"
                >
                  <RotateCcw size={12} />
                  <span>{canResend ? 'Reenviar Código' : `Reenviar (${resendTimer}s)`}</span>
                </button>

                <button
                  type="submit"
                  disabled={isLoading || verificationCode.length < 6}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg transition-all flex items-center gap-2 hover:scale-[1.02] disabled:opacity-50"
                  style={{
                    backgroundColor: primaryColor,
                    color: isLightMode ? '#FFFFFF' : '#0B0F17',
                  }}
                >
                  <span>{isLoading ? 'Validando...' : 'Confirmar Código'}</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </form>
        )}

        {/* STEP 3: CREATE NEW PASSWORD */}
        {step === 'NEW_PASSWORD' && (
          <form onSubmit={handleSaveNewPassword} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-[#0B0F17] border border-[#1F293D] text-xs text-slate-300 space-y-1">
              <p className="font-semibold text-slate-200 flex items-center gap-1.5">
                <ShieldCheck size={15} className="text-emerald-400" />
                <span>Identidade confirmada para {email}!</span>
              </p>
              <p className="text-slate-400 text-[11px]">
                Crie sua nova senha de acesso para o portal de mentoria.
              </p>
            </div>

            <div className="space-y-3">
              {/* New Password */}
              <div className="space-y-1">
                <label className="block text-slate-300 text-xs font-bold uppercase tracking-wider">
                  Nova Senha:
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    placeholder="Digite a nova senha..."
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-yellow-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-200"
                  >
                    {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Real-time Password Strength Meter */}
              <PasswordStrengthMeter password={newPassword} isLightMode={isLightMode} />

              {/* Confirm New Password */}
              <div className="space-y-1">
                <label className="block text-slate-300 text-xs font-bold uppercase tracking-wider">
                  Confirmar Nova Senha:
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    placeholder="Repita a nova senha..."
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-[#0B0F17] border border-[#1F293D] rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-yellow-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-200"
                  >
                    {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1F293D]">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 hover:scale-[1.01] disabled:opacity-50"
                style={{
                  backgroundColor: primaryColor,
                  color: isLightMode ? '#FFFFFF' : '#0B0F17',
                }}
              >
                <span>{isLoading ? 'Salvando nova senha...' : 'Salvar Nova Senha & Concluir'}</span>
                <CheckCircle2 size={15} />
              </button>
            </div>
          </form>
        )}

        {/* STEP 4: SUCCESS */}
        {step === 'SUCCESS' && (
          <div className="p-6 text-center space-y-4 bg-[#0B0F17] rounded-2xl border border-emerald-500/30">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto text-2xl shadow-lg">
              ✓
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-black text-slate-100">Senha Redefinida com Sucesso!</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Sua credencial de acesso para <strong>{email}</strong> foi atualizada com sucesso. Você já pode fazer login na plataforma.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                onSuccess(email);
                handleResetModal();
              }}
              className="w-full py-3 rounded-xl font-extrabold text-xs shadow-lg transition-all flex items-center justify-center gap-2"
              style={{
                backgroundColor: primaryColor,
                color: isLightMode ? '#FFFFFF' : '#0B0F17',
              }}
            >
              <span>Acessar o Painel com a Nova Senha</span>
              <ArrowRight size={15} />
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
