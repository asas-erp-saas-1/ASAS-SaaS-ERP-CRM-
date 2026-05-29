// src/app/dashboard/layout.tsx
import { redirect } from 'next/navigation'
import { LayoutGrid, Users, Handshake, Building2, DollarSign, CheckSquare, BarChart2, Settings, LogOut, Bell, Search, Menu, UserSquare2, Calendar as CalendarIcon, Zap, Award, Bot } from 'lucide-react';
import Link from 'next/link'
import { kernel } from '@/lib/kernel/core'
import { NextMobileMenu } from '@/components/MobileMenu'
import { ThemeToggle } from '@/components/ThemeToggle'
import { CommandPalette } from '@/components/CommandPalette'
import { DesktopOmnibarTrigger, MobileOmnibarTrigger } from '@/components/OmnibarTriggers'

const NAV_GROUPS = [
  {
    group: "Command Center",
    items: [
      { href: '/dashboard/overview',   label: 'Hub Opérationnel',   Icon: LayoutGrid },
      { href: '/dashboard/tasks',      label: 'Tâches & Actions',   Icon: CheckSquare },
      { href: '/dashboard/calendar',   label: 'Agenda',             Icon: CalendarIcon },
    ]
  },
  {
    group: "Commercial & CRM",
    items: [
      { href: '/dashboard/leads',      label: 'Pipeline Prospection',Icon: Users },
      { href: '/dashboard/deals',      label: 'Dossiers Vente',      Icon: Handshake },
      { href: '/dashboard/clients',    label: 'Base Profils',       Icon: UserSquare2 },
    ]
  },
  {
    group: "Construction & Projets",
    items: [
      { href: '/dashboard/projects',   label: 'Projets',            Icon: Building2 },
      { href: '/dashboard/properties', label: 'Unités (Biens)',     Icon: Building2 },
      { href: '/dashboard/sav',        label: 'Livraison & SAV',    Icon: CheckSquare },
    ]
  },
  {
    group: "Finance & Comptabilité",
    items: [
      { href: '/dashboard/finance',    label: 'Trésorerie & Encaissements', Icon: DollarSign },
      { href: '/dashboard/agents',     label: 'RH & Commerciaux',  Icon: Users },
    ],
    roles: ['owner', 'admin', 'finance']
  },
  {
    group: "Gouvernance & Paramètres",
    items: [
      { href: '/dashboard/intelligence', label: 'Dashboard Décisionnel', Icon: Award },
      { href: '/dashboard/orchestration', label: 'Automatismes', Icon: Zap },
      { href: '/dashboard/settings',   label: 'Structure & Organisation',         Icon: Settings },
    ],
    roles: ['owner', 'admin']
  }
]

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let profile = {
    full_name: 'Unknown User',
    role: 'agent',
    avatar_url: null,
  };
  let identity;
  let shouldRedirectTo: string | null = null;
  let unhandledError = null;

  try {
    try {
      identity = await kernel.identity();
      const profiles = await kernel.query<any>('profiles', {
        filters: { id: identity.userId, agency_id: identity.tenantId }
      });
      if (profiles && profiles.length > 0) {
        profile = {
          ...profiles[0],
          role: identity.role
        };
      }
    } catch (error: any) {
      const errorMsg = error?.message || '';
      console.error('Failed to resolve identity in layout:', errorMsg);
      if (errorMsg.includes('Tenant isolation failure')) {
        shouldRedirectTo = '/onboarding';
      } else {
        shouldRedirectTo = '/login';
      }
    }

    if (shouldRedirectTo) {
      redirect(shouldRedirectTo);
    }

    if (!identity) {
      return null;
    }

    const roleDisplay = profile.role === 'owner' ? 'CEO / Admin' : profile.role;
    const initial = profile.full_name ? profile.full_name.charAt(0).toUpperCase() : 'U';

    const role = profile.role || 'agent';

    return (
      <div className="flex bg-asas-sand dark:bg-asas-charcoal h-[100dvh] overflow-hidden selection:bg-asas-gold/30 selection:text-asas-charcoal dark:text-asas-sand font-sans text-asas-charcoal dark:text-asas-sand">
        <NextMobileMenu profile={profile} initial={initial} roleDisplay={roleDisplay} />
        {/* Sidebar - Desktop */}
        <aside className="w-[280px] bg-asas-charcoal border-r border-asas-silver/20 flex-col shrink-0 hidden md:flex z-10 relative group">
          <div className="absolute inset-y-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-asas-gold/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
          
          {/* Decorative Gold Pattern Overlay (very subtle) */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-5 mix-blend-overlay z-0"
            style={{ 
              backgroundImage: 'radial-gradient(circle at center, #C7A15A 1px, transparent 1px)', 
              backgroundSize: '20px 20px' 
            }} 
          />

          <div className="px-6 py-8 flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-asas-gold" strokeWidth={1.5} />
              </div>
              <div>
                <p className="font-bold text-asas-sand tracking-widest leading-tight text-xl font-display uppercase">ASAS<span className="text-asas-silver mx-2 font-sans font-light">|</span>أساس</p>
                <p className="text-[9px] uppercase font-bold tracking-[0.2em] text-asas-gold/80 leading-tight mt-0.5">Real Estate ERP</p>
              </div>
            </div>
          </div>

          <div className="px-4 py-4 flex-1 overflow-y-auto custom-scrollbar relative z-10 space-y-6">
            {NAV_GROUPS.map((navGroup) => {
               if (navGroup.roles && !navGroup.roles.includes(role)) return null;
               return (
                 <div key={navGroup.group}>
                   <p className="text-[10px] font-bold text-asas-silver/60 uppercase tracking-widest mb-2 px-3">{navGroup.group}</p>
                   <nav className="flex flex-col gap-1">
                     {navGroup.items.map(({ href, label, Icon }) => (
                       <Link key={href} href={href}
                         className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-asas-sand/70 rounded-sm hover:bg-white/5 hover:text-asas-sand transition-all group relative">
                         <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-0 bg-asas-gold transition-all group-hover:h-1/2 opacity-0 group-hover:opacity-100"></div>
                         <Icon className="h-4 w-4 text-asas-silver group-hover:text-asas-gold transition-colors" strokeWidth={1.5} />
                         <span className="group-hover:translate-x-0.5 transition-transform">{label}</span>
                       </Link>
                     ))}
                   </nav>
                 </div>
               )
            })}
          </div>

          <div className="mt-auto px-6 py-6 border-t border-asas-silver/10 shrink-0 relative z-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-sm bg-asas-navy border border-asas-silver/20 flex items-center justify-center text-asas-sand font-bold shrink-0">
                 {initial}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-asas-sand truncate">{(profile as any)?.full_name}</p>
                <p className="text-[11px] text-asas-silver capitalize truncate font-medium">{roleDisplay}</p>
              </div>
            </div>
            
            <form action="/auth/signout" method="post">
              <button type="submit" className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-asas-sand/70 hover:text-white bg-white/5 hover:bg-asas-copper/20 border border-transparent hover:border-asas-copper/30 rounded-sm transition-all">
                <LogOut className="h-4 w-4" strokeWidth={1.5} /> Déconnexion
              </button>
            </form>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-asas-sand dark:bg-[#141618] border-l border-asas-silver/20 shadow-sm">
          {/* Top Header */}
          <header className="h-[72px] bg-white/50 dark:bg-asas-charcoal/80 backdrop-blur-xl border-b border-asas-silver/20 flex items-center justify-between px-6 sm:px-8 shrink-0 z-20 sticky top-0">
            <div className="flex items-center gap-4 w-full max-w-xl">
              <div className="md:hidden flex items-center gap-2">
                <Building2 className="w-5 h-5 text-asas-gold" strokeWidth={1.5} />
                <p className="font-extrabold text-asas-charcoal dark:text-asas-sand tracking-widest uppercase leading-tight text-lg font-display">ASAS</p>
              </div>
              
              <DesktopOmnibarTrigger />
            </div>
            
            <div className="flex items-center gap-2 sm:gap-4">
              <MobileOmnibarTrigger />
              <ThemeToggle />
              <button className="relative p-2 text-asas-silver hover:text-asas-charcoal dark:hover:text-asas-sand transition-all">
                <Bell className="w-5 h-5" strokeWidth={1.5} />
                <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-asas-copper rounded-full border border-white dark:border-asas-charcoal"></span>
              </button>
              <div className="w-px h-6 bg-asas-silver/30 hidden sm:block"></div>
              <div className="hidden sm:flex items-center gap-3 pl-2">
                <div className="flex flex-col items-end">
                  <span className="text-sm font-bold text-asas-charcoal dark:text-asas-sand leading-none">{(profile as any)?.full_name}</span>
                  <span className="text-[11px] text-asas-silver font-medium mt-1">{roleDisplay}</span>
                </div>
                <div className="w-9 h-9 rounded-sm bg-asas-navy border border-asas-silver/20 flex items-center justify-center text-asas-sand font-bold">
                  {initial}
                </div>
              </div>
            </div>
          </header>

          {/* Scrollable Main Area */}
          <main className="flex-1 overflow-y-auto flex flex-col w-full text-asas-charcoal dark:text-asas-sand custom-scrollbar relative pb-28 md:pb-0">
            <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-white/30 dark:from-black/10 to-transparent pointer-events-none -z-10"></div>
            <div className="p-4 sm:p-6 max-w-7xl mx-auto w-full flex-1 flex flex-col pt-8">
              {children}
            </div>
          </main>
        </div>
        <CommandPalette />
      </div>
    )
  } catch (err: any) {
    if (err?.message === 'NEXT_REDIRECT' || err?.digest?.startsWith('NEXT_REDIRECT')) throw err;
    unhandledError = err;
  }

  if (unhandledError) {
    return (
      <div className="p-8 bg-red-900 border border-red-500 rounded text-black m-8">
        <h1 className="text-xl font-bold">Layout Unhandled Crash</h1>
        <pre className="mt-4 p-4 bg-black text-red-500 border border-red-500/50 rounded">{String(unhandledError.message)}</pre>
        <pre className="mt-4 text-xs opacity-50">{String((unhandledError as any)?.stack)}</pre>
      </div>
    );
  }
}
