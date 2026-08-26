import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export default async function RootPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get('rocket_session')?.value;

  if (!session) {
    redirect('/login');
  }

  redirect('/dashboard');
}
