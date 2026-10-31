import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SiteShell, PageHeader } from "@/components/site-shell";
import { Card, JaapNav, KitStatusPill, SampleBanner, SetBadge } from "@/components/jaap/jaap-ui";
import { EmptyState, WorkspaceGate } from "@/components/workspace-gate";
import { ShieldCheck, QrCode, Check, ChefHat, Truck, ShieldX, Briefcase, Hotel, ClipboardCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { KITCHEN, verifyChain, type EventType, type KitView, type Workspace } from "@/lib/processing";
import { recordEvent } from "@/lib/data/store";
import { TEMP_RANGE, WINDOW_TYPES } from "@/lib/jaap/protocol";
import { fmtDT, fmtRange, nowLondon } from "@/lib/jaap/time";

export const Route = createFileRoute("/tracking")({
  validateSearch: (s: Record<string, unknown>) => ({ kit: typeof s.kit === "string" ? s.kit : undefined }),
  head: () => ({
    meta: [
      { title: "Kit Handover Tracking — SafeMeal" },
      { name: "description", content: "Record each custody step of a kit and check its record." },
    ],
  }),
  component: TrackingPage,
});

const input = "rounded-lg border border-brand-border bg-background px-3 py-2 text-sm outline-none focus:border-brand-accent w-full";
const LABELS: Record<Exclude<EventType, "resolution">, string> = {
  dispatch: "Dispatched to courier",
  receipt: "Received at handover point",
  release: "Released from storage",
  confirm: "Traveller confirmed receipt",
  reaction: "Reaction reported",
};

function TrackingPage() {
  return (
    <SiteShell>
      <PageHeader eyebrow="Kit handover tracking" title="Record and follow custody" description="Choose a kit, record each physical step as it happens, and check its hash-chained record." />
      <JaapNav />
      <WorkspaceGate>{(ws, uid) => <Tracker ws={ws} uid={uid} />}</WorkspaceGate>
    </SiteShell>
  );
}

function Tracker({ ws, uid }: { ws: Workspace; uid: string }) {
  const { kit: wanted } = Route.useSearch();
  const navigate = useNavigate();
  if (!ws.kits.length) return <div className="mx-auto max-w-7xl px-6 py-10"><EmptyState uid={uid} title="No kits yet" text="Kits are created when a saved journey has exposure windows and a covering exclusion set." /></div>;
  const kit = ws.kits.find((k) => k.kitId === wanted) ?? ws.kits.find((k) => k.status !== "Receipt confirmed" && k.status !== "Withdrawn") ?? ws.kits[0];
  const j = ws.journeys.find((x) => x.id === kit.journeyId)!;
  const traveller = ws.travellers.find((x) => x.id === kit.travellerId);
  const plan = ws.plansById[kit.journeyId];
  const b = plan.batches.find((x) => x.key === kit.batchKey)!;
  const run = ws.runs.find((r) => r.id === kit.runId)!;
  const at = (ev: string) => kit.ledger.find((e) => e.event.startsWith(ev));
  const stages = [
    { label: "Window confirmed", icon: Check, e: at("Exposure window confirmed") },
    { label: "Produced in run", icon: ChefHat, e: at("Produced") },
    { label: "With courier", icon: Truck, e: at("Dispatched") },
    { label: b.receiver === "hotel" ? "At the hotel" : "Handed over", icon: b.receiver === "hotel" ? Hotel : Briefcase, e: kit.ledger.find((e) => e.from === "in transit" || e.from === "unconfirmed") },
    { label: "Receipt confirmed", icon: ClipboardCheck, e: at("Receipt confirmed") },
  ];
  const receipt = kit.ledger.find((e) => e.from === "in transit" || e.from === "unconfirmed");

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 space-y-6">
      {ws.hasSample && <SampleBanner />}
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Kit</label>
        <select value={kit.kitId} onChange={(e) => navigate({ to: "/tracking", search: { kit: e.target.value }, replace: true })} className="rounded-lg border border-brand-border bg-background px-3 py-2 text-sm max-w-full">
          {ws.journeys.map((jj) => (
            <optgroup key={jj.id} label={`${jj.label} · ${ws.travellers.find((t) => t.id === jj.travellerId)?.label ?? ""}`}>
              {ws.kits.filter((k) => k.journeyId === jj.id).map((k) => (
                <option key={k.kitId} value={k.kitId}>{k.kitId} · {WINDOW_TYPES[k.type].kit} · {fmtDT(k.occasionStart)} · {k.status}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <KitStatusPill status={kit.status} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6 min-w-0">
          <Card>
            <h3 className="font-display font-extrabold text-lg">{WINDOW_TYPES[kit.type].kit}: {kit.dish}</h3>
            <p className="text-sm text-muted-foreground">{traveller?.label} · {j.label} · {b.place}, declared window {fmtRange(b.start, b.end)}</p>
            <div className="mt-5 grid grid-cols-5 gap-2">
              {stages.map((s) => (
                <div key={s.label} className="text-center">
                  <div className={`size-10 rounded-full mx-auto grid place-items-center ${s.e ? "bg-brand-success/15 text-brand-success" : "bg-secondary text-muted-foreground"}`}>
                    <s.icon className="size-4" />
                  </div>
                  <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{s.label}</p>
                  {s.e && <p className="text-[10px] text-muted-foreground">{fmtDT(s.e.ts)}</p>}
                </div>
              ))}
            </div>
            {run.status !== "accepted" && (
              <p className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
                {run.id} has no accepted clearance yet, so this kit is not produced. Record the clearance on the <Link to="/kitchen" className="font-bold underline">kitchen run sheet</Link>.
              </p>
            )}
          </Card>

          <RecordEvent kit={kit} ws={ws} uid={uid} />

          <Card>
            <h3 className="font-display font-extrabold">Recorded events</h3>
            {kit.events.length === 0 ? (
              <p className="text-sm text-muted-foreground mt-2">Nothing recorded for this kit yet.</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {kit.events.map((e) => (
                  <li key={e.id} className="flex flex-wrap gap-x-3 gap-y-1">
                    <span className="font-mono text-xs text-muted-foreground w-32">{fmtDT(e.at)}</span>
                    <span className="font-semibold">{e.type === "resolution" ? "Exception closed" : LABELS[e.type]}</span>
                    <span className="text-muted-foreground text-xs">
                      {[e.tempC !== null ? `${e.tempC} °C` : "", e.sealPresented ? `seal ${e.sealPresented}` : "", e.actor, e.note].filter(Boolean).join(" · ")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <aside className="space-y-6">
          <KitRecordCard kit={kit} receiptSeal={String(receipt?.data.sealCheck ?? "—")} receiptTemp={receipt?.data.tempC} />
          <div className="rounded-2xl border border-brand-border bg-card p-5 text-sm">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Produced under</p>
            <p className="mt-2 font-semibold">{KITCHEN}</p>
            <p className="text-xs text-muted-foreground mt-1">{run.id} · <SetBadge setId={kit.setId} /></p>
            <Link to="/records/$kitId" params={{ kitId: kit.kitId }} className="mt-3 inline-block text-sm font-bold text-brand-accent">Full record →</Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

function RecordEvent({ kit, ws, uid }: { kit: KitView; ws: Workspace; uid: string }) {
  const next: Exclude<EventType, "resolution"> = !kit.events.some((e) => e.type === "dispatch")
    ? "dispatch"
    : !kit.events.some((e) => e.type === "receipt")
      ? "receipt"
      : !kit.events.some((e) => e.type === "release") && ws.plansById[kit.journeyId].batches.find((b) => b.key === kit.batchKey)?.receiver === "hotel"
        ? "release"
        : "confirm";
  const [type, setType] = useState<Exclude<EventType, "resolution">>(next);
  const [when, setWhen] = useState(nowLondon());
  const [temp, setTemp] = useState("");
  const [seal, setSeal] = useState("");
  const [releasedTo, setReleasedTo] = useState(kit.travellerId);
  const [actor, setActor] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(when)) return toast.error("Enter when it happened.");
    const tempC = temp.trim() === "" ? null : Number(temp);
    if (tempC !== null && (!Number.isFinite(tempC) || tempC < -30 || tempC > 60)) return toast.error("Temperature must be a number of °C.");
    if (type === "receipt" && !seal.trim()) return toast.error("Type the seal number printed on the kit.");
    setBusy(true);
    try {
      await recordEvent(uid, {
        kitId: kit.kitId,
        journeyId: kit.journeyId,
        type,
        at: when,
        tempC: type === "dispatch" || type === "receipt" ? tempC : null,
        sealPresented: type === "receipt" ? seal.trim().toUpperCase() : null,
        releasedToTravellerId: type === "release" ? releasedTo : null,
        resolves: null,
        actor: actor.trim() || (type === "dispatch" ? "Courier" : type === "confirm" ? "Traveller" : "Coordinator"),
        note: note.trim(),
      });
      toast.success(`${LABELS[type]} recorded`);
      setTemp("");
      setSeal("");
      setNote("");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <h3 className="font-display font-extrabold">Record a custody step</h3>
      <p className="text-xs text-muted-foreground mt-1">Entries are append-only. A mistake is corrected by a new entry, never by editing an old one.</p>
      <div className="mt-4 grid sm:grid-cols-2 gap-3">
        <label className="text-[11px] font-semibold">
          Step
          <select value={type} onChange={(e) => setType(e.target.value as typeof type)} className={`${input} mt-1`}>
            {(Object.keys(LABELS) as (keyof typeof LABELS)[]).map((k) => (
              <option key={k} value={k}>{LABELS[k]}</option>
            ))}
          </select>
        </label>
        <label className="text-[11px] font-semibold">
          When it happened
          <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className={`${input} mt-1`} />
        </label>
        {(type === "dispatch" || type === "receipt") && (
          <label className="text-[11px] font-semibold">
            Temperature °C (declared range {TEMP_RANGE.min}–{TEMP_RANGE.max})
            <input inputMode="decimal" value={temp} onChange={(e) => setTemp(e.target.value)} placeholder="e.g. 3.8" className={`${input} mt-1`} />
          </label>
        )}
        {type === "receipt" && (
          <label className="text-[11px] font-semibold">
            Seal number on the kit
            <input value={seal} onChange={(e) => setSeal(e.target.value)} placeholder="TS-000000" className={`${input} mt-1 font-mono`} />
          </label>
        )}
        {type === "release" && (
          <label className="text-[11px] font-semibold">
            Released to
            <select value={releasedTo} onChange={(e) => setReleasedTo(e.target.value)} className={`${input} mt-1`}>
              {ws.travellers.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </label>
        )}
        <label className="text-[11px] font-semibold">
          Recorded by
          <input value={actor} onChange={(e) => setActor(e.target.value)} placeholder="Name or role" className={`${input} mt-1`} />
        </label>
        <label className="text-[11px] font-semibold sm:col-span-2">
          Note
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" className={`${input} mt-1`} />
        </label>
      </div>
      <button disabled={busy} onClick={submit} className="mt-4 rounded-full bg-brand-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-accent disabled:opacity-60">
        Record {LABELS[type].toLowerCase()}
      </button>
    </Card>
  );
}

const QR_PATTERN = [
  1,0,1,1,0,1,1,0, 0,1,1,0,1,0,1,1, 1,1,0,1,0,1,0,1, 0,0,1,0,1,1,1,0,
  1,0,1,1,1,0,0,1, 0,1,0,1,0,1,1,0, 1,1,0,1,1,0,1,0, 0,1,1,0,0,1,0,1,
].map(Boolean);

function KitRecordCard({ kit, receiptSeal, receiptTemp }: { kit: KitView; receiptSeal: string; receiptTemp: unknown }) {
  const [checked, setChecked] = useState<null | boolean>(null);
  return (
    <div className="rounded-3xl bg-gradient-to-br from-brand-primary via-slate-800 to-brand-primary text-white p-6 shadow-elegant">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">Kit record</p>
          <p className="font-display font-extrabold text-lg">{kit.kitId}</p>
        </div>
        <ShieldCheck className="size-6 text-brand-accent" />
      </div>
      <div className="rounded-2xl bg-white p-4 mx-auto w-full max-w-[200px]">
        <div className="grid grid-cols-8 gap-px aspect-square">
          {QR_PATTERN.map((on, i) => (
            <div key={i} className={`rounded-[1px] ${on ? "bg-brand-primary" : ""}`} />
          ))}
        </div>
      </div>
      <div className="mt-5 space-y-2 text-xs">
        {[
          ["Seal", kit.sealNo],
          ["Seal at receipt", receiptSeal],
          ["Temperature at receipt", receiptTemp !== undefined ? `${receiptTemp} °C` : "—"],
          ["Entries", String(kit.ledger.length)],
          ["Head hash", `${kit.ledger.at(-1)?.hash.slice(0, 12) ?? "—"}…`],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3">
            <span className="text-white/60">{k}</span>
            <span className="font-bold text-brand-accent text-right">{v}</span>
          </div>
        ))}
      </div>
      <button
        onClick={() => {
          const r = verifyChain(kit.ledger);
          setChecked(r.ok);
          if (r.ok) toast.success(`All ${kit.ledger.length} entries recompute.`);
          else toast.error(`Chain broken at entry ${r.brokenAt}.`);
        }}
        className={`mt-5 w-full rounded-full py-2.5 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 ${checked === null ? "bg-brand-accent text-white hover:bg-white hover:text-brand-primary" : checked ? "bg-brand-success text-white" : "bg-red-600 text-white"}`}
      >
        {checked === null ? <QrCode className="size-3.5" /> : checked ? <Check className="size-3.5" /> : <ShieldX className="size-3.5" />}
        {checked === null ? "Verify custody chain" : checked ? "Chain verified" : "Chain broken"}
      </button>
      <p className="mt-3 text-[11px] text-white/60">Verifies that the record is complete and unaltered. It does not by itself prove the food is safe.</p>
    </div>
  );
}

