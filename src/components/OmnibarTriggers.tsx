'use client';

import { Search } from 'lucide-react';

export function DesktopOmnibarTrigger() {
  return (
    <button 
      onClick={() => {
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('asas-omnibar-open'))
      }}
      className="hidden sm:flex items-center px-4 py-2 bg-white dark:bg-black/20 hover:bg-white dark:hover:bg-black/30 border border-asas-silver/40 dark:border-asas-silver/20 hover:border-asas-gold dark:hover:border-asas-gold rounded-sm w-full text-left transition-all group"
    >
      <Search className="w-4 h-4 text-asas-silver mr-3 group-hover:text-asas-gold transition-colors shrink-0" strokeWidth={1.5} />
      <span className="bg-transparent border-none outline-none text-sm w-full text-asas-charcoal/60 dark:text-asas-silver font-medium overflow-hidden whitespace-nowrap overflow-ellipsis">
         Rechercher / بحث (Ctrl+K)...
      </span>
      <div className="hidden lg:flex items-center gap-1 shrink-0 ml-2">
        <kbd className="px-1.5 py-0.5 text-[10px] font-bold text-asas-silver bg-asas-sand dark:bg-black border border-asas-silver/20 rounded-sm shadow-sm">⌘</kbd>
        <kbd className="px-1.5 py-0.5 text-[10px] font-bold text-asas-silver bg-asas-sand dark:bg-black border border-asas-silver/20 rounded-sm shadow-sm">K</kbd>
      </div>
    </button>
  );
}

export function MobileOmnibarTrigger() {
  return (
    <button 
      onClick={() => {
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('asas-omnibar-open'))
      }}
      className="sm:hidden p-2 text-asas-silver hover:text-asas-charcoal dark:hover:text-asas-sand transition-all"
    >
      <Search className="w-5 h-5" strokeWidth={1.5} />
    </button>
  );
}
