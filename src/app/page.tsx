import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Redirect based on auth status
  if (user) {
    redirect('/home');
  } else {
    redirect('/login');
  }
}
