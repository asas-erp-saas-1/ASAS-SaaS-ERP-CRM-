'use client';
import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { Building2, ArrowRight } from 'lucide-react';

export default function SignupPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const router = useRouter();

  const getSupabase = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
    return { supabase: createBrowserClient(supabaseUrl, supabaseKey), isMock: supabaseUrl === 'https://placeholder.supabase.co' };
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { supabase, isMock } = getSupabase();

    if (isMock) {
      setTimeout(() => {
        setSuccess(true);
      }, 1000);
      return;
    }

    // Register user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        }
      }
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (authData.user && authData.session) {
      router.push('/onboarding');
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-[100dvh] w-full items-center justify-center bg-white dark:bg-[#141618] text-asas-charcoal dark:text-asas-sand px-4 py-12">
        <div className="w-full max-w-md p-8 border border-gray-200 dark:border-white/5 bg-white dark:bg-[#141618] rounded-sm shadow-2xl text-center">
            <h2 className="text-2xl font-bold mb-4">Vérifiez votre Email</h2>
            <p className="text-asas-silver">Un lien de confirmation a été envoyé à <strong>{email}</strong>. Cliquez sur ce lien pour activer votre compte, puis connectez-vous.</p>
            <button onClick={() => router.push('/login')} className="mt-8 px-6 py-3 bg-asas-navy text-white rounded-sm font-bold">Retour à la connexion</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] w-full items-center justify-center bg-asas-sand/30 dark:bg-[#050505] text-gray-900 dark:text-white px-4 py-12 bg-dot-grid relative">
      <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-white dark:from-[#0A0A0A] to-transparent pointer-events-none z-0"></div>
      <div className="w-full max-w-md p-6 sm:p-8 border border-gray-200 dark:border-white/5 bg-white dark:bg-[#0A0A0A] rounded-3xl shadow-2xl z-10 relative">
        <div className="flex items-center justify-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-bl from-blue-600 to-indigo-900 border border-blue-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.3)]">
            <Building2 className="w-6 h-6 text-white" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-center mb-2 font-display tracking-tight text-gray-900 dark:text-white">Créer un compte</h2>
        <p className="text-asas-charcoal/80 dark:text-asas-silver text-center text-sm mb-8">Rejoignez ASAS OS pour digitaliser votre agence</p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-4 rounded-xl mb-6 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-asas-sand/90 mb-1.5 uppercase tracking-wide">Nom Complet</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-gray-50 dark:bg-[#141618] border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-asas-gold focus:border-asas-gold/50 transition-all font-medium"
              placeholder="Jean Dupont"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">Email Professionnel</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium"
              placeholder="jean@monagence.com"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">Mot de passe</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-50 dark:bg-[#111111] border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-asas-charcoal dark:hover:bg-black text-white font-bold py-3.5 rounded-xl transition-all mt-4 disabled:opacity-50 relative overflow-hidden group flex items-center justify-center gap-2 shadow-lg"
          >
            {loading ? 'Création...' : 'Créer l\'agence'}
            {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" strokeWidth={2} />}
          </button>
        </form>
        <div className="mt-6 text-center text-sm font-medium text-gray-500">
           Déjà un compte ? <button onClick={() => router.push('/login')} className="text-asas-navy dark:text-asas-sand hover:text-blue-400">Connectez-vous</button>
        </div>
      </div>
    </div>
  );
}
