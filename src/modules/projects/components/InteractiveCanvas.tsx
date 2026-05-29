'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'
import type { Property } from '@/types/app'

const CanvasRenderer = dynamic(() => import('./CanvasRenderer'), { 
  ssr: false,
  loading: () => <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-4"><Loader2 className="w-8 h-8 animate-spin" /><span className="text-sm font-bold uppercase tracking-widest animate-pulse">Initialisation WebGL...</span></div>
})

export function InteractiveCanvas({ projectId }: { projectId: string }) {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects?id=${projectId}`)
      if (res.ok) {
        const data = await res.json()
        setProperties(data.properties || [])
      }
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <div className="w-full h-full flex items-center justify-center text-asas-silver animate-pulse">Chargement des géométries...</div>

  return (
     <CanvasRenderer properties={properties} onReload={load} />
  )
}
