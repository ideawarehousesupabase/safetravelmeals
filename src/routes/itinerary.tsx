import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SiteShell, PageHeader } from "@/components/site-shell";
import { CapabilityNote, Card, JaapNav, Pill, SetBadge } from "@/components/jaap/jaap-ui";
import { Plane, Hotel, Briefcase, Plus, MapPin, Clock, ArrowRight, Trash2, ShieldX, ListChecks, Package } from "lucide-react";
import {
  legLabel,
  mapItinerary,
  matchExclusionSet,
  planHandovers,
  suggestProduct,
  type Leg,
} from "@/lib/jaap/engine";
import { ALLERGENS, COVERED_ALLERGENS, DISHES, PREFERENCES, RULE_SET_VERSION, WINDOW_TYPES, type Allergen, type Preference } from "@/lib/jaap/protocol";
import { DEMO, FEATURED_IDS, journeyById } from "@/lib/jaap/demo";
import { fmtDT, fmtRange, toMin } from "@/lib/jaap/time";

export const Route = createFileRoute("/itinerary")({
  validateSearch: (s: Record<string, unknown>) => ({ journey: typeof s.journey === "string" ? s.journey : undefined }),
  head: () => ({
    meta: [
      { title: "Travel Itinerary Planner — SafeMeal" },
      { name: "description", content: "Add flights, hotels and meetings. The JAAP mapping rules find every exposure window and build the kit plan." },
    ],
  }),
  component: ItineraryPage,
});

const ICONS = { flight: Plane, hotel: Hotel, meeting: Briefcase };
const PRESETS = [FEATURED_IDS.business, FEATURED_IDS.family, ...FEATURED_IDS.corporate];

type Draft = { legs: Leg[]; allergens: Allergen[]; persons: number; preference: Preference; declined: string[] };

function draftFrom(id: string | undefined): Draft {
  const j = id ? journeyById(id) : undefined;
  const src = j ?? journeyById(FEATURED_IDS.business)!;
  return {
    legs: src.legs.map((l) => ({ ...l })),
    allergens: [...src.allergens],
    persons: src.persons,
    preference: src.preference,
    declined: src.windows.filter((w) => w.declineReason && w.servable).map((w) => w.key),
  };
}

const validLeg = (l: Leg) => {
  const [a, b] = l.kind === "flight" ? [l.depart, l.arrive] : l.kind === "hotel" ? [l.checkIn, l.checkOut] : [l.start, l.end];
  return a?.length === 16 && b?.length === 16 && toMin(b) > toMin(a);
};

const input = "rounded-lg border border-brand-border bg-background px-3 py-2 text-sm outline-none focus:border-brand-accent w-full";

function ItineraryPage() {
  const { journey } = Route.useSearch();
  const [presetId, setPresetId] = useState<string | undefined>(journey ?? FEATURED_IDS.business);
  const [d, setD] = useState<Draft>(() => draftFrom(journey));

  const load = (id: string) => {
    setPresetId(id);
    setD(draftFrom(id));
  };
  const edit = (patch: Partial<Draft>) => {
    setPresetId(undefined);
    setD((x) => ({ ...x, ...patch }));
  };
  const setLeg = (id: string, patch: Partial<Leg>) => edit({ legs: d.legs.map((l) => (l.id === id ? ({ ...l, ...patch } as Leg) : l)) });
  const addLeg = (kind: Leg["kind"]) => {
    const id = `${kind[0]}${Date.now() % 100000}`;
    const base = "2027-05-12";
    const leg: Leg =
      kind === "flight"
        ? { id, kind, ref: "FL 0000", from: "EDI", to: "LHR", depart: `${base}T19:30`, arrive: `${base}T20:55`, departsFromServiceArea: false }
        : kind === "hotel"
          ? { id, kind, name: "Riverside Hotel, Greenwich", location: "Greenwich, London SE10", checkIn: `${base}T22:00`, checkOut: "2027-05-14T09:00" }
          : { id, kind, title: "Meeting", location: "City of London EC2", start: "2027-05-13T11:00", end: "2027-05-13T15:00", catered: false };
    edit({ legs: [...d.legs, leg] });
  };

  const plan = useMemo(() => {
    const legs = d.legs.filter(validLeg);
    const invalid = d.legs.filter((l) => !validLeg(l));
    const match = matchExclusionSet(d.allergens);
    const { windows, trace } = mapItinerary(legs);
    const marked = windows.map((w) => ({ ...w, accepted: !!match.set && w.servable && !d.declined.includes(w.key) }));
    const { batches, windows: annotated } = planHandovers(marked.filter((w) => w.accepted), legs);
    const product = suggestProduct(annotated, d.persons, batches.length);
    return { invalid, match, marked, trace, batches, annotated, product };
  }, [d]);

  const preset = presetId ? journeyById(presetId) : undefined;

  return (
    <SiteShell>
      <PageHeader
        eyebrow="Trip planner · JAAP stages 1–4"
        title="Build your travel itinerary"
        description="Add every leg of the journey. The founder's mapping rules find each exposure window and turn it into an allergen-controlled kit plan."
      >
        <Link to="/rules" className="rounded-full bg-brand-primary px-5 py-3 text-sm font-bold text-white flex items-center gap-2 hover:bg-brand-accent transition-colors">
          <ListChecks className="size-4" /> Rule matrix
        </Link>
      </PageHeader>
      <JaapNav />

      <div className="mx-auto max-w-7xl px-6 py-8 space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground mr-1">Sample journeys</span>
          {PRESETS.map((id) => (
            <button
              key={id}
              onClick={() => load(id)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${presetId === id ? "border-brand-accent bg-brand-accent/10 text-brand-accent" : "border-brand-border hover:border-brand-accent"}`}
            >
              {id} · {journeyById(id)!.segment}
            </button>
          ))}
          {!presetId && <Pill tone="warn">Edited: not a stored journey</Pill>}
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-6">
            <Card>
              <h2 className="font-display font-extrabold text-lg">Allergy and dietary requirements</h2>
              <p className="text-xs text-muted-foreground mt-1">Diagnosed allergens only. Health data is held under explicit consent and referenced in the record by a pseudonymous key (§13.5).</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {(Object.keys(ALLERGENS) as Allergen[]).map((a) => {
                  const on = d.allergens.includes(a);
                  const covered = COVERED_ALLERGENS.includes(a);
                  return (
                    <button
                      key={a}
                      onClick={() => edit({ allergens: on ? d.allergens.filter((x) => x !== a) : [...d.allergens, a] })}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${on ? (covered ? "border-brand-primary bg-brand-primary text-white" : "border-red-600 bg-red-600 text-white") : "border-brand-border hover:border-brand-accent"}`}
                      title={covered ? "Covered by the published exclusion sets" : "Not covered by any published exclusion set"}
                    >
                      {ALLERGENS[a]}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 grid sm:grid-cols-2 gap-3">
                <label className="text-xs font-semibold">
                  Cultural preference (menu system)
                  <select value={d.preference} onChange={(e) => edit({ preference: e.target.value as Preference })} className={`${input} mt-1`}>
                    {PREFERENCES.map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-semibold">
                  People covered by the kits
                  <input type="number" min={1} max={6} value={d.persons} onChange={(e) => edit({ persons: Math.max(1, Math.min(6, +e.target.value || 1)) })} className={`${input} mt-1`} />
                </label>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-extrabold text-lg">Itinerary</h2>
                <span className="text-xs font-bold text-muted-foreground">{d.legs.length} legs · Europe/London times</span>
              </div>
              <div className="relative pl-6 border-l-2 border-brand-border space-y-4">
                {d.legs.map((leg) => {
                  const Icon = ICONS[leg.kind];
                  const ok = validLeg(leg);
                  return (
                    <div key={leg.id} className="relative">
                      <div className="absolute -left-[31px] top-4 size-4 rounded-full border-2 border-brand-accent bg-card" />
                      <div className={`rounded-xl border p-4 ${ok ? "border-brand-border" : "border-red-300 bg-red-50/50"}`}>
                        <div className="flex items-center gap-3 mb-3">
                          <div className="size-9 rounded-lg bg-brand-accent/10 grid place-items-center text-brand-accent">
                            <Icon className="size-4" />
                          </div>
                          <p className="font-semibold flex-1 capitalize">{leg.kind === "meeting" ? "Meeting or event" : leg.kind}</p>
                          {!ok && <Pill tone="bad">Incomplete: not evaluated</Pill>}
                          <button onClick={() => edit({ legs: d.legs.filter((l) => l.id !== leg.id) })} className="size-8 rounded-full grid place-items-center text-muted-foreground hover:bg-red-50 hover:text-red-600" aria-label="Remove leg">
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                        {leg.kind === "flight" && (
                          <div className="grid sm:grid-cols-3 gap-2">
                            <input className={input} value={leg.ref} onChange={(e) => setLeg(leg.id, { ref: e.target.value })} placeholder="Flight" />
                            <input className={input} value={leg.from} onChange={(e) => setLeg(leg.id, { from: e.target.value })} placeholder="From" />
                            <input className={input} value={leg.to} onChange={(e) => setLeg(leg.id, { to: e.target.value })} placeholder="To" />
                            <label className="text-[11px] text-muted-foreground sm:col-span-1">Departs<input type="datetime-local" className={input} value={leg.depart} onChange={(e) => setLeg(leg.id, { depart: e.target.value })} /></label>
                            <label className="text-[11px] text-muted-foreground sm:col-span-1">Lands<input type="datetime-local" className={input} value={leg.arrive} onChange={(e) => setLeg(leg.id, { arrive: e.target.value })} /></label>
                            <label className="text-[11px] text-muted-foreground flex items-center gap-2 sm:mt-4">
                              <input type="checkbox" checked={leg.departsFromServiceArea} onChange={(e) => setLeg(leg.id, { departsFromServiceArea: e.target.checked })} /> Departs from UK service area
                            </label>
                          </div>
                        )}
                        {leg.kind === "hotel" && (
                          <div className="grid sm:grid-cols-2 gap-2">
                            <input className={input} value={leg.name} onChange={(e) => setLeg(leg.id, { name: e.target.value })} placeholder="Hotel" />
                            <input className={input} value={leg.location} onChange={(e) => setLeg(leg.id, { location: e.target.value })} placeholder="Address" />
                            <label className="text-[11px] text-muted-foreground">Check-in<input type="datetime-local" className={input} value={leg.checkIn} onChange={(e) => setLeg(leg.id, { checkIn: e.target.value })} /></label>
                            <label className="text-[11px] text-muted-foreground">Check-out<input type="datetime-local" className={input} value={leg.checkOut} onChange={(e) => setLeg(leg.id, { checkOut: e.target.value })} /></label>
                          </div>
                        )}
                        {leg.kind === "meeting" && (
                          <div className="grid sm:grid-cols-2 gap-2">
                            <input className={input} value={leg.title} onChange={(e) => setLeg(leg.id, { title: e.target.value })} placeholder="Meeting or event" />
                            <input className={input} value={leg.location} onChange={(e) => setLeg(leg.id, { location: e.target.value })} placeholder="Location" />
                            <label className="text-[11px] text-muted-foreground">Starts<input type="datetime-local" className={input} value={leg.start} onChange={(e) => setLeg(leg.id, { start: e.target.value })} /></label>
                            <label className="text-[11px] text-muted-foreground">Ends<input type="datetime-local" className={input} value={leg.end} onChange={(e) => setLeg(leg.id, { end: e.target.value })} /></label>
                            <label className="text-[11px] text-muted-foreground flex items-center gap-2">
                              <input type="checkbox" checked={leg.catered} onChange={(e) => setLeg(leg.id, { catered: e.target.checked })} /> Catering line declared
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {(["flight", "hotel", "meeting"] as const).map((k) => {
                  const Icon = ICONS[k];
                  return (
                    <button key={k} onClick={() => addLeg(k)} className="rounded-xl border-2 border-dashed border-brand-border p-3 text-xs font-bold text-muted-foreground hover:border-brand-accent hover:text-brand-accent flex items-center justify-center gap-2">
                      <Plus className="size-3.5" /> <Icon className="size-3.5" /> {k === "meeting" ? "Meeting" : k[0].toUpperCase() + k.slice(1)}
                    </button>
                  );
                })}
              </div>
            </Card>
          </div>

          <aside className="lg:col-span-2 space-y-6">
            <Card>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Rule R5 · exclusion set</p>
              {plan.match.set ? (
                <div className="mt-2">
                  <SetBadge setId={plan.match.set.id} long />
                  <p className="text-sm text-muted-foreground mt-2">{plan.match.reason}</p>
                </div>
              ) : (
                <div className="mt-2 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-800 flex gap-2">
                  <ShieldX className="size-4 shrink-0 mt-0.5" />
                  <span>
                    <strong>Order refused.</strong> {plan.match.reason}
                  </span>
                </div>
              )}
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <h3 className="font-display font-extrabold">Exposure windows</h3>
                <span className="text-[10px] font-mono text-muted-foreground">{RULE_SET_VERSION}</span>
              </div>
              {plan.invalid.length > 0 && <p className="mt-2 text-xs text-red-700">{plan.invalid.length} incomplete leg(s) not evaluated. Fix the times to include them.</p>}
              <div className="mt-4 space-y-3">
                {plan.marked.length === 0 && <p className="text-sm text-muted-foreground">No rule fired for this itinerary.</p>}
                {plan.marked.map((w) => {
                  const declined = d.declined.includes(w.key);
                  return (
                    <div key={w.key} className={`rounded-xl border p-3 ${w.accepted ? "border-brand-border" : "border-dashed border-brand-border opacity-70"}`}>
                      <div className="flex items-center gap-2">
                        <Link to="/rules" hash={w.ruleId} className="rounded bg-brand-primary px-1.5 py-0.5 text-[10px] font-bold text-white hover:bg-brand-accent">
                          {w.ruleId}
                        </Link>
                        <p className="text-sm font-semibold flex-1">{WINDOW_TYPES[w.type].label}</p>
                        {w.servable && plan.match.set && (
                          <button
                            onClick={() => edit({ declined: declined ? d.declined.filter((k) => k !== w.key) : [...d.declined, w.key] })}
                            className={`text-[11px] font-bold ${declined ? "text-brand-accent" : "text-muted-foreground hover:text-red-600"}`}
                          >
                            {declined ? "Restore" : "Remove"}
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Clock className="size-3" /> {fmtRange(w.occasionStart, w.occasionEnd)}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="size-3" /> {w.place}</p>
                      <p className="text-xs mt-1">{w.reason}</p>
                      {!w.servable && <Pill tone="bad">Outside UK service area</Pill>}
                      {declined && <Pill tone="info">Removed by traveller</Pill>}
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card>
              <h3 className="font-display font-extrabold flex items-center gap-2"><Package className="size-4 text-brand-accent" /> Personalised meal-kit plan</h3>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-secondary p-3">
                  <p className="font-display text-2xl font-extrabold">{plan.annotated.length * d.persons}</p>
                  <p className="text-[10px] text-muted-foreground">kit-equivalents</p>
                </div>
                <div className="rounded-xl bg-secondary p-3">
                  <p className="font-display text-2xl font-extrabold">{plan.batches.length}</p>
                  <p className="text-[10px] text-muted-foreground">handovers</p>
                </div>
                <div className="rounded-xl bg-secondary p-3">
                  <p className="font-display text-sm font-extrabold leading-tight mt-1">{plan.product.product?.price ?? "Quote"}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">price</p>
                </div>
              </div>
              <p className="mt-3 text-sm font-semibold">{plan.product.product?.name ?? "No standard product"}</p>
              <p className="text-xs text-muted-foreground">{plan.product.note}</p>
              {preset?.product === "corporate" && <p className="text-xs text-brand-accent mt-1">Stored journey: drawn from the employer's Corporate or Airline Pack block.</p>}
              <div className="mt-4 space-y-2">
                {plan.batches.map((b) => (
                  <div key={b.key} className="rounded-lg border border-brand-border p-2.5 text-xs">
                    <p className="font-semibold">{b.key} · {b.place}</p>
                    <p className="text-muted-foreground">{fmtRange(b.start, b.end)} · {b.windowKeys.length * d.persons} kit(s)</p>
                    <p className="text-muted-foreground">{b.modeLabel}</p>
                    <ul className="mt-1 list-disc pl-4">
                      {plan.annotated
                        .filter((w) => w.batchKey === b.key)
                        .map((w) => (
                          <li key={w.key}>{WINDOW_TYPES[w.type].kit}: {DISHES[d.preference][w.type]}</li>
                        ))}
                    </ul>
                  </div>
                ))}
              </div>
              {preset && preset.kitIds.length > 0 ? (
                <Link to="/records" search={{ journey: preset.id }} className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-brand-accent">
                  Follow {preset.id} through production and handover <ArrowRight className="size-4" />
                </Link>
              ) : (
                <CapabilityNote>
                  The rules run live on this itinerary. Ordering, payment and production scheduling of a new plan are planned year 1 capabilities (§5.6); the stored records cover the sample journeys only.
                </CapabilityNote>
              )}
            </Card>

            <Card>
              <h3 className="font-display font-extrabold">Rule evaluation trace</h3>
              <p className="text-xs text-muted-foreground mt-1">Every rule checked against every leg, including those that did not fire.</p>
              <ul className="mt-3 space-y-1.5 text-xs">
                {plan.trace.map((t, i) => (
                  <li key={i} className="flex gap-2">
                    <span className={`font-mono font-bold ${t.fired ? "text-emerald-700" : "text-muted-foreground"}`}>{t.ruleId}</span>
                    <span className={t.fired ? "" : "text-muted-foreground"}>
                      <span className="font-semibold">{legLabelSafe(d.legs, t.legId)}:</span> {t.detail}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] text-muted-foreground">Sample journeys stored: {DEMO.journeys.filter((j) => j.featured).length} featured, {DEMO.journeys.filter((j) => !j.featured).length} simulated cohort, all evaluated under {RULE_SET_VERSION}.</p>
            </Card>
          </aside>
        </div>
      </div>
    </SiteShell>
  );
}

function legLabelSafe(legs: Leg[], id: string) {
  const l = legs.find((x) => x.id === id);
  return l ? legLabel(l) : id;
}
