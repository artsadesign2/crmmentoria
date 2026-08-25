import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
});

export const metadata: Metadata = {
  title: 'Rocket Club — SaaS Multi-Tenant para Mentorias & Comunidades',
  description: 'Plataforma All-in-One para gestão de membros, vendas, cursos, wiki e eventos.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${jakarta.variable} dark`}>
      <body className="bg-[#0B0F17] text-slate-100 antialiased selection:bg-yellow-500/30 selection:text-yellow-200">
        {children}
      </body>
    </html>
  );
}
