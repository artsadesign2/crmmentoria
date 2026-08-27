import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';

export default async function RootPage() {
  // getSession verifica a assinatura do JWT; a versão anterior apenas checava
  // se o cookie existia, o que qualquer pessoa conseguia forjar.
  const session = await getSession();
  redirect(session ? '/dashboard' : '/login');
}
