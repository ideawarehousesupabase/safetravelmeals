import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteShell, PageHeader } from "@/components/site-shell";
import { Card, JaapNav, LedgerTable, OutcomePill, Pill, SimulatedBanner } from "@/components/jaap/jaap-ui";
import { CheckCircle2, Circle, ShieldCheck } from "lucide-react";
import { DEMO, FEATURED_IDS, journeyById, kitById, verifyChain, type ExceptionRecord } from "@/lib/jaap/demo";
import { ROLES, WINDOW_TYPES } from "@/lib/jaap/protocol";
import { STAGES } from "@/lib/jaap/stages";
import { fmtDT } from "@/lib/jaap/time";

export const Route = createFileRoute("/exceptions")({
  head: () => ({
    meta: [
      { title: "Exception Handling — SafeMeal" },
      { name: "description", content: "How the platform holds, corrects and records failures in the Journey Allergen Assurance Protocol." },
    ],
  }),
  component: ExceptionsPage,
});

const FILTERS = ["All", "Normal workflow", "Failed (open)", "Resolved or closed"] as const;

function History({ e }: { e: ExceptionRecord }) {
  const kits = e.kitIds.filter((id) => kitById(id)!.journeyId === e.journeyId || e.id === "EXC-07").slice(0, 2);
  return (
    <div className="space-y-4">
      {kits.map((id) => {
        const kit = kitById(id)!;
        // This exception's entries, plus any correction that references one of them.
        const own = new Set(kit.ledger.filter((x) => x.data.exception === e.id).map((x) => x.seq));
        const rows = kit.ledger.filter((x) => own.has(x.seq) || (x.corrects !== null && own.has(x.corrects)));
        return (
          <div key={id}>
            <p className="text-xs font-semibold mb-1">
              <Link to="/records/$kitId" params={{ kitId: id }} className="font-mono text-brand-accent">{id}</Link> · {WINDOW_TYPES[kit.type].kit} · {journeyById(kit.journeyId)!.id} · chain {verifyChain(kit.ledger).ok ? "verifies" : "broken"} ({kit.ledger.length} entries)
            </p>
            <LedgerTable entries={rows} highlight={() => true} />
          </div>
        );
      })}
    </div>
  );
}

function ExceptionCard({ e }: { e: ExceptionRecord }) {
  const stage = STAGES[e.stage];
  return (
    <div id={e.id} className="scroll-mt-24">
      <Card className={e.outcome === "Open" ? "border-red-300" : ""}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-brand-accent">
              {e.id} · {e.type} · <Link to="/protocol" className="hover:underline">stage {stage.n} {stage.name}</Link>
            </p>
            <h3 className="font-display text-lg font-extrabold">{e.title}</h3>
          </div>
          <div className="flex items-center gap-2">
            <Pill tone="warn">Simulated</Pill>
            <OutcomePill outcome={e.outcome} />
          </div>
        </div>

        <dl className="mt-4 grid md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">What triggered it</dt>
            <dd className="mt-0.5">{e.trigger}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Alert or hold status</dt>
            <dd className="mt-0.5 font-semibold text-red-800">{e.alert}</dd>
            <dd className="text-xs text-muted-foreground">Detected {fmtDT(e.detectedAt)}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Affected kit or run</dt>
            <dd className="mt-0.5 flex flex-wrap gap-1.5">
              {e.kitIds.slice(0, 8).map((id) => (
                <Link key={id} to="/records/$kitId" params={{ kitId: id }} className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs font-bold text-brand-accent">{id}</Link>
              ))}
              {e.kitIds.length > 8 && <span className="text-xs text-muted-foreground">+{e.kitIds.length - 8} more in the run</span>}
            </dd>
            {e.runId && <dd className="text-xs text-muted-foreground mt-1">{e.id === "EXC-01" ? "Rejected run" : "Run"}: <span className="font-mono">{e.runId}</span> · journey {e.journeyId}</dd>}
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Responsible role</dt>
            <dd className="mt-0.5">{ROLES[e.responsible]}</dd>
            <dd className="text-xs text-muted-foreground">Endpoint impact: {e.endpoint}</dd>
          </div>
        </dl>

        <div className="mt-5 grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Corrective-action workflow</p>
            <ol className="space-y-2.5">
              {e.steps.map((s, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  {s.done ? <CheckCircle2 className="size-4 shrink-0 mt-0.5 text-emerald-600" /> : <Circle className="size-4 shrink-0 mt-0.5 text-red-500" />}
                  <div>
                    <p className={s.done ? "" : "font-semibold"}>{s.action}</p>
                    <p className="text-[11px] text-muted-foreground">{fmtDT(s.ts)} · {ROLES[s.role]}{s.done ? "" : " · open"}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-3 rounded-lg bg-secondary p-3 text-sm">{e.result}</p>
            <p className="mt-2 text-[11px] text-muted-foreground">Plan reference {e.planRef}</p>
          </div>
          <div className="lg:col-span-3 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">How it is recorded in the assurance history</p>
            <History e={e} />
          </div>
        </div>
      </Card>
    </div>
  );
}

function NormalWorkflow() {
  const kit = DEMO.kits.find((k) => k.journeyId === FEATURED_IDS.business && k.type === "lunch")!;
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-brand-accent">Reference · normal workflow</p>
          <h3 className="font-display text-lg font-extrabold">{kit.id}: every check passes first time</h3>
          <p className="text-sm text-muted-foreground mt-1">The same business journey as EXC-04 and EXC-07. This kit went through every stage with no exception, so its chain is a straight line from window to receipt.</p>
        </div>
        <Pill tone="ok"><ShieldCheck className="size-3" /> No exceptions</Pill>
      </div>
      <div className="mt-4">
        <LedgerTable entries={kit.ledger} />
      </div>
    </Card>
  );
}

function ExceptionsPage() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const list = DEMO.exceptions.filter((e) =>
    filter === "All" ? true : filter === "Failed (open)" ? e.outcome === "Open" : filter === "Resolved or closed" ? e.outcome !== "Open" : false,
  );
  const count = (o: string) => DEMO.exceptions.filter((e) => e.outcome === o).length;

  return (
    <SiteShell>
      <PageHeader
        eyebrow="Exception handling · JAAP stages 5–9"
        title="When something goes wrong"
        description="The record does not prove a kit is safe. It proves the chain of custody is complete and unaltered, and makes an incomplete chain visible instead of silent (§4.3). Each example shows the trigger, the hold, the corrective workflow and the entries it leaves behind."
      />
      <JaapNav />
      <div className="mx-auto max-w-7xl px-6 py-8 space-y-6">
        <SimulatedBanner>
          These exceptions are fictional scenarios written into the simulated records to demonstrate the platform's responses. They did not happen. A resolved exception keeps its original entries: corrections are new entries that reference the ones they correct.
        </SimulatedBanner>

        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${filter === f ? "border-brand-accent bg-brand-accent/10 text-brand-accent" : "border-brand-border"}`}>
              {f}
            </button>
          ))}
          <span className="ml-auto text-xs text-muted-foreground">
            {DEMO.exceptions.length} exceptions · {count("Resolved")} resolved · {count("Closed with recorded outcome")} closed with outcome · {count("Open")} open
          </span>
        </div>

        {(filter === "All" || filter === "Normal workflow") && <NormalWorkflow />}
        {list.map((e) => (
          <ExceptionCard key={e.id} e={e} />
        ))}
      </div>
    </SiteShell>
  );
}
