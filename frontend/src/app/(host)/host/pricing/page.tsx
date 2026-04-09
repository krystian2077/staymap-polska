"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Link from "next/link";
import { api } from "@/lib/api";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

const CARD = "rounded-2xl bg-white shadow-card ring-1 ring-black/[.04]";

type ListingPricing = {
  id: string;
  title: string;
  slug: string;
  base_price: string;
  cleaning_fee: string;
  currency: string;
  booking_mode: string;
  cancellation_policy?: string;
  max_guests: number;
};

const BOOKING_MODE_LABELS: Record<string, string> = {
  instant: "Natychmiastowa",
  request: "Na prośbę",
};

const POLICY_LABELS: Record<string, { label: string; desc: string }> = {
  flexible: { label: "Elastyczna", desc: "Bezpłatna rezygnacja do 24h przed zameldowaniem." },
  moderate: { label: "Umiarkowana", desc: "Bezpłatna rezygnacja do 5 dni przed zameldowaniem." },
  strict: { label: "Ścisła", desc: "Bezpłatna rezygnacja do 14 dni przed zameldowaniem." },
  non_refundable: { label: "Bezzwrotna", desc: "Brak zwrotu po dokonaniu rezerwacji." },
};

export default function HostPricingPage() {
  const [listings, setListings] = useState<ListingPricing[] | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [editFee, setEditFee] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let c = false;
    (async () => {
      try {
        const res = await api.get<{ data: ListingPricing[] }>("/api/v1/host/listings/");
        if (!c) setListings(res.data ?? []);
      } catch {
        if (!c) setListings([]);
      }
    })();
    return () => { c = true; };
  }, []);

  const startEdit = (l: ListingPricing) => {
    setEditId(l.id);
    setEditPrice(l.base_price);
    setEditFee(l.cleaning_fee);
  };

  const savePrice = async () => {
    if (!editId) return;
    setSaving(true);
    try {
      await api.patch(`/api/v1/host/listings/${editId}/`, {
        base_price: editPrice,
        cleaning_fee: editFee,
      });
      toast.success("Ceny zaktualizowane.");
      setListings((prev) =>
        prev?.map((l) =>
          l.id === editId ? { ...l, base_price: editPrice, cleaning_fee: editFee } : l
        ) ?? null
      );
      setEditId(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Nie udało się zapisać cen.");
    } finally {
      setSaving(false);
    }
  };

  if (listings === null) {
    return <div className="flex justify-center py-24"><LoadingSpinner className="h-10 w-10 text-brand" /></div>;
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <p className="text-[11px] font-extrabold uppercase tracking-[.15em] text-brand">Cennik</p>
        <h1 className="mt-1 text-[22px] font-extrabold text-brand-dark">Ceny i reguły</h1>
        <p className="text-sm text-text-secondary">Zarządzaj cenami, opłatami i polityką rezerwacji.</p>
      </div>

      {listings.length === 0 ? (
        <div className="rounded-2xl bg-brand-surface/50 ring-1 ring-brand/5 py-16 text-center">
          <p className="text-lg font-bold text-brand-dark">Brak ofert</p>
          <p className="mt-1 text-sm text-text-muted">Dodaj ofertę, aby zarządzać cenami.</p>
          <Link href="/host/new-listing" className="btn-primary mt-6 inline-flex">Dodaj ofertę</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {listings.map((l) => {
            const isEditing = editId === l.id;
            const policy = POLICY_LABELS[l.cancellation_policy ?? "flexible"];
            return (
              <div key={l.id} className={`${CARD} p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-elevated`}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <Link href={`/listing/${l.slug}`} className="text-base font-bold text-brand-dark hover:text-brand hover:underline">
                      {l.title}
                    </Link>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="rounded-full bg-brand-muted px-2.5 py-1 text-[10px] font-bold text-brand-dark">
                        {BOOKING_MODE_LABELS[l.booking_mode] ?? l.booking_mode}
                      </span>
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-bold text-gray-600">
                        Max {l.max_guests} gości
                      </span>
                    </div>
                  </div>

                  {!isEditing ? (
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-2xl font-extrabold text-brand-dark">{l.base_price} <span className="text-sm font-medium text-text-muted">{l.currency}/noc</span></p>
                        {Number(l.cleaning_fee) > 0 && (
                          <p className="text-xs text-text-muted">+ {l.cleaning_fee} {l.currency} sprzątanie</p>
                        )}
                      </div>
                      <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={() => startEdit(l)}>
                        Edytuj ceny
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-end gap-3">
                      <label className="text-xs font-semibold text-text-secondary">
                        Cena/noc ({l.currency})
                        <input type="number" className="mt-1 w-28 rounded-xl border-0 bg-[#f7f9f8] px-3 py-2.5 text-sm ring-1 ring-black/[.06] focus:ring-2 focus:ring-brand" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} />
                      </label>
                      <label className="text-xs font-semibold text-text-secondary">
                        Sprzątanie ({l.currency})
                        <input type="number" className="mt-1 w-28 rounded-xl border-0 bg-[#f7f9f8] px-3 py-2.5 text-sm ring-1 ring-black/[.06] focus:ring-2 focus:ring-brand" value={editFee} onChange={(e) => setEditFee(e.target.value)} />
                      </label>
                      <div className="flex gap-2">
                        <button type="button" className="btn-secondary px-3 py-2 text-xs" onClick={() => setEditId(null)}>Anuluj</button>
                        <button type="button" className="btn-primary px-3 py-2 text-xs" disabled={saving} onClick={() => void savePrice()}>
                          {saving ? "…" : "Zapisz"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {policy && (
                  <div className="mt-4 rounded-xl bg-brand-surface/50 px-4 py-3">
                    <p className="text-xs font-bold text-brand-dark">Polityka rezygnacji: {policy.label}</p>
                    <p className="mt-0.5 text-xs text-text-muted">{policy.desc}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
