'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, MessageSquare, Copy, ExternalLink, ShieldCheck, Zap, Info, Check, RefreshCw } from 'lucide-react'
import { clsx } from 'clsx'

type TemplateKey = 'reminder' | 'receipt' | 'portal_msg';

interface WhatsAppTemplateModalProps {
  deal: any;
  payment?: any;
  onClose: () => void;
  onSuccess?: () => void;
}

const TEMPLATES: Record<TemplateKey, { name: string; content: string; desc: string }> = {
  reminder: {
    name: "Relance d'Appel de Fonds (Échéance)",
    desc: "Pour notifier un client d'un appel de fonds ou d'une tranche de paiement à régler.",
    content: "Bonjour {{client_name}},\n\nNous vous informons que l'appel de fonds concernant votre lot {{property_ref}} d'un montant de {{amount}} DZD est à régler.\n\nVous pouvez consulter l'échéancier et suivre l'avancement du chantier directement sur votre espace client sécurisé ASAS :\n👉 {{portal_link}}\n\nRestant à votre entière disposition,\nCordialement,\n{{agent_name}}\nASAS Promotion Immobilière"
  },
  receipt: {
    name: "Quittance de Paiement & Accusé",
    desc: "Pour confirmer la bonne réception d'un paiement et la disponibilité de la quittance.",
    content: "Bonjour {{client_name}},\n\nNous vous confirmons la bonne réception de votre paiement de {{amount}} DZD pour la tranche du lot {{property_ref}}.\n\nVotre quittance officielle est disponible au téléchargement dans votre coffre-fort numérique sécurisé sur votre portail d'acquéreur :\n👉 {{portal_link}}\n\nNous vous remercions pour votre confiance.\nCordialement,\n{{agent_name}}\nASAS Promotion Immobilière"
  },
  portal_msg: {
    name: "Notification de Nouveau Message",
    desc: "Pour relancer un client qui a un message non lu sur le portail d'échange.",
    content: "Bonjour {{client_name}},\n\nVotre conseiller commercial ASAS vous a laissé un nouveau message important concernant votre dossier.\n\nMerci d'en prendre connaissance et d'y répondre sur votre portail d'acquéreur sécurisé :\n👉 {{portal_link}}\n\nCordialement,\n{{agent_name}}\nASAS Promotion Immobilière"
  }
};

export function WhatsAppTemplateModal({ deal, payment, onClose, onSuccess }: WhatsAppTemplateModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateKey>('reminder');
  const [customText, setCustomText] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agentName, setAgentName] = useState("Votre Conseiller ASAS");

  const clientName = deal?.clients?.full_name || 'Acquéreur';
  const clientPhone = deal?.clients?.phone || '';
  const propertyRef = deal?.properties?.reference_code || 'Lot N/A';
  const amountToDisplay = payment 
    ? new Intl.NumberFormat('fr-DZ').format(payment.amount)
    : deal?.amount 
      ? new Intl.NumberFormat('fr-DZ').format(deal.amount)
      : '0';

  const portalLink = `${window.location.protocol}//${window.location.host}/portal/${deal?.id}`;

  // Load configured agent profile info
  useEffect(() => {
    fetch('/api/system/identity-stub')
      .then(r => r.json())
      .then(d => {
        if (d.data?.full_name) {
          setAgentName(d.data.full_name);
        }
      })
      .catch(() => {
        // Fallback to agent profile or team
        setAgentName(deal?.profiles?.full_name || "Votre Conseiller ASAS");
      });
  }, [deal]);

  // Autofill templates when selected or when payload parameters change
  useEffect(() => {
    const raw = TEMPLATES[selectedTemplate].content;
    const compiled = raw
      .replace(/\{\{client_name\}\}/g, clientName)
      .replace(/\{\{property_ref\}\}/g, propertyRef)
      .replace(/\{\{amount\}\}/g, amountToDisplay)
      .replace(/\{\{portal_link\}\}/g, portalLink)
      .replace(/\{\{agent_name\}\}/g, agentName);
    
    setCustomText(compiled);
  }, [selectedTemplate, clientName, propertyRef, amountToDisplay, portalLink, agentName]);

  const handleCopy = () => {
    navigator.clipboard.writeText(customText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendAndLog = async () => {
    setLoading(true);
    try {
      // 1. Record the action inside the events system of ASAS
      const activityDescription = `[WHATSAPP_SIM] Relance de type "${TEMPLATES[selectedTemplate].name}" émise à destination de ${clientName} (${clientPhone})`;
      
      await fetch('/api/activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          deal_id: deal.id,
          type: 'whatsapp',
          description: activityDescription
        })
      });

      // 2. Open WhatsApp link with prefilled text
      // Clean phone number: remove any non-digit chars
      const cleanPhone = clientPhone.replace(/\D/g, '');
      // If phone doesn't have country code, we default to Algeria (213)
      const targetPhone = cleanPhone.startsWith('213') || cleanPhone.startsWith('+213') 
        ? cleanPhone 
        : cleanPhone.startsWith('0') 
          ? `213${cleanPhone.substring(1)}` 
          : `213${cleanPhone}`;

      const encodedText = encodeURIComponent(customText);
      const url = `https://wa.me/${targetPhone}?text=${encodedText}`;
      
      window.open(url, '_blank', 'noreferrer,noopener');

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-sans text-asas-charcoal dark:text-asas-sand">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-3xl bg-white dark:bg-[#101112] border border-asas-silver/20 rounded-sm shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-asas-silver/10 bg-[#faf9f5] dark:bg-black/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-[#25D366]/10 border border-[#25D366]/30 text-[#25D366] flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest font-display text-asas-navy dark:text-asas-sand">Assistant de Communication WhatsApp</h3>
              <p className="text-[10px] uppercase font-bold text-asas-silver mt-0.5">Simulation d'intégration Omnicanale • Client: {clientName}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-asas-silver hover:text-asas-charcoal dark:hover:text-white rounded-sm hover:bg-asas-silver/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Left Column: Template Selection */}
          <div className="md:col-span-5 space-y-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-asas-silver">Sélectionner un Modèle</p>
            <div className="space-y-3">
              {(Object.keys(TEMPLATES) as TemplateKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedTemplate(key)}
                  className={clsx(
                    "w-full text-left p-4 rounded-sm border transition-all flex flex-col cursor-pointer",
                    selectedTemplate === key
                      ? "bg-asas-gold/5 border-asas-gold dark:border-asas-gold text-asas-gold"
                      : "bg-transparent border-asas-silver/15 text-asas-silver hover:border-asas-silver/30 hover:text-asas-charcoal dark:hover:text-asas-sand"
                  )}
                >
                  <span className="text-xs font-bold uppercase tracking-wider block mb-1">{TEMPLATES[key].name}</span>
                  <span className="text-[10px] opacity-80 leading-relaxed font-medium">{TEMPLATES[key].desc}</span>
                </button>
              ))}
            </div>

            {/* Info tip */}
            <div className="p-4 bg-asas-sand/20 dark:bg-white/5 border border-asas-silver/10 rounded-sm space-y-2">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase text-asas-silver">
                <Info className="w-3.5 h-3.5 text-asas-gold shrink-0" />
                <span>Rappel de Conformité</span>
              </div>
              <p className="text-[9px] text-asas-silver uppercase tracking-wider leading-relaxed">
                Le token d'expédition est simulé. Le message s'ouvrira directement dans le client officiel WhatsApp (Desktop ou Mobile) pour conserver le contrôle total de la relation humaine sans risque de bannissement par l'API Meta.
              </p>
            </div>
          </div>

          {/* Right Column: Message editor and live preview */}
          <div className="md:col-span-7 flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-asas-silver">Aperçu & Personnalisation</p>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-asas-sand/50 dark:bg-white/5 border border-asas-silver/20 hover:border-asas-silver/40 text-[10px] uppercase font-bold text-asas-silver rounded-sm transition-colors cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-500 font-extrabold">Copié !</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copier texte</span>
                  </>
                )}
              </button>
            </div>

            {/* Textarea Codebox Editor */}
            <div className="flex-1 flex flex-col">
              <textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                rows={12}
                className="w-full flex-1 p-4 bg-[#faf9f5] dark:bg-black/25 text-xs text-asas-charcoal dark:text-asas-sand border border-asas-silver/20 rounded-sm font-sans focus:outline-none focus:border-asas-gold transition-colors resize-none leading-relaxed"
                placeholder="Rédigez ou modifiez le message ici..."
              />
            </div>

            {/* Dynamic Placeholder values info pill */}
            <div className="bg-[#25D366]/5 border border-[#25D366]/10 p-3 rounded-sm flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#25D366]">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span className="text-[9px] font-bold uppercase tracking-widest">Lien Portal Sécurisé Injecté</span>
              </div>
              <span className="text-[8px] font-mono font-bold text-asas-silver shrink-0 uppercase">UID: {deal?.id?.substring(0,8)}</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-asas-silver/10 bg-[#faf9f5] dark:bg-black/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-asas-silver">
            <Zap className="w-4 h-4 text-asas-gold animate-pulse" />
            <span>Destinataire: {clientName} ({clientPhone || "Aucun numéro renseigné"})</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto self-stretch sm:self-auto justify-end">
            <button
              onClick={onClose}
              type="button"
              className="px-5 py-2.5 bg-transparent hover:bg-asas-silver/10 text-asas-silver text-xs font-bold uppercase tracking-widest rounded-sm transition-colors cursor-pointer"
            >
              Fermer
            </button>
            <button
              onClick={handleSendAndLog}
              disabled={loading || !customText.trim()}
              type="button"
              className="px-6 py-2.5 bg-[#25D366] hover:bg-[#1ebd54] text-white text-xs font-bold uppercase tracking-widest rounded-sm transition-all focus:outline-none flex items-center gap-2 shadow-md active:scale-95 disabled:scale-100 disabled:opacity-40 cursor-pointer text-center justify-center shrink-0"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Traitement...</span>
                </>
              ) : (
                <>
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Copier & Ouvrir WhatsApp</span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
