'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body className="bg-[#141618] text-[#F4F1EA] flex flex-col items-center justify-center min-h-screen p-4 font-sans text-center selection:bg-[#C5A880]/30 selection:text-[#141618]">
        <div className="max-w-md p-8 bg-[#1B1D20] border border-[#C5A880]/20 rounded-sm shadow-2xl">
          <div className="w-12 h-12 rounded-sm bg-red-500/10 flex items-center justify-center mx-auto mb-6 border border-red-500/20">
            <span className="text-red-500 font-mono text-xl">!</span>
          </div>
          <h2 className="text-lg font-bold uppercase tracking-widest mb-4">ASAS RE-OS — Erreur Critique</h2>
          <p className="text-[13px] text-[#A1A5AC] mb-6 leading-relaxed">
            L'environnement d'exécution a rencontré une anomalie système irrécupérable.
          </p>
          {error?.message && (
            <pre className="text-[10px] font-mono text-red-400 bg-black/40 p-3 rounded-sm mb-6 overflow-auto max-h-32 text-left border border-white/5">
              {error.message}
            </pre>
          )}
          <div className="flex flex-col gap-3">
            <button
              onClick={() => reset()}
              className="px-6 py-2.5 bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20 text-xs font-bold uppercase tracking-widest rounded-sm transition-colors"
            >
              Tentative de réinitialisation
            </button>
            <a
              href="/login"
              className="px-6 py-2.5 bg-[#C5A880] hover:bg-[#B4956D] text-[#141618] text-xs font-bold uppercase tracking-widest rounded-sm transition-colors"
            >
              Retour à l'authentification
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
