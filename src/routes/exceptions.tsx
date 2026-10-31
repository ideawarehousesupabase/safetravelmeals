import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { SiteShell, PageHeader } from "@/components/site-shell";
import { Card, JaapNav, LedgerTable, OutcomePill, Pill, SampleBanner, SampleTag } from "@/components/jaap/jaap-ui";
import { WorkspaceGate } from "@/components/workspace-gate";
import { CheckCircle2, Circle, ShieldCheck } from "lucide-react";
import { verifyChain, type ExceptionView, type Workspace } from "@/lib/processing";
import { recordEvent } from "@/lib/data/store";
import { ROLES, WINDOW_TYPES } from "@/lib/jaap/protocol";
import { STAGES } from "@/lib/jaap/stages";
import { fmtDT, nowLondon } from "@/lib/jaap/time";

export const Route = createFileRoute("/exceptions")({
  head: () => ({
    meta: [
      { title: "Exception Handling — SafeMeal" },
      { name: "description", content: "Exceptions the rule engine detected in your records, with holds, corrective steps and their assurance history." },
    ],
  }),
  component: ExceptionsPage,
});

const FILTERS = ["All", "Open", "Resolved or closed"] as const;

function History({ e, ws }: { e: ExceptionView; ws: Workspace }) {
  const kits = e.kitIds.map((id) => ws.kits.find((k) => k.kitId === id)).filter((k) => !!k).slice(0, 2);
  return (
    <div className="space-y-4">
      {kits.map((kit) => {
        const own = new Set(kit!.ledger.filter((x) => x.data.exception === e.id).map((x) => x.seq));
        const rows = kit!.ledger.filter((x) => own.has(x.seq) || (x.corrects !== null && own.has(x.corrects)));
        return (
          <div key={kit!.kitId}>
            <p className="text-xs font-semibold mb-1">
              <Link to="/records/$kitId" params={{ kitId: kit!.kitId }} className="font-mono text-brand-accent">{kit!.kitId}</Link> · {WINDOW_TYPES[kit!.type].kit} · chain {verifyChain(kit!.ledger).ok ? "verifies" : "broken"} ({kit!.ledger.length} entries)
            </p>
            {rows.length ? <LedgerTable entries={rows} highlight={() => true} /> : <p className="text-xs text-muted-foreground">Recorded on the run's clearance record.</p>}
          </div>
        );
      })}
      {e.kitIds.length > 2 && <p className="text-xs text-muted-foreground">+{e.kitIds.length - 2} more kits in the same run carry the same entries.</p>}
    </div>
  );
}

function Resolve({ e, uid }: { e: ExceptionView; uid: string }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="mt-3 rounded-xl border border-brand-border p-3 space-y-2">
      <p className="text-xs font-semibold">Record the outcome</p>
      <input value={note} onChange={(x) => setNote(x.target.value)} placeholder="e.g. Kit withdrawn; traveller notified; 1 kit-equivalent credited" className="w-full rounded-lg border border-brand-border bg-background px-3 py-2 text-sm" />
      <button
        disabled={busy}
        onClick={async () => {
          if (!note.trim()) return toast.error("Describe the outcome.");
          setBusy(true);
          try {
            await recordEvent(uid, { kitId: e.kitIds[0], journeyId: e.journeyId, type: "resolution", at: nowLondon(), tempC: null, sealPresented: null, releasedToTravellerId: null, resolves: e.id, actor: "Customer assurance", note: note.trim() });
            toast.success("Outcome recorded; the original entries stay in the record");
          } catch (x) {
            toast.error((x as Error).message);
          } finally {
            setBusy(false);
          }
        }}
        className="rounded-full bg-brand-primary px-4 py-2 text-xs font-bold text-white hover:bg-brand-accent disabled:opacity-60"
      >
        Close with this outcome
      </button>
    </div>
  );
}

function ExceptionCard({ e, ws, uid }: { e: ExceptionView; ws: Workspace; uid: string }) {
  const stage = STAGES[e.stage];
  const journey = ws.journeys.find((j) => j.id === e.journeyId);
  return (
    <div id={e.id} className="scroll-mt-24">
      <Card className={e.outcome === "Open" ? "border-red-300" : ""}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-brand-accent">
              {e.type} · <Link to="/protocol" className="hover:underline">stage {stage.n} {stage.name}</Link>
            </p>
            <h3 className="font-display text-lg font-extrabold">{e.title}</h3>
          </div>
          <div className="flex items-center gap-2">
            {journey?.source === "sample" && <SampleTag />}
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
              {e.kitIds.length > 8 && <span className="text-xs text-muted-foreground">+{e.kitIds.length - 8} more</span>}
            </dd>
            <dd className="text-xs text-muted-foreground mt-1">{e.runId ? <>Run <span className="font-mono">{e.runId}</span> · </> : null}{journey?.label}</dd>
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
                    <p className="text-[11px] text-muted-foreground">{s.done ? fmtDT(s.ts) : "Open"} · {ROLES[s.role]}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-3 rounded-lg bg-secondary p-3 text-sm">{e.result}</p>
            {e.resolvable && <Resolve e={e} uid={uid} />}
            <p className="mt-2 text-[11px] text-muted-foreground">Plan reference {e.planRef}</p>
          </div>
          <div className="lg:col-span-3 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">How it is recorded in the assurance history</p>
            <History e={e} ws={ws} />
          </div>
        </div>
      </Card>
    </div>
  );
}

function Exceptions({ ws, uid }: { ws: Workspace; uid: string }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const list = ws.exceptions.filter((e) => (filter === "All" ? true : filter === "Open" ? e.outcome === "Open" : e.outcome !== "Open"));
  const count = (o: string) => ws.exceptions.filter((e) => e.outcome === o).length;
  const clean = ws.kits.find((k) => !k.exceptionIds.length && k.status === "Receipt confirmed");
  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-6">
      {ws.hasSample && <SampleBanner />}
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${filter === f ? "border-brand-accent bg-brand-accent/10 text-brand-accent" : "border-brand-border"}`}>
            {f}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">
          {ws.exceptions.length} exceptions · {count("Open")} open · {count("Resolved")} resolved · {count("Closed with recorded outcome")} closed with outcome
        </span>
      </div>

      {ws.exceptions.length === 0 && (
        <Card>
          <div className="flex items-center gap-3">
            <ShieldCheck className="size-6 text-emerald-600" />
            <div>
              <p className="font-display text-lg font-extrabold">No exceptions detected</p>
              <p className="text-sm text-muted-foreground">The engine checks every clearance, receipt, seal, temperature, release and deadline in your records. Anything outside the protocol appears here automatically.</p>
            </div>
          </div>
        </Card>
      )}

      {filter !== "Open" && clean && (
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-brand-accent">Reference · normal workflow</p>
              <h3 className="font-display text-lg font-extrabold">{clean.kitId}: every check passed first time</h3>
            </div>
            <Pill tone="ok"><ShieldCheck className="size-3" /> No exceptions</Pill>
          </div>
          <div className="mt-4">
            <LedgerTable entries={clean.ledger} />
          </div>
        </Card>
      )}
      {list.map((e) => (
        <ExceptionCard key={e.id} e={e} ws={ws} uid={uid} />
      ))}
    </div>
  );
}

function ExceptionsPage() {
  return (
    <SiteShell>
      <PageHeader
        eyebrow="Exception handling · JAAP stages 5–9"
        title="When something goes wrong"
        description="The record does not prove a kit is safe. It proves the chain of custody is complete and unaltered, and makes an incomplete chain visible instead of silent (§4.3). The rule engine raises each exception from your records; closing one never erases its original entries."
      />
      <JaapNav />
      <WorkspaceGate>{(ws, uid) => <Exceptions ws={ws} uid={uid} />}</WorkspaceGate>
    </SiteShell>
  );
}
