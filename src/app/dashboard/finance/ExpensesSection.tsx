'use client'
import { useState, useEffect } from 'react'
import { PlusCircle, TrendingUp, TrendingDown, Receipt, DollarSign, Activity } from 'lucide-react'
import { clsx } from 'clsx'

function fmt(n: number): string {
  return new Intl.NumberFormat('fr-DZ').format(Math.round(n)) + ' DZD'
}

export function ExpensesSection() {
  const [pnl, setPnl] = useState<any>(null)
  const [expenses, setExpenses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  const loadData = () => {
    setLoading(true)
    Promise.all([
      fetch('/api/ledger?view=pnl').then(r => r.json()),
      fetch('/api/ledger?view=expenses').then(r => r.json())
    ]).then(([p, e]) => {
      setPnl(p)
      setExpenses(e.expenses || [])
      setLoading(false)
    })
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const amount = Number(form.get('amount'))
    const category = form.get('category')
    const description = form.get('description')
    
    if (!amount || !category || !description) return

    await fetch('/api/command-gateway', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commandId: crypto.randomUUID(),
        aggregateId: crypto.randomUUID(),
        type: 'LOG_EXPENSE',
        expectedVersion: 1,
        payload: { amount, category, description }
      })
    })

    setShowModal(false)
    loadData()
  }

  if (loading || !pnl) return <div className="animate-pulse h-64 bg-asas-sand/50 rounded-sm mt-8" />

  return (
    <div className="mt-12">
      <h2 className="text-xl md:text-2xl font-bold text-asas-charcoal dark:text-asas-sand tracking-tight mb-6 font-display uppercase">Compte de Résultat (P&L)</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-[#141618] p-6 rounded-sm border border-asas-silver/20 shadow-sm">
          <p className="text-[9px] uppercase font-bold text-asas-silver tracking-widest mb-1">Chiffre d'Affaires</p>
          <p className="text-2xl md:text-3xl font-bold text-asas-emerald font-mono">{fmt(pnl.revenue)}</p>
          <p className="text-[10px] font-bold text-asas-emerald/80 mt-2">Marge Brute: {Math.round(pnl.grossMargin)}%</p>
        </div>
        <div className="bg-white dark:bg-[#141618] p-6 rounded-sm border border-asas-silver/20 shadow-sm">
          <p className="text-[9px] uppercase font-bold text-asas-silver tracking-widest mb-1">Dépenses (COGS + Charges)</p>
          <p className="text-2xl md:text-3xl font-bold text-red-500 font-mono">{fmt(pnl.cogs + pnl.expenses)}</p>
          <p className="text-[10px] font-bold text-asas-silver mt-2">Commissions: {fmt(pnl.cogs)}</p>
        </div>
        <div className="bg-asas-sand/50 dark:bg-black/10 p-6 rounded-sm border border-asas-gold/40 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-asas-gold/10 rounded-full blur-3xl opacity-50" />
          <p className="text-[9px] uppercase font-bold text-asas-gold tracking-widest mb-1 relative z-10">Résultat Net</p>
          <p className="text-2xl md:text-3xl font-bold text-asas-gold relative z-10 font-mono">{fmt(pnl.netIncome)}</p>
          <p className="text-[10px] font-bold text-asas-gold/80 mt-2 relative z-10">Marge Nette: {Math.round(pnl.netMargin)}%</p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-6">
         <h3 className="text-lg font-bold text-asas-charcoal dark:text-asas-sand flex items-center gap-2 font-display uppercase tracking-widest">
            <Receipt className="w-5 h-5 text-asas-gold" /> Registre des Charges
         </h3>
         <button onClick={() => setShowModal(true)} className="px-5 py-2.5 bg-asas-charcoal text-asas-sand dark:bg-asas-sand dark:text-asas-charcoal hover:bg-black dark:hover:bg-white font-bold text-xs rounded-sm transition-colors flex items-center gap-2 shadow-sm border border-transparent">
            <PlusCircle className="w-4 h-4" /> Nouvelle Dépense
         </button>
      </div>

      <div className="bg-white dark:bg-[#141618] rounded-sm border border-asas-silver/20 shadow-sm overflow-hidden">
         {expenses.length === 0 ? (
           <div className="p-12 text-center text-asas-silver text-sm font-bold uppercase tracking-widest">Aucune dépense enregistrée.</div>
         ) : (
           <table className="w-full text-left text-sm">
             <thead className="bg-asas-sand/30 dark:bg-black/10 text-[9px] uppercase text-asas-silver border-b border-asas-silver/20">
                <tr>
                  <th className="px-6 py-4 font-bold tracking-widest">Date</th>
                  <th className="px-6 py-4 font-bold tracking-widest">Catégorie</th>
                  <th className="px-6 py-4 font-bold tracking-widest">Description</th>
                  <th className="px-6 py-4 font-bold tracking-widest text-right">Montant</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-asas-silver/10">
                {expenses.map((exp: any) => (
                   <tr key={exp.id} className="hover:bg-asas-sand/50 dark:hover:bg-black/10 transition-colors">
                      <td className="px-6 py-4 font-medium text-asas-charcoal dark:text-asas-sand">{new Date(exp.expense_date).toLocaleDateString()}</td>
                      <td className="px-6 py-4"><span className="px-2.5 py-1 rounded-sm text-[9px] font-bold uppercase tracking-widest bg-asas-sand/80 dark:bg-white/5 text-asas-silver border border-asas-silver/20">{exp.category}</span></td>
                      <td className="px-6 py-4 text-asas-silver">{exp.description}</td>
                      <td className="px-6 py-4 text-right font-bold text-asas-charcoal dark:text-asas-sand font-mono">{fmt(exp.amount)}</td>
                   </tr>
                ))}
             </tbody>
           </table>
         )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="bg-white dark:bg-[#141618] w-full max-w-md rounded-sm shadow-sm overflow-hidden border border-asas-silver/20">
            <div className="p-6 border-b border-asas-silver/20 bg-asas-sand/30 dark:bg-black/10">
               <h3 className="text-xl font-bold text-asas-charcoal dark:text-asas-sand font-display uppercase tracking-widest">Déclarer une Dépense</h3>
               <p className="text-[9px] text-asas-silver mt-1 uppercase tracking-widest font-bold">Imputation sur le P&L</p>
            </div>
            <div className="p-6 space-y-5">
               <div>
                 <label className="block text-[9px] uppercase tracking-widest font-bold text-asas-silver mb-2">Montant (DZD)</label>
                 <input name="amount" type="number" required placeholder="Ex: 50000" className="w-full bg-transparent border border-asas-silver/40 rounded-sm px-4 py-2.5 text-sm text-asas-charcoal dark:text-asas-sand font-mono focus:outline-none focus:border-asas-gold transition-colors" />
               </div>
               <div>
                 <label className="block text-[9px] uppercase tracking-widest font-bold text-asas-silver mb-2">Catégorie</label>
                 <select name="category" required className="w-full bg-white dark:bg-[#141618] border border-asas-silver/40 rounded-sm px-4 py-2.5 text-sm text-asas-charcoal dark:text-asas-sand font-bold focus:outline-none focus:border-asas-gold transition-colors">
                    <option value="marketing">Marketing & Acquisition</option>
                    <option value="salaries">Salaires & Charges</option>
                    <option value="rent">Loyer & Locaux</option>
                    <option value="software">Logiciels & IT</option>
                    <option value="travel">Déplacements</option>
                    <option value="equipment">Équipement</option>
                    <option value="utilities">Charges de Consommation</option>
                    <option value="other">Divers</option>
                 </select>
               </div>
               <div>
                 <label className="block text-[9px] uppercase tracking-widest font-bold text-asas-silver mb-2">Description</label>
                 <input name="description" type="text" required placeholder="Ex: Facebook Ads Octobre" className="w-full bg-transparent border border-asas-silver/40 rounded-sm px-4 py-2.5 text-sm text-asas-charcoal dark:text-asas-sand focus:outline-none focus:border-asas-gold transition-colors" />
               </div>
            </div>
            <div className="p-6 bg-asas-sand/50 dark:bg-black/10 flex justify-end gap-3 border-t border-asas-silver/20">
               <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 rounded-sm font-bold text-xs text-asas-charcoal dark:text-asas-sand hover:bg-black/5 dark:hover:bg-white/5 border border-asas-silver/20 transition-colors">Annuler</button>
               <button type="submit" className="px-5 py-2.5 bg-asas-gold text-white rounded-sm font-bold text-xs hover:bg-asas-gold/80 transition-colors">Déclarer</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
