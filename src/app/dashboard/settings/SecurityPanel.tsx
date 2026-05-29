'use client';

import { ShieldCheck, QrCode } from 'lucide-react';

export function SecurityPanel() {
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

          <div className="space-y-4">
              <p className="text-[9px] uppercase font-bold tracking-widest text-orange-500 bg-orange-500/10 border border-orange-500/20 p-2.5 rounded-sm inline-block">
                ⚠️ 2FA Migration en cours
              </p>

              <button 
                disabled={true}
                className="mt-4 flex items-center gap-2 px-5 py-3 bg-asas-charcoal dark:bg-asas-sand text-asas-sand dark:text-asas-charcoal font-bold text-[9px] uppercase tracking-widest rounded-sm shadow-sm hover:translate-y-[-1px] transition-all w-full sm:w-auto justify-center cursor-not-allowed opacity-50"
              >
                <QrCode className="w-4 h-4" />
                Ajouter une App d'Authentification (Bientôt disponible)
              </button>
          </div>
      </div>
    </div>
  );
}
