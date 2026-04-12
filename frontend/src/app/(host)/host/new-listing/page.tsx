"use client";

import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";

import { Step1Profile } from "@/components/host/onboarding/Step1Profile";
import { Step2Property } from "@/components/host/onboarding/Step2Property";
const Step3Location = dynamic(
  () => import("@/components/host/onboarding/Step3Location").then((m) => m.Step3Location),
  { ssr: false, loading: () => <p className="py-8 text-center text-sm text-text-muted">Ładowanie mapy…</p> }
);
import { Step4Photos } from "@/components/host/onboarding/Step4Photos";
import { Step5Pricing } from "@/components/host/onboarding/Step5Pricing";
import { Step6Amenities } from "@/components/host/onboarding/Step6Amenities";
import { Step6Publish } from "@/components/host/onboarding/Step6Publish";
import { LOCATION_TAG_KEYS } from "@/lib/locationTags";
import { api } from "@/lib/api";
import { useHostStore } from "@/lib/store/hostStore";
import type { ListingDraft } from "@/types/host";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

const STEP_NAMES = [
  "O Tobie",
  "Twój obiekt",
  "Lokalizacja",
  "Zdjęcia",
  "Ceny",
  "Udogodnienia",
  "Publikacja",
];

const MIN_TITLE_LEN = 5;
const MIN_DESC_LEN = 20;

function normalizeAmenityIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object") {
        const id = (item as { id?: unknown }).id;
        return typeof id === "string" ? id : "";
      }
      return "";
    })
    .filter((x) => Boolean(x) && x !== "[object Object]");
}

function emptyDraft(id: string): ListingDraft {
  return {
    id,
    completion_percent: 0,
    step: 1,
    title: "",
    description: "",
    listing_type_id: null,
    max_guests: 4,
    bedrooms: 1,
    beds: 1,
    bathrooms: 1,
    base_price: 0,
    cleaning_fee: 0,
    booking_mode: "instant",
    cancellation_policy: "flexible",
    location: {},
    images: [],
    amenity_ids: [],
  };
}

function completionPercent(d: ListingDraft, displayName: string): number {
  let p = 0;
  if (displayName.trim().length > 0) p += 15;
  if (d.title.trim().length >= MIN_TITLE_LEN && d.description.trim().length >= MIN_DESC_LEN) p += 20;
  if (d.location.latitude && d.location.longitude) p += 20;
  if (d.images.length >= 1) p += 15;
  if (d.base_price > 0) p += 15;
  if (d.amenity_ids.length >= 1) p += 15;
  return Math.min(100, p);
}

import { motion } from "framer-motion";

function ProgressBar({
  step,
  total,
  name,
  pct,
}: {
  step: number;
  total: number;
  name: string;
  pct: number;
}) {
  return (
    <div className="mb-10">
      <div className="flex gap-2">
        {Array.from({ length: total }).map((_, i) => {
          const n = i + 1;
          const done = n < step;
          const active = n === step;
          return (
            <div
              key={n}
              className="relative h-2 flex-1 overflow-hidden rounded-full bg-brand-dark/[0.05]"
            >
              <motion.div
                initial={false}
                animate={{ 
                  width: done || active ? "100%" : "0%",
                  backgroundColor: done ? "#16a34a" : active ? "#16a34a" : "#e2e8f0"
                }}
                className="h-full"
                transition={{ duration: 0.5, ease: "easeInOut" }}
              />
              {active && (
                <motion.div 
                  layoutId="progress-glow"
                  className="absolute inset-0 bg-brand/20 blur-sm"
                />
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex items-end justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-brand-dark/30">Krok {step} z {total}</p>
          <h3 className="text-lg font-black text-brand-dark leading-none mt-0.5">{name}</h3>
        </div>
        <div className="flex items-center gap-2 rounded-2xl bg-brand-surface px-4 py-2 ring-1 ring-brand/10">
          <span className="text-[10px] font-black uppercase text-brand tracking-wider">Ukończono</span>
          <span className="text-sm font-black text-brand">{pct}%</span>
        </div>
      </div>
    </div>
  );
}

export default function NewListingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setDraftStore = useHostStore((s) => s.setDraft);
  const setSaving = useHostStore((s) => s.setSaving);
  const markSaved = useHostStore((s) => s.markSaved);
  const lastSaved = useHostStore((s) => s.lastSaved);
  const isSaving = useHostStore((s) => s.isSaving);

  const [step, setStep] = useState(1);
  const [listingId, setListingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ListingDraft | null>(null);
  const [typeSlug, setTypeSlug] = useState<string | null>("domek");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(true);

  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editingListingId = searchParams.get("listingId");

  const refreshListing = useCallback(async (id: string) => {
    const res = await api.get<{ data: Record<string, unknown> }>(`/api/v1/host/listings/${id}/`);
    const L = res.data;
    const loc = (L.location as Record<string, unknown>) || {};
    const imgs = (L.images as Record<string, unknown>[]) || [];
    setDraft((prev) => {
      const base = prev || emptyDraft(id);
      return {
        ...base,
        id,
        title: String(L.title ?? base.title),
        description: String(L.description ?? base.description),
        max_guests: Number(L.max_guests ?? base.max_guests),
        bedrooms: Number(L.bedrooms ?? base.bedrooms),
        beds: Number(L.beds ?? base.beds),
        bathrooms: Number(L.bathrooms ?? base.bathrooms),
        base_price: Number(L.base_price ?? base.base_price),
        cleaning_fee: Number(L.cleaning_fee ?? base.cleaning_fee),
        booking_mode: (L.booking_mode as ListingDraft["booking_mode"]) ?? base.booking_mode,
        cancellation_policy: String(L.cancellation_policy ?? base.cancellation_policy),
        location: {
          ...base.location,
          city: String(loc.city ?? base.location.city ?? ""),
          region: String(loc.region ?? base.location.region ?? ""),
          address_line: String(loc.address_line ?? base.location.address_line ?? ""),
          postal_code: String(loc.postal_code ?? base.location.postal_code ?? ""),
          latitude: Number(loc.latitude ?? loc.lat ?? base.location.latitude ?? 0) || undefined,
          longitude: Number(loc.longitude ?? loc.lng ?? base.location.longitude ?? 0) || undefined,
          country: String(loc.country ?? base.location.country ?? "PL"),
          ...Object.fromEntries(
            LOCATION_TAG_KEYS.map((k) => {
              const lv = (loc as Record<string, unknown>)[k];
              const bv = (base.location as Record<string, unknown>)[k];
              return [k, Boolean(lv ?? bv)];
            })
          ),
        },
        images: imgs.map((im, i) => ({
          id: String(im.id),
          display_url: String(im.display_url ?? im.url ?? ""),
          is_cover: Boolean(im.is_cover),
          sort_order: Number(im.sort_order ?? i),
        })),
        amenity_ids: Array.isArray(L.amenities)
          ? normalizeAmenityIds(L.amenities)
          : base.amenity_ids,
      };
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await api.post("/api/v1/host/onboarding/start/");
        const prof = await api.get<{
          data: { first_name?: string; last_name?: string; is_host?: boolean };
        }>("/api/v1/profile/");
        if (!cancelled && prof.data) {
          const n = `${prof.data.first_name ?? ""} ${prof.data.last_name ?? ""}`.trim();
          setDisplayName(n);
        }
        let id = editingListingId;
        if (!id) {
          const listRes = await api.get<{ data: { id: string; status: string }[] }>(
            "/api/v1/host/listings/"
          );
          const drafts = (listRes.data || []).filter((x) => x.status === "draft");
          id = drafts[0]?.id;
          if (!id) {
            const created = await api.post<{ data: { id: string } }>("/api/v1/host/listings/", {
              title: "Nowa oferta",
              description: "",
              base_price: "100.00",
              cleaning_fee: "0",
              currency: "PLN",
              max_guests: 4,
              booking_mode: "instant",
              location: { lat: 52.2297, lng: 21.0122, city: "Warszawa", region: "Mazowieckie", country: "PL" },
            });
            id = created.data.id;
          }
        }
        if (!id) throw new Error("Brak szkicu");
        if (typeof window !== "undefined") localStorage.setItem("listing_draft_id", id);
        setListingId(id);
        await refreshListing(id);
      } catch (e) {
        toast.error((e as Error).message || "Nie udało się zainicjować kreatora.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshListing, editingListingId]);

  const mergedDraft = useMemo(() => {
    if (!draft || !listingId) return null;
    const pct = completionPercent(draft, displayName);
    return { ...draft, completion_percent: pct, step };
  }, [draft, listingId, displayName, step]);

  useEffect(() => {
    if (mergedDraft) setDraftStore(mergedDraft);
  }, [mergedDraft, setDraftStore]);

  const persist = useCallback(async () => {
    if (!listingId || !draft) return;
    setSaving(true);
    try {
      const lat = draft.location.latitude ?? 52.2297;
      const lng = draft.location.longitude ?? 21.0122;
      await api.patch(`/api/v1/host/listings/${listingId}/`, {
        title: draft.title || "Nowa oferta",
        description: draft.description,
        base_price: String(draft.base_price || 0),
        cleaning_fee: String(draft.cleaning_fee ?? 0),
        booking_mode: draft.booking_mode,
        amenities: normalizeAmenityIds(draft.amenity_ids),
        max_guests: draft.max_guests,
        bedrooms: draft.bedrooms,
        beds: draft.beds,
        bathrooms: draft.bathrooms,
        location: {
          lat,
          lng,
          city: draft.location.city || "",
          region: draft.location.region || "",
          country: draft.location.country || "PL",
          address_line: draft.location.address_line || "",
          postal_code: draft.location.postal_code || "",
          ...Object.fromEntries(LOCATION_TAG_KEYS.map((k) => [k, Boolean(draft.location[k])])),
        },
      });
      markSaved();
    } catch {
      toast.error("Błąd zapisu. Sprawdź połączenie.");
      setSaving(false);
    }
  }, [listingId, draft, setSaving, markSaved]);

  useEffect(() => {
    if (!draft || !listingId) return;
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      void persist();
    }, 1000);
    return () => {
      if (persistTimer.current) clearTimeout(persistTimer.current);
    };
  }, [draft, listingId, persist]);

  const profileDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!displayName && !bio) return;
    if (profileDebounce.current) clearTimeout(profileDebounce.current);
    profileDebounce.current = setTimeout(() => {
      const parts = displayName.trim().split(/\s+/);
      const first = parts[0] ?? "";
      const last = parts.slice(1).join(" ") || "";
      void api.patch("/api/v1/profile/", { 
        first_name: first, 
        last_name: last,
        bio: bio 
      }).catch(() => {});
    }, 800);
    return () => {
      if (profileDebounce.current) clearTimeout(profileDebounce.current);
    };
  }, [displayName, bio]);

  const submitReview = async () => {
    if (!listingId || !draft) return;
    try {
      const lat = draft.location.latitude ?? 52.2297;
      const lng = draft.location.longitude ?? 21.0122;
      await api.patch(`/api/v1/host/listings/${listingId}/`, {
        title: draft.title || "Nowa oferta",
        description: draft.description,
        base_price: String(draft.base_price || 0),
        cleaning_fee: String(draft.cleaning_fee ?? 0),
        booking_mode: draft.booking_mode,
        amenities: normalizeAmenityIds(draft.amenity_ids),
        max_guests: draft.max_guests,
        bedrooms: draft.bedrooms,
        beds: draft.beds,
        bathrooms: draft.bathrooms,
        status: "approved",
        location: {
          lat,
          lng,
          city: draft.location.city || "",
          region: draft.location.region || "",
          country: draft.location.country || "PL",
          address_line: draft.location.address_line || "",
          postal_code: draft.location.postal_code || "",
          ...Object.fromEntries(LOCATION_TAG_KEYS.map((k) => [k, Boolean(draft.location[k])])),
        },
      });
      toast.success("Oferta opublikowana.");
      router.push("/host/listing-submitted");
    } catch (e) {
      toast.error((e as Error).message || "Błąd publikacji.");
    }
  };

  const checklistDone =
    mergedDraft &&
    displayName.trim().length > 0 &&
    mergedDraft.title.trim().length >= MIN_TITLE_LEN &&
    mergedDraft.description.trim().length >= MIN_DESC_LEN &&
    mergedDraft.images.length >= 1 &&
    mergedDraft.amenity_ids.length >= 1 &&
    mergedDraft.base_price > 0 &&
    mergedDraft.location.latitude &&
    mergedDraft.location.longitude;

  if (loading || !mergedDraft || !listingId) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-brand-dark/40 font-bold">
        <LoadingSpinner className="h-10 w-10 text-brand" />
        Przygotowujemy Twój kreator...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[720px] px-6 py-12">
      <ProgressBar step={step} total={7} name={STEP_NAMES[step - 1]} pct={mergedDraft.completion_percent} />

      <motion.div 
        key={step}
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="rounded-[40px] bg-white p-10 shadow-[0_20px_60px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.02]"
      >
        {step === 1 ? (
          <Step1Profile
            displayName={displayName}
            bio={bio}
            onDisplayNameChange={setDisplayName}
            onBioChange={setBio}
          />
        ) : null}
        {step === 2 && draft ? (
          <Step2Property
            selectedSlug={typeSlug}
            onSelectType={(slug) => {
              setTypeSlug(slug);
              setDraft((d) => (d ? { ...d, listing_type_id: slug } : d));
            }}
            maxGuests={draft.max_guests}
            bedrooms={draft.bedrooms}
            beds={draft.beds}
            bathrooms={draft.bathrooms}
            title={draft.title}
            description={draft.description}
            onChange={(patch) => setDraft((d) => (d ? { ...d, ...patch } : d))}
          />
        ) : null}
        {step === 3 && draft ? (
          <Step3Location
            location={draft.location}
            onChange={(patch) =>
              setDraft((d) => (d ? { ...d, location: { ...d.location, ...patch } } : d))
            }
          />
        ) : null}
        {step === 4 ? (
          <Step4Photos
            listingId={listingId}
            images={draft?.images ?? []}
            onRefresh={() => void refreshListing(listingId)}
          />
        ) : null}
        {step === 5 && draft ? (
          <Step5Pricing
            city={draft.location.city || "Polska"}
            basePrice={draft.base_price}
            cleaningFee={draft.cleaning_fee}
            bookingMode={draft.booking_mode}
            cancellationPolicy={draft.cancellation_policy}
            onChange={(patch) => setDraft((d) => (d ? { ...d, ...patch } : d))}
          />
        ) : null}
        {step === 6 && draft ? (
          <Step6Amenities
            selectedAmenityIds={draft.amenity_ids}
            onChange={(amenityIds) => setDraft((d) => (d ? { ...d, amenity_ids: amenityIds } : d))}
          />
        ) : null}
        {step === 7 && draft ? (
          <Step6Publish
            draft={{ ...draft, step: 7, completion_percent: mergedDraft.completion_percent }}
            displayName={displayName}
            canSubmit={Boolean(checklistDone)}
          />
        ) : null}
      </motion.div>

      <div className="mt-6 flex flex-col items-center gap-8">
        <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-brand-dark/20">
          <span className={cn("inline-block h-2 w-2 rounded-full", isSaving ? "bg-brand animate-pulse" : "bg-emerald-400")} />
          {isSaving
            ? "Automatyczny zapis w toku..."
            : lastSaved
              ? `Zmiany zapisane · ${format(lastSaved, "HH:mm", { locale: pl })}`
              : "Gotowy do zapisu"}
        </p>

        <div className="flex w-full justify-between gap-4">
          <button
            type="button"
            className={cn("h-14 px-8 rounded-2xl bg-white border border-black/[0.05] text-sm font-black text-brand-dark transition-all hover:bg-gray-50 hover:shadow-md active:scale-95", step <= 1 && "invisible pointer-events-none")}
            onClick={() => setStep((s) => Math.max(1, s - 1))}
          >
            ← Wstecz
          </button>
          {step < 7 ? (
            <button
              type="button" 
              className="h-14 px-10 rounded-2xl bg-brand text-white text-sm font-black shadow-lg shadow-brand/20 transition-all hover:-translate-y-1 hover:shadow-xl active:scale-95" 
              onClick={() => setStep((s) => Math.min(7, s + 1))}
            >
              Dalej →
            </button>
          ) : (
            <button
              type="button"
              className="h-14 px-10 rounded-2xl bg-brand-dark text-white text-sm font-black shadow-xl transition-all hover:-translate-y-1 hover:bg-brand disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none"
              disabled={!checklistDone}
              onClick={() => void submitReview()}
            >
              Opublikuj ofertę 🚀
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Remove old ProgressBar function if it exists below

