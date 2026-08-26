'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
        'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
        className
      )}
      {...props}
    />
  );
}

export function SignInCard2() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<'email' | 'password' | null>(null);
  const [rememberMe, setRememberMe] = useState(false);

  // For 3D card effect
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-300, 300], [10, -10]);
  const rotateY = useTransform(mouseX, [-300, 300], [-10, 10]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <div className="min-h-screen w-screen bg-black relative overflow-hidden flex items-center justify-center">
      {/* Background gradient effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/15 via-yellow-700/10 to-black" />

      {/* Subtle noise texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] mix-blend-soft-light"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundSize: '200px 200px',
        }}
      />

      {/* Top radial glow */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-[120vh] h-[60vh] rounded-b-[50%] bg-yellow-400/15 blur-[90px]" />
      <motion.div
        className="absolute top-0 left-1/2 transform -translate-x-1/2 w-[100vh] h-[60vh] rounded-b-full bg-yellow-300/10 blur-[70px]"
        animate={{
          opacity: [0.15, 0.3, 0.15],
          scale: [0.98, 1.02, 0.98],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          repeatType: 'mirror',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-sm relative z-10"
        style={{ perspective: 1500 }}
      >
        <motion.div
          className="relative"
          style={{ rotateX, rotateY }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          whileHover={{ z: 10 }}
        >
          <div className="relative group">
            {/* Card glow effect */}
            <motion.div
              className="absolute -inset-[1px] rounded-2xl opacity-0 group-hover:opacity-70 transition-opacity duration-700"
              animate={{
                boxShadow: [
                  '0 0 10px 2px rgba(234,179,8,0.1)',
                  '0 0 20px 5px rgba(234,179,8,0.2)',
                  '0 0 10px 2px rgba(234,179,8,0.1)',
                ],
                opacity: [0.2, 0.4, 0.2],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: 'easeInOut',
                repeatType: 'mirror',
              }}
            />

            {/* Traveling light beam effect */}
            <div className="absolute -inset-[1px] rounded-2xl overflow-hidden pointer-events-none">
              <motion.div
                className="absolute top-0 left-0 h-[3px] w-[50%] bg-gradient-to-r from-transparent via-yellow-400 to-transparent opacity-80"
                animate={{
                  left: ['-50%', '100%'],
                  opacity: [0.3, 0.8, 0.3],
                }}
                transition={{
                  left: { duration: 2.5, ease: 'easeInOut', repeat: Infinity, repeatDelay: 1 },
                  opacity: { duration: 1.2, repeat: Infinity, repeatType: 'mirror' },
                }}
              />
              <motion.div
                className="absolute top-0 right-0 h-[50%] w-[3px] bg-gradient-to-b from-transparent via-yellow-400 to-transparent opacity-80"
                animate={{
                  top: ['-50%', '100%'],
                  opacity: [0.3, 0.8, 0.3],
                }}
                transition={{
                  top: { duration: 2.5, ease: 'easeInOut', repeat: Infinity, repeatDelay: 1, delay: 0.6 },
                  opacity: { duration: 1.2, repeat: Infinity, repeatType: 'mirror', delay: 0.6 },
                }}
              />
              <motion.div
                className="absolute bottom-0 right-0 h-[3px] w-[50%] bg-gradient-to-r from-transparent via-yellow-400 to-transparent opacity-80"
                animate={{
                  right: ['-50%', '100%'],
                  opacity: [0.3, 0.8, 0.3],
                }}
                transition={{
                  right: { duration: 2.5, ease: 'easeInOut', repeat: Infinity, repeatDelay: 1, delay: 1.2 },
                  opacity: { duration: 1.2, repeat: Infinity, repeatType: 'mirror', delay: 1.2 },
                }}
              />
              <motion.div
                className="absolute bottom-0 left-0 h-[50%] w-[3px] bg-gradient-to-b from-transparent via-yellow-400 to-transparent opacity-80"
                animate={{
                  bottom: ['-50%', '100%'],
                  opacity: [0.3, 0.8, 0.3],
                }}
                transition={{
                  bottom: { duration: 2.5, ease: 'easeInOut', repeat: Infinity, repeatDelay: 1, delay: 1.8 },
                  opacity: { duration: 1.2, repeat: Infinity, repeatType: 'mirror', delay: 1.8 },
                }}
              />
            </div>

            {/* Glass card background */}
            <div className="relative bg-[#0B0F17]/85 backdrop-blur-2xl rounded-2xl p-6 sm:p-7 border border-[#1F293D] shadow-2xl overflow-hidden">
              <div className="text-center space-y-1 mb-5">
                <div className="mx-auto w-12 h-12 rounded-2xl bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center text-2xl mb-2 shadow-lg">
                  🚀
                </div>
                <h1 className="text-xl font-black text-slate-100 uppercase tracking-tight">
                  Rocket Club
                </h1>
                <p className="text-slate-400 text-xs">
                  Acesse sua plataforma de mentoria & CRM
                </p>
              </div>

              <form className="space-y-4">
                <div className="space-y-3">
                  <div className="relative flex items-center overflow-hidden rounded-xl border border-[#1F293D] bg-[#0B0F17]">
                    <Mail className="absolute left-3 w-4 h-4 text-slate-400" />
                    <Input
                      type="email"
                      placeholder="E-mail corporativo"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setFocusedInput('email')}
                      onBlur={() => setFocusedInput(null)}
                      className="w-full bg-transparent border-transparent text-slate-100 placeholder:text-slate-500 h-10 pl-10 pr-3 focus:bg-white/5"
                    />
                  </div>

                  <div className="relative flex items-center overflow-hidden rounded-xl border border-[#1F293D] bg-[#0B0F17]">
                    <Lock className="absolute left-3 w-4 h-4 text-slate-400" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Senha de acesso"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocusedInput('password')}
                      onBlur={() => setFocusedInput(null)}
                      className="w-full bg-transparent border-transparent text-slate-100 placeholder:text-slate-500 h-10 pl-10 pr-10 focus:bg-white/5"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 text-slate-400 hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center space-x-2 cursor-pointer text-xs text-slate-400">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={() => setRememberMe(!rememberMe)}
                      className="rounded border-[#1F293D] bg-[#0B0F17] text-yellow-500 focus:ring-0"
                    />
                    <span>Lembrar-me</span>
                  </label>
                  <Link href="#" className="text-xs text-yellow-400 hover:text-yellow-300">
                    Esqueceu a senha?
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 rounded-xl font-bold text-xs bg-yellow-500 hover:bg-yellow-400 text-slate-950 transition-all flex items-center justify-center gap-2 shadow-lg"
                >
                  <span>Entrar no Painel</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
