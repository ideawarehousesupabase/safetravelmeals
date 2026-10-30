import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell, PageHeader } from "@/components/site-shell";
import { JaapNav, SetBadge, SimulatedBanner } from "@/components/jaap/jaap-ui";
import { MapPin, Clock, ShieldCheck, QrCode, Check, Package, ChefHat, Truck, ShieldX, Briefcase } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DEMO, FEATURED_IDS, KITCHEN, clearanceById, journeyById, runById, verifyChain } from "@/lib/jaap/demo";
import { WINDOW_TYPES } from "@/lib/jaap/protocol";
import { fmtDT, fmtRange, fmtTime } from "@/lib/jaap/time";

export const Route = createFileRoute("/tracking")({
  head: () => ({
    meta: [
      { title: "Kit Handover Tracking — SafeMeal" },
      { name: "description", content: "Follow one kit from its production run to the traveller, and check its custody record." },
    ],
  }),
  component: TrackingPage,
});

const QR_PATTERN = [
  1,0,1,1,0,1,1,0, 0,1,1,0,1,0,1,1, 1,1,0,1,0,1,0,1, 0,0,1,0,1,1,1,0,
  1,0,1,1,1,0,0,1, 0,1,0,1,0,1,1,0, 1,1,0,1,1,0,1,0, 0,1,1,0,0,1,0,1,
].map(Boolean);

function TrackingPage() {
  const kit = DEMO.kits.find((k) => k.journeyId === FEATURED_IDS.business && k.type === "lunch")!;
  const j = journeyById(kit.journeyId)!;
  const run = runById(kit.runId)!;
  const clr = clearanceById(run.clearanceId)!;
  const b = j.batches.find((x) => x.key === kit.batchKey)!;
  const at = (ev: string) => kit.ledger.find((e) => e.event.startsWith(ev));
  const stages = [
    { label: "Window confirmed", icon: Check, e: at("Exposure window confirmed") },
    { label: "Produced in run", icon: ChefHat, e: at("Produced") },
    { label: "Sealed", icon: ShieldCheck, e: at("Sealed") },
    { label: "With courier", icon: Truck, e: at("Dispatched") },
    { label: "Received at venue", icon: Briefcase, e: at("Received") },
  ];
  const receipt = at("Received");
  const [checked, setChecked] = useState<null | boolean>(null);

  function handleVerify() {
    const r = verifyChain(kit.ledger);
    setChecked(r.ok);
    if (r.ok) toast.success(`All ${kit.ledger.length} entries recompute. Seal ${kit.sealNo} matches the run record.`);
    else toast.error(`Chain broken at entry ${r.brokenAt}.`);
  }

  return (
    <SiteShell>
      <PageHeader eyebrow="Kit handover · sample record" title={`${WINDOW_TYPES[kit.type].kit}: ${kit.dish}`} description={`${b.place} · declared window ${fmtRange(b.start, b.end)}`} />
      <JaapNav />

      <div className="mx-auto max-w-7xl px-6 py-10 space-y-6">
        <SimulatedBanner />
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-3xl border border-brand-border bg-card overflow-hidden">
              <div className="relative aspect-[16/9] bg-gradient-to-br from-indigo-50 via-sky-50 to-emerald-50 overflow-hidden">
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="none">
                  <defs>
                    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-brand-border" />
                    </pattern>
                  </defs>
                  <rect width="400" height="200" fill="url(#grid)" />
                  <path d="M40,160 Q120,40 240,90 T360,40" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" fill="none" className="text-brand-accent" />
                  <circle cx="40" cy="160" r="6" className="fill-brand-success" />
                  <circle cx="360" cy="40" r="8" className="fill-brand-accent" />
                </svg>
                <div className="absolute top-4 left-4 rounded-full bg-white/90 backdrop-blur px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-brand-primary shadow">
                  Route illustration
                </div>
                <div className="absolute bottom-4 left-4 rounded-2xl bg-white/95 backdrop-blur p-3 shadow-elegant text-xs">
                  <p className="font-bold flex items-center gap-1"><ChefHat className="size-3 text-brand-success" /> {KITCHEN}</p>
                  <p className="text-muted-foreground mt-0.5">Dispatched {fmtTime(b.dispatchAt)}</p>
                </div>
                <div className="absolute top-4 right-4 rounded-2xl bg-white/95 backdrop-blur p-3 shadow-elegant text-xs">
                  <p className="font-bold flex items-center gap-1"><MapPin className="size-3 text-brand-accent" /> {b.place}</p>
                  <p className="text-muted-foreground mt-0.5 flex items-center gap-1"><Clock className="size-3" /> Received {fmtTime(b.receivedAt)}</p>
                </div>
              </div>

              <div className="p-6">
                <h3 className="font-display font-extrabold text-lg mb-5">Custody progress</h3>
                <div className="grid grid-cols-5 gap-2">
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
              </div>
            </div>

            <div className="rounded-3xl border border-brand-border bg-card p-6">
              <h3 className="font-display font-extrabold text-lg mb-4">Production evidence for {run.id}</h3>
              <div className="space-y-3 text-sm">
                {[
                  [`Clearance ${clr.id}`, `${clr.deepClean ? "Deep clean" : "Line clearance"} signed ${fmtDT(clr.acceptedAt)} by ${clr.attempts[clr.attempts.length - 1].actor}`],
                  ...clr.swabs.map((s) => [`Swab ${s.id} · ${s.surface}`, s.result]),
                  ...clr.declarations.map((d) => [`Supplier declaration ${d}`, "Recorded against the batch at goods-in"]),
                ].map(([name, meta]) => (
                  <div key={name} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
                    <Package className="size-4 text-brand-accent" />
                    <div className="flex-1">
                      <p className="font-semibold">{name}</p>
                      <p className="text-xs text-muted-foreground">{meta}</p>
                    </div>
                    <Check className="size-4 text-brand-success" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-3xl bg-gradient-to-br from-brand-primary via-slate-800 to-brand-primary text-white p-6 shadow-elegant">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">Kit record</p>
                  <p className="font-display font-extrabold text-lg">{kit.id}</p>
                </div>
                <ShieldCheck className="size-6 text-brand-accent" />
              </div>
              <div className="rounded-2xl bg-white p-4 mx-auto w-full max-w-[220px]">
                <div className="grid grid-cols-8 gap-px aspect-square">
                  {QR_PATTERN.map((on, i) => (
                    <div key={i} className={`rounded-[1px] ${on ? "bg-brand-primary" : ""}`} />
                  ))}
                </div>
              </div>
              <div className="mt-5 space-y-2 text-xs">
                {[
                  ["Exclusion set", <SetBadge key="s" setId={kit.setId} />],
                  ["Seal", kit.sealNo],
                  ["Seal at receipt", String(receipt?.data.sealCheck ?? "—")],
                  ["Temperature at receipt", `${receipt?.data.tempC ?? "—"} °C`],
                  ["Head hash", `${kit.ledger[kit.ledger.length - 1].hash.slice(0, 12)}…`],
                ].map(([k, v]) => (
                  <div key={k as string} className="flex justify-between gap-3">
                    <span className="text-white/60">{k}</span>
                    <span className="font-bold text-brand-accent text-right">{v}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={handleVerify}
                className={`mt-5 w-full rounded-full py-2.5 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors ${
                  checked === null ? "bg-brand-accent text-white hover:bg-white hover:text-brand-primary" : checked ? "bg-brand-success text-white" : "bg-red-600 text-white"
                }`}
              >
                {checked === null ? <QrCode className="size-3.5" /> : checked ? <Check className="size-3.5" /> : <ShieldX className="size-3.5" />}
                {checked === null ? "Verify custody chain" : checked ? "Chain verified" : "Chain broken"}
              </button>
              <p className="mt-3 text-[11px] text-white/60">Verifies that the record is complete and unaltered. It does not by itself prove the food is safe.</p>
            </div>

            <div className="rounded-2xl border border-brand-border bg-card p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Produced under</p>
              <p className="mt-2 font-semibold">The company's written protocol, in hired segregated capacity</p>
              <p className="text-xs text-muted-foreground mt-1">HACCP-based regime. Validation endpoints are counter-signed by an independent food safety consultant during months 1 to 6.</p>
              <Link to="/records/$kitId" params={{ kitId: kit.id }} className="mt-3 inline-block text-sm font-bold text-brand-accent">Full record →</Link>
            </div>
          </aside>
        </div>
      </div>
    </SiteShell>
  );
}
