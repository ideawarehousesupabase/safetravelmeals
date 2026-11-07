import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { SiteShell, PageHeader } from "@/components/site-shell";
import { Card, JaapNav, Pill, SetBadge } from "@/components/jaap/jaap-ui";
import { ConfirmButton, WorkspaceGate } from "@/components/workspace-gate";
import { Plane, Hotel, Briefcase, Plus, MapPin, Clock, ArrowRight, Trash2, ShieldX, ListChecks, Package, Save, Loader2 } from "lucide-react";
import { legLabel, type Leg } from "@/lib/jaap/engine";
import { ALLERGENS, COVERED_ALLERGENS, PREFERENCES, PRODUCTS, WINDOW_TYPES, productById, type Allergen, type Preference, type ProductId } from "@/lib/jaap/protocol";
import { addDays, fmtRange, nowLondon } from "@/lib/jaap/time";
import { processInput, validLeg, type JourneyInput, type TravellerInput, type Workspace } from "@/lib/processing";
import { deleteJourney, deleteTraveller, newId, saveJourney, saveTraveller } from "@/lib/data/store";

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
const input = "rounded-lg border border-brand-border bg-background px-3 py-2 text-sm outline-none focus:border-brand-accent w-full";

// Leg ids only need to be unique within a journey; a counter avoids clashes when two legs are added at once.
let legCounter = 0;
const legId = (kind: Leg["kind"]) => `${kind[0]}${Date.now().toString(36)}${(legCounter++).toString(36)}`;

const blankTraveller = (): TravellerInput => ({
  id: newId(),
  label: "",
  allergens: [],
  severity: "",
  preference: "British",
  consentVersion: "1.2",
  consentAt: "",
  source: "user",
});

const blankJourney = (travellerId: string): JourneyInput => {
  const d = addDays(nowLondon().slice(0, 10), 14);
  return {
    id: newId(),
    travellerId,
    label: "",
    persons: 1,
    legs: [{ id: legId("hotel"), kind: "hotel", name: "", location: "", checkIn: `${d}T21:00`, checkOut: `${addDays(d, 2)}T09:00` }],
    declinedWindowKeys: [],
    accountProduct: null,
    status: "draft",
    createdAt: nowLondon(),
    source: "user",
  };
};

function ItineraryPage() {
  return (
    <SiteShell>
      <PageHeader
        eyebrow="Trip planner · JAAP stages 1–4"
        title="Build your travel itinerary"
        description="Enter the traveller's diagnosed allergens and the legs of the journey. The rule engine finds each exposure window and turns it into an allergen-controlled kit plan, saved to your account."
      >
        <Link to="/rules" className="rounded-full bg-brand-primary px-5 py-3 text-sm font-bold text-white flex items-center gap-2 hover:bg-brand-accent transition-colors">
          <ListChecks className="size-4" /> Rule matrix
        </Link>
      </PageHeader>
      <JaapNav />
      <WorkspaceGate requireData={false}>{(ws, uid) => <Planner ws={ws} uid={uid} />}</WorkspaceGate>
    </SiteShell>
  );
}

function Planner({ ws, uid }: { ws: Workspace; uid: string }) {
  const { journey: wanted } = Route.useSearch();
  const navigate = useNavigate();
  const initialJourney = ws.journeys.find((j) => j.id === wanted) ?? ws.journeys[0];
  const initialTraveller = initialJourney ? ws.travellers.find((t) => t.id === initialJourney.travellerId) : ws.travellers[0];
  const [t, setT] = useState<TravellerInput>(() => (initialTraveller ? { ...initialTraveller } : blankTraveller()));
  const [j, setJ] = useState<JourneyInput>(() => (initialJourney ? structuredClone(initialJourney) : blankJourney(t.id)));
  const [consent, setConsent] = useState(!!initialTraveller);
  const [busy, setBusy] = useState(false);

  const storedT = ws.travellers.find((x) => x.id === t.id);
  const storedJ = ws.journeys.find((x) => x.id === j.id);
  const tDirty = !storedT || JSON.stringify(storedT) !== JSON.stringify(t);
  const jDirty = !storedJ || JSON.stringify(storedJ) !== JSON.stringify({ ...j, travellerId: t.id });
  const myJourneys = ws.journeys.filter((x) => x.travellerId === t.id);

  const selectTraveller = (id: string) => {
    if (id === "new") {
      const nt = blankTraveller();
      setT(nt);
      setJ(blankJourney(nt.id));
      setConsent(false);
      return;
    }
    const nt = ws.travellers.find((x) => x.id === id)!;
    setT({ ...nt });
    setConsent(true);
    const first = ws.journeys.find((x) => x.travellerId === id);
    setJ(first ? structuredClone(first) : blankJourney(id));
  };
  const selectJourney = (id: string) => setJ(id === "new" ? blankJourney(t.id) : structuredClone(ws.journeys.find((x) => x.id === id)!));
  const setLeg = (id: string, patch: Partial<Leg>) => setJ((x) => ({ ...x, legs: x.legs.map((l) => (l.id === id ? ({ ...l, ...patch } as Leg) : l)) }));
  const addLeg = (kind: Leg["kind"]) => {
    const id = legId(kind);
    const base = addDays(nowLondon().slice(0, 10), 14);
    const leg: Leg =
      kind === "flight"
        ? { id, kind, ref: "", from: "", to: "", depart: `${base}T19:30`, arrive: `${base}T21:00`, departsFromServiceArea: false }
        : kind === "hotel"
          ? { id, kind, name: "", location: "", checkIn: `${base}T22:00`, checkOut: `${addDays(base, 2)}T09:00` }
          : { id, kind, title: "", location: "", start: `${addDays(base, 1)}T11:00`, end: `${addDays(base, 1)}T15:00`, catered: false };
    setJ((x) => ({ ...x, legs: [...x.legs, leg] }));
  };

  // Live preview through the same processing API the stored plan comes from.
  const plan = useMemo(() => processInput({ ...j, travellerId: t.id }, t.allergens.length ? t : undefined, "preview"), [j, t]);
  const invalid = j.legs.filter((l) => !validLeg(l));
  const accepted = plan.windows.filter((w) => w.accepted);
  const product = plan.productId ? productById(plan.productId) : null;

  const errors: string[] = [];
  if (!t.label.trim()) errors.push("Give the traveller a name or label.");
  if (!t.allergens.length) errors.push("Select at least one diagnosed allergen.");
  if (!consent) errors.push("Confirm explicit consent to store this health data.");
  if (!j.label.trim()) errors.push("Give the journey a name.");
  if (!j.legs.length) errors.push("Add at least one leg.");
  if (invalid.length) errors.push(`${invalid.length} leg(s) have missing or reversed times.`);

  async function save() {
    if (errors.length) return toast.error(errors[0]);
    setBusy(true);
    try {
      const traveller = { ...t, label: t.label.trim(), consentAt: storedT?.consentAt || nowLondon() };
      await saveJourney(uid, { ...j, travellerId: t.id, label: j.label.trim() }, ws, tDirty ? traveller : undefined);
      setT(traveller);
      toast.success("Journey saved; plan recalculated");
      navigate({ to: "/itinerary", search: { journey: j.id }, replace: true });
    } catch (e) {
      toast.error(`Could not save: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function saveProfileOnly() {
    if (!t.label.trim() || !t.allergens.length || !consent) return toast.error(errors.find((e) => /traveller|allergen|consent/i.test(e)) ?? "Complete the profile first.");
    setBusy(true);
    try {
      const traveller = { ...t, label: t.label.trim(), consentAt: storedT?.consentAt || nowLondon() };
      await saveTraveller(uid, traveller, ws);
      setT(traveller);
      toast.success(myJourneys.length ? `Profile saved; ${myJourneys.length} journey plan(s) recalculated` : "Profile saved");
    } catch (e) {
      toast.error(`Could not save: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function removeJourney() {
    if (!storedJ) return;
    await deleteJourney(uid, storedJ.id, ws);
    toast.success("Journey deleted");
    setJ(blankJourney(t.id));
  }

  async function removeTraveller() {
    if (!storedT) return;
    await deleteTraveller(uid, storedT.id, ws);
    toast.success("Traveller deleted");
    selectTraveller("new");
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-6">
      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-6 min-w-0">
          <Card>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-display font-extrabold text-lg flex-1">Traveller</h2>
              <select value={storedT ? t.id : "new"} onChange={(e) => selectTraveller(e.target.value)} className="rounded-lg border border-brand-border bg-background px-3 py-2 text-sm max-w-full">
                {ws.travellers.map((x) => (
                  <option key={x.id} value={x.id}>{x.label}</option>
                ))}
                <option value="new">+ New traveller</option>
              </select>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Diagnosed allergens only. Health data is held under explicit consent; records refer to the traveller by an internal id (§13.5).</p>
            <div className="mt-4 grid sm:grid-cols-3 gap-3">
              <label className="text-xs font-semibold sm:col-span-1">
                Name or label
                <input className={`${input} mt-1`} value={t.label} onChange={(e) => setT({ ...t, label: e.target.value })} placeholder="e.g. Alex Morgan" />
              </label>
              <label className="text-xs font-semibold">
                Severity
                <input className={`${input} mt-1`} value={t.severity} onChange={(e) => setT({ ...t, severity: e.target.value })} placeholder="e.g. Anaphylactic" />
              </label>
              <label className="text-xs font-semibold">
                Cultural preference
                <select value={t.preference} onChange={(e) => setT({ ...t, preference: e.target.value as Preference })} className={`${input} mt-1`}>
                  {PREFERENCES.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {(Object.keys(ALLERGENS) as Allergen[]).map((a) => {
                const on = t.allergens.includes(a);
                const covered = COVERED_ALLERGENS.includes(a);
                return (
                  <button
                    key={a}
                    onClick={() => setT({ ...t, allergens: on ? t.allergens.filter((x) => x !== a) : [...t.allergens, a] })}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${on ? (covered ? "border-brand-primary bg-brand-primary text-white" : "border-red-600 bg-red-600 text-white") : "border-brand-border hover:border-brand-accent"}`}
                    title={covered ? "Covered by the published exclusion sets" : "Not covered by any published exclusion set"}
                  >
                    {ALLERGENS[a]}
                  </button>
                );
              })}
            </div>
            <label className="mt-4 flex items-start gap-2 text-xs">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
              <span>The traveller has given explicit consent for these diagnosed allergens to be stored and used to plan their kits.</span>
            </label>
            <div className="mt-4 flex flex-wrap gap-2">
              <button disabled={busy || !tDirty} onClick={saveProfileOnly} className="rounded-full border border-brand-border px-4 py-2 text-xs font-bold disabled:opacity-50 hover:border-brand-accent">
                Save profile only
              </button>
              {storedT && <ConfirmButton label="Delete traveller" confirmLabel={`Delete ${storedT.label} and ${myJourneys.length} journey(s)`} onConfirm={removeTraveller} />}
            </div>
          </Card>

          <Card>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <h2 className="font-display font-extrabold text-lg flex-1">Itinerary</h2>
              <select value={storedJ ? j.id : "new"} onChange={(e) => selectJourney(e.target.value)} className="rounded-lg border border-brand-border bg-background px-3 py-2 text-sm max-w-full">
                {myJourneys.map((x) => (
                  <option key={x.id} value={x.id}>{x.label}</option>
                ))}
                <option value="new">+ New journey</option>
              </select>
              {storedJ && <Pill tone={storedJ.status === "confirmed" ? "ok" : "info"}>{storedJ.status}</Pill>}
            </div>
            <div className="grid sm:grid-cols-3 gap-3 mb-4">
              <label className="text-xs font-semibold">
                Journey name
                <input className={`${input} mt-1`} value={j.label} onChange={(e) => setJ({ ...j, label: e.target.value })} placeholder="e.g. Edinburgh to London" />
              </label>
              <label className="text-xs font-semibold">
                People covered by the kits
                <input type="number" min={1} max={6} value={j.persons} onChange={(e) => setJ({ ...j, persons: Math.max(1, Math.min(6, +e.target.value || 1)) })} className={`${input} mt-1`} />
              </label>
              <label className="text-xs font-semibold">
                Paid through
                <select value={j.accountProduct ?? ""} onChange={(e) => setJ({ ...j, accountProduct: (e.target.value || null) as ProductId | null })} className={`${input} mt-1`}>
                  <option value="">Per-trip product (suggested)</option>
                  {PRODUCTS.filter((p) => p.id === "subscription" || p.id === "corporate").map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="relative pl-6 border-l-2 border-brand-border space-y-4">
              {j.legs.length === 0 && <p className="text-sm text-muted-foreground">No legs yet. Add a flight, hotel stay or meeting below.</p>}
              {j.legs.map((leg) => {
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
                        {!ok && <Pill tone="bad">Check the times</Pill>}
                        <button onClick={() => setJ({ ...j, legs: j.legs.filter((l) => l.id !== leg.id) })} className="size-8 rounded-full grid place-items-center text-muted-foreground hover:bg-red-50 hover:text-red-600" aria-label="Remove leg">
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                      {leg.kind === "flight" && (
                        <div className="grid sm:grid-cols-3 gap-2">
                          <input className={input} value={leg.ref} onChange={(e) => setLeg(leg.id, { ref: e.target.value })} placeholder="Flight number" />
                          <input className={input} value={leg.from} onChange={(e) => setLeg(leg.id, { from: e.target.value.toUpperCase() })} placeholder="From (e.g. EDI)" />
                          <input className={input} value={leg.to} onChange={(e) => setLeg(leg.id, { to: e.target.value.toUpperCase() })} placeholder="To (e.g. LHR)" />
                          <label className="text-[11px] text-muted-foreground">Departs<input type="datetime-local" className={input} value={leg.depart} onChange={(e) => setLeg(leg.id, { depart: e.target.value })} /></label>
                          <label className="text-[11px] text-muted-foreground">Lands<input type="datetime-local" className={input} value={leg.arrive} onChange={(e) => setLeg(leg.id, { arrive: e.target.value })} /></label>
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
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button disabled={busy || (!jDirty && !tDirty)} onClick={save} className="rounded-full bg-brand-primary px-5 py-2.5 text-sm font-bold text-white flex items-center gap-2 hover:bg-brand-accent disabled:opacity-50">
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} {storedJ ? "Save changes" : "Save journey"}
              </button>
              {storedJ && <ConfirmButton label="Delete journey" confirmLabel="Delete journey, kits and events" onConfirm={removeJourney} />}
              {!jDirty && !tDirty && storedJ && <span className="text-xs text-muted-foreground">All changes saved</span>}
            </div>
            {errors.length > 0 && (jDirty || tDirty) && (
              <ul className="mt-3 list-disc pl-5 text-xs text-red-700">
                {errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <aside className="lg:col-span-2 space-y-6 min-w-0">
          <Card>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Rule R5 · exclusion set</p>
            {!t.allergens.length ? (
              <p className="mt-2 text-sm text-muted-foreground">Select the traveller's diagnosed allergens.</p>
            ) : plan.setId ? (
              <div className="mt-2">
                <SetBadge setId={plan.setId} long />
                <p className="text-sm text-muted-foreground mt-2">{plan.setReason}</p>
              </div>
            ) : (
              <div className="mt-2 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-800 flex gap-2">
                <ShieldX className="size-4 shrink-0 mt-0.5" />
                <span><strong>Order refused.</strong> {plan.setReason}</span>
              </div>
            )}
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <h3 className="font-display font-extrabold">Exposure windows</h3>
              <span className="text-[10px] font-mono text-muted-foreground">{plan.engine.version}</span>
            </div>
            <div className="mt-4 space-y-3">
              {plan.windows.length === 0 && <p className="text-sm text-muted-foreground">No rule fired for this itinerary yet.</p>}
              {plan.windows.map((w) => {
                const declined = j.declinedWindowKeys.includes(w.key);
                return (
                  <div key={w.key} className={`rounded-xl border p-3 ${w.accepted ? "border-brand-border" : "border-dashed border-brand-border opacity-70"}`}>
                    <div className="flex items-center gap-2">
                      <Link to="/rules" hash={w.ruleId} className="rounded bg-brand-primary px-1.5 py-0.5 text-[10px] font-bold text-white hover:bg-brand-accent">
                        {w.ruleId}
                      </Link>
                      <p className="text-sm font-semibold flex-1">{WINDOW_TYPES[w.type].label}</p>
                      {w.servable && plan.setId && (
                        <button
                          onClick={() => setJ({ ...j, declinedWindowKeys: declined ? j.declinedWindowKeys.filter((k) => k !== w.key) : [...j.declinedWindowKeys, w.key] })}
                          className={`text-[11px] font-bold ${declined ? "text-brand-accent" : "text-muted-foreground hover:text-red-600"}`}
                        >
                          {declined ? "Restore" : "Remove"}
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Clock className="size-3" /> {fmtRange(w.occasionStart, w.occasionEnd)}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="size-3" /> {w.place}</p>
                    <p className="text-xs mt-1">{w.reason}</p>
                    {w.declineReason && <p className="text-[11px] text-muted-foreground mt-1">{w.declineReason}</p>}
                  </div>
                );
              })}
            </div>
          </Card>

          <Card>
            <h3 className="font-display font-extrabold flex items-center gap-2"><Package className="size-4 text-brand-accent" /> Kit plan</h3>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-secondary p-3">
                <p className="font-display text-2xl font-extrabold">{plan.kits.length}</p>
                <p className="text-[10px] text-muted-foreground">kit-equivalents</p>
              </div>
              <div className="rounded-xl bg-secondary p-3">
                <p className="font-display text-2xl font-extrabold">{plan.batches.length}</p>
                <p className="text-[10px] text-muted-foreground">handovers</p>
              </div>
              <div className="rounded-xl bg-secondary p-3">
                <p className="font-display text-sm font-extrabold leading-tight mt-1">{product?.price ?? "Quote"}</p>
                <p className="text-[10px] text-muted-foreground mt-1">price</p>
              </div>
            </div>
            <p className="mt-3 text-sm font-semibold">{product?.name ?? "No standard product"}</p>
            <p className="text-xs text-muted-foreground">{plan.productNote}</p>
            <div className="mt-4 space-y-2">
              {plan.batches.map((b) => (
                <div key={b.key} className="rounded-lg border border-brand-border p-2.5 text-xs">
                  <p className="font-semibold">{b.place}</p>
                  <p className="text-muted-foreground">{fmtRange(b.start, b.end)} · {plan.kits.filter((k) => k.batchKey === b.key).length} kit(s)</p>
                  <p className="text-muted-foreground">{b.modeLabel}</p>
                </div>
              ))}
            </div>
            {storedJ && !jDirty && accepted.length > 0 && (
              <Link to="/records" search={{ journey: storedJ.id }} className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-brand-accent">
                Follow these kits through production and handover <ArrowRight className="size-4" />
              </Link>
            )}
          </Card>

          <Card>
            <h3 className="font-display font-extrabold">Rule evaluation trace</h3>
            <p className="text-xs text-muted-foreground mt-1">Every rule checked against every leg, including those that did not fire.</p>
            <ul className="mt-3 space-y-1.5 text-xs">
              {plan.trace.map((tr, i) => (
                <li key={i} className="flex gap-2">
                  <span className={`font-mono font-bold ${tr.fired ? "text-emerald-700" : "text-muted-foreground"}`}>{tr.ruleId}</span>
                  <span className={tr.fired ? "" : "text-muted-foreground"}>
                    <span className="font-semibold">{legName(j.legs, tr.legId)}:</span> {tr.detail}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function legName(legs: Leg[], id: string) {
  const l = legs.find((x) => x.id === id);
  return l ? legLabel(l) : id;
}
