"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
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
import { Step6Publish } from "@/components/host/onboarding/Step6Publish";
import { LOCATION_TAG_KEYS } from "@/lib/locationTags";
import { api } from "@/lib/api";
import { useHostStore } from "@/lib/store/hostStore";
import type { ListingDraft } from "@/types/host";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { pl } from "date-fns/locale";

const STEP_NAMES = [
  "O Tobie",
  "Twój obiekt",
  "Lokalizacja",
  "Zdjęcia",
  "Ceny",
  "Publikacja",
];

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

function completionPercent(d: ListingDraft, bioLen: number, hasAvatar: boolean): number {
  let p = 0;
  if (bioLen > 20 && hasAvatar) p += 15;
  if (d.title.length > 10 && d.description.length > 50) p += 20;
  if (d.location.latitude && d.location.longitude) p += 20;
  if (d.images.length >= 5) p += 20;
  if (d.base_price > 0) p += 15;
  if (d.max_guests >= 1) p += 10;
  return Math.min(100, p);
}

export default function NewListingPage() {
  const router = useRouter();
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
  const [hasAvatar, setHasAvatar] = useState(false);
  const [loading, setLoading] = useState(true);

  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        const listRes = await api.get<{ data: { id: string; status: string }[] }>(
          "/api/v1/host/listings/"
        );
        const drafts = (listRes.data || []).filter((x) => x.status === "draft");
        let id = drafts[0]?.id;
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
  }, [refreshListing]);

  const mergedDraft = useMemo(() => {
    if (!draft || !listingId) return null;
    const pct = completionPercent(draft, bio.length, hasAvatar);
    return { ...draft, completion_percent: pct, step };
  }, [draft, listingId, bio.length, hasAvatar, step]);

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
        max_guests: draft.max_guests,
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
      void api.patch("/api/v1/profile/", { first_name: first, last_name: last }).catch(() => {});
    }, 800);
    return () => {
      if (profileDebounce.current) clearTimeout(profileDebounce.current);
    };
  }, [displayName, bio]);

  const submitReview = async () => {
    if (!listingId) return;
    try {
      await api.post(`/api/v1/host/listings/${listingId}/submit-for-review/`);
      toast.success("Wysłano do moderacji.");
      router.push("/host/listing-submitted");
    } catch (e) {
      toast.error((e as Error).message || "Błąd wysyłki.");
    }
  };

  const checklistDone =
    mergedDraft &&
    mergedDraft.title.length > 10 &&
    mergedDraft.description.length > 50 &&
    mergedDraft.images.length >= 5 &&
    mergedDraft.base_price > 0 &&
    mergedDraft.location.latitude &&
    mergedDraft.location.longitude &&
    bio.length > 20 &&
    hasAvatar;

  if (loading || !mergedDraft || !listingId) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-text-muted">
        Ładowanie kreatora…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[680px] px-5 py-8">
      <ProgressBar step={step} total={6} name={STEP_NAMES[step - 1]} pct={mergedDraft.completion_percent} />

      <div className="animate-scale-in rounded-[18px] border-[1.5px] border-[#e5e7eb] bg-white p-7 shadow-[0_4px_20px_rgba(0,0,0,.06)]">
        {step === 1 ? (
          <Step1Profile
            displayName={displayName}
            bio={bio}
            onDisplayNameChange={setDisplayName}
            onBioChange={setBio}
            onAvatarUploaded={() => setHasAvatar(true)}
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
          <Step6Publish
            draft={{ ...draft, step: 6, completion_percent: mergedDraft.completion_percent }}
            profileBioLen={bio.length}
            hasAvatar={hasAvatar}
            canSubmit={Boolean(checklistDone)}
          />
        ) : null}
      </div>

      <p className="mt-2.5 flex items-center justify-center gap-1 text-[11px] text-text-muted">
        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
        {isSaving
          ? "Zapisuję..."
          : lastSaved
            ? `Auto-zapisano o ${format(lastSaved, "HH:mm:ss", { locale: pl })}`
            : ""}
      </p>

      <div className="mt-6 flex justify-between gap-3">
        <button
          type="button"
          className={cn("btn-secondary", step <= 1 && "invisible pointer-events-none")}
          onClick={() => setStep((s) => Math.max(1, s - 1))}
        >
          ← Wstecz
        </button>
        {step < 6 ? (
          <button type="button" className="btn-primary" onClick={() => setStep((s) => Math.min(6, s + 1))}>
            Dalej →
          </button>
        ) : (
          <button
            type="button"
            className="btn-primary disabled:opacity-50"
            disabled={!checklistDone}
            onClick={() => void submitReview()}
          >
            Wyślij do moderacji 🚀
          </button>
        )}
      </div>
    </div>
  );
}

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
    <div className="mb-8">
      <div className="flex gap-0">
        {Array.from({ length: total }).map((_, i) => {
          const n = i + 1;
          const done = n < step;
          const active = n === step;
          return (
            <div
              key={n}
              className={cn(
                "h-[5px] flex-1 rounded-[3px] transition-colors duration-400",
                done || active ? "bg-brand" : "bg-[#e5e7eb]",
                active && "shadow-[0_0_0_3px_rgba(22,163,74,.2)]"
              )}
            />
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[11px]">
        <span className="text-text-muted">
          Krok {step} z {total}
        </span>
        <span className="font-semibold text-brand-dark">{name}</span>
        <span className="font-bold text-brand">{pct}% ukończone</span>
      </div>
    </div>
  );
}
