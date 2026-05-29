'use client'

import React from 'react'
import { motion } from 'motion/react'
import { Building2, Search, SlidersHorizontal, ArrowRight, User } from 'lucide-react'

// Bilingual Data Source
const SAMPLE_LEADS = [
  { id: 'LD-4091', nameEN: 'Ahmed Benali', nameAR: 'أحمد بن علي', type: 'VIP Investor | مستثمر', budget: '$1.2M', statusEN: 'Negotiation', statusAR: 'تفاوض', date: '21/10/2026' },
  { id: 'LD-4092', nameEN: 'Sarah & Karim', nameAR: 'سارة وكريم', type: 'Residential | سكني', budget: '$450K', statusEN: 'Viewing', statusAR: 'معاينة', date: '20/10/2026' },
  { id: 'LD-4093', nameEN: 'Atlas Corp', nameAR: 'مجموعة أطلس', type: 'Commercial | تجاري', budget: '$3.5M', statusEN: 'Contract', statusAR: 'عقد', date: '19/10/2026' },
]

export default function BrandPreviewDashboard() {
  return (
    <div className="w-full min-h-screen bg-asas-sand dark:bg-asas-charcoal p-8 font-sans transition-colors duration-300">
      
      {/* Decorative Gold Pattern Overlay (very subtle) */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-5 dark:opacity-10 mix-blend-overlay z-0"
        style={{ 
          backgroundImage: 'radial-gradient(circle at center, #C7A15A 1px, transparent 1px)', 
          backgroundSize: '40px 40px' 
        }} 
      />

      <div className="relative z-10 max-w-7xl mx-auto space-y-12">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-end justify-between border-b border-asas-silver/30 pb-6 gap-6">
          <div className="space-y-2">
            <h1 className="font-display text-4xl font-bold tracking-widest uppercase text-asas-charcoal dark:text-asas-sand">
              CRM Dashboard <span className="text-asas-gold mx-2">|</span> لوحة التحكم
            </h1>
            <p className="text-sm font-medium text-asas-charcoal/60 dark:text-asas-sand/60">
              ASAS Real Estate Development — Live Overview
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative group">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-asas-silver" />
              <input 
                type="text" 
                placeholder="Search / بحث..." 
                className="pl-10 pr-4 py-2 bg-transparent border border-asas-silver/40 dark:border-asas-silver/20 rounded-sm outline-none focus:border-asas-gold transition-colors text-sm w-64 text-asas-charcoal dark:text-asas-sand placeholder:text-asas-silver"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-asas-emerald text-asas-sand hover:bg-asas-emerald/90 transition-colors rounded-sm text-sm font-bold tracking-wide">
              New Entry <span className="opacity-50">إضافة</span>
            </button>
          </div>
        </header>

        {/* Executive KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { labelEN: 'Total Volume', labelAR: 'الحجم الإجمالي', val: '$14,200,000', trend: '+12%', color: 'border-asas-gold' },
            { labelEN: 'Active Deals', labelAR: 'صفقات نشطة', val: '42', trend: '+5', color: 'border-asas-emerald' },
            { labelEN: 'Critical Tasks', labelAR: 'مهام عاجلة', val: '8', trend: '-2', color: 'border-asas-copper' },
          ].map((kpi, i) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              key={i} 
              className={`bg-white dark:bg-[#141618] border-t-2 border-x border-b border-asas-silver/20 ${kpi.color} p-6 shadow-sm flex flex-col justify-between`}
            >
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-asas-charcoal/50 dark:text-asas-sand/50">{kpi.labelEN}</h3>
                  <h3 className="text-xs font-bold tracking-wider text-asas-charcoal/50 dark:text-asas-sand/50 font-arabic">{kpi.labelAR}</h3>
                </div>
                <span className="text-xs font-bold text-asas-emerald bg-asas-emerald/10 px-2 py-0.5 rounded-sm">{kpi.trend}</span>
              </div>
              <p className="text-3xl font-display text-asas-charcoal dark:text-asas-sand">{kpi.val}</p>
            </motion.div>
          ))}
        </div>

        {/* Data Table Section */}
        <section className="bg-white dark:bg-[#141618] border border-asas-silver/20 shadow-sm flex flex-col h-full rounded-sm overflow-hidden">
          <div className="flex items-center justify-between p-4 md:p-6 border-b border-asas-silver/20 bg-asas-sand/30 dark:bg-black/20">
            <h2 className="font-display text-xl font-bold uppercase tracking-wide text-asas-charcoal dark:text-asas-sand flex items-center gap-3">
              <Building2 className="w-5 h-5 text-asas-gold" />
              Pipeline <span className="opacity-40">|</span> خط العمليات
            </h2>
            <button className="p-2 border border-asas-silver/20 hover:border-asas-gold transition-colors rounded-sm text-asas-charcoal dark:text-asas-sand">
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-asas-silver/20 text-xs uppercase tracking-wider text-asas-charcoal/60 dark:text-asas-sand/60 bg-asas-sand/30/50 dark:bg-black/10">
                  <th className="p-4 font-semibold whitespace-nowrap">Ref / المرجع</th>
                  <th className="p-4 font-semibold">Entity / الكيان</th>
                  <th className="p-4 font-semibold">Category / الفئة</th>
                  <th className="p-4 font-semibold">Volume / الحجم</th>
                  <th className="p-4 font-semibold">Status / الحالة</th>
                  <th className="p-4 font-semibold text-right">Action / إجراء</th>
                </tr>
              </thead>
              <tbody className="text-sm font-medium">
                {SAMPLE_LEADS.map((lead, i) => (
                  <tr key={lead.id} className="border-b border-asas-silver/10 hover:bg-asas-sand/50 dark:hover:bg-white/5 transition-colors group">
                    <td className="p-4 text-asas-charcoal dark:text-asas-sand font-mono text-xs">{lead.id}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-sm bg-asas-navy/10 flex items-center justify-center text-asas-navy dark:text-asas-sand">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-asas-charcoal dark:text-asas-sand">{lead.nameEN}</p>
                          <p className="text-xs text-asas-charcoal/50 dark:text-asas-sand/50" dir="rtl">{lead.nameAR}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-asas-charcoal/80 dark:text-asas-sand/80 text-xs">
                      {lead.type}
                    </td>
                    <td className="p-4 font-mono text-asas-charcoal dark:text-asas-sand">
                      {lead.budget}
                    </td>
                    <td className="p-4">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm border text-[10px] font-bold uppercase tracking-wider
                        ${lead.statusEN === 'Contract' ? 'bg-asas-emerald/10 text-asas-emerald border-asas-emerald/20' : 
                         lead.statusEN === 'Negotiation' ? 'bg-asas-gold/10 text-asas-gold border-asas-gold/20' : 
                         'bg-asas-silver/10 text-asas-charcoal dark:text-asas-sand border-asas-silver/20'}"
                      >
                        {lead.statusEN} <span>|</span> <span dir="rtl">{lead.statusAR}</span>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <button className="inline-flex items-center justify-center w-8 h-8 rounded-sm bg-transparent border border-asas-silver/30 text-asas-silver group-hover:border-asas-gold group-hover:text-asas-gold transition-colors">
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </div>
  )
}
