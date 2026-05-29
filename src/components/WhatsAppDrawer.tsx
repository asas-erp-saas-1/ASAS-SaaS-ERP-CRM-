'use client'

import { useState, useEffect } from 'react'
import { X, MessageCircle, Send } from 'lucide-react'
import { clsx } from 'clsx'

interface WhatsAppDrawerProps {
  isOpen: boolean
  onClose: () => void
  clientName: string
  clientPhone: string
  contextType: 'lead' | 'deal' | 'sav'
  propertyName?: string
}

export function WhatsAppDrawer({ isOpen, onClose, clientName, clientPhone, contextType, propertyName = 'notre programme' }: WhatsAppDrawerProps) {
  const [mounted, setMounted] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null)
  
  useEffect(() => { setMounted(true) }, [])

  const templates = {
    lead: [
      { id: 1, title: 'Premier Contact', text: `Bonjour ${clientName}, je suis conseiller chez ASAS Immobilier. Je vous contacte suite à votre intérêt pour ${propertyName}. Avez-vous quelques minutes pour en discuter ?` },
      { id: 2, title: 'Confirmation de visite', text: `Bonjour ${clientName}, je vous confirme notre rendez-vous pour la visite concernant ${propertyName}. À très vite !` },
      { id: 3, title: 'Relance', text: `Bonjour ${clientName}, avez-vous pu prendre une décision concernant ${propertyName} ? Je reste à votre disposition.` }
    ],
    deal: [
      { id: 4, title: 'Appel de fonds', text: `Bonjour ${clientName}, l'étape concernant ${propertyName} est achevée. Vous trouverez le nouvel appel de fonds sur votre espace client.` },
      { id: 5, title: 'Félicitations', text: `Bonjour ${clientName}, félicitations pour votre réservation de ${propertyName} ! Toute l'équipe ASAS vous remercie.` }
    ],
    sav: [
      { id: 6, title: 'Prise en charge SAV', text: `Bonjour ${clientName}, nous avons bien noté vos réserves concernant ${propertyName}. Notre équipe technique intervient prochainement.` },
      { id: 7, title: 'SAV Résolu', text: `Bonjour ${clientName}, les interventions sur ${propertyName} sont terminées. Merci de votre patience.` }
    ]
  }

  const activeTemplates = templates[contextType] || templates.lead
  const currentMessage = selectedTemplate ? activeTemplates.find(t => t.id === selectedTemplate)?.text : ''

  if (!mounted) return null

  const handleSend = () => {
    if (!currentMessage || !clientPhone) return
    const cleanPhone = clientPhone.replace(/\+/g, '').replace(/\s+/g, '')
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(currentMessage)}`
    window.open(url, '_blank')
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className={clsx(
          "fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998] transition-opacity duration-300",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      />

      {/* Sheet */}
      <div
        className={clsx(
          "fixed inset-x-0 sm:inset-x-auto sm:right-0 sm:top-0 bottom-0 z-[9999] sm:w-[400px] w-full bg-white dark:bg-[#141618] sm:border-l border-t sm:border-t-0 border-asas-silver/20 flex flex-col shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
          isOpen ? "translate-y-0 sm:translate-x-0" : "translate-y-full sm:translate-y-0 sm:translate-x-full"
        )}
      >
        <div className="w-full flex justify-center pt-3 pb-1 sm:hidden shrink-0">
          <div className="w-12 h-1.5 bg-asas-silver/20 rounded-sm"></div>
        </div>

        <div className="px-6 pb-4 pt-4 sm:pt-6 flex items-center justify-between border-b border-asas-silver/20 shrink-0">
          <div className="flex flex-col">
            <h2 className="text-[10px] uppercase tracking-widest font-bold text-asas-charcoal dark:text-asas-sand flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-[#25D366]" />
              Action WhatsApp
            </h2>
            <p className="text-[9px] font-bold text-asas-silver uppercase tracking-widest mt-1">Destinataire: <span className="font-bold text-asas-charcoal dark:text-asas-sand">{clientName}</span></p>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-2 text-asas-silver hover:text-asas-charcoal dark:hover:text-asas-sand bg-asas-sand/50 dark:bg-black/10 hover:bg-asas-silver/10 rounded-sm transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
          <p className="text-[9px] font-bold text-asas-silver uppercase tracking-widest mb-4">Modèles de messages ({contextType})</p>
          
          <div className="space-y-3">
            {activeTemplates.map(t => (
              <div 
                key={t.id}
                onClick={() => setSelectedTemplate(t.id)}
                className={clsx(
                  "p-4 rounded-sm border cursor-pointer transition-all",
                  selectedTemplate === t.id 
                    ? "bg-[#25D366]/10 border-[#25D366]/30 shadow-sm"
                    : "bg-white dark:bg-[#141618] border-asas-silver/20 hover:border-[#25D366]/30"
                )}
              >
                <p className="text-[10px] uppercase tracking-widest font-bold text-asas-charcoal dark:text-asas-sand mb-2">{t.title}</p>
                <p className="text-xs font-medium text-asas-charcoal/80 dark:text-asas-silver line-clamp-3 leading-relaxed">{t.text}</p>
              </div>
            ))}
          </div>

          {selectedTemplate && (
            <div className="mt-6">
              <p className="text-[9px] font-bold text-asas-silver uppercase tracking-widest mb-2">Aperçu du message</p>
              <div className="p-4 bg-[#e5ddd5] dark:bg-[#075e54]/20 rounded-sm border border-[#075e54]/20 shadow-sm relative before:absolute before:border-[8px] before:border-transparent before:border-b-[#e5ddd5] dark:before:border-b-[#075e54]/20 before:-top-[16px] before:left-4">
                <p className="text-sm font-medium text-asas-charcoal dark:text-asas-sand whitespace-pre-wrap">{currentMessage}</p>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-asas-silver/20 bg-asas-sand/30 dark:bg-black/10 shrink-0">
          <button
            onClick={handleSend}
            disabled={!selectedTemplate}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#25D366]/10 border border-[#25D366]/20 hover:bg-[#25D366]/20 disabled:opacity-50 disabled:cursor-not-allowed text-[#25D366] text-[10px] uppercase tracking-widest font-bold rounded-sm shadow-sm transition-all active:scale-[0.98] cursor-pointer"
          >
            <Send className="w-4 h-4" /> 
            Envoyer sur WhatsApp
          </button>
        </div>
      </div>
    </>
  )
}
