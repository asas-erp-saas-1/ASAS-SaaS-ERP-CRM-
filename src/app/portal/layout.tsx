import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Espace Acquéreur — ASAS',
  description: 'Votre portail client immobilier exclusif',
}

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="bg-white dark:bg-[#141618] min-h-screen text-gray-900 dark:text-gray-100 font-sans antialiased overflow-x-hidden selection:bg-indigo-500/30">
      {children}
    </div>
  )
}
