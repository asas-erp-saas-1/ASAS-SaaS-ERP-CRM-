// src/lib/hooks/usePlan.ts
'use client'
import { useEffect, useState } from 'react'

export interface LimitStat { used: number; max: number; pct: number }

export interface PlanUsage {
  plan:        string
  features:    Record<string, boolean>
  limits:      Record<string, LimitStat>
  trialEndsAt: string | null
  isNearLimit: boolean
}

export function usePlan() {
  const [usage,   setUsage]   = useState<PlanUsage | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/billing/usage')
      .then(r => r.json())
      .then(d => { if (d.success) setUsage(d.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const canUse    = (feature: string): boolean  => usage?.features?.[feature] ?? false
  const isAtLimit = (resource: string): boolean => (usage?.limits?.[resource]?.pct ?? 0) >= 100
  const usagePct  = (resource: string): number  => usage?.limits?.[resource]?.pct ?? 0

  return { usage, loading, canUse, isAtLimit, usagePct }
}
