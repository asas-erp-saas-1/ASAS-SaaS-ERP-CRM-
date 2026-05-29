'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { LayoutGrid, Users, Handshake, Building2, DollarSign, CheckSquare, BarChart2, Settings, LogOut, Menu, X, ChevronRight, Calendar } from 'lucide-react'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'

import { ThemeToggle } from './ThemeToggle'

const NAV_GROUPS = [
  {
    group: "Command Center",
    items: [
      { href: '/dashboard/overview',   label: 'Action Inbox',       Icon: LayoutGrid },
      { href: '/dashboard/tasks',      label: 'Tâches',             Icon: CheckSquare },
      { href: '/dashboard/calendar',   label: 'Agenda',             Icon: Calendar },
    ]
  },
  {
    group: "Commercial & CRM",
    items: [
      { href: '/dashboard/leads',      label: 'Pipeline Leads',     Icon: Users },
      { href: '/dashboard/deals',      label: 'Transactions',       Icon: Handshake },
      { href: '/dashboard/clients',    label: 'Base Clients',       Icon: Users },
    ]
  },
  {
    group: "Chantier & Promotion",
    items: [
      { href: '/dashboard/projects',   label: 'Programmes',         Icon: Building2 },
      { href: '/dashboard/properties', label: 'Biens (Unités)',     Icon: Building2 },
    ]
  },
  {
    group: "Finance & Back-Office",
    items: [
      { href: '/dashboard/finance',    label: 'Finance & Trésorerie', Icon: DollarSign },
      { href: '/dashboard/agents',     label: 'Classement Agents',  Icon: Users },
    ],
    roles: ['owner', 'admin', 'finance']
  },
  {
    group: "Intelligence & Settings",
    items: [
      { href: '/dashboard/metrics',    label: 'Statistiques',       Icon: BarChart2 },
      { href: '/dashboard/settings',   label: 'Paramètres',         Icon: Settings },
    ],
    roles: ['owner', 'admin']
  }
]

export function NextMobileMenu({ profile, initial, roleDisplay }: { profile: any, initial: string, roleDisplay: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setMounted(true)
  }, [])

  const role = profile?.role || 'agent'
  
  // We no longer need filteredNav as we map NAV_GROUPS directly

  // Determine bottom nav based on role
  const BOTTOM_NAV = role === 'agent' ? [
    { href: '/dashboard/overview', label: 'Tâches', Icon: CheckSquare },
    { href: '/dashboard/leads', label: 'Leads', Icon: Users },
    { href: '/dashboard/deals', label: 'Deals', Icon: Handshake },
    { href: '/dashboard/properties', label: 'Biens', Icon: Building2 },
  ] : [
    { href: '/dashboard/overview', label: 'Vue', Icon: LayoutGrid },
    { href: '/dashboard/leads', label: 'Leads', Icon: Users },
    { href: '/dashboard/finance', label: 'Finance', Icon: DollarSign },
    { href: '/dashboard/metrics', label: 'Stats', Icon: BarChart2 },
  ];

  if (!mounted) return null;

  return (
    <>
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-[9000] bg-white dark:bg-[#141618]/95 backdrop-blur-3xl border-t border-asas-silver/20 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_40px_rgba(0,0,0,0.5)] transition-transform duration-300">
        <nav className="flex items-center justify-around px-2 h-[68px]">
          {BOTTOM_NAV.map(({ href, label, Icon }) => {
            const isActive = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  "flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-200 active:scale-95 relative",
                  isActive ? "text-asas-gold" : "text-asas-silver hover:text-asas-charcoal dark:hover:text-asas-sand"
                )}
              >
                {isActive && (
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-asas-gold shadow-[0_0_10px_rgba(199,161,90,0.5)]"></div>
                )}
                <Icon 
                  className="w-[22px] h-[22px] mb-0.5 transition-all duration-200" 
                  strokeWidth={isActive ? 2 : 1.5} 
                />
                <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
              </Link>
            )
          })}
          
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="flex flex-col items-center justify-center w-full h-full space-y-1 text-asas-silver hover:text-asas-charcoal dark:hover:text-asas-sand transition-all duration-200 active:scale-95 relative cursor-pointer"
          >
            {isOpen && (
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-asas-gold shadow-[0_0_10px_rgba(199,161,90,0.5)]"></div>
            )}
            <div className={clsx("flex flex-col items-center space-y-1", isOpen ? "text-asas-gold" : "")}>
              <Menu className="w-[22px] h-[22px] mb-0.5 transition-all duration-200" strokeWidth={isOpen ? 2 : 1.5} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Menu</span>
            </div>
          </button>
        </nav>
      </div>

      {/* Backdrop */}
      <div 
        onClick={() => setIsOpen(false)}
        className={clsx(
          "md:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-[9998] transition-opacity duration-300",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      />

      {/* Sheet */}
      <div
        className={clsx(
          "md:hidden fixed inset-x-0 bottom-0 z-[9999] bg-white/95 dark:bg-[#141618]/95 backdrop-blur-3xl rounded-t-sm border-t border-asas-silver/20 flex flex-col shadow-[0_-20px_50px_rgba(0,0,0,0.7)] overflow-hidden transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
          isOpen ? "translate-y-0" : "translate-y-full"
        )}
        style={{ 
          top: '12%',
          paddingBottom: 'env(safe-area-inset-bottom)' 
        }}
      >
        {/* iOS Sheet Drag Handle Indicator */}
        <div className="w-full flex justify-center pt-4 pb-2 shrink-0">
          <div className="w-12 h-1.5 bg-asas-silver/20 rounded-sm"></div>
        </div>

        <div className="px-6 pb-5 pt-1 flex items-center justify-between border-b border-asas-silver/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-asas-navy border border-asas-silver/20 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-asas-gold" strokeWidth={1.5} />
            </div>
            <div>
              <p className="font-bold text-asas-charcoal dark:text-asas-sand tracking-widest leading-none text-xl font-display uppercase">ASAS<span className="text-asas-silver mx-2 font-sans font-light">|</span>أساس</p>
              <p className="text-[9px] uppercase font-bold tracking-[0.25em] text-asas-gold/90 leading-tight mt-0.5">OS Mobile</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button 
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-2 text-asas-silver hover:text-asas-charcoal dark:hover:text-asas-sand rounded-sm bg-asas-sand/50 dark:bg-black/10 hover:bg-asas-silver/10 transition-colors active:scale-95 cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-6 custom-scrollbar overscroll-contain">
            {NAV_GROUPS.map((navGroup) => {
              if (navGroup.roles && !navGroup.roles.includes(role)) return null;
              return (
                <div key={navGroup.group} className="mb-4">
                  <p className="text-[9px] font-bold text-asas-silver uppercase tracking-widest mb-2 px-2">{navGroup.group}</p>
                  <div className="flex flex-col gap-1">
                    {navGroup.items.map(({ href, label, Icon }) => {
                      const isActive = pathname.startsWith(href)
                      return (
                        <Link 
                          key={href} 
                          href={href}
                          onClick={() => setIsOpen(false)}
                          className={clsx(
                            "flex items-center justify-between px-4 py-3 text-[10px] font-bold tracking-widest uppercase rounded-sm transition-all relative overflow-hidden group active:scale-[0.98]",
                            isActive 
                              ? "text-asas-charcoal dark:text-asas-sand bg-asas-gold/10 border border-asas-gold/20 shadow-[0_0_15px_rgba(199,161,90,0.05)]" 
                              : "text-asas-charcoal/60 dark:text-asas-silver bg-asas-sand/50 dark:bg-white/5 hover:bg-asas-silver/10 hover:text-asas-charcoal dark:hover:text-asas-sand border border-transparent"
                          )}
                        >
                          <div className="flex items-center gap-4 relative z-10">
                            <Icon className={clsx("h-5 w-5 transition-colors", isActive ? "text-asas-gold" : "text-asas-silver group-hover:text-asas-charcoal dark:group-hover:text-asas-sand")} strokeWidth={isActive ? 2 : 1.5} />
                            <span>{label}</span>
                          </div>
                          {isActive && <ChevronRight className="w-5 h-5 text-asas-gold/50" />}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          <div className="h-6"></div> {/* Extra space at bottom of scroll list */}
        </div>

        <div className="border-t border-asas-silver/20 px-6 py-5 bg-transparent shrink-0">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-sm bg-asas-navy border border-asas-silver/20 flex items-center justify-center text-asas-sand font-bold shrink-0 shadow-sm relative">
                {initial}
                <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-asas-emerald rounded-sm border-2 border-white dark:border-[#141618]"></div>
              </div>
              <div className="overflow-hidden">
                <p className="text-[10px] font-bold text-asas-charcoal dark:text-asas-sand uppercase tracking-widest truncate leading-tight">{profile?.full_name}</p>
                <p className="text-[9px] text-asas-silver uppercase tracking-widest truncate font-bold">{roleDisplay}</p>
              </div>
            </div>
          </div>
          
          <form action="/auth/signout" method="post">
            <button type="submit" className="w-full flex items-center justify-center gap-2 px-4 py-3 text-[10px] uppercase font-bold tracking-widest text-[#EF4444] bg-[#EF4444]/10 hover:bg-[#EF4444]/20 border border-[#EF4444]/20 rounded-sm transition-all active:scale-[0.98] cursor-pointer">
              <LogOut className="h-4 w-4" strokeWidth={2} /> Déconnexion
            </button>
          </form>
        </div>
      </div>
    </>
  )
}

