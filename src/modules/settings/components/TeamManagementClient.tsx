'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Users, Shield, ShieldAlert, ShieldCheck, Mail, ArrowLeft, CheckCircle2, UserX } from 'lucide-react'
import Link from 'next/link'
import { clsx } from 'clsx'

type Profile = {
  id: string
  full_name: string
  email: string
  role: 'owner' | 'manager' | 'agent'
  status: 'active' | 'suspended'
  last_active: string | null
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Administrateur',
  manager: 'Manager',
  agent: 'Agent Commercial',
}

const ROLE_ICONS: Record<string, React.ReactNode> = {
  owner: <ShieldAlert className="w-4 h-4 text-purple-500" />,
  manager: <ShieldCheck className="w-4 h-4 text-asas-navy dark:text-asas-sand" />,
  agent: <Shield className="w-4 h-4 text-asas-silver" />
}

export function TeamManagementClient({ initialProfiles, currentUserRole }: { initialProfiles: Profile[], currentUserRole: string }) {
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles)
  const [processing, setProcessing] = useState<string | null>(null)

  const handleRoleChange = async (profileId: string, newRole: string) => {
    setProcessing(profileId)
    try {
      const res = await fetch(`/api/settings/team/${profileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'change_role', role: newRole })
      })
      if (!res.ok) throw new Error('Role update failed')
      setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, role: newRole as any } : p))
    } catch (e) {
      console.error(e)
      alert("Erreur lors de la modification du rôle.")
    } finally {
      setProcessing(null)
    }
  }

  const handleStatusChange = async (profileId: string, newStatus: string) => {
    setProcessing(profileId)
    try {
      const res = await fetch(`/api/settings/team/${profileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'change_status', status: newStatus })
      })
      if (!res.ok) throw new Error('Status update failed')
      setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, status: newStatus as any } : p))
    } catch (e) {
      console.error(e)
      alert("Erreur lors de la suspension.")
    } finally {
      setProcessing(null)
    }
  }

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto space-y-8 font-sans text-asas-charcoal dark:text-asas-sand">
      <div className="flex items-center gap-4 mb-4 shrink-0">
        <Link href="/dashboard/settings" className="p-2 bg-white dark:bg-[#141618] border border-asas-silver/20 rounded-sm hover:bg-asas-sand/50 dark:hover:bg-black/10 transition-colors shadow-sm">
          <ArrowLeft className="w-5 h-5 text-asas-silver" />
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-asas-charcoal dark:text-asas-sand tracking-tight flex items-center gap-3 font-display uppercase">
            <div className="w-10 h-10 rounded-sm bg-asas-navy/10 border border-asas-navy/20 flex items-center justify-center">
              <Users className="h-5 w-5 text-asas-navy dark:text-asas-sand" />
            </div>
            Gestion des Accès (RBAC)
          </h1>
          <p className="text-[9px] font-bold text-asas-silver uppercase tracking-widest mt-2">Contrôle des rôles et autorisations d'équipe</p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#141618] border border-asas-silver/20 rounded-sm overflow-hidden shadow-sm">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[600px]">
             <thead className="bg-asas-sand/50 dark:bg-black/10 border-b border-asas-silver/20">
                <tr>
                   <th className="px-6 py-4 text-[9px] uppercase font-bold tracking-widest text-asas-silver">Utilisateur</th>
                   <th className="px-6 py-4 text-[9px] uppercase font-bold tracking-widest text-asas-silver">Contact</th>
                   <th className="px-6 py-4 text-[9px] uppercase font-bold tracking-widest text-asas-silver">Rôle RBAC</th>
                   <th className="px-6 py-4 text-[9px] uppercase font-bold tracking-widest text-asas-silver">Statut</th>
                   <th className="px-6 py-4 text-[9px] uppercase font-bold tracking-widest text-asas-silver text-right">Actions</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-asas-silver/10">
                <AnimatePresence>
                   {profiles.map((p) => {
                     const isProcessing = processing === p.id;
                     return (
                        <motion.tr 
                          key={p.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className={clsx(
                             "group transition-colors",
                             isProcessing ? "opacity-50 pointer-events-none" : "hover:bg-asas-sand/30 dark:hover:bg-white/5"
                          )}
                        >
                           <td className="px-6 py-5">
                              <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 rounded-sm bg-asas-sand/50 dark:bg-black/10 border border-asas-silver/20 flex items-center justify-center text-asas-charcoal dark:text-asas-sand font-bold font-mono">
                                    {p.full_name.charAt(0).toUpperCase() || 'U'}
                                 </div>
                                 <span className="text-[10px] uppercase tracking-widest font-bold text-asas-charcoal dark:text-asas-sand">{p.full_name}</span>
                              </div>
                           </td>
                           <td className="px-6 py-5">
                              <div className="flex items-center gap-2 text-[10px] font-bold text-asas-silver">
                                 <Mail className="w-3 h-3" /> {p.email}
                              </div>
                           </td>
                           <td className="px-6 py-5">
                              <div className="flex items-center gap-2">
                                {ROLE_ICONS[p.role]}
                                <select 
                                   disabled={currentUserRole !== 'owner' || p.role === 'owner'}
                                   value={p.role}
                                   onChange={(e) => handleRoleChange(p.id, e.target.value)}
                                   className="bg-transparent text-[10px] uppercase font-bold tracking-widest text-asas-charcoal dark:text-asas-sand outline-none cursor-pointer appearance-none disabled:opacity-50"
                                >
                                   <option value="owner" disabled>Administrateur</option>
                                   <option value="manager">Manager</option>
                                   <option value="agent">Agent Commercial</option>
                                </select>
                              </div>
                           </td>
                           <td className="px-6 py-5">
                              {p.status === 'active' ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[9px] font-bold uppercase tracking-widest bg-asas-emerald/10 text-asas-emerald border border-asas-emerald/20">
                                  <CheckCircle2 className="w-3 h-3" /> Actif
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[9px] font-bold uppercase tracking-widest bg-red-500/10 text-red-500 border border-red-500/20">
                                  <UserX className="w-3 h-3" /> Suspendu
                                </span>
                              )}
                           </td>
                           <td className="px-6 py-5 text-right">
                              {currentUserRole === 'owner' && p.role !== 'owner' && (
                                 <button
                                   onClick={() => handleStatusChange(p.id, p.status === 'active' ? 'suspended' : 'active')}
                                   className={clsx(
                                      "text-[9px] font-bold transition-colors px-3 py-1.5 rounded-sm uppercase tracking-widest cursor-pointer",
                                      p.status === 'active' ? "text-red-500 hover:bg-red-500/10" : "text-asas-emerald hover:bg-asas-emerald/10"
                                   )}
                                 >
                                   {p.status === 'active' ? 'Suspendre' : 'Réactiver'}
                                 </button>
                              )}
                           </td>
                        </motion.tr>
                     )
                   })}
                </AnimatePresence>
             </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
