'use client';
import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { Building2, ShieldCheck, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [showMfa, setShowMfa] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [factorId, setFactorId] = useState('');

  const router = useRouter();

  const getSupabase = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
    return { supabase: createBrowserClient(supabaseUrl, supabaseKey), isMock: supabaseUrl === 'https://placeholder.supabase.co' };
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { supabase, isMock } = getSupabase();

    if (isMock) {
      setTimeout(() => {
        router.push('/dashboard/overview');
      }, 1000);
      return;
    }

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    // Check MFA
    const { data: mfaData, error: mfaError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (mfaError) {
      setError(mfaError.message);
      setLoading(false);
      return;
    }

    if (mfaData.nextLevel === 'aal2' && mfaData.currentLevel === 'aal1') {
      // User has MFA enabled, find a TOTP factor
      const factors = await supabase.auth.mfa.listFactors();
      const totpFactor = factors.data?.totp?.[0];
      if (totpFactor) {
        setFactorId(totpFactor.id);
        setShowMfa(true);
      } else {
        // Enrolled but no valid factor? (shouldn't happen)
        router.push('/dashboard/overview');
      }
      setLoading(false);
      return;
    }

    router.push('/dashboard/overview');
  };

  const handleMfaChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { supabase } = getSupabase();

    const challenge = await supabase.auth.mfa.challenge({ factorId });
    if (challenge.error) {
      setError(challenge.error.message);
      setLoading(false);
      return;
    }

    const verify = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.data.id,
      code: mfaCode,
    });

    if (verify.error) {
      setError(verify.error.message);
      setLoading(false);
      return;
    }

    router.push('/dashboard/overview');
  };

  return (
    <div className="flex min-h-[100dvh] w-full items-center justify-center bg-white dark:bg-[#141618] text-asas-charcoal dark:text-asas-sand px-4 py-12 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-asas-sand dark:from-black/10 to-transparent pointer-events-none z-0"></div>
      <div className="w-full max-w-md p-6 sm:p-8 border border-asas-silver/20 bg-white dark:bg-[#141618] rounded-sm shadow-sm z-10 relative">
        <div className="flex items-center justify-center mb-8">
          <div className="w-12 h-12 rounded-sm bg-asas-navy border border-asas-silver/20 flex items-center justify-center shadow-sm">
            <Building2 className="w-6 h-6 text-asas-gold" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-center mb-2 font-display uppercase tracking-widest text-asas-charcoal dark:text-asas-sand">ASAS OS</h2>
        <p className="text-asas-charcoal/80 dark:text-asas-silver text-center text-[10px] uppercase font-bold tracking-widest mb-8">{showMfa ? 'Vérification en deux étapes' : 'Connectez-vous à votre compte'}</p>

        {error && (
          <div className="bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] text-[10px] uppercase font-bold tracking-widest p-4 rounded-sm mb-6">
            {error}
          </div>
        )}

        {!showMfa ? (
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="block text-[10px] font-bold text-asas-silver tracking-widest uppercase mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-asas-sand/50 dark:bg-black/10 border border-asas-silver/20 rounded-sm px-4 py-3 text-asas-charcoal dark:text-asas-sand focus:outline-none focus:border-asas-gold transition-all text-sm font-bold"
                placeholder="admin@asas.com"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-asas-silver tracking-widest uppercase mb-1.5">Mot de passe</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-asas-sand/50 dark:bg-black/10 border border-asas-silver/20 rounded-sm px-4 py-3 text-asas-charcoal dark:text-asas-sand focus:outline-none focus:border-asas-gold transition-all text-sm font-bold"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-asas-navy border border-asas-silver/20 hover:bg-asas-charcoal dark:hover:bg-black text-asas-sand font-bold text-[10px] uppercase tracking-widest py-3.5 rounded-sm transition-all mt-4 disabled:opacity-50 relative group flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              {loading ? 'Connexion...' : 'Connexion'}
              {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" strokeWidth={2} />}
            </button>
          </form>
        ) : (
          <form onSubmit={handleMfaChallenge} className="flex flex-col gap-4">
            <div className="flex items-center justify-center p-4 bg-asas-sand/50 dark:bg-black/10 border border-asas-silver/20 rounded-sm mb-2">
              <ShieldCheck className="w-8 h-8 text-asas-gold" strokeWidth={1.5} />
            </div>
            <p className="text-[10px] text-center text-asas-charcoal/80 dark:text-asas-silver uppercase tracking-widest font-bold mb-2">
              Ouvrez votre application d'authentification et saisissez le code à 6 chiffres.
            </p>
            <div>
              <label className="block text-[10px] font-bold text-center text-asas-silver tracking-widest uppercase mb-1.5">Code d'authentification</label>
              <input
                type="text"
                required
                maxLength={6}
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full bg-asas-sand/50 dark:bg-black/10 border border-asas-silver/20 rounded-sm px-4 py-4 text-asas-charcoal dark:text-asas-sand focus:outline-none focus:border-asas-gold transition-all font-mono text-center text-2xl tracking-[0.5em] font-bold"
                placeholder="000000"
                autoComplete="one-time-code"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={loading || mfaCode.length !== 6}
              className="w-full bg-asas-navy border border-asas-silver/20 hover:bg-asas-charcoal dark:hover:bg-black text-asas-sand font-bold text-[10px] uppercase tracking-widest py-3.5 rounded-sm transition-all mt-4 disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              {loading ? 'Vérification...' : 'Valider le code'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
