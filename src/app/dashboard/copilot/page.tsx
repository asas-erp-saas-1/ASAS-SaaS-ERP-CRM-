import { Metadata } from 'next'
import CopilotWorkspace from './CopilotWorkspace'

export const metadata: Metadata = {
  title: 'Copilote IA & Décisions — ASAS RE-OS',
  description: 'Assistant opérationnel et cognitif pour la direction générale de la promotion immobilière',
}

export default function CopilotPage() {
  return (
    <div className="w-full">
      <CopilotWorkspace />
    </div>
  )
}
