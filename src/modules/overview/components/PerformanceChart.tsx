'use client'

import { motion } from 'motion/react'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { TrendingUp } from 'lucide-react'

const data = [
  { name: 'Jan', revenue: 4000000, pipeline: 2400000 },
  { name: 'Fév', revenue: 3000000, pipeline: 1398000 },
  { name: 'Mar', revenue: 2000000, pipeline: 9800000 },
  { name: 'Avr', revenue: 2780000, pipeline: 3908000 },
  { name: 'Mai', revenue: 1890000, pipeline: 4800000 },
  { name: 'Juin', revenue: 2390000, pipeline: 3800000 },
  { name: 'Juil', revenue: 3490000, pipeline: 4300000 },
]

export function PerformanceChart() {
  return (
    <div className="bg-white dark:bg-[#141618] border border-asas-silver/20 rounded-sm p-6 sm:p-8 shadow-sm relative overflow-hidden group">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 relative z-10">
        <div>
          <h3 className="text-xl font-bold text-asas-charcoal dark:text-asas-sand tracking-tight flex items-center gap-2 font-display uppercase">
            <TrendingUp className="w-5 h-5 text-asas-emerald" />
            Performance & Pipeline <span className="opacity-40 text-asas-silver mx-1 font-sans">|</span> <span className="opacity-40">الأداء</span>
          </h3>
          <p className="text-xs font-bold text-asas-silver mt-1 uppercase tracking-widest">Projection sur 7 mois (DZD)</p>
        </div>
        <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-asas-silver">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-asas-emerald"></div> Revenus
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-asas-navy dark:bg-asas-sand"></div> Pipeline
          </div>
        </div>
      </div>
      
      <div className="h-[300px] w-full relative z-10">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorPipeline" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} dy={10} />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }}
              tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
              dx={-10}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#141618', borderColor: '#334155', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}
              itemStyle={{ color: '#f8fafc' }}
              formatter={(value: number) => [`${(value / 1000000).toFixed(2)}M DZD`, '']}
            />
            <Area type="monotone" dataKey="pipeline" stroke="#94a3b8" fillOpacity={1} fill="url(#colorPipeline)" strokeWidth={2} />
            <Area type="monotone" dataKey="revenue" stroke="#10b981" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
