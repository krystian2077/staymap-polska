"use client";

import { useCallback, useState, type ReactNode } from "react";
import toast from "react-hot-toast";

import { api } from "@/lib/api";

type PlatformRef = {
  seasonality_default: {
    title: string;
    description: string;
    summer_label: string;
    summer_multiplier: string;
    winter_label: string;
    winter_multiplier: string;
  };
  public_holidays_gus: { title: string; items: string[] };
  travel_peak_extras: { title: string; description: string; toggle_field: string };
  default_multipliers: { holiday_when_no_host_rule: string; note: string };
};

type RuleSeasonal = {
  id: string;
  rule_type: "seasonal";
  name: string;
  valid_from: string;
  valid_to: string;
  multiplier: string;
  priority: number;
};
type RuleHoliday = {
  id: string;
  rule_type: "holiday_date";
  date: string;
  multiplier: string;
};
type RuleCustom = {
  id: string;
  rule_type: "custom_price";
  date: string;
  price_override: string;
};
type RuleLong = {
  id: string;
  rule_type: "long_stay";
  min_nights: number;
  discount_percent: string;
  priority: number;
};

export type HostPricingRulesPayload = {
  listing_id: string;
  apply_pl_travel_peak_extras: boolean;
  platform_reference: PlatformRef;
  seasonal_rules: RuleSeasonal[];
  holiday_date_rules: RuleHoliday[];
  custom_date_prices: RuleCustom[];
  long_stay_rules: RuleLong[];
};

type Props = {
  listingId: string;
  currency: string;
};

const INP = "host-input mt-1 w-full max-w-xs rounded-lg border border-black/[0.08] bg-white px-2 py-1.5 text-sm dark:bg-[var(--bg2)]";

/** Odpowiedź Django/BFF: `{ data: payload, meta }` lub sporadycznie sam payload (np. proxy). */
function parsePricingRulesBody(body: unknown): HostPricingRulesPayload | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  if ("listing_id" in o && "platform_reference" in o) {
    return body as HostPricingRulesPayload;
  }
  const inner = o.data;
  if (inner && typeof inner === "object" && "listing_id" in inner && "platform_reference" in inner) {
    return inner as HostPricingRulesPayload;
  }
  return null;
}

export function HostListingPricingRules({ listingId, currency }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState<HostPricingRulesPayload | null>(null);
  const [showRef, setShowRef] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!listingId?.trim()) {
      toast.error("Brak identyfikatora oferty.");
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const res = await api.get<unknown>(`/api/v1/host/listings/${listingId}/pricing-rules/`);
      const parsed = parsePricingRulesBody(res);
      if (!parsed) {
        throw new Error("Nieprawidłowy format odpowiedzi serwera.");
      }
      setPayload(parsed);
    } catch (e: unknown) {
      const err = e as Error & { status?: number };
      let msg = "Nie udało się wczytać reguł cenowych.";
      if (err.message && err.message !== "OK") {
        msg = err.message;
      }
      if (err.status === 503) {
        msg = `${msg} Backend niedostępny — uruchom Django lub ustaw INTERNAL_API_URL / DJANGO_API_URL dla BFF.`;
      } else if (err.status === 500) {
        msg = `${msg} Na serwerze uruchom migracje: python manage.py migrate.`;
      }
      toast.error(msg);
      setLoadError(msg);
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  const toggleExtras = async (v: boolean) => {
    try {
      await api.patch(`/api/v1/host/listings/${listingId}/`, {
        apply_pl_travel_peak_extras: v,
      });
      setPayload((p) => (p ? { ...p, apply_pl_travel_peak_extras: v } : p));
      toast.success(v ? "Włączono dodatkowe dni szczytu PL." : "Wyłączono dodatkowe dni szczytu PL.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Błąd zapisu.");
    }
  };

  const createRule = async (body: Record<string, unknown>) => {
    try {
      const res = await api.post<{ data: Record<string, unknown> }>(
        `/api/v1/host/listings/${listingId}/pricing-rules/`,
        body
      );
      toast.success("Reguła dodana.");
      await load();
      return res.data;
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast.error(err?.message ?? "Nie udało się dodać reguły.");
      throw e;
    }
  };

  const deleteRule = async (id: string, ruleType: string) => {
    try {
      await api.delete(
        `/api/v1/host/listings/${listingId}/pricing-rules/${id}/?rule_type=${encodeURIComponent(ruleType)}`
      );
      toast.success("Usunięto.");
      await load();
    } catch {
      toast.error("Nie udało się usunąć.");
    }
  };

  const onOpen = () => {
    setOpen(true);
    if (!payload && !loading) void load();
  };

  const ref = payload?.platform_reference;

  return (
    <div className="mt-4 border-t border-black/[0.06] pt-4">
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : onOpen())}
        className="text-sm font-bold text-brand hover:underline"
      >
        {open ? "▼ Ukryj reguły cenowe i kalendarz PL" : "▸ Reguły cenowe i kalendarz PL"}
      </button>

      {open && (
        <div className="mt-4 space-y-6">
          {loading && !payload && (
            <p className="text-sm text-text-muted">Wczytywanie…</p>
          )}

          {!loading && !payload && loadError && (
            <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>
          )}

          {payload && (
            <>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-brand-surface/40 px-4 py-3 ring-1 ring-brand/10">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={payload.apply_pl_travel_peak_extras}
                  onChange={(e) => void toggleExtras(e.target.checked)}
                />
                <span className="text-sm">
                  <span className="font-bold text-brand-dark">Dodatkowe szczyty PL</span>
                  <span className="block text-text-muted">
                    Wielki Piątek, majówka, Wigilia, Sylwester itd. (oprócz świąt ustawowych). Wyłącz, jeśli chcesz
                    tylko święta GUS + własne reguły poniżej.
                  </span>
                </span>
              </label>

              {ref && (
                <div className="rounded-xl bg-gray-50 px-4 py-3 dark:bg-[var(--bg3)]">
                  <button
                    type="button"
                    onClick={() => setShowRef(!showRef)}
                    className="flex w-full items-center justify-between text-left text-sm font-bold text-brand-dark"
                  >
                    Co jest w domyślnym kalendarzu PL?
                    <span>{showRef ? "−" : "+"}</span>
                  </button>
                  {showRef && (
                    <div className="mt-3 space-y-3 text-sm text-text-secondary">
                      <div>
                        <p className="font-semibold text-brand-dark">{ref.seasonality_default.title}</p>
                        <p className="mt-1">{ref.seasonality_default.description}</p>
                        <ul className="mt-2 list-inside list-disc text-xs">
                          <li>
                            Lato: {ref.seasonality_default.summer_label} → ×{ref.seasonality_default.summer_multiplier}
                          </li>
                          <li>
                            Okolice świąt: {ref.seasonality_default.winter_label} → ×
                            {ref.seasonality_default.winter_multiplier}
                          </li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-semibold text-brand-dark">{ref.public_holidays_gus.title}</p>
                        <ul className="mt-1 max-h-32 overflow-y-auto text-xs">
                          {ref.public_holidays_gus.items.map((x) => (
                            <li key={x}>{x}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="font-semibold text-brand-dark">{ref.travel_peak_extras.title}</p>
                        <p className="mt-1 text-xs">{ref.travel_peak_extras.description}</p>
                      </div>
                      <p className="text-xs text-text-muted">
                        Domyślny mnożnik świąteczny (gdy nie masz własnej reguły na datę): ×
                        {ref.default_multipliers.holiday_when_no_host_rule}. {ref.default_multipliers.note}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <SeasonalForm onSubmit={(b) => void createRule(b)} />
              <HolidayDateForm onSubmit={(b) => void createRule(b)} />
              <CustomPriceForm currency={currency} onSubmit={(b) => void createRule(b)} />
              <LongStayForm onSubmit={(b) => void createRule(b)} />

              <RulesLists
                payload={payload}
                onDelete={(id, t) => void deleteRule(id, t)}
                currency={currency}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SeasonalForm({
  onSubmit,
}: {
  onSubmit: (b: Record<string, unknown>) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [mult, setMult] = useState("1.15");
  const [pri, setPri] = useState("0");

  return (
    <div className="rounded-xl bg-white px-4 py-3 ring-1 ring-black/[0.06] dark:bg-[var(--bg2)]">
      <p className="text-sm font-bold text-brand-dark">Własny sezon (zakres dat × mnożnik)</p>
      <p className="text-xs text-text-muted">Nakłada się na cennik — wyższy priorytet wygrywa przy nakładaniu.</p>
      <div className="mt-3 flex flex-wrap gap-3">
        <label className="block text-xs font-semibold text-text-secondary">
          Nazwa (opcjonalnie)
          <input className={INP} value={name} onChange={(e) => setName(e.target.value)} placeholder="np. Szczyt lata" />
        </label>
        <label className="block text-xs font-semibold text-text-secondary">
          Od
          <input className={INP} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="block text-xs font-semibold text-text-secondary">
          Do
          <input className={INP} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <label className="block text-xs font-semibold text-text-secondary">
          Mnożnik
          <input className={INP} value={mult} onChange={(e) => setMult(e.target.value)} />
        </label>
        <label className="block text-xs font-semibold text-text-secondary">
          Priorytet
          <input className={INP} value={pri} onChange={(e) => setPri(e.target.value)} />
        </label>
        <button
          type="button"
          className="btn-primary self-end px-3 py-2 text-xs"
          onClick={() =>
            onSubmit({
              rule_type: "seasonal",
              name,
              valid_from: from,
              valid_to: to,
              multiplier: mult,
              priority: parseInt(pri, 10) || 0,
            })
          }
        >
          Dodaj sezon
        </button>
      </div>
    </div>
  );
}

function HolidayDateForm({ onSubmit }: { onSubmit: (b: Record<string, unknown>) => Promise<void> }) {
  const [d, setD] = useState("");
  const [mult, setMult] = useState("1.20");

  return (
    <div className="rounded-xl bg-white px-4 py-3 ring-1 ring-black/[0.06] dark:bg-[var(--bg2)]">
      <p className="text-sm font-bold text-brand-dark">Konkretna data — mnożnik</p>
      <p className="text-xs text-text-muted">Nadpisuje domyślny mnożnik świąteczny tego dnia.</p>
      <div className="mt-3 flex flex-wrap gap-3">
        <label className="block text-xs font-semibold text-text-secondary">
          Data
          <input className={INP} type="date" value={d} onChange={(e) => setD(e.target.value)} />
        </label>
        <label className="block text-xs font-semibold text-text-secondary">
          Mnożnik
          <input className={INP} value={mult} onChange={(e) => setMult(e.target.value)} />
        </label>
        <button
          type="button"
          className="btn-primary self-end px-3 py-2 text-xs"
          onClick={() => onSubmit({ rule_type: "holiday_date", date: d, multiplier: mult })}
        >
          Dodaj
        </button>
      </div>
    </div>
  );
}

function CustomPriceForm({
  currency,
  onSubmit,
}: {
  currency: string;
  onSubmit: (b: Record<string, unknown>) => Promise<void>;
}) {
  const [d, setD] = useState("");
  const [price, setPrice] = useState("");

  return (
    <div className="rounded-xl bg-white px-4 py-3 ring-1 ring-black/[0.06] dark:bg-[var(--bg2)]">
      <p className="text-sm font-bold text-brand-dark">Stała cena za noc (konkretna data)</p>
      <p className="text-xs text-text-muted">
        Zastępuje cenę bazową i mnożniki dla tej nocy (kwota w {currency}).
      </p>
      <div className="mt-3 flex flex-wrap gap-3">
        <label className="block text-xs font-semibold text-text-secondary">
          Data
          <input className={INP} type="date" value={d} onChange={(e) => setD(e.target.value)} />
        </label>
        <label className="block text-xs font-semibold text-text-secondary">
          Cena za noc
          <input
            className={INP}
            type="number"
            min={0}
            step={1}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </label>
        <button
          type="button"
          className="btn-primary self-end px-3 py-2 text-xs"
          onClick={() =>
            onSubmit({ rule_type: "custom_price", date: d, price_override: price })
          }
        >
          Dodaj
        </button>
      </div>
    </div>
  );
}

function LongStayForm({ onSubmit }: { onSubmit: (b: Record<string, unknown>) => Promise<void> }) {
  const [n, setN] = useState("7");
  const [pct, setPct] = useState("10");
  const [pri, setPri] = useState("0");

  return (
    <div className="rounded-xl bg-white px-4 py-3 ring-1 ring-black/[0.06] dark:bg-[var(--bg2)]">
      <p className="text-sm font-bold text-brand-dark">Rabat za długi pobyt</p>
      <div className="mt-3 flex flex-wrap gap-3">
        <label className="block text-xs font-semibold text-text-secondary">
          Min. nocy
          <input className={INP} value={n} onChange={(e) => setN(e.target.value)} />
        </label>
        <label className="block text-xs font-semibold text-text-secondary">
          Rabat %
          <input className={INP} value={pct} onChange={(e) => setPct(e.target.value)} />
        </label>
        <label className="block text-xs font-semibold text-text-secondary">
          Priorytet
          <input className={INP} value={pri} onChange={(e) => setPri(e.target.value)} />
        </label>
        <button
          type="button"
          className="btn-primary self-end px-3 py-2 text-xs"
          onClick={() =>
            onSubmit({
              rule_type: "long_stay",
              min_nights: parseInt(n, 10) || 1,
              discount_percent: pct,
              priority: parseInt(pri, 10) || 0,
            })
          }
        >
          Dodaj rabat
        </button>
      </div>
    </div>
  );
}

function RulesLists({
  payload,
  onDelete,
  currency,
}: {
  payload: HostPricingRulesPayload;
  onDelete: (id: string, ruleType: string) => void;
  currency: string;
}) {
  return (
    <div className="space-y-4">
      <RuleBlock title="Twoje reguły sezonowe">
        {payload.seasonal_rules.length === 0 ? (
          <p className="text-xs text-text-muted">Brak — obowiązuje domyślny sezon PL (jeśli nie ma innych reguł).</p>
        ) : (
          <ul className="space-y-2">
            {payload.seasonal_rules.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-brand-surface/30 px-3 py-2 text-sm"
              >
                <span>
                  {r.name ? `${r.name}: ` : ""}
                  {r.valid_from} — {r.valid_to} ×{r.multiplier}{" "}
                  <span className="text-xs text-text-muted">(priorytet {r.priority})</span>
                </span>
                <button type="button" className="text-xs font-bold text-red-600 hover:underline" onClick={() => onDelete(r.id, "seasonal")}>
                  Usuń
                </button>
              </li>
            ))}
          </ul>
        )}
      </RuleBlock>

      <RuleBlock title="Mnożniki na konkretne daty">
        {payload.holiday_date_rules.length === 0 ? (
          <p className="text-xs text-text-muted">Brak własnych — działają domyślne święta PL.</p>
        ) : (
          <ul className="space-y-2">
            {payload.holiday_date_rules.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 rounded-lg bg-brand-surface/30 px-3 py-2 text-sm">
                <span>
                  {r.date} ×{r.multiplier}
                </span>
                <button type="button" className="text-xs font-bold text-red-600 hover:underline" onClick={() => onDelete(r.id, "holiday_date")}>
                  Usuń
                </button>
              </li>
            ))}
          </ul>
        )}
      </RuleBlock>

      <RuleBlock title="Nadpisania ceny (kwota)">
        {payload.custom_date_prices.length === 0 ? (
          <p className="text-xs text-text-muted">Brak.</p>
        ) : (
          <ul className="space-y-2">
            {payload.custom_date_prices.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 rounded-lg bg-brand-surface/30 px-3 py-2 text-sm">
                <span>
                  {r.date}: {r.price_override} {currency}
                </span>
                <button type="button" className="text-xs font-bold text-red-600 hover:underline" onClick={() => onDelete(r.id, "custom_price")}>
                  Usuń
                </button>
              </li>
            ))}
          </ul>
        )}
      </RuleBlock>

      <RuleBlock title="Rabaty długiego pobytu">
        {payload.long_stay_rules.length === 0 ? (
          <p className="text-xs text-text-muted">Brak.</p>
        ) : (
          <ul className="space-y-2">
            {payload.long_stay_rules.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 rounded-lg bg-brand-surface/30 px-3 py-2 text-sm">
                <span>
                  od {r.min_nights} nocy: −{r.discount_percent}%
                </span>
                <button type="button" className="text-xs font-bold text-red-600 hover:underline" onClick={() => onDelete(r.id, "long_stay")}>
                  Usuń
                </button>
              </li>
            ))}
          </ul>
        )}
      </RuleBlock>
    </div>
  );
}

function RuleBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-black uppercase tracking-wider text-text-muted">{title}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}
