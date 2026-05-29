// src/modules/deals/components/DealIntelligencePanel.tsx
'use client'
import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { CheckCircle2, AlertTriangle, User, Building, MapPin, Calculator, Calendar, ArrowUpRight, DollarSign, FileText, CheckSquare, MessageCircle, Download, Trash2, UploadCloud, RefreshCw, File } from 'lucide-react'
import { clsx } from 'clsx'
import { ErrorTracker } from '@/lib/observability/errors'
import { jsPDF } from 'jspdf'
import { Clock, Send } from 'lucide-react';
import type { Activity } from '@/types/app';
import { CreateTaskModal } from '@/app/dashboard/tasks/CreateTaskModal'
import { LogDepositModal } from '@/app/dashboard/deals/LogDepositModal'
import { SchedulePaymentModal } from '@/app/dashboard/deals/SchedulePaymentModal'
import { WhatsAppTemplateModal } from './WhatsAppTemplateModal'

function DealPortalChatSection({ dealId }: { dealId: string }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);

  const loadMessages = () => {
    fetch(`/api/portal/message?deal_id=${dealId}`)
      .then(res => res.json())
      .then(data => {
        setMessages(data.data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [dealId]);

  const handleSend = async (textToSend?: string) => {
    const text = (typeof textToSend === 'string' ? textToSend : newMessage).trim();
    if (!text || sending) return;
    setNewMessage("");
    setSending(true);

    const optAct = {
      id: crypto.randomUUID(),
      deal_id: dealId,
      type: 'message',
      description: `[AGENT_MSG] ${text}`,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, optAct]);

    try {
      const res = await fetch('/api/portal/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealId,
          message: text,
          sender: 'agent'
        })
      });
      if (res.ok) {
        loadMessages();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const quickReplies = [
    "Votre document d'identité a bien été enregistré dans le Coffre-fort GED.",
    "Merci de nous transmettre le justificatif de virement pour valider l'Appel de fonds.",
    "Bonjour, le chantier progresse conformément au calendrier contractuel !",
    "La signature officielle chez le notaire a été programmée. Merci d'être présent."
  ];

  return (
    <div className="bg-white dark:bg-[#141618] rounded-sm p-6 border border-asas-silver/20 shadow-sm mt-6">
      <div className="flex items-center justify-between mb-4 border-b border-asas-silver/10 pb-3">
        <h4 className="text-sm uppercase tracking-widest text-[#1A2A4A] dark:text-[#E8D1A7] font-bold flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-indigo-400" /> Communication Portail Acquéreur
        </h4>
        <span className="text-[8px] bg-indigo-500/10 text-indigo-500 dark:bg-white/5 dark:text-gray-300 border border-indigo-500/20 px-2 py-0.5 rounded font-black uppercase tracking-wider">
          Canal Direct Live
        </span>
      </div>

      <div className="h-64 overflow-y-auto mb-4 border border-asas-silver/20 rounded-sm p-4 space-y-3 bg-[#faf9f5] dark:bg-black/15 scrollbar-thin">
        {loading ? (
          <p className="text-xs text-asas-silver italic animate-pulse">Chargement de la messagerie...</p>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col justify-center items-center text-center p-4">
            <MessageCircle className="w-8 h-8 text-asas-silver/40 mb-2" />
            <p className="text-xs font-bold text-asas-silver">Aucun message pour le moment</p>
            <p className="text-[10px] text-gray-500 max-w-[280px] mt-1">L'acquéreur verra vos messages s'afficher instantanément sur son Espace.</p>
          </div>
        ) : (
          messages.map((m: any) => {
            const isAgent = m.description.startsWith('[AGENT_MSG] ');
            const bodyText = m.description.replace('[AGENT_MSG] ', '').replace('[PORTAL_MSG] ', '');
            
            return (
              <div key={m.id} className={clsx("flex flex-col", isAgent ? "items-end" : "items-start")}>
                <div className="flex items-center gap-1.5 mb-1 max-w-[80%]">
                  <span className={clsx("text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-sm", 
                    isAgent ? "bg-asas-navy/10 text-[#1A2A4A]" : "bg-emerald-500/10 text-emerald-500"
                  )}>
                    {isAgent ? 'Vous (Agent)' : 'Client (Acquéreur)'}
                  </span>
                  <span className="text-[8px] text-gray-500 font-mono">
                    {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className={clsx("max-w-[85%] rounded-md px-3.5 py-2 text-xs font-medium leading-relaxed shadow-xs border", 
                  isAgent 
                    ? "bg-[#1A2A4A] text-white border-transparent" 
                    : "bg-white dark:bg-[#1f2124] text-asas-charcoal dark:text-asas-sand border-asas-silver/20"
                )}>
                  {bodyText}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mb-4">
        <p className="text-[9px] uppercase tracking-widest text-asas-silver font-bold mb-2">Réponses Pré-enregistrées (Quick replies)</p>
        <div className="flex flex-wrap gap-2">
          {quickReplies.map((reply, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(reply)}
              disabled={sending}
              type="button"
              className="text-[10px] font-bold text-gray-700 dark:text-gray-300 bg-asas-sand/40 hover:bg-asas-gold/20 dark:bg-white/5 border border-asas-silver/30 dark:border-white/5 hover:border-asas-gold px-2.5 py-1.5 rounded transition-all text-left max-w-full truncate cursor-pointer"
              title={reply}
            >
              {reply}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          disabled={sending}
          placeholder="Répondre à l'acquéreur en direct..."
          className="flex-1 bg-white dark:bg-[#141618] border border-asas-silver/20 rounded-sm px-4 py-2 text-xs text-asas-charcoal dark:text-asas-sand focus:outline-none focus:ring-1 focus:ring-asas-gold placeholder-gray-500 font-medium"
        />
        <button
          type="submit"
          disabled={!newMessage.trim() || sending}
          className="px-4 py-2 bg-[#1A2A4A] hover:bg-[#1A2A4A]/80 disabled:bg-asas-silver/20 text-white rounded-sm text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer"
        >
          {sending ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          Envoyer
        </button>
      </form>
    </div>
  );
}

function DealActivitiesSection({ dealId }: { dealId: string }) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetch(`/api/activities?deal_id=${dealId}`)
      .then(res => res.json())
      .then(data => {
        if (mounted) {
          const filtered = (data.data || []).filter((a: any) => a.type !== 'message' && !a.description?.startsWith('[VAULT]') && !a.description?.startsWith('[VAULT-JSON]'));
          setActivities(filtered);
          setLoading(false);
        }
      })
      .catch(err => {
        console.error(err);
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, [dealId]);

  return (
    <div className="bg-white dark:bg-[#141618] rounded-sm p-6 border border-asas-silver/20 shadow-sm mt-6">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm uppercase tracking-widest text-asas-silver font-bold flex items-center gap-2">
          <Clock className="w-4 h-4" /> Activités & Notes
        </h4>
      </div>

      <div className="mb-6 flex gap-2">
        <input 
          type="text" 
          id="new-deal-note-input"
          className="flex-1 bg-white dark:bg-[#141618] border border-asas-silver/20 rounded-sm px-4 py-2 text-[10px] uppercase font-bold text-asas-charcoal dark:text-asas-sand focus:outline-none focus:ring-1 focus:ring-asas-gold"
          placeholder="Ajouter une note..."
          onKeyDown={async (e) => {
            if (e.key === 'Enter' && e.currentTarget.value.trim() && !loading) {
              const val = e.currentTarget.value.trim();
              e.currentTarget.value = '';
              try {
                const res = await fetch('/api/activities', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ deal_id: dealId, type: 'note', description: val })
                });
                if (res.ok) {
                  const newAct = await res.json();
                  setActivities(prev => [newAct.data, ...prev]);
                }
              } catch (err) {
                console.error(err);
              }
            }
          }}
        />
        <button 
          onClick={async () => {
            const input = document.getElementById('new-deal-note-input') as HTMLInputElement;
            if (!input || !input.value.trim() || loading) return;
            const val = input.value.trim();
            input.value = '';
            try {
              const res = await fetch('/api/activities', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ deal_id: dealId, type: 'note', description: val })
              });
              if (res.ok) {
                const newAct = await res.json();
                setActivities(prev => [newAct.data, ...prev]);
              }
            } catch (err) {
              console.error(err);
            }
          }}
          className="px-4 py-2 bg-asas-navy text-white rounded-sm text-sm font-bold hover:bg-asas-charcoal dark:hover:bg-black transition-colors">
          Ajouter
        </button>
      </div>
      
      {loading ? (
        <p className="text-sm text-asas-silver">Chargement...</p>
      ) : activities.length > 0 ? (
        <div className="space-y-4">
          {activities.map((act) => (
            <div key={act.id} className="relative pl-6 pb-2">
              <div className="absolute top-2 left-[11px] bottom-[-16px] w-[2px] bg-black/5 dark:bg-white/5" />
              <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-asas-navy dark:border-asas-sand/20 dark:text-asas-sand dark:bg-white/10 ring-4 ring-gray-50 dark:ring-[#141618]" />
              
              <div className="bg-white dark:bg-[#141618] border border-asas-silver/20 rounded-sm p-4 transition-colors hover:bg-asas-sand/30 dark:hover:bg-white/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">{act.type}</span>
                  <span className="text-[10px] text-gray-500 font-mono">
                    {new Date(act.created_at).toLocaleString('fr-FR', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </span>
                </div>
                <p className="text-sm text-asas-charcoal/90 dark:text-asas-sand/90">
                  {act.description}
                </p>
                {(act as any).profiles?.full_name && (
                  <p className="text-[10px] text-gray-500 mt-2 uppercase tracking-widest font-bold">
                    Par {(act as any).profiles.full_name}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">Aucune activité enregistrée.</p>
      )}
    </div>
  );
}

function DealVaultSection({ dealId }: { dealId: string }) {
  const [links, setLinks] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragActive, setDragActive] = useState(false);
  const [uploadCategory, setUploadCategory] = useState("CNI");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fetchVaultDocs = () => {
    setLoading(true);
    fetch(`/api/activities?deal_id=${dealId}`)
      .then(res => res.json())
      .then(data => {
        // Identify both legacy [VAULT] links and new structured [VAULT-JSON] data nodes
        const vaultLinks = (data.data || []).filter((a: any) => 
          a.type === 'note' && (a.description.startsWith('[VAULT]') || a.description.startsWith('[VAULT-JSON]'))
        );
        setLinks(vaultLinks);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchVaultDocs();
  }, [dealId]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const uploadFile = async (file: File) => {
    if (!file) return;
    setUploading(true);
    setUploadProgress(10);
    
    try {
      // Read file as Base64/DataURL
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        setUploadProgress(40);

        const res = await fetch("/api/documents/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            category: uploadCategory,
            dataUrl,
            dealId,
            portalUpload: false
          })
        });

        setUploadProgress(80);

        if (res.ok) {
           setUploadProgress(100);
           setTimeout(() => {
             setUploading(false);
             setUploadProgress(0);
             fetchVaultDocs();
           }, 500);
        } else {
           const errData = await res.json();
           alert(errData.error || "Une erreur est survenue lors du téléversement");
           setUploading(false);
           setUploadProgress(0);
        }
      };
    } catch (err) {
      console.error(err);
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await uploadFile(e.target.files[0]);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Voulez-vous vraiment retirer ce document du coffre-fort ?")) return;
    try {
      const res = await fetch(`/api/activities?id=${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
         setLinks(prev => prev.filter(l => l.id !== id));
      } else {
         alert("Échec de la suppression.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "---";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  // Helper to parse unstructured legacy notes or structured JSON nodes smoothly
  const parseDocument = (link: Activity) => {
    const isJson = link.description.startsWith('[VAULT-JSON]');
    if (isJson) {
      try {
        const payloadStr = link.description.replace('[VAULT-JSON] ', '').trim();
        const payload = JSON.parse(payloadStr);
        return {
          id: link.id,
          filename: payload.filename,
          category: payload.category || "Autre",
          url: payload.url,
          size: payload.size,
          uploadedBy: payload.uploadedBy || "Agent",
          date: new Date(payload.timestamp || link.created_at).toLocaleDateString('fr-FR')
        };
      } catch (err) {
         return {
          id: link.id,
          filename: "Document Corrompu",
          category: "Autre",
          url: "#",
          size: 0,
          uploadedBy: "Inconnu",
          date: new Date(link.created_at).toLocaleDateString('fr-FR')
         };
      }
    } else {
      // Legacy parsing
      const url = link.description.replace('[VAULT] ', '').trim();
      let guessedFilename = "Lien Document Externe";
      try {
        const u = new URL(url);
        guessedFilename = u.pathname.split('/').pop() || u.hostname;
      } catch(e){}
      return {
        id: link.id,
        filename: guessedFilename,
        category: "Lien Externe",
        url: url,
        size: undefined,
        uploadedBy: "Agent",
        date: new Date(link.created_at).toLocaleDateString('fr-FR')
      };
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case "CNI":
      case "CNI / Passeport":
        return "bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/50";
      case "Livret Foncier":
        return "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50";
      case "Contrat VEFA Signé":
      case "Contrat":
        return "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/50";
      case "Attestation de Virement":
      case "Paiement":
        return "bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/50";
      case "Lien Externe":
        return "bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/50";
      default:
        return "bg-gray-100 dark:bg-[#1f2124] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800/30";
    }
  };

  const parsedDocs = links.map(parseDocument);

  return (
    <div className="bg-white dark:bg-[#141618] rounded-sm p-6 border border-asas-silver/20 shadow-sm mt-6 font-sans">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h4 className="text-sm uppercase tracking-widest text-asas-charcoal dark:text-asas-sand font-bold flex items-center gap-2">
            <FileText className="w-4 h-4 text-asas-gold" /> Le Coffre-Fort (compliance)
          </h4>
          <p className="text-[8px] text-asas-silver uppercase tracking-wider font-semibold mt-1">Classification et archivage des pièces contractuelles</p>
        </div>
        <button 
          onClick={fetchVaultDocs}
          className="p-1 px-2.5 bg-asas-sand/30 dark:bg-[#25282c]/30 hover:bg-asas-sand/50 dark:hover:bg-[#25282c]/70 text-asas-silver border border-asas-silver/20 rounded-sm text-[8px] font-bold uppercase tracking-widest flex items-center gap-1 transition-colors"
        >
          <RefreshCw className="w-3 h-3" /> Synchroniser
        </button>
      </div>

      {/* Upload and Category control */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="md:col-span-1 flex flex-col justify-center">
          <label className="text-[9px] uppercase tracking-widest font-extrabold text-asas-silver mb-2">Choisir la Catégorie</label>
          <select 
            value={uploadCategory}
            onChange={(e) => setUploadCategory(e.target.value)}
            className="w-full bg-white dark:bg-[#1c1e21] border border-asas-silver/20 rounded-sm px-3 py-2 text-[10px] uppercase font-bold text-asas-charcoal dark:text-asas-sand focus:outline-none focus:border-asas-gold cursor-pointer"
          >
            <option value="CNI / Passeport">CNI / Passeport</option>
            <option value="Livret Foncier">Livret Foncier</option>
            <option value="Contrat VEFA Signé">Contrat de Réservation Signé</option>
            <option value="Attestation de Virement">Attestation de Virement</option>
            <option value="Autre">Autre document</option>
          </select>
        </div>

        {/* Drag and drop panel */}
        <div className="md:col-span-2">
          <form 
            onDragEnter={handleDrag} 
            onDragLeave={handleDrag} 
            onDragOver={handleDrag} 
            onDrop={handleDrop}
            onSubmit={(e) => e.preventDefault()}
            className={clsx(
              "border border-dashed rounded-sm p-6 text-center transition-all flex flex-col items-center justify-center relative cursor-pointer min-h-[100px]",
              dragActive ? "border-asas-gold bg-asas-gold/5" : "border-asas-silver/30 bg-asas-sand/20 dark:bg-black/10 hover:border-asas-gold/40"
            )}
            onClick={() => document.getElementById('deal-vault-file-picker')?.click()}
          >
            <input 
              id="deal-vault-file-picker" 
              type="file" 
              className="hidden" 
              onChange={handleFileChange} 
              accept="application/pdf,image/*" 
            />

            {uploading ? (
              <div className="space-y-3 w-full max-w-[200px]">
                <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-widest text-asas-silver">
                   <span>Téléversement...</span>
                   <span>{uploadProgress}%</span>
                </div>
                <div className="h-1.5 w-full bg-asas-silver/20 rounded-full overflow-hidden">
                   <div className="h-full bg-asas-gold transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            ) : (
              <>
                <UploadCloud className="w-6 h-6 text-asas-silver group-hover:text-asas-gold mb-2" />
                <p className="text-[10px] font-bold text-asas-charcoal dark:text-asas-sand uppercase tracking-wider">
                   {dragActive ? "Déposer ici" : "Glisser-déposer un document ou cliquer"}
                </p>
                <p className="text-[8px] text-asas-silver font-semibold uppercase tracking-widest mt-1">PDF, PNG, JPEG (Max. 5MB)</p>
              </>
            )}
          </form>
        </div>
      </div>

      {loading ? (
        <div className="p-4 text-center text-asas-silver text-[9px] uppercase tracking-widest font-bold">Chargement du coffre-fort...</div>
      ) : parsedDocs.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {parsedDocs.map((doc) => (
            <div 
              key={doc.id} 
              className="flex items-center justify-between p-4 rounded-sm border border-asas-silver/20 bg-asas-sand/50 dark:bg-[#181a1c] hover:border-asas-gold/20 transition-all group"
            >
              <a 
                href={doc.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-3 overflow-hidden flex-1"
              >
                <div className="w-10 h-10 rounded-sm bg-asas-gold/10 text-asas-gold flex items-center justify-center shrink-0 border border-asas-gold/15">
                  <File className="w-5 h-5" />
                </div>
                <div className="overflow-hidden min-w-0 pr-2">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                     <span className={clsx("text-[8px] font-extrabold uppercase tracking-widest px-1.5 py-0.5 rounded-sm border", getCategoryColor(doc.category))}>
                       {doc.category}
                     </span>
                     <span className="text-[8px] bg-black/5 dark:bg-white/5 text-asas-silver px-1 rounded-sm uppercase tracking-widest font-bold font-mono">
                        {doc.uploadedBy === "Client" ? "Client" : "Agent"}
                     </span>
                  </div>
                  <h5 className="text-[10px] font-bold text-asas-charcoal dark:text-asas-sand truncate uppercase leading-tight" title={doc.filename}>
                     {doc.filename}
                  </h5>
                  <p className="text-[8px] text-asas-silver font-bold uppercase tracking-wider mt-0.5">
                    {doc.date} {doc.size ? `· ${formatFileSize(doc.size)}` : ""}
                  </p>
                </div>
              </a>

              <div className="flex items-center gap-1.5 shrink-0 pl-1">
                 <a 
                   href={doc.url} 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="p-1 px-2 bg-white dark:bg-[#1e2124] hover:bg-asas-sand dark:hover:bg-[#25282c] border border-asas-silver/25 hover:border-asas-gold/40 text-asas-silver dark:hover:text-asas-sand rounded-sm tracking-widest text-[8px] font-bold uppercase transition-colors"
                   title="Télécharger"
                 >
                   <Download className="w-3.5 h-3.5" />
                 </a>
                 <button 
                   onClick={() => handleDelete(doc.id)}
                   className="p-1 px-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/10 hover:border-red-500/20 rounded-sm transition-colors"
                   title="Supprimer"
                 >
                   <Trash2 className="w-3.5 h-3.5" />
                 </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-8 text-center border border-dashed border-asas-silver/10 rounded-sm bg-asas-sand/20 dark:bg-[#1a1c1e]/40">
           <p className="text-[10px] font-extrabold uppercase tracking-widest text-asas-silver">Coffre-fort vide</p>
           <p className="text-[8px] text-asas-silver font-semibold uppercase tracking-widest mt-1">Glissez-déposez des scans d'identité, de versements ou de quittances.</p>
        </div>
      )}
    </div>
  );
}

export function DealIntelligencePanel({ dealId }: { dealId: string }) {
  const [deal, setDeal] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false)
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false)
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false)
  const [whatsAppPayment, setWhatsAppPayment] = useState<any>(null)

  const reloadData = () => {
    setLoading(true)
    fetch(`/api/deals?id=${dealId}`)
      .then(r => r.json())
      .then(d => {
        setDeal(d.data?.[0] || d.data || null)
        setLoading(false)
      })
      .catch((err) => {
        ErrorTracker.captureError(err, { context: 'DealIntelligencePanel fetch' })
        setLoading(false)
      })
  }

  useEffect(() => {
    reloadData()
  }, [dealId])

  const handleGenerateContract = () => {
    if (!deal) return
    const doc = new jsPDF()
    const clientName = deal.clients?.full_name || 'Client Inconnu'
    const propertyRef = deal.properties?.reference_code || 'N/A'
    const projectName = deal.properties?.projects?.name || 'Projet Inconnu'
    const agreedPrice = deal.agreed_price || deal.amount || 0

    doc.setFont("helvetica", "bold")
    doc.setFontSize(22)
    doc.text("CONTRAT DE RESERVATION (VEFA)", 105, 20, { align: "center" })

    doc.setFontSize(12)
    doc.setFont("helvetica", "normal")
    doc.text(`Identifiant Transaction : ${dealId.substring(0,8).toUpperCase()}`, 20, 40)
    doc.text(`Date : ${new Date().toLocaleDateString()}`, 20, 50)

    doc.setFont("helvetica", "bold")
    doc.text("ENTRE LES SOUSSIGNES :", 20, 70)
    
    doc.setFont("helvetica", "normal")
    doc.text(`ASAS OS Immobilier (Le Promoteur)`, 20, 80)
    doc.text(`Et`, 20, 90)
    doc.text(`Monsieur/Madame ${clientName}`, 20, 100)
    if (deal.clients?.phone) {
       doc.text(`Contact : ${deal.clients.phone}`, 20, 110)
    }

    doc.setFont("helvetica", "bold")
    doc.text("OBJET DU CONTRAT :", 20, 130)
    
    doc.setFont("helvetica", "normal")
    doc.text(`Réservation du lot (Réf: ${propertyRef}) au sein du programme immobilier`, 20, 140)
    doc.text(`"${projectName}".`, 20, 150)

    doc.setFont("helvetica", "bold")
    doc.text("CONDITIONS FINANCIERES :", 20, 170)
    
    doc.setFont("helvetica", "normal")
    doc.text(`Le prix de vente convenu est de : ${(agreedPrice / 1_000_000).toFixed(2)} Millions DZD.`, 20, 180)
    
    doc.text("Signature du Promoteur", 40, 220)
    doc.text("Signature de l'Acquéreur", 130, 220)

    doc.save(`Contrat_Reservation_${propertyRef}.pdf`)
  }

  const handleGenerateReceipt = (payment: any) => {
    if (!deal) return
    const doc = new jsPDF()
    const clientName = deal.clients?.full_name || 'Client Inconnu'
    const propertyRef = deal.properties?.reference_code || 'N/A'
    
    doc.setFont("helvetica", "bold")
    doc.setFontSize(22)
    doc.text("REÇU DE PAIEMENT", 105, 20, { align: "center" })

    doc.setFontSize(12)
    doc.setFont("helvetica", "normal")
    doc.text(`Identifiant Transaction : ${dealId.substring(0,8).toUpperCase()}`, 20, 40)
    doc.text(`Reçu N° : ${payment.id.substring(0,8).toUpperCase()}`, 20, 50)
    doc.text(`Date de Paiement : ${new Date(payment.paid_date || new Date()).toLocaleDateString()}`, 20, 60)

    doc.setFont("helvetica", "bold")
    doc.text("CLIENT :", 20, 80)
    doc.setFont("helvetica", "normal")
    doc.text(`Monsieur/Madame ${clientName}`, 20, 90)

    doc.setFont("helvetica", "bold")
    doc.text("MONTANT REGLE :", 20, 110)
    doc.setFont("helvetica", "normal")
    doc.text(`${payment.amount.toLocaleString()} DZD`, 20, 120)

    doc.setFont("helvetica", "bold")
    doc.text("NATURE DU PAIEMENT :", 20, 140)
    doc.setFont("helvetica", "normal")
    doc.text(`${payment.notes || 'Avance / Appel de fonds'} - Réf: ${propertyRef}`, 20, 150)

    doc.text("Cachet et Signature de l'Agence", 130, 200)

    doc.save(`Recu_Paiement_${payment.id.substring(0,8)}.pdf`)
  }

  if (loading) {
    return (
      <div className="p-8 h-full flex flex-col justify-center items-center text-asas-charcoal/80 dark:text-asas-silver">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-[#1A2A4A] rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium animate-pulse">Chargement de la transaction...</p>
      </div>
    )
  }

  if (!deal) {
    return (
      <div className="p-8 h-full flex items-center justify-center">
        <p className="text-gray-500">Transaction introuvable.</p>
      </div>
    )
  }

  const isCritical = deal.risk_level === 'critical' || deal.risk_level === 'high'
  const agreedPrice = deal.agreed_price || deal.amount || 0
  const paymentsReceived = deal.total_payments_received || 0

  return (
          <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6 pb-[env(safe-area-inset-bottom)]">
      {/* Header section */}
      <div className="bg-white dark:bg-[#141618] rounded-sm shadow-sm border border-asas-silver/20 overflow-hidden">
        <div className="border-b border-asas-silver/20 flex items-center justify-between px-6 py-4 bg-asas-sand/30 dark:bg-black/20 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-asas-charcoal dark:text-asas-sand tracking-tight leading-none mb-1">
                Transaction #{dealId.substring(0,8).toUpperCase()}
              </h2>
              <div className="text-xs text-gray-600 dark:text-gray-400 flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" /> Logged by: {deal.profiles?.full_name || 'Système'}
                </span>
                <span className="text-gray-600">•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Réf: {deal.properties?.reference_code || 'N/A'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                const url = `${window.location.origin}/portal/${dealId}`;
                navigator.clipboard.writeText(url);
                alert('Lien du Portail Acquéreur copié dans le presse-papier !');
              }}
              className="flex items-center justify-center p-2 min-w-[36px] min-h-[36px] border border-blue-500/20 bg-blue-500/10 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 rounded-lg transition-all" title="Copier le lien du portail client">
              <ArrowUpRight className="h-4 w-4" />
            </button>
            {deal.clients?.phone && (
              <button 
                onClick={() => window.open(`https://wa.me/${deal.clients.phone.replace(/\+/g, '')}?text=${encodeURIComponent(`Bonjour ${deal.clients.full_name},\nVoici l'accès à votre Espace Acquéreur ASAS : ${window.location.origin}/portal/${dealId}`)}`, '_blank')}
                className="flex items-center justify-center p-2 min-w-[36px] min-h-[36px] border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20 rounded-lg transition-all" title="Partager le portail par WhatsApp">
                <MessageCircle className="h-4 w-4" />
              </button>
            )}
            <button onClick={() => setIsTaskModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-[#171717] border border-asas-silver/20 rounded-lg text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-white/5 transition-colors shadow-sm whitespace-nowrap active:scale-95">
              <CheckSquare className="w-4 h-4" /> Créer Tâche
            </button>
            <button onClick={handleGenerateContract} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 border border-transparent rounded-lg text-sm font-medium text-white transition-colors shadow-sm whitespace-nowrap active:scale-95">
              <FileText className="w-4 h-4 inline-block mr-1" /> Contrat (PDF)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/5">
          <div className="p-6">
            <p className="text-sm font-medium text-gray-500 mb-1 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-gray-500" /> Montant total convenu
            </p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {(agreedPrice / 1_000_000).toFixed(1)} <span className="text-lg text-gray-600 font-medium">M DZD</span>
            </p>
            <div className="mt-3 w-full bg-gray-200 dark:bg-[#171717] h-1.5 rounded-full overflow-hidden">
              <div 
                className={clsx("h-full rounded-full transition-all duration-1000", paymentsReceived >= agreedPrice ? 'bg-emerald-500' : 'bg-blue-500')} 
                style={{ width: `${Math.min((paymentsReceived / (agreedPrice || 1)) * 100, 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-gray-500 font-medium">
                {(paymentsReceived / 1_000_000).toFixed(1)}M payé • {((agreedPrice - paymentsReceived) / 1_000_000).toFixed(1)}M restant
              </p>
              <button 
                onClick={() => setIsDepositModalOpen(true)}
                className="text-[10px] uppercase tracking-widest font-bold text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-1 flex items-center gap-1 rounded transition-colors border border-emerald-500/20"
              >
                + Avance
              </button>
            </div>
          </div>
          
          <div className="p-6">
             <p className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
              <User className="w-4 h-4 text-gray-500" /> Informations Client
            </p>
            <p className="text-base font-semibold text-gray-900 dark:text-white mb-1">{deal.clients?.full_name}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{deal.clients?.phone}</p>
            <a href="#" className="text-sm text-blue-400 hover:underline inline-flex items-center gap-1 font-medium mt-1">
              Voir profil client <ArrowUpRight className="w-3 h-3" />
            </a>
          </div>

          <div className="p-6">
             <p className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
              <Building className="w-4 h-4 text-gray-500" /> Propriété & Projet
            </p>
            <p className="text-base font-semibold text-gray-900 dark:text-white mb-1">{deal.properties?.projects?.name || 'Projet inconnu'}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1 mb-2">
              <MapPin className="w-3 h-3 text-gray-500" /> {deal.properties?.reference_code ? `Réf: ${deal.properties.reference_code}` : 'Réf: ---'}
            </p>
            <span className="inline-flex px-2 py-1 bg-gray-200 dark:bg-[#171717] text-gray-600 dark:text-gray-400 border border-black/5 dark:border-white/5 text-xs rounded-md font-medium">
              Type: {deal.properties?.property_type || 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* AI Insights & Risk */}
      {isCritical ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-500/10 p-5 rounded-sm border border-red-500/20 flex gap-4 shadow-sm relative overflow-hidden backdrop-blur-sm">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/20 rounded-full blur-3xl" />
          <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0 border border-red-500/30 backdrop-blur-md">
             <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <div className="relative z-10">
            <h3 className="text-base font-bold text-red-400 mb-1">Alerte de Risque Intelligence Artificielle</h3>
            <p className="text-sm text-red-300/80 leading-relaxed">
              Le modèle d'apprentissage a détecté un risque {deal.risk_level} pour cette transaction en raison de retards de paiement historiques sur des profils similaires. Il est recommandé de demander une avance de trésorerie supérieure ou de vérifier les garanties de financement avant l'étape de clôture.
            </p>
          </div>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-blue-500/10 p-5 rounded-2xl border border-blue-500/20 flex gap-4 shadow-sm backdrop-blur-sm">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0 border border-blue-500/30 backdrop-blur-md">
             <CheckCircle2 className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-blue-400 mb-1">Analyse ASAS AI</h3>
            <p className="text-sm text-blue-300/80 leading-relaxed">
              La probabilité de clôture est évaluée à 85%. Le client a un profil fiable. Prochaine étape recommandée : Planifier une visite finale et préparer les documents de l'acte de vente.
            </p>
          </div>
        </motion.div>
      )}

      {/* Process & Checklists - Dynamic display based on Deal Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Action 1: Draft/Validation Phase */}
        {deal.status === 'draft' && (
          <div className="bg-asas-silver/5 border border-asas-silver/20 rounded-2xl p-6 col-span-1 lg:col-span-2 shadow-sm">
            <h3 className="text-lg font-bold text-asas-charcoal dark:text-asas-sand mb-3">Vérifications Pré-Contrat</h3>
            <p className="text-sm text-asas-silver mb-4">La VSP (Vente sur plan) doit être validée avant la génération des appels de fonds.</p>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 bg-white dark:bg-[#1C1E20] border border-asas-silver/20 rounded-sm">
                <input type="checkbox" className="w-5 h-5 rounded border-asas-silver/40 text-asas-gold focus:ring-asas-gold" />
                <span className="text-sm font-bold text-asas-charcoal dark:text-asas-sand object-contain">Validation de l'identité acquéreur</span>
              </label>
              <label className="flex items-center gap-3 p-3 bg-white dark:bg-[#1C1E20] border border-asas-silver/20 rounded-sm">
                <input type="checkbox" className="w-5 h-5 rounded border-asas-silver/40 text-asas-gold focus:ring-asas-gold" />
                <span className="text-sm font-bold text-asas-charcoal dark:text-asas-sand">Validation de solvabilité / Chèque de réservation déposé</span>
              </label>
            </div>
          </div>
        )}

        {/* Action 2: Notary Phase */}
        {(deal.status === 'negotiation' || deal.status === 'notary') && (
          <div className="bg-indigo-500/5 dark:bg-[#050510] border border-indigo-500/20 rounded-2xl p-6 shadow-2xl col-span-1 lg:col-span-2">
            <h3 className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" /> Signature Notaire (Gating)
            </h3>
            <p className="text-sm font-medium text-indigo-500/80 mb-6">Le dossier notaire doit être complet et déposé dans le coffre-fort pour débloquer la signature officielle.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
               {['CNI / Passeport', 'Contrat VEFA Signé', 'Attestation de Virement'].map((doc, idx) => {
                 // Check if it's implicitly injected in the Vault
                 const hasDoc = parsedDocs.some(d => d.category === doc);
                 return (
                 <div key={idx} className={clsx("border rounded-sm p-4 flex items-center justify-between transition-all", hasDoc ? "bg-emerald-500/10 border-emerald-500/30" : "bg-white dark:bg-[#141618] border-asas-silver/20")}>
                   <div className="flex items-center gap-3">
                     <div className={clsx("w-5 h-5 rounded flex items-center justify-center text-white", hasDoc ? "bg-emerald-500" : "bg-gray-300 dark:bg-[#2A2D30]")}>
                       {hasDoc && <CheckCircle2 className="w-3 h-3" />}
                     </div>
                     <span className={clsx("text-sm font-bold", hasDoc ? "text-emerald-700 dark:text-emerald-400" : "text-gray-900 dark:text-white")}>{doc}</span>
                   </div>
                   {!hasDoc && (
                     <button 
                       onClick={() => window.open(`https://wa.me/${deal.clients?.phone?.replace(/\+/g, '')}?text=${encodeURIComponent(`Salam ${deal.clients?.full_name},\n\nPour préparer la signature chez le notaire, merci de m'envoyer le document suivant : ${doc}.\n\nMerci !`)}`, '_blank')}
                       className="p-2 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 rounded-lg transition-colors">
                       <MessageCircle className="w-4 h-4" />
                     </button>
                   )}
                 </div>
               )})}
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-[#141618] rounded-sm p-6 border border-asas-silver/20 shadow-sm">
           <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-500" /> Calendrier de la Transaction
          </h3>
          <div className="relative pl-6 border-l-2 border-[#171717] space-y-6">
            <div className="relative">
              <div className="absolute w-3 h-3 bg-gray-600 rounded-full -left-[29px] top-1.5" />
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-0.5">Création de la transaction</p>
              <p className="text-xs text-gray-500">{new Date(deal.created_at).toLocaleDateString()}</p>
            </div>
             <div className="relative">
              <div className="absolute w-3 h-3 bg-blue-500 rounded-full -left-[29px] top-1.5 ring-4 ring-[#141618]" />
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-0.5">Négociation en cours</p>
              <p className="text-xs text-blue-400 font-medium">Actuel</p>
            </div>
             <div className="relative opacity-40">
              <div className="absolute w-3 h-3 bg-[#262626] rounded-full -left-[29px] top-1.5" />
              <p className="text-sm font-semibold text-gray-900 dark:text-white mb-0.5">Signature finale (Prévue)</p>
              <p className="text-xs text-gray-500">Dans 14 jours</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#141618] rounded-sm p-6 border border-asas-silver/20 shadow-sm flex flex-col justify-between">
           <div>
             <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-gray-500" /> Commission Agent
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              Basé sur le plan de commissionement <strong className="text-gray-900 dark:text-white">Standard (3%)</strong>, l'agent assigné percevra la commission lors de la réception totale des fonds.
            </p>
           </div>
           
           <div className="mt-6 p-4 bg-white dark:bg-[#141618] rounded-sm border border-asas-silver/20">
             <div className="flex justify-between items-center mb-4">
               <span className="text-sm text-gray-500 font-bold uppercase tracking-widest">Part Agence (60%)</span>
               <span className="text-sm font-bold text-gray-900 dark:text-white">{((agreedPrice * 0.03 * 0.6) / 1000).toFixed(1)}k DZD</span>
             </div>
             <div className="flex justify-between items-center mb-2 pb-4 border-b border-black/5 dark:border-white/5">
               <span className="text-sm text-blue-500 font-bold uppercase tracking-widest">Part Agent (40%)</span>
               <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{((agreedPrice * 0.03 * 0.4) / 1000).toFixed(1)}k DZD</span>
             </div>
             <div className="flex justify-between items-center mt-3">
               <span className="text-sm text-gray-500 font-bold uppercase tracking-widest">Total Commission (3%)</span>
               <span className="text-lg font-black text-gray-900 dark:text-white">{((agreedPrice * 0.03) / 1000).toFixed(1)}k DZD</span>
             </div>
           </div>
        </div>
      </div>

      <div className="bg-white dark:bg-[#141618] rounded-sm p-6 border border-asas-silver/20 shadow-sm mt-6">
        <div className="flex items-center justify-between mb-6">
           <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-500" /> Registre des Paiements & Échéancier
          </h3>
          <div className="flex items-center gap-2">
            <button 
               onClick={() => setIsScheduleModalOpen(true)}
               className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 text-xs font-bold rounded-lg transition-colors">
              + Échéance
            </button>
            <button 
               onClick={() => setIsDepositModalOpen(true)}
               className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors">
              Encaisser
            </button>
          </div>
        </div>
        
        {(!deal.deal_payments || deal.deal_payments.length === 0) ? (
           <p className="text-sm text-gray-500 italic">Aucun paiement ou appel de fonds enregistré pour cette transaction.</p>
        ) : (
           <div className="divide-y divide-black/5 dark:divide-white/5">
              {(deal.deal_payments as any[]).sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map(payment => (
                 <div key={payment.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-4 gap-4">
                    <div className="flex items-center gap-4">
                       <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", payment.status === 'paid' ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border border-amber-500/20")}>
                          {payment.status === 'paid' ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                       </div>
                       <div>
                         <p className="text-sm font-bold text-gray-900 dark:text-white">{payment.notes || 'Appel de fonds / Avance'}</p>
                         <p className="text-xs text-gray-500 mt-0.5">Échéance: {new Date(payment.due_date).toLocaleDateString()}</p>
                       </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-1/3">
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{((payment.amount) / 1000000).toFixed(2)}M DZD</p>
                      {payment.status === 'pending' && (
                        <button 
                           onClick={async (e) => {
                              e.currentTarget.disabled = true;
                              e.currentTarget.innerText = "...";
                              try {
                                 const res = await fetch('/api/command-gateway', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                       commandId: crypto.randomUUID(),
                                       aggregateId: payment.id,
                                       type: 'MARK_PAYMENT_PAID',
                                       expectedVersion: 1,
                                       payload: { dealId: deal.id, amount: payment.amount }
                                    })
                                 });
                                 if (!res.ok) throw new Error('Echec');
                                 // Optimistic update
                                 payment.status = 'paid';
                                 payment.paid_date = new Date().toISOString();
                                 deal.total_payments_received += payment.amount;
                                 setDeal({ ...deal });
                              } catch(err) {
                                 alert('Erreur technique');
                                 e.currentTarget.disabled = false;
                                 e.currentTarget.innerText = "Valider";
                              }
                           }}
                           className="px-3 py-1.5 bg-asas-sand/50 hover:bg-emerald-50 text-gray-700 hover:text-emerald-700 dark:bg-white/5 dark:hover:bg-emerald-500/10 dark:text-gray-300 dark:hover:text-emerald-400 text-xs font-bold rounded-lg border border-transparent hover:border-emerald-500/20 transition-all">
                           Valider
                        </button>
                      )}
                      {payment.status === 'paid' && (
                        <button 
                           onClick={() => handleGenerateReceipt(payment)}
                           className="px-3 py-1.5 flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 dark:text-blue-400 text-xs font-bold rounded-lg transition-colors">
                           <Download className="w-3.5 h-3.5" /> Reçu
                        </button>
                      )}
                      <button 
                         onClick={() => {
                            setWhatsAppPayment(payment);
                            setIsWhatsAppModalOpen(true);
                         }}
                         className="px-3 py-1.5 flex items-center gap-1.5 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] text-xs font-bold rounded-lg border border-[#25D366]/15 hover:border-[#25D366]/30 transition-all cursor-pointer"
                         title="Préparer une communication WhatsApp"
                      >
                         <MessageCircle className="w-3.5 h-3.5" /> WA
                      </button>
                    </div>
                 </div>
              ))}
           </div>
        )}
      </div>

      <DealVaultSection dealId={dealId} />
      <DealPortalChatSection dealId={dealId} />
      <DealActivitiesSection dealId={dealId} />

      {isTaskModalOpen && (
        <CreateTaskModal
          dealId={dealId}
          onClose={() => setIsTaskModalOpen(false)}
          onSuccess={() => setIsTaskModalOpen(false)}
        />
      )}
      
      {isDepositModalOpen && (
        <LogDepositModal 
          dealId={dealId}
          onClose={() => setIsDepositModalOpen(false)}
          onSuccess={() => { setIsDepositModalOpen(false); reloadData() }}
        />
      )}
      
      {isScheduleModalOpen && (
        <SchedulePaymentModal 
          dealId={dealId}
          onClose={() => setIsScheduleModalOpen(false)}
          onSuccess={() => { setIsScheduleModalOpen(false); reloadData() }}
        />
      )}
      
      {isWhatsAppModalOpen && (
        <WhatsAppTemplateModal
          deal={deal}
          payment={whatsAppPayment}
          onClose={() => {
            setIsWhatsAppModalOpen(false);
            setWhatsAppPayment(null);
          }}
          onSuccess={() => {
            reloadData();
          }}
        />
      )}
    </div>
  )
}
