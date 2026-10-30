import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SiteShell, PageHeader } from "@/components/site-shell";
import { CapabilityNote, Card, JaapNav, Pill, SetBadge } from "@/components/jaap/jaap-ui";
import { AlertTriangle, ArrowDown, ArrowRight, Check, CornerDownLeft, FileText, RotateCcw, X } from "lucide-react";
import { STAGES } from "@/lib/jaap/stages";
import { DEMO, FEATURED_IDS, exceptionById, kitById } from "@/lib/jaap/demo";
import { kitStages, type StageStatus } from "@/lib/jaap/follow";
import { ROLES, WINDOW_TYPES } from "@/lib/jaap/protocol";
import { fmtDT } from "@/lib/jaap/time";

export const Route = createFileRoute("/protocol")({
  head: () => ({
    meta: [
      { title: "Journey Allergen Assurance Protocol — SafeMeal" },
      { name: "description", content: "How JAAP turns an itinerary into an allergen-controlled meal plan, a segregated production run and a hash-chained handover record." },
    ],
  }),
  component: ProtocolPage,
});

const COMPONENT_STYLE = {
  "Exposure map": { ring: "border-sky-300", chip: "bg-sky-100 text-sky-900", label: "Component 1 · itinerary-to-exposure map (§4.1)" },
  "Segregation regime": { ring: "border-violet-300", chip: "bg-violet-100 text-violet-900", label: "Component 2 · single-allergen-run segregation regime (§4.2)" },
  "Handover record": { ring: "border-emerald-300", chip: "bg-emerald-100 text-emerald-900", label: "Component 3 · transit handover record (§4.3)" },
} as const;

// Kits chosen to show a clean run and each exception path.
const FOLLOW = (() => {
  const pick = (jid: string, pred: (k: (typeof DEMO.kits)[number]) => boolean) => DEMO.kits.find((k) => k.journeyId === jid && pred(k))!;
  const normal = pick(FEATURED_IDS.business, (k) => k.type === "lunch");
  const list = [{ id: normal.id, label: `Normal · ${normal.id} business lunch` }];
  for (const e of DEMO.exceptions) {
    // Prefer a kit that shows only this exception, from the exception's own journey.
    const only = e.kitIds.filter((id) => kitById(id)!.exceptionIds.length === 1);
    const k = kitById(only.find((id) => kitById(id)!.journeyId === e.journeyId) ?? only[0] ?? e.kitIds[0])!;
    list.push({ id: k.id, label: `${e.id} · ${k.id} ${e.type.toLowerCase()}` });
  }
  return list;
})();

const STATUS_STYLE: Record<StageStatus, string> = {
  ok: "bg-emerald-500 text-white",
  warn: "bg-amber-500 text-white",
  fail: "bg-red-600 text-white",
  skip: "bg-secondary text-muted-foreground",
};

function StatusDot({ s }: { s: StageStatus }) {
  const Icon = s === "ok" ? Check : s === "warn" ? AlertTriangle : s === "fail" ? X : ArrowDown;
  return (
    <span className={`size-5 rounded-full grid place-items-center ${STATUS_STYLE[s]}`}>
      <Icon className="size-3" />
    </span>
  );
}

function ProtocolPage() {
  const [kitId, setKitId] = useState(FOLLOW[0].id);
  const [selected, setSelected] = useState(1);
  const [failAt, setFailAt] = useState<number | null>(null);
  const kit = kitById(kitId)!;
  const views = useMemo(() => kitStages(kit), [kit]);

  // A simulated failure overrides the recorded statuses: the failing stage is held and later stages are not reached.
  const statusOf = (n: number): StageStatus => {
    if (failAt === null) return views[n - 1].status;
    if (n < failAt) return "ok";
    if (n === failAt) return "fail";
    return n === 10 ? "warn" : "skip";
  };
  const stage = STAGES[selected - 1];
  const view = views[selected - 1];
  const style = COMPONENT_STYLE[stage.component];

  return (
    <SiteShell>
      <PageHeader
        eyebrow="Journey Allergen Assurance Protocol"
        title="From itinerary to assurance record"
        description="The protocol is the asset; the software orchestrates it (§1). Ten stages carry one kit from the traveller's itinerary to a record they can verify. Pick a stage to see its purpose, the records it passes on and what happens when it fails."
      />
      <JaapNav />

      <div className="mx-auto max-w-7xl px-6 py-8 space-y-6">
        <div className="grid md:grid-cols-3 gap-3">
          {Object.entries(COMPONENT_STYLE).map(([k, v]) => (
            <div key={k} className={`rounded-xl border-2 ${v.ring} bg-card px-4 py-3 text-xs font-semibold`}>
              {v.label}
            </div>
          ))}
        </div>

        <Card>
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Follow a kit</label>
            <select
              value={kitId}
              onChange={(e) => {
                setKitId(e.target.value);
                setFailAt(null);
              }}
              className="max-w-full rounded-lg border border-brand-border bg-background px-3 py-2 text-sm"
            >
              {FOLLOW.map((f) => (
                <option key={f.label} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
            <SetBadge setId={kit.setId} long />
            <Pill tone="warn">Simulated data</Pill>
            <Link to="/records/$kitId" params={{ kitId: kit.id }} className="ml-auto text-sm font-bold text-brand-accent flex items-center gap-1">
              Open full record <ArrowRight className="size-4" />
            </Link>
          </div>

          <ol className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {STAGES.map((s) => {
              const st = statusOf(s.n);
              const c = COMPONENT_STYLE[s.component];
              return (
                <li key={s.n} className="relative">
                  <button
                    onClick={() => setSelected(s.n)}
                    className={`w-full h-full text-left rounded-xl border-2 p-3 transition-all ${c.ring} ${selected === s.n ? "shadow-elegant ring-2 ring-brand-accent" : "hover:-translate-y-0.5"} ${st === "skip" ? "opacity-50" : ""} ${st === "fail" ? "bg-red-50" : "bg-card"}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${c.chip}`}>{s.n}</span>
                      <StatusDot s={st} />
                    </div>
                    <p className="mt-2 text-sm font-bold leading-snug">{s.name}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">{ROLES[s.role]}</p>
                  </button>
                  {s.n < 10 && (
                    <ArrowRight className={`hidden md:block absolute top-1/2 -right-3 size-3 -translate-y-1/2 z-10 ${s.n === 5 ? "md:hidden" : ""} text-muted-foreground`} />
                  )}
                </li>
              );
            })}
          </ol>
          <div className="mt-4 flex flex-wrap gap-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><StatusDot s="ok" /> verified</span>
            <span className="flex items-center gap-1"><StatusDot s="warn" /> exception recorded and resolved</span>
            <span className="flex items-center gap-1"><StatusDot s="fail" /> failed verification: hold or withdrawal</span>
            <span className="flex items-center gap-1"><StatusDot s="skip" /> not reached</span>
          </div>
        </Card>

        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold ${style.chip}`}>{style.label}</p>
                <h2 className="font-display text-2xl font-extrabold mt-2">
                  {stage.n}. {stage.name}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">{stage.purpose}</p>
              </div>
              <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">{stage.planRef}</span>
            </div>

            <div className="mt-5 grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Receives</p>
                <div className="flex flex-wrap gap-1.5">
                  {stage.receives.map((r) => (
                    <span key={r} className="rounded-md bg-secondary px-2 py-1 text-xs">{r}</span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Passes on</p>
                <div className="flex flex-wrap gap-1.5">
                  {stage.produces.map((r) => (
                    <span key={r} className={`rounded-md px-2 py-1 text-xs font-semibold ${style.chip}`}>{r}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-brand-border p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Verification at this stage</p>
              <p className="text-sm mt-1">{stage.check}</p>
            </div>

            <div className="mt-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Records for {kit.id} · {WINDOW_TYPES[kit.type].kit}
              </p>
              <dl className="divide-y divide-brand-border/70 rounded-xl border border-brand-border">
                {view.fields.map(([k, v]) => (
                  <div key={k} className="grid sm:grid-cols-[160px_1fr] gap-1 px-4 py-2 text-sm">
                    <dt className="text-muted-foreground text-xs font-semibold pt-0.5">{k}</dt>
                    <dd className="[overflow-wrap:anywhere]">{v}</dd>
                  </div>
                ))}
              </dl>
              {view.entries.length > 0 && (
                <ul className="mt-3 space-y-1 text-xs">
                  {view.entries.map((e) => (
                    <li key={e.seq} className="flex gap-2">
                      <FileText className="size-3.5 shrink-0 mt-0.5 text-brand-accent" />
                      <span>
                        <span className="font-mono text-muted-foreground">#{e.seq} {e.hash.slice(0, 8)}</span> · {fmtDT(e.ts)} · <strong>{e.event}</strong>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

          <div className="space-y-6">
            <Card className={statusOf(selected) === "fail" ? "border-red-300" : ""}>
              <h3 className="font-display font-extrabold">When this stage fails</h3>
              <p className="text-sm text-muted-foreground mt-2">{stage.onFail}</p>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setFailAt(failAt === selected ? null : selected)}
                  className={`flex-1 rounded-full px-4 py-2 text-sm font-bold ${failAt === selected ? "bg-secondary" : "bg-red-600 text-white hover:bg-red-700"}`}
                >
                  {failAt === selected ? "Clear simulated failure" : "Simulate failure here"}
                </button>
                {failAt !== null && failAt !== selected && (
                  <button onClick={() => setFailAt(null)} className="rounded-full bg-secondary px-3" aria-label="Reset">
                    <RotateCcw className="size-4" />
                  </button>
                )}
              </div>
              {failAt === selected && (
                <ol className="mt-4 space-y-2 text-sm">
                  <li className="flex gap-2"><X className="size-4 text-red-600 shrink-0 mt-0.5" /> Status set to <strong>{stage.failState}</strong>{selected < 9 ? `; stages ${selected + 1}–9 are not reached` : ""}.</li>
                  <li className="flex gap-2"><AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" /> {ROLES[stage.role]} is alerted with the kit and run identifiers.</li>
                  <li className="flex gap-2"><CornerDownLeft className="size-4 text-brand-accent shrink-0 mt-0.5" /> Corrective action is taken and the stage is verified again, or the kit is withdrawn with a recorded outcome.</li>
                  <li className="flex gap-2"><FileText className="size-4 text-emerald-600 shrink-0 mt-0.5" /> The failure and the correction are both appended to the assurance record. The original entry is never edited.</li>
                </ol>
              )}
              {stage.exceptionIds.length > 0 && (
                <div className="mt-4 border-t border-brand-border pt-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Worked examples</p>
                  {stage.exceptionIds.map((id) => {
                    const e = exceptionById(id)!;
                    return (
                      <Link key={id} to="/exceptions" hash={id} className="block text-sm text-brand-accent font-semibold hover:underline">
                        {id} · {e.type}
                      </Link>
                    );
                  })}
                </div>
              )}
            </Card>

            <Card>
              <h3 className="font-display font-extrabold">How records move</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Each stage adds identifiers that the next stage checks: the window cites its rule, the kit is bound to a run, the run to its clearance, the seal to the kit, and every movement to an actor, place and time. Each entry carries the hash of the one before it.
              </p>
              <Link to="/rules" className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-brand-accent">
                See the rules behind stages 2–5 <ArrowRight className="size-4" />
              </Link>
            </Card>

            <CapabilityNote>
              Implemented in this prototype: the mapping rules, exclusion-set matching, run grouping checks and the hash chain. Simulated: production, courier, hotel and temperature events. The plan runs months 1–6 on the written protocol with manual records while the platform is built (§2.5, §5.6).
            </CapabilityNote>
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
