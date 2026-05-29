'use client'

import React from 'react'
import {
  ActionPanel,
  ActionPanelContent,
} from '@/components/patterns/ActionPanel'
import { DealIntelligencePanel } from '@/modules/deals/components/DealIntelligencePanel'

interface DealActionDrawerProps {
  dealId: string | null
  onClose: () => void
}

export function DealActionDrawer({ dealId, onClose }: DealActionDrawerProps) {
  return (
    <ActionPanel open={!!dealId} onOpenChange={(open) => { if (!open) onClose() }}>
      <ActionPanelContent className="flex flex-col p-0 w-full sm:max-w-xl md:max-w-3xl lg:max-w-4xl border-none">
         <div className="flex-1 overflow-y-auto w-full custom-scrollbar">
            {dealId && <DealIntelligencePanel dealId={dealId} />}
         </div>
      </ActionPanelContent>
    </ActionPanel>
  )
}
