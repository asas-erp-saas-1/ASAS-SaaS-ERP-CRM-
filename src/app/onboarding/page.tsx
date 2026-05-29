'use client';
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { Building2, Rocket, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

export default function OnboardingPage() {
  const [agencyName, setAgencyName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  
  const router = useRouter();

  const getSupabase = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
    return { supabase: createBrowserClient(supabaseUrl, supabaseKey), isMock: supabaseUrl === 'https://placeholder.supabase.co' };
  };

  useEffect(() => {
    const checkStatus = async () => {
      const { supabase, isMock } = getSupabase();
      if (isMock) {
        setChecking(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Check if user already has an agency
      const { data: profile } = await supabase
        .from('profiles')
        .select('agency_id')
        .eq('id', user.id)
        .single();
        
      if (profile?.agency_id) {
         router.push('/dashboard/overview');
      } else {
         setChecking(false);
      }
    };
    
    checkStatus();
  }, [router]);

  const handleOnboarding = async (e: React.FormEvent) => {
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

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // We should call a secure RPC to create the agency and link the profile
      const { data, error: rpcError } = await supabase.rpc('create_agency_and_link_owner', {
        _agency_name: agencyName,
        _agency_phone: phone,
        _user_id: user.id
      });

      if (rpcError) {
        // Fallback: doing it directly if RPC doesn't exist yet (though it should be protected by RLS)
        // Actually, let's just do it directly with the service role key internally, or an RPC. 
        // We will do a direct insert, assuming RLS allows insertion into agencies for authenticated users.
        const { data: newAgency, error: createError } = await supabase
          .from('agencies')
          .insert({ name: agencyName, phone: phone })
          .select('id')
          .single();
          
        if (createError) throw new Error("Impossible de créer l'agence. " + createError.message);
        
        const { error: linkError } = await supabase
          .from('profiles')
          .update({ agency_id: newAgency.id, role: 'owner' })
          .eq('id', user.id);
          
        if (linkError) throw new Error("Impossible de lier votre profil.");
      }

      // Force session refresh for RLS policies checking profiles.agency_id
      await supabase.auth.refreshSession();
      router.push('/dashboard/overview');
      
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  if (checking) {
     return <div className="min-h-screen bg-[#141618] flex items-center justify-center text-asas-sand text-[10px] uppercase font-bold tracking-widest">Vérification...</div>
  }

  return (
    <div className="flex min-h-[100dvh] w-full items-center justify-center bg-white dark:bg-[#141618] text-asas-charcoal dark:text-asas-sand px-4 py-12 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-asas-sand dark:from-black/10 to-transparent pointer-events-none z-0"></div>
      
      <motion.div 
         initial={{ opacity: 0, y: 20 }}
         animate={{ opacity: 1, y: 0 }}
         className="w-full max-w-lg p-6 sm:p-10 border border-asas-silver/20 bg-white dark:bg-[#141618] rounded-sm shadow-sm z-10 relative"
      >
        <div className="flex items-center justify-center mb-8">
          <div className="w-16 h-16 rounded-sm bg-asas-navy border border-asas-silver/20 flex items-center justify-center shadow-sm">
            <Rocket className="w-8 h-8 text-asas-gold" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-center mb-3 font-display uppercase tracking-widest text-asas-charcoal dark:text-asas-sand">Création du Workspace</h2>
        <p className="text-asas-charcoal/80 dark:text-asas-silver text-center text-[10px] uppercase font-bold tracking-widest mb-10 pb-6 border-b border-asas-silver/20">
           Configurez votre agence pour commencer à utiliser ASAS ERP.
        </p>

        {error && (
          <div className="bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] text-[10px] uppercase font-bold tracking-widest p-4 rounded-sm mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleOnboarding} className="flex flex-col gap-6">
          <div>
            <label className="block text-[10px] font-bold text-asas-silver uppercase tracking-widest mb-2">Nom de l'Agence / Promotion</label>
            <input
              type="text"
              required
              value={agencyName}
              onChange={(e) => setAgencyName(e.target.value)}
              className="w-full bg-asas-sand/50 dark:bg-black/10 border border-asas-silver/20 rounded-sm px-4 py-3.5 text-asas-charcoal dark:text-asas-sand focus:outline-none focus:border-asas-gold transition-all font-bold text-lg"
              placeholder="Ex: ASAS Immobilier"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-asas-silver uppercase tracking-widest mb-2">Téléphone Principal</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-asas-sand/50 dark:bg-white/5 border border-asas-silver/20 rounded-sm px-4 py-3.5 text-asas-charcoal dark:text-asas-sand focus:outline-none focus:border-asas-gold transition-all font-bold text-lg cursor-pointer"
              placeholder="+213 550 00 00 00"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-asas-navy border border-asas-silver/20 hover:bg-asas-charcoal dark:hover:bg-black text-asas-sand font-bold text-[10px] uppercase tracking-widest py-4 rounded-sm transition-all mt-6 disabled:opacity-50 relative group flex items-center justify-center gap-2 shadow-sm cursor-pointer"
          >
            {loading ? 'Configuration en cours...' : 'Terminer l\'installation'}
            {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" strokeWidth={2} />}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
