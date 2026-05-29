import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Building2, Rocket, ArrowRight } from 'lucide-react';
import { kernel } from '@/lib/kernel/core';
import Link from 'next/link';

export default async function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
  
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll() { /* ... */ }
    }
  });

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // Need to login or signup first
    // Save invite code to a cookie to process after login? Or just pass it in URL
    return (
      <div className="flex min-h-[100dvh] w-full items-center justify-center bg-white dark:bg-[#141618] text-asas-charcoal dark:text-asas-sand px-4 py-12 bg-dot-grid">
         <div className="w-full max-w-md p-8 border border-gray-200 dark:border-white/5 bg-white dark:bg-[#141618] rounded-sm shadow-2xl text-center">
            <h2 className="text-2xl font-bold mb-4">Invitation Reçue</h2>
            <p className="text-asas-silver mb-8">Connectez-vous ou créez un compte pour accepter l'invitation à rejoindre l'agence.</p>
            <div className="space-y-4">
              <Link href={`/login?invite=${code}`} className="block w-full px-6 py-3 bg-asas-navy hover:bg-asas-charcoal dark:hover:bg-black text-white rounded-sm font-bold transition-all">
                Se Connecter
              </Link>
              <Link href={`/signup?invite=${code}`} className="block w-full px-6 py-3 bg-asas-sand/50 hover:bg-gray-200 dark:bg-[#141618] dark:hover:bg-[#1a1a1a] text-gray-900 dark:text-white rounded-xl font-bold border border-gray-200 dark:border-white/10 transition-all">
                Créer un compte
              </Link>
            </div>
         </div>
      </div>
    );
  }

  // Find agency based on invite code (In a real app, from an 'invites' table. For now, simulate or mock)
  // For demo, if code starts with 'ag-', we accept it.
  if (code.startsWith('ag-')) {
    // If we map code straight to a specific ID, let's just grab the first agency for demo purposes
    // since we can't easily query an `invites` table that doesn't exist yet.
    const { data: agencies } = await supabase.from('agencies').select('id, name').limit(1);
    const agency = agencies?.[0];

    if (agency) {
       // Update profile
       const { error } = await supabase.from('profiles').update({ agency_id: agency.id, role: 'agent' }).eq('id', user.id);
       if (!error) {
           redirect('/dashboard/overview');
       }
    }
  }

  return (
    <div className="flex min-h-[100dvh] w-full items-center justify-center bg-asas-sand/30 dark:bg-[#050505] text-gray-900 dark:text-white px-4 py-12">
      <div className="w-full max-w-md p-8 border border-gray-200 dark:border-white/5 bg-white dark:bg-[#0A0A0A] rounded-3xl shadow-2xl text-center">
         <h2 className="text-xl font-bold mb-4 text-red-500">Lien invalide ou expiré</h2>
         <p className="text-gray-500">Cette invitation n'existe plus ou a déjà été utilisée.</p>
         <Link href="/dashboard/overview" className="mt-8 inline-block px-6 py-3 bg-blue-600 text-white rounded-xl font-bold">Retour à l'accueil</Link>
      </div>
    </div>
  );
}
