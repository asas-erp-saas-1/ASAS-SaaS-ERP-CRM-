"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Handshake, AlertCircle, Save, Loader2 } from "lucide-react";
import { ErrorTracker } from "@/lib/observability/errors";
import type { Client, Property } from "@/types/app";

function DealForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const leadId = searchParams.get("leadId") || "";

  const [formData, setFormData] = useState({
    clientId: "",
    propertyId: "",
    agreedPrice: "",
    dealType: "sale",
    leadId: leadId,
  });

  const [clients, setClients] = useState<Client[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [cRes, pRes] = await Promise.all([
          fetch("/api/clients"),
          fetch("/api/properties"),
        ]);
        const cData = await cRes.json();
        const pData = await pRes.json();
        setClients(cData.data || []);

        // Only get available properties
        const availProps = (pData.data || []).filter(
          (p: Property) => p.status === "available",
        );
        setProperties(availProps);
      } catch (e: any) {
        ErrorTracker.captureError(e, { context: "DealForm load" });
      } finally {
        setLoadingData(false);
      }
    }
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!formData.clientId || !formData.propertyId || !formData.agreedPrice) {
        throw new Error(
          "Veuillez remplir tous les champs obligatoires (Client, Propriété, Prix).",
        );
      }

      const price = Number(formData.agreedPrice);
      if (isNaN(price) || price <= 0) {
        throw new Error("Prix convenu invalide.");
      }

      const payload = {
        client_id: formData.clientId,
        property_id: formData.propertyId,
        deal_type: formData.dealType,
        agreed_price: price,
        leadId: formData.leadId || undefined,
      };

      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          errData.error || "Erreur lors de la création du dossier de vente.",
        );
      }

      router.push("/dashboard/deals");
    } catch (err: any) {
      setError(err.message);
      ErrorTracker.captureError(err, { context: "DealCreationForm" });
    } finally {
      setLoading(false);
    }
  }

  if (loadingData) {
    return (
      <div className="flex items-center justify-center p-24">
        <Loader2 className="w-8 h-8 animate-spin text-asas-gold" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto mt-4 sm:mt-8 bg-white dark:bg-[#141618] border border-asas-silver/20 p-5 sm:p-8 rounded-sm shadow-sm relative overflow-hidden">
      <div className="flex items-center gap-3 mb-8 relative z-10">
        <div className="w-12 h-12 bg-asas-navy text-asas-sand rounded-sm flex items-center justify-center border border-asas-gold/20 shadow-[0_0_15px_rgba(199,161,90,0.15)]">
          <Handshake className="w-6 h-6" strokeWidth={1.5} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-asas-charcoal dark:text-asas-sand tracking-tight uppercase font-display">
            Ouverture de Dossier
          </h1>
          <p className="text-xs font-bold text-asas-silver uppercase tracking-widest mt-1">
            Création d'une nouvelle opération immobilière
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-sm flex items-center gap-3 font-semibold text-xs uppercase tracking-widest relative z-10">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-[10px] font-bold text-asas-charcoal/80 dark:text-asas-silver mb-2 uppercase tracking-wide">
              Client Acquéreur *
            </label>
            <select
              className="w-full bg-white dark:bg-[#1A1D20] border border-asas-silver/20 text-asas-charcoal dark:text-white rounded-sm px-4 py-3 focus:outline-none focus:border-asas-gold focus:ring-1 focus:ring-asas-gold transition-all text-sm font-medium"
              value={formData.clientId}
              onChange={(e) =>
                setFormData({ ...formData, clientId: e.target.value })
              }
            >
              <option value="">Sélectionner un profil...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name} {c.phone ? `(${c.phone})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-asas-charcoal/80 dark:text-asas-silver mb-2 uppercase tracking-wide">
              Produit / Unité *
            </label>
            <select
              className="w-full bg-white dark:bg-[#1A1D20] border border-asas-silver/20 text-asas-charcoal dark:text-white rounded-sm px-4 py-3 focus:outline-none focus:border-asas-gold focus:ring-1 focus:ring-asas-gold transition-all text-sm font-medium"
              value={formData.propertyId}
              onChange={(e) =>
                setFormData({ ...formData, propertyId: e.target.value })
              }
            >
              <option value="">Sélectionner un bien...</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.reference_code || p.type} {p.rooms ? `(${p.rooms})` : ""} -{" "}
                  {p.area_sqm ? `${p.area_sqm} m²` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-[10px] font-bold text-asas-charcoal/80 dark:text-asas-silver mb-2 uppercase tracking-wide">
              Prix Convenu (DZD) *
            </label>
            <input
              type="number"
              className="w-full bg-white dark:bg-[#1A1D20] border border-asas-silver/20 text-asas-charcoal dark:text-white rounded-sm px-4 py-3 focus:outline-none focus:border-asas-gold focus:ring-1 focus:ring-asas-gold transition-all text-sm font-medium"
              placeholder="ex: 15000000"
              value={formData.agreedPrice}
              onChange={(e) =>
                setFormData({ ...formData, agreedPrice: e.target.value })
              }
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-asas-charcoal/80 dark:text-asas-silver mb-2 uppercase tracking-wide">
              Type d'Opération *
            </label>
            <select
              className="w-full bg-white dark:bg-[#1A1D20] border border-asas-silver/20 text-asas-charcoal dark:text-white rounded-sm px-4 py-3 focus:outline-none focus:border-asas-gold focus:ring-1 focus:ring-asas-gold transition-all text-sm font-medium"
              value={formData.dealType}
              onChange={(e) =>
                setFormData({ ...formData, dealType: e.target.value })
              }
            >
              <option value="sale">Vente (VSP/VFA)</option>
              <option value="rental">Location</option>
              <option value="lease">Leasing / Autres</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={
            loading ||
            !formData.clientId ||
            !formData.propertyId ||
            !formData.agreedPrice
          }
          className="w-full flex justify-center items-center gap-2 py-4 px-6 border border-transparent rounded-sm text-xs font-bold text-asas-charcoal uppercase tracking-widest bg-asas-gold hover:bg-asas-gold/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-asas-gold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(199,161,90,0.3)] mt-8"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Save className="w-4 h-4" />
              Générer Dossier Financier
            </>
          )}
        </button>
      </form>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-asas-silver text-sm uppercase tracking-widest font-bold font-mono">
          Chargement...
        </div>
      }
    >
      <DealForm />
    </Suspense>
  );
}
