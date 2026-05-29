'use client'

import { useState, useEffect, use, useRef } from 'react'
import { motion } from 'motion/react'
import { Loader2, FileText, CheckCircle2, MapPin, Download, MessageCircle, Building2, Wallet, UploadCloud, Check, File, FileCode, Send, Clock } from 'lucide-react'
import { clsx } from 'clsx'
import type { Deal } from '@/types/app'
import Link from 'next/link'
import { jsPDF } from 'jspdf'

export default function CustomerPortal({ params }: { params: Promise<{ deal_id: string }> }) {
  const { deal_id } = use(params)
  const [deal, setDeal] = useState<Deal | null>(null)
  const [loading, setLoading] = useState(true)
  const [docs, setDocs] = useState<any[]>([])
  const [docsLoading, setDocsLoading] = useState(true)
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [uploadCategory, setUploadCategory] = useState("CNI / Passeport")
  const [uploadProgress, setUploadProgress] = useState(0)

  // Portal messaging states
  const [messages, setMessages] = useState<any[]>([])
  const [messagesLoading, setMessagesLoading] = useState(true)
  const [newMessage, setNewMessage] = useState("")
  const [sendingMessage, setSendingMessage] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const loadDocs = () => {
    setDocsLoading(true)
    fetch(`/api/activities?deal_id=${deal_id}`)
      .then(res => res.json())
      .then(data => {
        const vaultLinks = (data.data || []).filter((a: any) => 
          a.type === 'note' && (a.description.startsWith('[VAULT]') || a.description.startsWith('[VAULT-JSON]'))
        );
        setDocs(vaultLinks);
        setDocsLoading(false);
      })
      .catch(() => setDocsLoading(false))
  };

  const loadMessages = () => {
    fetch(`/api/portal/message?deal_id=${deal_id}`)
      .then(res => res.json())
      .then(data => {
        setMessages(data.data || [])
        setMessagesLoading(false)
      })
      .catch(() => setMessagesLoading(false))
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom()
    }
  }, [messages])

  useEffect(() => {
    fetch(`/api/deals?id=${deal_id}`)
      .then(res => res.json())
      .then(d => {
        setDeal(d.data?.[0] || null)
        setLoading(false)
      })
      .catch(() => setLoading(false))

    loadDocs()
    loadMessages()

    // Poll every 5 seconds for agent replies
    const pollInterval = setInterval(() => {
      fetch(`/api/portal/message?deal_id=${deal_id}`)
        .then(res => res.json())
        .then(data => {
          if (data.data) {
            setMessages(data.data)
          }
        })
        .catch(() => {})
    }, 5000)

    return () => clearInterval(pollInterval)
  }, [deal_id])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || sendingMessage) return
    const text = newMessage.trim()
    setNewMessage("")
    setSendingMessage(true)

    // Optimistically add client message
    const placeholderMsg = {
      id: crypto.randomUUID(),
      deal_id,
      type: 'message',
      description: `[PORTAL_MSG] ${text}`,
      created_at: new Date().toISOString()
    }
    setMessages(prev => [...prev, placeholderMsg])

    try {
      const res = await fetch('/api/portal/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealId: deal_id,
          message: text,
          sender: 'client'
        })
      })
      if (res.ok) {
        const data = await fetch(`/api/portal/message?deal_id=${deal_id}`).then(r => r.json())
        if (data.data) setMessages(data.data)
      }
    } catch(err) {
      console.error(err)
    } finally {
      setSendingMessage(false)
    }
  }

  // Parse custom prefix from message description
  const parseMessage = (desc: string) => {
    if (desc.startsWith('[PORTAL_MSG] ')) {
      return { body: desc.replace('[PORTAL_MSG] ', ''), isMe: true }
    }
    if (desc.startsWith('[AGENT_MSG] ')) {
      return { body: desc.replace('[AGENT_MSG] ', ''), isMe: false }
    }
    return { body: desc, isMe: false }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#000000]">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    )
  }

  if (!deal) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#000000] text-white">
        <h1 className="text-2xl font-bold mb-2">Accès restreint</h1>
        <p className="text-gray-400">Le dossier demandé n'existe pas ou est sécurisé.</p>
      </div>
    )
  }

  const price = (deal as any).agreed_price || 0
  const paid = (deal as any).total_payments_received || 0
  const pct = price > 0 ? (paid / price) * 100 : 0

  return (
    <div className="min-h-screen w-full bg-[#141618] text-white selection:bg-indigo-500/30">
      {/* Header */}
      <header className="border-b border-white/5 bg-[#141618]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
               <span className="text-black font-black text-xl tracking-tighter leading-none">A</span>
            </div>
            <span className="font-extrabold tracking-tight text-lg">ASAS</span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-full">
            Espace Acquéreur
          </span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12 space-y-12">
        {/* Intro */}
        <section>
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-5xl font-extrabold tracking-tight mb-2"
          >
            Bienvenue, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">{deal.clients?.full_name}</span>.
          </motion.h1>
          <motion.p 
             initial={{ opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.1 }}
             className="text-gray-400 font-medium max-w-2xl"
          >
            Suivez l'avancement de votre acquisition immobilière, gérez vos appels de fonds et accédez à l'ensemble de vos documents contractuels dans cet espace sécurisé.
          </motion.p>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           {/* Propriété */}
           <motion.div 
             initial={{ opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.2 }}
             className="md:col-span-2 bg-[#0A0A0A] border border-white/5 p-8 rounded-sm relative overflow-hidden"
           >
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              
              <div className="flex items-start gap-4 mb-8 relative z-10">
                 <div className="w-12 h-12 rounded-sm bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    <Building2 className="w-6 h-6 text-indigo-400" />
                 </div>
                 <div>
                    <h2 className="text-xl font-bold">{deal.properties?.projects?.name || 'Programme Immobilier'}</h2>
                    <p className="text-sm text-gray-400 flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" /> Lot {deal.properties?.reference_code || '---'}
                    </p>
                 </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 relative z-10">
                 <div className="bg-[#141618] border border-white/5 rounded-sm p-4">
                     <p className="text-[10px] uppercase tracking-widest text-[#a1a1a5] mb-1 font-bold">Type</p>
                     <p className="font-bold text-sm">{deal.properties?.type || 'Appartement'}</p>
                 </div>
                 <div className="bg-[#141618] border border-white/5 rounded-sm p-4">
                     <p className="text-[10px] uppercase tracking-widest text-[#a1a1a5] mb-1 font-bold">Surface</p>
                     <p className="font-bold text-sm">{deal.properties?.area_sqm ? `${deal.properties.area_sqm} m²` : '---'}</p>
                 </div>
                 <div className="bg-[#141618] border border-white/5 rounded-sm p-4">
                     <p className="text-[10px] uppercase tracking-widest text-[#a1a1a5] mb-1 font-bold">Pièces</p>
                     <p className="font-bold text-sm">{deal.properties?.rooms || '---'}</p>
                 </div>
                 <div className="bg-[#141618] border border-white/5 rounded-sm p-4">
                     <p className="text-[10px] uppercase tracking-widest text-[#a1a1a5] mb-1 font-bold">Livraison</p>
                     <p className="font-bold text-sm">T4 2026</p>
                 </div>
              </div>
           </motion.div>

           {/* Messagerie Instantanée & Contact Conseiller */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-[#0A0A0A] border border-white/5 p-6 rounded-sm flex flex-col h-[480px] justify-between relative mb-6"
            >
               {/* Chat Header */}
               <div className="pb-3 border-b border-white/5">
                 <div className="flex items-center gap-3">
                   <div className="relative w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-indigo-400 font-bold uppercase text-sm">
                     {(deal.profiles?.full_name || 'EQ')[0]}
                     <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-black" />
                   </div>
                   <div>
                     <p className="text-[10px] uppercase tracking-widest text-[#a1a1a5] font-bold">Votre Conseiller ASAS</p>
                     <p className="text-xs font-bold text-white leading-tight">{deal.profiles?.full_name || 'Équipe Commerciale'}</p>
                   </div>
                 </div>
               </div>

               {/* Message History Area */}
               <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                 {messagesLoading ? (
                   <div className="flex flex-col items-center justify-center h-full space-y-2">
                     <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                     <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Chargement du canal...</p>
                   </div>
                 ) : messages.length === 0 ? (
                   <div className="flex flex-col items-center justify-center h-full text-center p-4">
                     <MessageCircle className="w-8 h-8 text-gray-600 mb-2" />
                     <p className="text-xs font-bold text-gray-400">Canal de Discussion Sécurisé</p>
                     <p className="text-[10px] text-gray-500 mt-1 max-w-[180px]">Posez vos questions à votre conseiller directement d'ici.</p>
                   </div>
                 ) : (
                   messages.map((msg) => {
                     const parsed = parseMessage(msg.description);
                     return (
                       <div key={msg.id} className={clsx("flex flex-col", parsed.isMe ? "items-end" : "items-start")}>
                         <div className={clsx(
                           "max-w-[85%] rounded-2xl px-3.5 py-2 text-xs font-medium leading-relaxed shadow-sm",
                           parsed.isMe 
                             ? "bg-indigo-600 text-white rounded-br-none" 
                             : "bg-white/5 hover:bg-white/10 border border-white/5 text-gray-200 rounded-bl-none"
                         )}>
                           <p className="whitespace-pre-wrap break-words">{parsed.body}</p>
                         </div>
                         <span className="text-[8px] text-gray-500 font-bold font-mono mt-1 px-1 flex items-center gap-1">
                           <Clock className="w-2.5 h-2.5" />
                           {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                         </span>
                       </div>
                     );
                   })
                 )}
                 <div ref={messagesEndRef} />
               </div>

               {/* Chat Input Form */}
               <div className="border-t border-white/5 pt-3">
                 <form onSubmit={handleSendMessage} className="flex gap-2">
                   <input
                     type="text"
                     value={newMessage}
                     onChange={(e) => setNewMessage(e.target.value)}
                     disabled={sendingMessage}
                     placeholder="Tapez votre message..."
                     className="flex-1 bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors placeholder-gray-500"
                   />
                   <button
                     type="submit"
                     disabled={!newMessage.trim() || sendingMessage || messagesLoading}
                     className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-white/5 disabled:hover:bg-white/5 text-white disabled:text-gray-600 rounded-xl transition-all active:scale-95 flex items-center justify-center shrink-0"
                   >
                     {sendingMessage ? (
                       <Loader2 className="w-4 h-4 animate-spin" />
                     ) : (
                       <Send className="w-4 h-4" />
                     )}
                   </button>
                 </form>
                 <div className="mt-3 text-center">
                   <button
                     type="button"
                     onClick={() => window.open("https://wa.me/213000000000", "_blank")}
                     className="text-[9px] font-bold uppercase tracking-widest text-[#25D366] hover:underline flex items-center justify-center gap-1 mx-auto bg-transparent border-none cursor-pointer"
                   >
                     <MessageCircle className="w-3 h-3" /> Ouvrir sur WhatsApp
                   </button>
                 </div>
               </div>
            </motion.div>


        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Section Finance */}
          <motion.section 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-[#0A0A0A] border border-white/5 p-8 rounded-3xl"
          >
             <h3 className="text-lg font-bold flex items-center gap-2 mb-6">
                <Wallet className="w-5 h-5 text-indigo-400" /> Échéancier Financier
             </h3>
             <div className="mb-8">
                <div className="flex justify-between items-end mb-2">
                  <div>
                    <p className="text-3xl font-black">{(paid / 1000000).toFixed(1)} <span className="text-sm text-gray-500">M DZD</span></p>
                    <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mt-1">Payé sur {(price / 1000000).toFixed(1)} M</p>
                  </div>
                  <div className="text-xl font-bold text-indigo-400">{pct.toFixed(0)}%</div>
                </div>
                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                </div>
             </div>

             <div className="space-y-3">
                {(!deal.deal_payments || deal.deal_payments.length === 0) ? (
                   <p className="text-sm text-gray-400">Aucun paiement ou appel de fonds enregistré.</p>
                ) : (
                   (deal.deal_payments as any[]).sort((a,b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()).map(payment => (
                      <div key={payment.id} className={clsx("flex items-center justify-between p-4 rounded-xl border transition-colors", payment.status === 'paid' ? "bg-[#111111] border-white/5" : "bg-[#0A0A0A] border-white/5 opacity-50")}>
                         <div className="flex items-center gap-3">
                            {payment.status === 'paid' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <div className="w-5 h-5 rounded-full border-2 border-gray-600" />}
                            <div>
                              <p className="text-sm font-bold">Appel de Fonds</p>
                              <p className="text-[10px] uppercase text-gray-500 tracking-wider">
                                 {payment.status === 'paid' ? `Réglé le ${new Date(payment.updated_at || payment.due_date).toLocaleDateString()}` : `Prévu pour le ${new Date(payment.due_date).toLocaleDateString()}`}
                              </p>
                            </div>
                         </div>
                         <span className={clsx("text-sm font-bold", payment.status === 'paid' ? "text-white" : "text-gray-400")}>{((payment.amount) / 1000000).toFixed(2)} M</span>
                      </div>
                   ))
                )}
             </div>
          </motion.section>

          {/* Section Documents GED */}
          <motion.section 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-[#0A0A0A] border border-white/5 p-8 rounded-3xl space-y-8"
          >
             <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                   <FileText className="w-5 h-5 text-indigo-400" /> Documents de Acquisition & GED
                </h3>
                <p className="text-[10px] uppercase tracking-widest text-[#989a9e] mt-1">Vos documents officiels et téléchargement de vos contrats</p>
             </div>

             {/* Contract generation helper */}
             <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
               <div>
                 <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300">Contrat de Réservation / Dossier de Réservation</h4>
                 <p className="text-[10px] text-gray-400 mt-1">Générez et téléchargez instantanément un exemplaire certifié de votre réservation de lot.</p>
               </div>
               <button 
                 onClick={() => {
                   if (!deal) return
                   const doc = new jsPDF()
                   const clientName = deal.clients?.full_name || 'Acquéreur ASAS OS'
                   const propertyRef = deal.properties?.reference_code || 'Lot-VEFA'
                   const projectName = deal.properties?.projects?.name || 'Résidence ASAS'
                   const agreedPrice = (deal as any).agreed_price || (deal as any).amount || 0

                   doc.setFont("helvetica", "bold")
                   doc.setFontSize(20)
                   doc.text("CONTRAT DE RESERVATION (VEFA)", 105, 25, { align: "center" })

                   doc.setFontSize(10)
                   doc.setFont("helvetica", "normal")
                   doc.text(`Identifiant Dossier : ${deal_id.substring(0,8).toUpperCase()}`, 20, 45)
                   doc.text(`Fait le : ${new Date().toLocaleDateString('fr-FR')}`, 20, 52)

                   doc.setFont("helvetica", "bold")
                   doc.setFontSize(12)
                   doc.text("1. PARTIES CONTRACTANTES", 20, 70)
                   doc.setFont("helvetica", "normal")
                   doc.setFontSize(10)
                   doc.text(`Promoteur : ASAS OS Promotion Immobilière, Alger`, 25, 80)
                   doc.text(`Bénéficiaire : M./Mme ${clientName}`, 25, 88)
                   if (deal.clients?.phone) {
                      doc.text(`Téléphone portable : ${deal.clients.phone}`, 25, 96)
                   }

                   doc.setFont("helvetica", "bold")
                   doc.setFontSize(12)
                   doc.text("2. DESIGNATION DU BIEN IMMOBILIER", 20, 115)
                   doc.setFont("helvetica", "normal")
                   doc.setFontSize(10)
                   doc.text(`Résidence / Projet : ${projectName}`, 25, 125)
                   doc.text(`Numéro de Lot : ${propertyRef}`, 25, 133)
                   doc.text(`Type de lot : ${deal.properties?.type || 'Appartement'}`, 25, 141)
                   if (deal.properties?.area_sqm) {
                      doc.text(`Superficie approximative : ${deal.properties.area_sqm} m²`, 25, 149)
                   }

                   doc.setFont("helvetica", "bold")
                   doc.setFontSize(12)
                   doc.text("3. ENUMERATION FINANCIERE", 20, 165)
                   doc.setFont("helvetica", "normal")
                   doc.setFontSize(10)
                   doc.text(`Prix de cession convenu : ${new Intl.NumberFormat('fr-DZ').format(agreedPrice)} DZD`, 25, 175)
                   doc.text(`Ce paiement sera échelonné selon le calendrier approuvé et annexé.`, 25, 183)

                   const y = 210
                   doc.setFont("helvetica", "bold")
                   doc.text("SIGNATURES DES PARTIES :", 20, y)
                   doc.text("Le Promoteur (Cachet & Signature)", 30, y + 15)
                   doc.text("Le Bénéficiaire Acquéreur", 130, y + 15)

                   doc.save(`Contrat_Reservation_${propertyRef}.pdf`)
                 }}
                 className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 border border-transparent text-white rounded-xl text-[9px] uppercase font-bold tracking-widest transition-colors cursor-pointer"
               >
                 Générer PDF
               </button>
             </div>

             {/* Documents Real List */}
             <div className="space-y-3">
               {docsLoading ? (
                  <p className="text-center py-4 text-xs text-gray-400">Synchronisation des justificatifs...</p>
               ) : docs.length === 0 ? (
                  <div className="py-8 text-center border border-white/5 rounded-xl bg-white/5">
                     <p className="text-[10px] font-bold uppercase tracking-widest text-[#9ea0a3]">Coffre-fort vide</p>
                     <p className="text-[9px] text-gray-500 mt-1">Aucun document n'a encore été mis en ligne pour cette transaction.</p>
                  </div>
               ) : (
                 docs.map((rawDoc) => {
                   const isJson = rawDoc.description.startsWith('[VAULT-JSON]');
                   let docInfoObj: any = {};
                   if (isJson) {
                     try {
                        docInfoObj = JSON.parse(rawDoc.description.replace('[VAULT-JSON] ', '').trim());
                     } catch(e){}
                   } else {
                     const url = rawDoc.description.replace('[VAULT] ', '').trim();
                     docInfoObj = {
                        filename: "Document Externe",
                        category: "Lien Externe",
                        url: url,
                        uploadedBy: "Promoteur",
                        size: undefined
                     };
                   }

                   const displayTitle = docInfoObj.filename || "Fichier Joint";
                   const displayCat = docInfoObj.category || "Autre";
                   const isFromClient = docInfoObj.uploadedBy === "Client";

                   return (
                     <div key={rawDoc.id} className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-colors cursor-pointer group">
                        <div className="flex items-center gap-3 overflow-hidden">
                           <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors shrink-0">
                              <FileText className="w-5 h-5" />
                           </div>
                           <div className="overflow-hidden">
                             <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                <span className="text-[8px] font-bold uppercase tracking-widest bg-indigo-500/15 text-indigo-300 border border-indigo-500/20 px-1.5 py-0.5 rounded-sm">
                                   {displayCat}
                                </span>
                                <span className="text-[8px] bg-white/5 text-gray-400 px-1 rounded-sm uppercase tracking-widest font-bold font-mono">
                                   {isFromClient ? "Transmis par vous" : "Transmis par l'agence"}
                                </span>
                             </div>
                             <p className="text-sm font-bold group-hover:text-white truncate">{displayTitle}</p>
                           </div>
                        </div>
                        <a 
                          href={docInfoObj.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-2.5 bg-white/5 group-hover:bg-[#25D366]/10 hover:!bg-[#25D366]/20 border border-white/5 group-hover:border-[#25D366]/20 group-hover:text-[#25D366] text-gray-400 rounded-xl transition-all block shrink-0"
                          title="Télécharger"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                     </div>
                   );
                 })
               )}
             </div>

             {/* Client file uploader */}
             <div className="border-t border-white/5 pt-6">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300 mb-4">Transmettre un document (CNI, Virement)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-1">
                     <label className="text-[9px] uppercase tracking-widest font-bold text-gray-500 block mb-2">Type de Document</label>
                     <select 
                       value={uploadCategory}
                       onChange={(e) => setUploadCategory(e.target.value)}
                       className="w-full bg-[#141618] border border-white/10 rounded-xl px-3 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                     >
                        <option value="CNI / Passeport">CNI / Passeport (Identité)</option>
                        <option value="Justificatif de Versement">Preuve de Versement</option>
                        <option value="Autre">Autre pièce jointe</option>
                     </select>
                  </div>
                  <div className="sm:col-span-2">
                     <label className="text-[9px] uppercase tracking-widest font-bold text-gray-500 block mb-2">Sélectionner le fichier</label>
                     {uploadingDoc ? (
                        <div className="w-full bg-white/5 rounded-xl p-3 border border-indigo-500/30 flex items-center justify-between text-xs text-indigo-300 font-bold">
                           <span className="animate-pulse">Transfert de votre justificatif...</span>
                           <span>{uploadProgress}%</span>
                        </div>
                     ) : (
                        <div 
                          className="w-full bg-[#111111] hover:bg-[#141618] border border-dashed border-white/10 hover:border-indigo-500/50 rounded-xl p-3 flex items-center justify-center gap-2 cursor-pointer transition-all"
                          onClick={() => document.getElementById('client-portal-uploader')?.click()}
                        >
                           <UploadCloud className="w-4 h-4 text-indigo-400" />
                           <span className="text-xs font-bold uppercase tracking-wider text-[#797af0] group-hover:text-white">Choisir un fichier (PDF, PNG, JPG)</span>
                           <input 
                             id="client-portal-uploader" type="file" className="hidden"

               
                             accept="image/*,application/pdf"
                             onChange={async (e) => {
                               if (e.target.files && e.target.files[0]) {
                                 const f = e.target.files[0];
                                 setUploadingDoc(true);
                                 setUploadProgress(15);
                                 try {
                                    const r = new FileReader();
                                    r.readAsDataURL(f);
                                    r.onload = async () => {
                                      setUploadProgress(40);
                                      const res = await fetch("/api/documents/upload", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({
                                          filename: f.name,
                                          category: uploadCategory,
                                          dataUrl: r.result as string,
                                          dealId: deal_id,
                                          portalUpload: true
                                        })
                                      });
                                      setUploadProgress(80);
                                      if (res.ok) {
                                        setUploadProgress(100);
                                        setTimeout(() => {
                                           setUploadingDoc(false);
                                           setUploadProgress(0);
                                           loadDocs();
                                        }, 400);
                                      } else {
                                        alert("Erreur lors du transfert de la pièce");
                                        setUploadingDoc(false);
                                        setUploadProgress(0);
                                      }
                                    };
                                 } catch(err) {
                                   setUploadingDoc(false);
                                   setUploadProgress(0);
                                 }
                               }
                             }}
                           />
                        </div>
                     )}
                  </div>
                </div>
             </div>
          </motion.section>
        </div>
      </main>
    </div>
  )
}
