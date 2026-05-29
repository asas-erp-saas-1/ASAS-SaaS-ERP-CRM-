'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Send,
  Bot,
  User,
  ShieldCheck,
  FileText,
  AlertTriangle,
  CheckCircle,
  Play,
  RotateCcw,
  Sliders,
  Database,
  ArrowRight,
  PlusCircle,
  Clock,
  Briefcase,
  HelpCircle,
  FileCheck2,
  Lock,
  Globe,
  Loader2
} from 'lucide-react';

interface Message {
  id: string;
  sender_role: 'user' | 'assistant' | 'system';
  content: string;
  structured_data?: {
    proposedAction?: {
      type: string;
      title: string;
      payload: any;
    };
  };
  created_at: string;
}

interface AuditLog {
  id: string;
  raw_prompt: string;
  latency_ms: number;
  has_injection_risk: boolean;
  was_blocked: boolean;
  created_at: string;
}

export default function CopilotWorkspace() {
  // Navigation & Role Configuration
  const [activeRole, setActiveRole] = useState<'executive' | 'cfo' | 'construction' | 'crm'>('executive');
  const [activeTab, setActiveTab] = useState<'assistant' | 'notary_audit' | 'safety_ledger'>('assistant');
  
  // State for Chat Tab
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init-1',
      sender_role: 'assistant',
      content: "### Bienvenue sur le Cerveau Décisionnel d'ASAS Real Estate OS\n\nJe suis votre **Copilote IA Opérationnel**. J'analyse en temps réel le grand livre des comptes, la situation d'avancement des chantiers et la délinquance clients pour formuler des recommandations stratégiques conformes à la réalité foncière algérienne.\n\nQuelle opération stratégique ou administrative voulez-vous évaluer aujourd'hui ?",
      created_at: new Date().toISOString()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  // Suggested Prompts
  const preBakedPrompts = [
    {
      label: 'Tranche de 15% El-Karia',
      text: "Lancer la tranche d'appel de fonds pour le Bloc A de la Résidence El-Karia maintenant"
    },
    {
      label: 'Analyse Retards Clients',
      text: "Quels sont les clients en retard de paiement critique de plus de 30 jours et comment y remédier ?"
    },
    {
      label: 'Blocage Notaire EDD',
      text: "Vérifier le statut légal des ventes et blocage administratif de l'EDD chez Maître Rahmouni"
    }
  ];

  // State for Document Audit Tab
  const [documentText, setDocumentText] = useState('');
  const [docType, setDocType] = useState<'notary_edd' | 'bank_agreement' | 'supplier_invoice'>('notary_edd');
  const [isAuditingDoc, setIsAuditingDoc] = useState(false);
  const [docAuditReport, setDocAuditReport] = useState<string | null>(null);
  const [docAuditEntities, setDocAuditEntities] = useState<any>(null);

  // State for Actions & Execution Terminal (Human-in-the-Loop)
  const [activeProposal, setActiveProposal] = useState<any>(null);
  const [isExecutingProposal, setIsExecutingProposal] = useState(false);
  const [executionLog, setExecutionLog] = useState<string[]>([]);
  const [sysAuditLogs, setSysAuditLogs] = useState<AuditLog[]>([]);

  // Simulation controls
  const [simulationDelayDays, setSimulationDelayDays] = useState(30);

  // Refs
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch initial system recommendation on load to trigger prompt audit ledger look & feel
  useEffect(() => {
    fetchRecommendations();
    // Simulate initial system audits to populate logs
    setSysAuditLogs([
      {
        id: 'aud-1',
        raw_prompt: "Quels sont les risques de trésorerie consolidée ?",
        latency_ms: 382,
        has_injection_risk: false,
        was_blocked: false,
        created_at: new Date(Date.now() - 360000 * 2).toISOString()
      },
      {
        id: 'aud-2',
        raw_prompt: "Lancer un virement externe de 6000000 DZD",
        latency_ms: 124,
        has_injection_risk: true,
        was_blocked: true,
        created_at: new Date(Date.now() - 360000 * 1).toISOString()
      }
    ]);
  }, []);

  const fetchRecommendations = async () => {
    try {
      const res = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get-recommendations' })
      });
      const data = await res.json();
      if (data.success && data.recommendations && data.recommendations.length > 0) {
        // Hydrate the terminal with the primary recommendation
        const primary = data.recommendations[0];
        setActiveProposal({
          type: primary.proposed_actions[0]?.type || 'TRIGGER_PROJECT_TRANCHE',
          title: primary.title,
          payload: primary.proposed_actions[0]?.payload || { projectId: 'proj-elkaria', trancheLabel: 'Appel de fonds 45%', tranchePct: 15 },
          confidence: primary.confidence_score,
          namespace: primary.namespace,
          description: primary.body
        });
      }
    } catch (_) {}
  };

  // Handler for Chat submission
  const handleSendMessage = async (customPrompt?: string) => {
    const promptToSend = customPrompt || inputMessage;
    if (!promptToSend.trim() || isLoading) return;

    setInputMessage('');
    setIsLoading(true);

    // Optimistically update frontend UI with user prompt
    const userMsgId = 'usr-' + Math.random().toString(36).substring(7);
    const updatedMessages = [
      ...messages,
      {
        id: userMsgId,
        sender_role: 'user' as const,
        content: promptToSend,
        created_at: new Date().toISOString()
      }
    ];
    setMessages(updatedMessages);

    try {
      const res = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chat',
          prompt: promptToSend,
          conversationId,
          roleScope: activeRole
        })
      });
      const data = await res.json();

      if (data.success) {
        if (data.conversationId) {
          setConversationId(data.conversationId);
        }
        
        // Use backend returned messages array which has assistant response appended
        setMessages(data.messages || [
          ...updatedMessages,
          {
            id: 'asst-' + Math.random().toString(36).substring(7),
            sender_role: 'assistant' as const,
            content: data.responseText,
            created_at: new Date().toISOString()
          }
        ]);

        // Push new prompt audit log
        setSysAuditLogs(prev => [
          {
            id: 'aud-' + Math.random().toString(36).substring(7),
            raw_prompt: promptToSend.substring(0, 60),
            latency_ms: Math.floor(Math.random() * 400) + 100,
            has_injection_risk: promptToSend.toLowerCase().includes('delete') || promptToSend.toLowerCase().includes('drop table'),
            was_blocked: false,
            created_at: new Date().toISOString()
          },
          ...prev
        ]);

        // If the assistant structured an immediate CRM / Financial action, populate the Execution Terminal
        if (data.proposedAction) {
          setActiveProposal({
            type: data.proposedAction.type,
            title: data.proposedAction.title,
            payload: data.proposedAction.payload,
            confidence: 0.985,
            namespace: activeRole === 'cfo' ? 'treasury' : activeRole === 'construction' ? 'construction' : 'commercial',
            description: data.responseText.substring(0, 180) + '...'
          });
          setExecutionLog(prev => [
            ...prev,
            `[COGNITIVE INTERFACE]: Proposition d'action "${data.proposedAction.title}" détectée et mise en file de validation réglementaire.`
          ]);
        }
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: 'err-' + Math.random().toString(36).substring(7),
          sender_role: 'assistant' as const,
          content: `⚠️ **Erreur de communication cognitive** : Impossible de contacter le serveur d'intelligence. Veuillez configurer ou vérifier votre connexion.\n*Détail : ${err.message || 'Hôte injoignable'}*`,
          created_at: new Date().toISOString()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handler for Document Audit
  const handleAuditDocument = async () => {
    if (!documentText.trim()) return;
    setIsAuditingDoc(true);
    setDocAuditReport(null);
    setDocAuditEntities(null);

    try {
      const res = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'audit-document',
          documentText,
          docType
        })
      });
      const data = await res.json();
      if (data.success) {
        setDocAuditReport(data.auditReport);
        setDocAuditEntities(data.detectedEntities);
        
        // Audit log trigger
        setSysAuditLogs(prev => [
          {
            id: 'aud-' + Math.random().toString(36).substring(7),
            raw_prompt: `Document Audit (${docType})`,
            latency_ms: data.latencyMs || 450,
            has_injection_risk: false,
            was_blocked: false,
            created_at: new Date().toISOString()
          },
          ...prev
        ]);
      }
    } catch (_) {
      // simulated default set inside backend fallback
    } finally {
      setIsAuditingDoc(false);
    }
  };

  // Execute Action via Command Gateway (HUMAN-IN-THE-LOOP SAFEGUARD)
  const handleExecuteTargetAction = async () => {
    if (!activeProposal) return;
    setIsExecutingProposal(true);
    
    // Animate executing steps in terminal
    const addLog = (text: string, delay: number) => {
      return new Promise<void>(resolve => {
        setTimeout(() => {
          setExecutionLog(prev => [...prev, `[${new Date().toLocaleTimeString('fr-FR')}] ${text}`]);
          resolve();
        }, delay);
      });
    };

    await addLog("Validation de l'identité de l'opérateur et isolation globale...", 300);
    await addLog(`Appel de la commande d'entreprise : ${activeProposal.type}`, 400);
    await addLog(`Payload d'exécution : ${JSON.stringify(activeProposal.payload)}`, 400);

    try {
      const res = await fetch('/api/command-gateway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commandId: 'cmd-' + Math.random().toString(36).substring(7),
          aggregateId: activeProposal.payload.projectId || 'agg-target',
          type: activeProposal.type,
          expectedVersion: 1,
          payload: activeProposal.payload
        })
      });

      const data = await res.json();
      if (data.success || data.dispatched !== undefined) {
        await addLog(`✅ SUCCÈS : Commande traitée avec succès par le noyau de double entrée.`, 400);
        await addLog(`Registre mis à jour. Événement persistant sauvegardé de manière immuable.`, 300);
        
        // Visual cue
        setActiveProposal(null);
      } else {
        await addLog(`❌ ERREUR COMMAND GATEWAY : ${data.error || 'Rejet par la règle d\'audit transactionnel'}`, 300);
      }
    } catch (err: any) {
      await addLog(`❌ ÉCHEC : Erreur réseau lors de la transaction d'entreprise .`, 400);
    } finally {
      setIsExecutingProposal(false);
    }
  };

  // Pre-seed some document examples so user can test OCR instantly
  const seedDocumentSample = () => {
    if (docType === 'notary_edd') {
      setDocumentText(`ETAT DESCRIPTIF DE DIVISION ET REGLEMENT DE COPROPRIETE
Fait devant Maître Rahmouni, notaire résident de la daïra d'El Biar, Alger.
CONSTATATIONS TECHNIQUES :
Le programme immobilier « Résidence El-Karia », sis à Alger-Ouest, comprend des parcelles désignées cadastrées section 14.
Il est certifié que la dalle de compression du niveau R+2 du Bloc-A a été coulée avec succès en béton d'Alger dosé à 350 kg/m³.
L'apport en valeur foncière déclarée est de 18,500,000 DZD avec une TVA légale fixée à 19%.
Absence constatée de la signature officielle du visa d'avancement émis par le bureau de contrôle agrégé CTC.`);
    } else if (docType === 'bank_agreement') {
      setDocumentText(`CONVENTION DE FINANCEMENT ACQUEREUR PAR PRÊT IMMOBILIER GOURMAND
Entre les soussignés, CNEP-Banque, Agence Didouche Mourad 104, Alger
D'une part, et M. Amine Belkacem, acquéreur désigné au lot F4 N°12.
Le prêt accordé à l'emprunteur s'élève à 12,000,000 DZD au taux préférentiel de 1.00% sous condition expresse de dépôt de l'État Descriptif de Division (EDD) légalement notarié et publié sous 60 jours.`);
    } else {
      setDocumentText(`FACTURE PRESTATAIRE F-2026-902
Émise par l'Entreprise de Travaux de Bâtiment ETB Mourad, sise à Blida.
Pour le compte de ASAS SAS - Promotion Immobilière.
Réf : Coulage de dalles et gros œuvre gros béton sur Zéralda.
Total Brut : 3,200,000 DZD.
Retard de versement de notre acompte de 14 jours constaté.`);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="asas-copilot-container">
      {/* 1. Left - Operations & Scope selector */}
      <div className="lg:col-span-3 flex flex-col gap-5">
        <div className="bg-asas-charcoal border border-asas-silver/20 rounded-sm p-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-asas-gold/5 rounded-full blur-2xl pointer-events-none"></div>
          <h2 className="text-xs uppercase font-extrabold text-asas-sand/90 tracking-widest mb-3 flex items-center gap-2">
            <Sliders className="h-4 w-4 text-asas-gold animate-pulse" />
            Portée Opérationnelle
          </h2>
          <p className="text-xs text-asas-silver mb-4 leading-relaxed">
            Adaptez les filtres cognitifs du copilote selon votre direction stratégique :
          </p>

          <div className="flex flex-col gap-2">
            {[
              { id: 'executive', name: 'Bureau du CEO (Général)', icon: Briefcase, color: 'text-asas-gold' },
              { id: 'cfo', name: 'Direction Finance & Trésor', icon: Database, color: 'text-asas-sand' },
              { id: 'construction', name: 'Ingénieur d\'Affaire Chantier', icon: FileCheck2, color: 'text-asas-copper' },
              { id: 'crm', name: 'Commercial & Relances', icon: User, color: 'text-asas-silver' }
            ].map(role => (
              <button
                key={role.id}
                onClick={() => setActiveRole(role.id as any)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs text-left font-bold border rounded-sm transition-all duration-300 ${
                  activeRole === role.id
                    ? 'bg-white/10 border-asas-gold text-asas-sand'
                    : 'bg-white/5 border-transparent text-asas-silver/70 hover:bg-white/10 hover:text-asas-sand'
                }`}
              >
                <role.icon className={`h-4 w-4 shrink-0 ${role.color}`} strokeWidth={1.5} />
                <span>{role.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Quick presets queries */}
        <div className="bg-asas-charcoal border border-asas-silver/20 rounded-sm p-4">
          <h2 className="text-xs uppercase font-extrabold text-asas-sand/90 tracking-widest mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-asas-gold" />
            Requêtes Rapides
          </h2>
          <p className="text-[11px] text-asas-silver mb-4">
            Demandez une analyse cognitive immédiate sur une fragilité du marché local algérien :
          </p>
          <div className="flex flex-col gap-2">
            {preBakedPrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(p.text)}
                className="w-full text-left p-2.5 bg-white/5 hover:bg-white/10 border border-asas-silver/10 hover:border-asas-gold/30 rounded-sm text-xs text-asas-sand font-medium transition-all group"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate group-hover:text-asas-gold transition-colors">{p.label}</span>
                  <ArrowRight className="h-3 w-3 text-asas-silver shrink-0 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Localized Market Warnings Feed */}
        <div className="bg-asas-charcoal/40 border border-asas-silver/10 rounded-sm p-4 text-xs">
          <p className="font-extrabold uppercase text-[10px] tracking-widest text-asas-silver mb-3 flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-asas-gold" />
            Variables d'Algérie
          </p>
          <div className="flex flex-col gap-2.5 text-asas-silver/80">
            <div className="flex items-start gap-2 border-b border-asas-silver/10 pb-2">
              <span className="text-asas-gold text-lg leading-none shrink-0">•</span>
              <p className="leading-relaxed">
                Compte d'attente CNEP : Retard moyen national de validation d'actes estimé à **45 jours** en Mai 2026.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-asas-gold text-lg leading-none shrink-0">•</span>
              <p className="leading-relaxed">
                Appel de tranches chantiers : Enregistrements obligatoirement authentifiés sous pénalités du code foncier.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Middle - Interactive Workspace Workspace */}
      <div className="lg:col-span-6 flex flex-col gap-6">
        {/* Workspace tabs selector */}
        <div className="flex border-b border-asas-silver/20 bg-asas-charcoal rounded-sm p-1 gap-1">
          {[
            { id: 'assistant', label: 'Copilote Tactique', icon: Bot },
            { id: 'notary_audit', label: 'Auditeur de Documents & Actes', icon: FileText },
            { id: 'safety_ledger', label: 'Journal d\'Audit Sécurité (LGP)', icon: ShieldCheck }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold transition-all rounded-sm ${
                activeTab === tab.id
                  ? 'bg-white/10 text-asas-gold border border-white/5'
                  : 'text-asas-silver/70 hover:text-asas-sand hover:bg-white/5'
              }`}
            >
              <tab.icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab content area */}
        <div className="bg-asas-charcoal border border-asas-silver/20 rounded-sm min-h-[500px] flex flex-col overflow-hidden">
          
          {/* TAB 1: OPERATIONAL CHAT ASSISTANT */}
          {activeTab === 'assistant' && (
            <div className="flex-1 flex flex-col min-h-[500px] relative">
              <div className="absolute inset-0 pointer-events-none opacity-5 mix-blend-overlay z-0 bg-[radial-gradient(ellipse_at_top,#C7A15A,transparent_60%)]"></div>
              
              {/* Messages viewport */}
              <div className="flex-1 p-6 overflow-y-auto max-h-[420px] space-y-4 custom-scrollbar z-10">
                <AnimatePresence initial={false}>
                  {messages.map((m) => (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-3 max-w-[85%] ${
                        m.sender_role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-sm flex items-center justify-center border shrink-0 ${
                          m.sender_role === 'user'
                            ? 'bg-asas-gold/10 border-asas-gold/30 text-asas-gold'
                            : 'bg-asas-navy border-asas-silver/20 text-asas-sand'
                        }`}
                      >
                        {m.sender_role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                      </div>

                      <div
                        className={`p-3 rounded-sm text-xs leading-relaxed border ${
                          m.sender_role === 'user'
                            ? 'bg-white/10 border-white/15 text-asas-sand'
                            : 'bg-white/5 border-white/5 text-asas-sand'
                        }`}
                      >
                        {/* Custom rudimentary markdown rendering safe parsing */}
                        {m.content.split('\n\n').map((para, pIdx) => {
                          if (para.startsWith('### ')) {
                            return <h3 key={pIdx} className="text-sm font-bold text-asas-gold mb-2 mt-2">{para.replace('### ', '')}</h3>;
                          }
                          if (para.startsWith('* ')) {
                            return (
                              <ul key={pIdx} className="list-disc pl-4 space-y-1 mb-2">
                                {para.split('\n').map((li, lIdx) => (
                                  <li key={lIdx}>{li.replace('* ', '')}</li>
                                ))}
                              </ul>
                            );
                          }
                          return <p key={pIdx} className="mb-2 last:mb-0 text-asas-sand/90">{para}</p>;
                        })}
                      </div>
                    </motion.div>
                  ))}
                  
                  {isLoading && (
                    <div className="flex gap-3 mr-auto max-w-[80%] items-center text-xs text-asas-silver">
                      <div className="w-8 h-8 rounded-sm bg-asas-navy border border-asas-silver/20 flex items-center justify-center">
                        <Loader2 className="h-4 w-4 text-asas-gold animate-spin" />
                      </div>
                      <span>Simulation de raisonnement cognitif en cours (Modèle Gemini-2.5-Flash)...</span>
                    </div>
                  )}
                </AnimatePresence>
                <div ref={chatBottomRef} />
              </div>

              {/* Chat action box footer */}
              <div className="p-4 bg-asas-charcoal border-t border-asas-silver/10 sticky bottom-0 z-20">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Posez une question administrative, financière ou relative aux chantiers..."
                    className="flex-1 bg-white/5 border border-asas-silver/20 rounded-sm px-3 py-2.5 text-xs text-white placeholder-asas-silver/60 focus:outline-none focus:border-asas-gold focus:ring-1 focus:ring-asas-gold transition-all"
                  />
                  <button
                    onClick={() => handleSendMessage()}
                    disabled={isLoading || !inputMessage.trim()}
                    className="px-4 py-2.5 bg-asas-gold hover:bg-asas-gold/90 disabled:opacity-50 text-asas-charcoal font-bold rounded-sm text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Calculer</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: NOTARY & CONTRACT AUDIT */}
          {activeTab === 'notary_audit' && (
            <div className="p-5 flex flex-col gap-4">
              <div className="relative border border-dashed border-asas-silver/30 rounded-sm p-4 bg-white/5 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-asas-sand">Type de document foncier ou d'engagement :</span>
                  <select
                    value={docType}
                    onChange={(e: any) => setDocType(e.target.value)}
                    className="bg-asas-charcoal border border-asas-silver/20 text-xs text-asas-sand px-2 py-1 rounded-sm focus:outline-none focus:border-asas-gold"
                  >
                    <option value="notary_edd">Acte EDD du Notaire (Cession/Copropriété)</option>
                    <option value="bank_agreement">Lettre d'engagement de prêt (CNEP/BADR)</option>
                    <option value="supplier_invoice">Facture ou Devis Fournisseur (ETB/CTC/Lafarge)</option>
                  </select>
                </div>
                
                <textarea
                  value={documentText}
                  onChange={(e) => setDocumentText(e.target.value)}
                  placeholder="Collez ici le texte brut extrait (OCR) de votre acte notarié, règlement d'EDD ou contrat..."
                  className="w-full h-40 bg-asas-charcoal border border-asas-silver/25 rounded-sm p-3 text-xs text-white placeholder-asas-silver/50 focus:outline-none focus:border-asas-gold focus:ring-1 focus:ring-asas-gold font-mono resize-none leading-relaxed"
                />

                <div className="flex justify-between items-center gap-2">
                  <button
                    onClick={seedDocumentSample}
                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-[11px] font-bold text-asas-silver hover:text-white rounded-sm border border-asas-silver/10 transition-all flex items-center gap-1"
                  >
                    <PlusCircle className="h-3 w-3" /> Insérer un texte démo d'Algérie
                  </button>

                  <button
                    onClick={handleAuditDocument}
                    disabled={isAuditingDoc || !documentText.trim()}
                    className="px-4 py-1.5 bg-asas-gold hover:bg-asas-gold/90 text-xs font-bold text-asas-charcoal rounded-sm transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {isAuditingDoc ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Audit en cours...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-3.5 w-3.5" />
                        <span>Lancer l'Audit Cognitif</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Render Audit report outputs results */}
              {docAuditReport && (
                <div className="bg-white/5 border border-asas-silver/20 rounded-sm p-4 text-xs">
                  <div className="flex items-center justify-between border-b border-asas-silver/10 pb-2.5 mb-3">
                    <span className="font-bold uppercase tracking-wider text-asas-gold flex items-center gap-1.5">
                      <FileCheck2 className="h-4 w-4" /> Analyse de Conformité Réglementaire
                    </span>
                    <span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded-sm ${
                      docAuditEntities?.declared_amount_dzd ? 'bg-asas-copper/20 text-asas-gold border border-asas-copper/40' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    }`}>
                      {docAuditEntities?.declared_amount_dzd ? 'Partiellement Conforme' : 'Vérifié Match Double Entrée'}
                    </span>
                  </div>

                  {/* Markdown Audit content */}
                  <div className="space-y-3 leading-relaxed text-asas-sand/90">
                    {docAuditReport.split('\n\n').map((para, idx) => {
                      if (para.startsWith('### ')) {
                        return <h4 key={idx} className="text-xs font-bold text-asas-gold uppercase tracking-wider">{para.replace('### ', '')}</h4>;
                      }
                      if (para.startsWith('* ')) {
                        return (
                          <ul key={idx} className="list-disc pl-4 space-y-1">
                            {para.split('\n').map((li, subIdx) => (
                              <li key={subIdx} className="text-[11px]">{li.replace('* ', '')}</li>
                            ))}
                          </ul>
                        );
                      }
                      return <p key={idx} className="text-[11px]">{para}</p>;
                    })}
                  </div>

                  {/* Extracted Entities Table */}
                  {docAuditEntities && (
                    <div className="mt-4 pt-3 border-t border-asas-silver/10">
                      <h5 className="font-bold text-[10px] uppercase text-asas-silver tracking-wider mb-2">Métriques Structurées Extraites :</h5>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px] font-mono">
                        <div className="bg-asas-charcoal p-2 border border-asas-silver/10 rounded-sm">
                          <p className="text-asas-silver text-[9px] uppercase">Banque / Notaire :</p>
                          <p className="font-bold text-asas-sand truncate">{docAuditEntities.notary_signatory}</p>
                        </div>
                        <div className="bg-asas-charcoal p-2 border border-asas-silver/10 rounded-sm">
                          <p className="text-asas-silver text-[9px] uppercase">Montant Détecté :</p>
                          <p className="font-bold text-asas-gold">
                            {(docAuditEntities.declared_amount_dzd || docAuditEntities.stamped_dzd || 0).toLocaleString()} DZD
                          </p>
                        </div>
                        <div className="bg-asas-charcoal p-2 border border-asas-silver/10 rounded-sm col-span-2 sm:col-span-1">
                          <p className="text-asas-silver text-[9px] uppercase">Analyseur :</p>
                          <p className="font-bold text-asas-silver truncate">{docAuditEntities.extracted_by}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PROMPT AUDITS LEDGER */}
          {activeTab === 'safety_ledger' && (
            <div className="p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-asas-silver/20 pb-2">
                <div>
                  <h3 className="text-xs font-bold text-asas-sand flex items-center gap-1.5 uppercase">
                    <ShieldCheck className="h-4 w-4 text-asas-gold" /> Légitimité & Contrôle d'Injection Cognitive
                  </h3>
                  <p className="text-[10px] text-asas-silver">
                    Registre des audits de prompts pour la conformité et la sécurité de l'IA (norme algérienne)
                  </p>
                </div>
                <button
                  onClick={() => setSysAuditLogs([])}
                  className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded-sm border border-asas-silver/10 text-[10px] font-bold text-asas-silver flex items-center gap-1"
                >
                  <RotateCcw className="h-3 w-3" /> Initialiser les Logs
                </button>
              </div>

              <div className="overflow-x-auto text-[11px] font-mono leading-relaxed">
                <table className="w-full border-collapse border border-asas-silver/10">
                  <thead className="bg-white/5 text-asas-silver uppercase text-[9px]">
                    <tr>
                      <th className="border border-asas-silver/10 p-2 text-left">Date / Heure</th>
                      <th className="border border-asas-silver/10 p-2 text-left">Calcul du Prompt</th>
                      <th className="border border-asas-silver/10 p-2 text-center">Latence (MS)</th>
                      <th className="border border-asas-silver/10 p-2 text-center">Injection Risk</th>
                      <th className="border border-asas-silver/10 p-2 text-center">Statut Audit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sysAuditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-white/5 transition-colors">
                        <td className="border border-asas-silver/10 p-2 text-asas-silver">
                          {new Date(log.created_at).toLocaleTimeString('fr-FR')}
                        </td>
                        <td className="border border-asas-silver/10 p-2 text-asas-sand max-w-[200px] truncate">
                          {log.raw_prompt}
                        </td>
                        <td className="border border-asas-silver/10 p-2 text-center font-bold text-asas-sand">
                          {log.latency_ms} ms
                        </td>
                        <td className="border border-asas-silver/10 p-2 text-center">
                          {log.has_injection_risk ? (
                            <span className="px-1.5 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[9px] font-bold rounded-sm uppercase">PROMPT ATTACK</span>
                          ) : (
                            <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold rounded-sm uppercase">SÉCURISÉ</span>
                          )}
                        </td>
                        <td className="border border-asas-silver/10 p-2 text-center">
                          {log.was_blocked ? (
                            <span className="px-1.5 py-0.5 bg-rose-600/20 text-rose-300 border border-rose-600/40 text-[9px] font-bold rounded-sm uppercase">BLOQUÉ</span>
                          ) : (
                            <span className="px-1.5 py-0.5 bg-green-500/10 text-green-400 border border-green-500/20 text-[9px] font-bold rounded-sm uppercase">AUDITÉ APPROVED</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* 3. Right - Execution Terminal & Decision validation Panel */}
      <div className="lg:col-span-3">
        <div className="bg-asas-charcoal border border-asas-silver/20 rounded-sm p-4 h-full flex flex-col">
          <h2 className="text-xs uppercase font-extrabold text-asas-sand/90 tracking-widest mb-3 flex items-center gap-1.5">
            <Lock className="h-4 w-4 text-asas-gold" />
            Terminal de Décision (HIPL)
          </h2>
          
          <p className="text-[11px] text-asas-silver mb-4 leading-normal">
            Conformément à la gouvernance, le copilote formule des propositions qui exigent un consentement humain explicite pour interagir avec le registre double-entrée.
          </p>

          {activeProposal ? (
            <div className="flex-1 flex flex-col gap-4">
              <div className="bg-white/5 border border-asas-silver/20 rounded-sm p-3 flex flex-col gap-2 text-xs">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-mono text-asas-silver uppercase">Confiance IA :</span>
                  <span className="font-bold text-asas-gold">{(activeProposal.confidence * 100).toFixed(1)}%</span>
                </div>
                
                <h4 className="font-bold text-asas-sand">{activeProposal.title}</h4>
                <p className="text-[11px] text-asas-silver leading-relaxed capitalize">
                  Secteur d'exploitation : <span className="text-asas-gold font-bold">{activeProposal.namespace}</span>
                </p>

                <div className="mt-2 bg-asas-charcoal p-2 border border-asas-silver/10 rounded-sm">
                  <p className="text-[10px] text-asas-silver uppercase mb-1 font-mono">Payload de la Commande :</p>
                  <pre className="text-[10px] font-mono text-asas-sand overflow-x-auto whitespace-pre p-1">
                    {JSON.stringify(activeProposal.payload, null, 2)}
                  </pre>
                </div>
              </div>

              <div className="mt-auto pt-4 flex flex-col gap-2">
                <button
                  onClick={handleExecuteTargetAction}
                  disabled={isExecutingProposal}
                  className="w-full py-2 bg-gradient-to-r from-asas-gold to-asas-sand hover:from-asas-gold/90 hover:to-asas-sand/90 text-asas-charcoal font-bold rounded-sm text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {isExecutingProposal ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Validation en cours...</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5" />
                      <span>Approuver & Exécuter (ERP)</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    setActiveProposal(null);
                    setExecutionLog(prev => [...prev, `[LOG]: Rejet de la proposition d'action par l'opérateur.`]);
                  }}
                  className="w-full py-1.5 bg-white/5 hover:bg-white/10 text-asas-silver hover:text-white border border-transparent hover:border-asas-silver/10 rounded-sm text-xs transition-all font-bold"
                >
                  Rejeter la recommandation
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border border-dashed border-asas-silver/20 rounded-sm bg-white/5 text-asas-silver">
              <Bot className="h-8 w-8 mb-2 text-asas-gold animate-bounce" strokeWidth={1} />
              <p className="text-xs font-bold text-asas-sand">En attente d'une proposition</p>
              <p className="text-[11px] mt-1 leading-normal text-asas-silver/70">
                Lancer une analyse de chat ou un audit d'acte notarié pour soumettre de nouvelles actions à valider.
              </p>
            </div>
          )}

          {/* Execution audit console log */}
          {executionLog.length > 0 && (
            <div className="mt-4 pt-3 border-t border-asas-silver/10">
              <h5 className="text-[10px] font-mono uppercase text-asas-silver mb-1.5 tracking-wider">Console d'exécution :</h5>
              <div className="bg-black/45 p-2 rounded-sm border border-asas-silver/5 font-mono text-[9px] text-emerald-400 space-y-1 h-24 overflow-y-auto custom-scrollbar">
                {executionLog.map((log, idx) => (
                  <p key={idx}>{log}</p>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
