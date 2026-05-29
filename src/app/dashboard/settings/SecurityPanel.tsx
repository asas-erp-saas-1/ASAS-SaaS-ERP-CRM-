'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { ShieldCheck, Loader2, QrCode, Smartphone, X, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { clsx } from 'clsx';
// Use something like qrcode.react for rendering the QR code?
// I can just output an img tag with the SVG we get from Supabase! Supabase provides the `totp.qr_code` as an SVG string.

export function SecurityPanel() {
  const [loading, setLoading] = useState(true);
  const [factors, setFactors] = useState<any[]>([]);
  const [enrolling, setEnrolling] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
  const supabase = createBrowserClient(supabaseUrl, supabaseKey);

  useEffect(() => {
    loadFactors();
  }, []);

  const loadFactors = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) {
      setError(error.message);
    } else if (data) {
      setFactors(data.totp || []);
    }
    setLoading(false);
  };

  const handleEnrollTOTP = async () => {
    setEnrolling(true);
    setError(null);
    setSuccessMsg(null);

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      issuer: 'ASAS OS',
    });

    if (error) {
      setError(error.message);
      setEnrolling(false);
      return;
    }

    setFactorId(data.id);
    setQrCode(data.totp.qr_code);
    setEnrolling(false);
  };

  const handleVerifyEnrollment = async () => {
    if (!factorId) return;
    setEnrolling(true);
    setError(null);

    const challenge = await supabase.auth.mfa.challenge({ factorId });
    if (challenge.error) {
      setError(challenge.error.message);
      setEnrolling(false);
      return;
    }

    const verify = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.data.id,
      code: verifyCode,
    });

    if (verify.error) {
      setError(verify.error.message);
      setEnrolling(false);
      return;
    }

    setSuccessMsg("L'authentification à deux facteurs a été activée avec succès !");
    setFactorId(null);
    setQrCode(null);
    setVerifyCode('');
    loadFactors();
    setEnrolling(false);
  };

  const handleUnenroll = async (id: string) => {
    setLoading(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId: id });
    if (error) {
      setError(error.message);
    } else {
      setSuccessMsg("Le facteur a été désactivé.");
      loadFactors();
    }
    setLoading(false);
  };

  return (
    <div className="bg-white dark:bg-[#141618] rounded-sm border border-asas-silver/20 p-8 shadow-sm relative overflow-hidden group hover:border-asas-gold/40 transition-colors">
      <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
        <ShieldCheck className="w-24 h-24 text-asas-navy dark:text-asas-sand" />
      </div>
      <div className="flex items-center gap-4 mb-8 relative z-10">
        <div className="w-12 h-12 rounded-sm bg-asas-navy/10 border border-asas-navy/20 text-asas-navy dark:text-asas-sand flex items-center justify-center">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <h2 className="text-sm font-bold text-asas-charcoal dark:text-asas-sand uppercase tracking-widest font-display">Sécurité du Compte (2FA)</h2>
      </div>

      <div className="space-y-6 relative z-10">
        <p className="text-[10px] text-asas-charcoal dark:text-asas-sand font-bold">
          Protégez votre compte avec l'authentification à deux facteurs (TOTP/SMS). À chaque connexion, un code de sécurité sera exigé.
        </p>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-sm text-[9px] uppercase tracking-widest font-bold flex items-start gap-3">
            <X className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}
        
        {successMsg && (
          <div className="p-4 bg-asas-emerald/10 border border-asas-emerald/20 text-asas-emerald rounded-sm text-[9px] uppercase tracking-widest font-bold flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> {successMsg}
          </div>
        )}

        {loading && !factors.length ? (
          <div className="flex items-center gap-3 text-asas-silver text-[9px] uppercase tracking-widest font-bold">
            <Loader2 className="w-4 h-4 animate-spin" /> Chargement...
          </div>
        ) : (
          <div className="space-y-4">
            {factors.length > 0 ? (
              <div className="space-y-3">
                {factors.map(f => (
                  <div key={f.id} className="flex items-center justify-between p-4 border border-asas-silver/20 bg-asas-sand/50 dark:bg-black/10 rounded-sm shadow-sm">
                    <div className="flex items-center gap-3">
                      {f.factor_type === 'totp' ? <QrCode className="w-4 h-4 text-asas-silver" /> : <Smartphone className="w-4 h-4 text-asas-silver" />}
                      <div>
                        <p className="text-[10px] font-bold text-asas-charcoal dark:text-asas-sand uppercase tracking-widest">App Authenticator</p>
                        <p className="text-[9px] text-asas-silver tracking-widest uppercase font-mono">ID: {f.id.split('-')[0]}...</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleUnenroll(f.id)}
                      disabled={loading}
                      className="px-4 py-2 text-[9px] font-bold text-red-500 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 rounded-sm transition-colors uppercase tracking-widest cursor-pointer"
                    >
                      Désactiver
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[9px] uppercase font-bold tracking-widest text-orange-500 bg-orange-500/10 border border-orange-500/20 p-2.5 rounded-sm inline-block">
                ⚠️ 2FA Non Configuré
              </p>
            )}

            {!qrCode && (
              <button 
                onClick={handleEnrollTOTP}
                disabled={enrolling}
                className="mt-4 flex items-center gap-2 px-5 py-3 bg-asas-charcoal dark:bg-asas-sand text-asas-sand dark:text-asas-charcoal font-bold text-[9px] uppercase tracking-widest rounded-sm shadow-sm hover:translate-y-[-1px] transition-all w-full sm:w-auto justify-center cursor-pointer"
              >
                {enrolling ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                Ajouter une App d'Authentification
              </button>
            )}

            {qrCode && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="mt-6 p-6 border border-asas-silver/20 bg-white dark:bg-[#141618] rounded-sm flex flex-col md:flex-row gap-6 items-start"
              >
                <div className="shrink-0 bg-white p-4 rounded-sm shadow-sm border border-asas-silver/20" dangerouslySetInnerHTML={{ __html: qrCode }} />
                <div className="flex-1 w-full space-y-4">
                  <h3 className="font-bold text-asas-charcoal dark:text-asas-sand uppercase tracking-widest text-[10px]">Scanner le QR Code</h3>
                  <p className="text-[10px] text-asas-silver">
                    Ouvrez votre application d'authentification (Google Authenticator, Authy, etc.) et scannez ce QR code.
                  </p>
                  <div>
                    <input 
                      type="text"
                      value={verifyCode}
                      onChange={(e) => setVerifyCode(e.target.value.replace(/[^0-9]/g, ''))}
                      maxLength={6}
                      placeholder="000 000"
                      className="w-full max-w-[200px] text-center font-mono text-xl tracking-[0.3em] font-bold px-4 py-3 bg-white dark:bg-[#141618] border border-asas-silver/20 rounded-sm focus:outline-none focus:border-asas-gold text-asas-charcoal dark:text-asas-sand"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={handleVerifyEnrollment}
                      disabled={enrolling || verifyCode.length !== 6}
                      className="flex-1 sm:flex-none justify-center flex items-center gap-2 px-5 py-3 bg-asas-charcoal dark:bg-asas-sand text-asas-sand dark:text-asas-charcoal font-bold text-[9px] uppercase tracking-widest rounded-sm shadow-sm transition-all disabled:opacity-50 hover:opacity-90 cursor-pointer"
                    >
                      {enrolling ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Valider
                    </button>
                    <button 
                      onClick={() => { setQrCode(null); setFactorId(null); setVerifyCode(''); setError(null); }}
                      disabled={enrolling}
                      className="flex-1 sm:flex-none justify-center px-5 py-3 bg-white dark:bg-[#141618] border border-asas-silver/20 hover:bg-asas-sand/50 dark:hover:bg-black/10 text-asas-charcoal dark:text-asas-sand font-bold text-[9px] uppercase tracking-widest rounded-sm transition-all cursor-pointer"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
