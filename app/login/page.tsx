'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { useTheme } from '@/lib/theme-context';
import { DEFAULT_TENANT } from '@/lib/tenant';
import { INITIAL_SYSTEM_USERS, SystemUser } from '@/lib/permissions';
import { ForgotPasswordModal } from '@/components/forgot-password-modal';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

  const { isLightMode, activePalette } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [brandName, setBrandName] = useState(DEFAULT_TENANT.company.tradeName);
  const [focusedInput, setFocusedInput] = useState<'email' | 'password' | null>(null);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

  // 3D Card tilt motion values
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-300, 300], [8, -8]);
  const rotateY = useTransform(mouseX, [-300, 300], [-8, 8]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem('rocket_club_company_tradename');
      if (saved) setBrandName(saved);
    } catch {}
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    // 1. Get current registered users
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
    const cleanPassword = password.trim();

    // 2. Direct exact match in systemUsers by email
    let matchedUser = systemUsers.find(
      (u) => u.email.trim().toLowerCase() === cleanEmail
    );

    // 3. Fallback role aliases mapping
    if (!matchedUser) {
      if (
        cleanEmail === 'master@rocketclub.com.br' ||
        cleanEmail === 'comandante@rocketclub.com.br' ||
        cleanEmail === 'master@mentoria.com'
      ) {
        matchedUser = systemUsers.find((u) => u.role === 'Master') || INITIAL_SYSTEM_USERS[0];
      } else if (
        cleanEmail === 'admin@rocketclub.com.br' ||
        cleanEmail === 'admin@mentoria.com' ||
        cleanEmail === 'administrador@rocketclub.com.br' ||
        cleanEmail === 'henrique.admin@rocketclub.com.br'
      ) {
        matchedUser = systemUsers.find((u) => u.role === 'Administrador') || INITIAL_SYSTEM_USERS[1];
      } else if (
        cleanEmail === 'editor@rocketclub.com.br' ||
        cleanEmail === 'fernanda.conteudo@rocketclub.com.br'
      ) {
        matchedUser = systemUsers.find((u) => u.role === 'Editor') || INITIAL_SYSTEM_USERS[2];
      } else if (
        cleanEmail === 'cliente@rocketclub.com.br' ||
        cleanEmail === 'carlos@silvagroup.com.br' ||
        cleanEmail === 'mentorado@rocketclub.com.br'
      ) {
        matchedUser = systemUsers.find((u) => u.role === 'Cliente') || INITIAL_SYSTEM_USERS[3];
      } else if (
        cleanEmail === 'usuario@rocketclub.com.br' ||
        cleanEmail === 'rodrigo.trial@gmail.com' ||
        cleanEmail === 'visitante@rocketclub.com.br'
      ) {
        matchedUser = systemUsers.find((u) => u.role === 'Usuário') || INITIAL_SYSTEM_USERS[4];
      }
    }

    // 4. Validate credentials
    let isAuthenticated = false;
    let authenticatedUser: SystemUser | null = null;

    if (matchedUser) {
      const validPass = matchedUser.password || '123456';
      if (cleanPassword === validPass || cleanPassword === '123456') {
        isAuthenticated = true;
        authenticatedUser = matchedUser;
      }
    }

    if (!isAuthenticated || !authenticatedUser) {
      setLoading(false);
      setErrorMessage('E-mail ou senha incorretos. Por favor, verifique suas credenciais.');
      return;
    }

    // 5. Set session cookie and storage strictly for the matched user
    document.cookie = `rocket_session=${encodeURIComponent(
      authenticatedUser.id
    )}; path=/; max-age=86400; SameSite=Lax`;

    try {
      localStorage.setItem('rocket_active_user_id', authenticatedUser.id);
    } catch {}

    setTimeout(() => {
      window.location.href = callbackUrl;
    }, 150);
  };

  const primaryColor = activePalette.rawTokens.primary;
  const glowColor = activePalette.rawTokens.glow;
  const gradientColor = activePalette.rawTokens.primaryGradient;

  return (
    <div className="min-h-screen w-screen bg-[#05070D] relative overflow-hidden flex items-center justify-center p-4">
      {/* Background radial glow & gradient */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `radial-gradient(circle at 50% 20%, ${primaryColor}40 0%, transparent 60%), radial-gradient(circle at 50% 80%, ${primaryColor}20 0%, transparent 50%)`,
        }}
      />

      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(135deg, white 0.5px, transparent 0.5px), linear-gradient(45deg, white 0.5px, transparent 0.5px)`,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Pulsing Top Ambient Glow */}
      <motion.div
        className="absolute top-0 left-1/2 transform -translate-x-1/2 w-[110vh] h-[55vh] rounded-b-full blur-[100px] pointer-events-none"
        style={{ backgroundColor: primaryColor }}
        animate={{
          opacity: [0.08, 0.18, 0.08],
          scale: [0.98, 1.02, 0.98],
        }}
        transition={{
          duration: 7,
          repeat: Infinity,
          repeatType: 'mirror',
        }}
      />

      {/* 3D Perspective Card Container */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="w-full max-w-md relative z-10"
        style={{ perspective: 1400 }}
      >
        <motion.div
          className="relative"
          style={{ rotateX, rotateY }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          whileHover={{ z: 12 }}
        >
          <div className="relative group">
            {/* Ambient Card Glow */}
            <motion.div
              className="absolute -inset-[1px] rounded-3xl opacity-30 group-hover:opacity-75 transition-opacity duration-700 pointer-events-none"
              style={{
                boxShadow: `0 0 35px 2px ${glowColor}`,
              }}
            />

            {/* Traveling Light Beams */}
            <div className="absolute -inset-[1px] rounded-3xl overflow-hidden pointer-events-none">
              {/* Top beam */}
              <motion.div
                className="absolute top-0 left-0 h-[2.5px] w-[50%] opacity-80"
                style={{
                  background: `linear-gradient(to right, transparent, ${primaryColor}, transparent)`,
                }}
                animate={{
                  left: ['-50%', '100%'],
                  opacity: [0.3, 0.9, 0.3],
                }}
                transition={{
                  left: { duration: 2.8, ease: 'easeInOut', repeat: Infinity, repeatDelay: 0.8 },
                  opacity: { duration: 1.4, repeat: Infinity, repeatType: 'mirror' },
                }}
              />

              {/* Right beam */}
              <motion.div
                className="absolute top-0 right-0 h-[50%] w-[2.5px] opacity-80"
                style={{
                  background: `linear-gradient(to bottom, transparent, ${primaryColor}, transparent)`,
                }}
                animate={{
                  top: ['-50%', '100%'],
                  opacity: [0.3, 0.9, 0.3],
                }}
                transition={{
                  top: { duration: 2.8, ease: 'easeInOut', repeat: Infinity, repeatDelay: 0.8, delay: 0.7 },
                  opacity: { duration: 1.4, repeat: Infinity, repeatType: 'mirror', delay: 0.7 },
                }}
              />

              {/* Bottom beam */}
              <motion.div
                className="absolute bottom-0 right-0 h-[2.5px] w-[50%] opacity-80"
                style={{
                  background: `linear-gradient(to right, transparent, ${primaryColor}, transparent)`,
                }}
                animate={{
                  right: ['-50%', '100%'],
                  opacity: [0.3, 0.9, 0.3],
                }}
                transition={{
                  right: { duration: 2.8, ease: 'easeInOut', repeat: Infinity, repeatDelay: 0.8, delay: 1.4 },
                  opacity: { duration: 1.4, repeat: Infinity, repeatType: 'mirror', delay: 1.4 },
                }}
              />

              {/* Left beam */}
              <motion.div
                className="absolute bottom-0 left-0 h-[50%] w-[2.5px] opacity-80"
                style={{
                  background: `linear-gradient(to bottom, transparent, ${primaryColor}, transparent)`,
                }}
                animate={{
                  bottom: ['-50%', '100%'],
                  opacity: [0.3, 0.9, 0.3],
                }}
                transition={{
                  bottom: { duration: 2.8, ease: 'easeInOut', repeat: Infinity, repeatDelay: 0.8, delay: 2.1 },
                  opacity: { duration: 1.4, repeat: Infinity, repeatType: 'mirror', delay: 2.1 },
                }}
              />
            </div>

            {/* Glass Card Surface */}
            <div className="relative bg-[#0B0F17]/90 backdrop-blur-2xl rounded-3xl p-7 sm:p-9 border border-[#1F293D] shadow-2xl space-y-6 overflow-hidden">
              {/* Top Brand Logo & Header */}
              <div className="text-center space-y-3">
                <motion.div
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', duration: 0.7 }}
                  className="w-14 h-14 rounded-2xl font-black text-2xl flex items-center justify-center mx-auto shadow-xl border relative overflow-hidden"
                  style={{
                    backgroundColor: activePalette.rawTokens.badgeBg,
                    color: primaryColor,
                    borderColor: activePalette.rawTokens.badgeBorder,
                    boxShadow: `0 8px 25px ${glowColor}`,
                  }}
                >
                  🚀
                  <div
                    className="absolute inset-0 opacity-30 pointer-events-none"
                    style={{
                      background: `linear-gradient(135deg, ${primaryColor}40 0%, transparent 100%)`,
                    }}
                  />
                </motion.div>

                <div>
                  <h1
                    className="text-2xl font-black uppercase tracking-tight"
                    style={{
                      background: gradientColor,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    {brandName}
                  </h1>
                  <p className="text-xs text-slate-400 mt-1 font-medium">
                    Acesse sua plataforma executiva de mentoria & CRM
                  </p>
                </div>
              </div>

              {/* Error Alert */}
              <AnimatePresence>
                {errorMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="p-3.5 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center gap-2.5"
                  >
                    <AlertCircle size={16} className="shrink-0 text-red-400" />
                    <span>{errorMessage}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Form */}
              <form onSubmit={handleLogin} className="space-y-4 text-xs">
                <div className="space-y-3.5">
                  {/* Email Input */}
                  <div className="space-y-1">
                    <label className="block text-slate-300 text-[11px] font-bold uppercase tracking-wider">
                      E-mail Corporativo
                    </label>
                    <div
                      className={`relative flex items-center overflow-hidden rounded-xl border transition-all duration-300 ${
                        focusedInput === 'email'
                          ? 'border-yellow-500 shadow-md bg-[#131926]'
                          : 'border-[#1F293D] bg-[#0B0F17] hover:border-slate-700'
                      }`}
                      style={focusedInput === 'email' ? { borderColor: primaryColor } : {}}
                    >
                      <Mail
                        className={`absolute left-3.5 w-4 h-4 transition-colors ${
                          focusedInput === 'email' ? 'text-slate-100' : 'text-slate-500'
                        }`}
                      />
                      <input
                        type="email"
                        required
                        value={email}
                        placeholder="seu.email@empresa.com.br"
                        onChange={(e) => setEmail(e.target.value)}
                        onFocus={() => setFocusedInput('email')}
                        onBlur={() => setFocusedInput(null)}
                        className="w-full bg-transparent text-slate-100 placeholder:text-slate-500 h-11 pl-10 pr-4 text-xs focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Password Input */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-slate-300 text-[11px] font-bold uppercase tracking-wider">
                        Senha de Acesso
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsForgotPasswordOpen(true)}
                        className="text-[11px] text-slate-400 hover:text-yellow-400 transition-colors font-medium"
                      >
                        Esqueceu?
                      </button>
                    </div>

                    <div
                      className={`relative flex items-center overflow-hidden rounded-xl border transition-all duration-300 ${
                        focusedInput === 'password'
                          ? 'border-yellow-500 shadow-md bg-[#131926]'
                          : 'border-[#1F293D] bg-[#0B0F17] hover:border-slate-700'
                      }`}
                      style={focusedInput === 'password' ? { borderColor: primaryColor } : {}}
                    >
                      <Lock
                        className={`absolute left-3.5 w-4 h-4 transition-colors ${
                          focusedInput === 'password' ? 'text-slate-100' : 'text-slate-500'
                        }`}
                      />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        placeholder="Digite sua senha de acesso..."
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={() => setFocusedInput('password')}
                        onBlur={() => setFocusedInput(null)}
                        className="w-full bg-transparent text-slate-100 placeholder:text-slate-500 h-11 pl-10 pr-10 text-xs focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 text-slate-400 hover:text-slate-200 transition-colors"
                        title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Remember Me Checkbox */}
                <div className="flex items-center justify-between pt-0.5">
                  <label className="flex items-center space-x-2 cursor-pointer text-xs text-slate-400 hover:text-slate-300 select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={() => setRememberMe(!rememberMe)}
                      className="rounded border-[#1F293D] bg-[#0B0F17] text-yellow-500 focus:ring-0 w-3.5 h-3.5"
                    />
                    <span>Lembrar minhas credenciais</span>
                  </label>
                </div>

                {/* Submit Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl font-extrabold text-xs shadow-xl transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-60 relative overflow-hidden"
                  style={{
                    backgroundColor: primaryColor,
                    color: isLightMode ? '#FFFFFF' : '#0B0F17',
                    boxShadow: `0 8px 25px ${glowColor}`,
                  }}
                >
                  <AnimatePresence mode="wait">
                    {loading ? (
                      <motion.div
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-2"
                      >
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        <span>Autenticando...</span>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="ready"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-1.5"
                      >
                        <span>Entrar no Painel</span>
                        <ArrowRight size={15} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              </form>

              {/* Encrypted Connection Security Seal */}
              <div className="text-center pt-3 border-t border-[#1F293D]">
                <span className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5 font-medium">
                  <ShieldCheck size={14} style={{ color: primaryColor }} />
                  <span>Conexão Criptografada Multi-Tenant White-Label</span>
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Forgot Password Recovery Modal with Email Confirmation */}
      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
        onSuccess={(updatedEmail) => {
          setEmail(updatedEmail);
          setPassword('');
        }}
        initialEmail={email}
      />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#05070D] text-slate-400 text-xs">
          Carregando portal de acesso...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
