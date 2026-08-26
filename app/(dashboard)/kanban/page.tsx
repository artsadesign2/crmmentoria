'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function KanbanRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to CRM (Novos Leads & Follow-ups WhatsApp)
    router.replace('/crm');
  }, [router]);

  return (
    <div className="h-96 flex flex-col items-center justify-center space-y-3 text-slate-400">
      <Loader2 size={32} className="animate-spin text-theme-primary" />
      <span className="text-sm font-semibold">Redirecionando para o CRM de Novos Leads & Follow-ups...</span>
    </div>
  );
}
