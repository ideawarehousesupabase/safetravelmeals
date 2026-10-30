import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SiteShell, PageHeader } from "@/components/site-shell";
import { Card, JaapNav, KitStatusPill, LedgerTable, OutcomePill, SetBadge, SimulatedBanner } from "@/components/jaap/jaap-ui";
import { AlertTriangle, ArrowDown, ArrowLeft, Check, Download, ShieldCheck, ShieldX, X } from "lucide-react";
import { exceptionById, journeyById, kitById, verifyChain, type LedgerEntry } from "@/lib/jaap/demo";
import { kitStages, type StageStatus } from "@/lib/jaap/follow";
import { STAGES } from "@/lib/jaap/stages";
import { WINDOW_TYPES } from "@/lib/jaap/protocol";

export const Route = createFileRoute("/records/$kitId")({
  loader: ({ params }) => {
    const kit = kitById(params.kitId);
    if (!kit) throw notFound();
    return { kitId: kit.id };
  },
  head: ({ params }) => ({ meta: [{ title: `${params.kitId} assurance record — SafeMeal` }] }),
  component: KitRecordPage,
});

const ICON: Record<StageStatus, { Icon: typeof Check; cls: string; label: string }> = {
  ok: { Icon: Check, cls: "bg-emerald-500 text-white", label: "Verified" },
  warn: { Icon: AlertTriangle, cls: "bg-amber-500 text-white", label: "Exception resolved" },
  fail: { Icon: X, cls: "bg-red-600 text-white", label: "Failed verification" },
  skip: { Icon: ArrowDown, cls: "bg-secondary text-muted-foreground", label: "Not reached" },
};

function KitRecordPage() {
  const { kitId } = Route.useLoaderData();
  const kit = kitById(kitId)!;
  const j = journeyById(kit.journeyId)!;
  const stages = useMemo(() => kitStages(kit), [kit]);
  const [tamperSeq, setTamperSeq] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [forKit, setForKit] = useState(kitId);
  if (forKit !== kitId) {
    setForKit(kitId);
    setTamperSeq(null);
    setChecked(false);
  }

  // Tampering edits a copy of one entry without re-hashing, exactly what a silent change would do.
  const shown: LedgerEntry[] = useMemo(
    () => kit.ledger.map((e) => (e.seq === tamperSeq ? { ...e, detail: `${e.detail} [edited after the fact]`, ts: e.ts } : e)),
    [kit, tamperSeq],
  );
  const result = verifyChain(shown);
  const siblings = j.kitIds;
  const idx = siblings.indexOf(kit.id);

  const exportChain = () => {
    const blob = new Blob(
      [JSON.stringify({ note: "SIMULATED DEMONSTRATION DATA", kit: kit.id, journey: j.id, traveller: j.travellerKey, hashAlgorithm: "SHA-256 over the JSON array of entry fields", entries: kit.ledger }, null, 2)],
      { type: "application/json" },
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${kit.id}-assurance-chain.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <SiteShell>
      <PageHeader
        eyebrow={`Meal-kit record · ${j.id}`}
        title={`${kit.id} · ${WINDOW_TYPES[kit.type].kit}`}
        description={`${kit.dish}. ${j.label}.`}
      >
        <Link to="/records" search={{ journey: j.id }} className="rounded-full border border-brand-border px-4 py-2.5 text-sm font-bold flex items-center gap-2 hover:border-brand-accent">
          <ArrowLeft className="size-4" /> All records
        </Link>
      </PageHeader>
      <JaapNav />

      <div className="mx-auto max-w-7xl px-6 py-8 space-y-6">
        <SimulatedBanner>
          This kit, its journey and every event below are fictional. The window, run binding, checks and hash chain were produced by the platform's own code from the simulated inputs.
        </SimulatedBanner>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            ["Exclusion set", <SetBadge key="s" setId={kit.setId} long />],
            ["Production run", <span key="r" className="font-mono">{kit.runId}</span>],
            ["Seal", <span key="se" className="font-mono">{kit.sealNo}</span>],
            ["Status", <KitStatusPill key="st" status={kit.status} />],
          ].map(([k, v]) => (
            <div key={k as string} className="rounded-xl border border-brand-border bg-card p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{k}</p>
              <div className="mt-1 text-sm font-semibold">{v}</div>
            </div>
          ))}
        </div>

        {kit.exceptionIds.length > 0 && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 space-y-2">
            {kit.exceptionIds.map((id) => {
              const e = exceptionById(id)!;
              return (
                <div key={id} className="flex flex-wrap items-center gap-2 text-sm">
                  <AlertTriangle className="size-4 text-amber-700" />
                  <Link to="/exceptions" hash={id} className="font-bold text-amber-900 hover:underline">{id}</Link>
                  <span>{e.type} at stage {e.stage + 1}</span>
                  <OutcomePill outcome={e.outcome} />
                </div>
              );
            })}
          </div>
        )}

        <Card>
          <h2 className="font-display text-xl font-extrabold mb-4">Journey of this kit through the protocol</h2>
          <ol className="relative border-l-2 border-brand-border ml-3 space-y-6">
            {stages.map((v) => {
              const s = STAGES[v.n - 1];
              const ic = ICON[v.status];
              return (
                <li key={v.n} className="pl-6 relative">
                  <span className={`absolute -left-[13px] top-0 size-6 rounded-full grid place-items-center ${ic.cls}`}>
                    <ic.Icon className="size-3.5" />
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display font-extrabold">{v.n}. {s.name}</p>
                    <span className="text-[11px] text-muted-foreground">{ic.label} · {s.planRef}</span>
                    {v.exceptionIds.map((id) => (
                      <Link key={id} to="/exceptions" hash={id} className="text-[11px] font-bold text-amber-700">{id}</Link>
                    ))}
                  </div>
                  <dl className="mt-2 grid sm:grid-cols-[170px_1fr] gap-x-3 gap-y-1 text-sm">
                    {v.fields.map(([k, val]) => (
                      <div key={k} className="contents">
                        <dt className="text-xs font-semibold text-muted-foreground pt-0.5">{k}</dt>
                        <dd className="[overflow-wrap:anywhere]">{val}</dd>
                      </div>
                    ))}
                  </dl>
                  {v.entries.length > 0 && v.n !== 10 && (
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      Chain entries: {v.entries.map((e) => `#${e.seq} ${e.event}`).join(" · ")}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        </Card>

        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="font-display text-xl font-extrabold">Assurance record</h2>
              <p className="text-sm text-muted-foreground">Append-only and hash-chained (§4.3, §7.7). Personal identifiers are held off-chain; the traveller appears only as {j.travellerKey}.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setChecked(true)} className="rounded-full bg-brand-primary px-4 py-2 text-sm font-bold text-white hover:bg-brand-accent">Verify chain</button>
              <select
                value={tamperSeq ?? ""}
                onChange={(e) => {
                  setTamperSeq(e.target.value === "" ? null : +e.target.value);
                  setChecked(true);
                }}
                className="rounded-full border border-brand-border bg-background px-3 py-2 text-sm"
              >
                <option value="">Simulate tampering: none</option>
                {kit.ledger.map((e) => (
                  <option key={e.seq} value={e.seq}>Silently edit entry #{e.seq}</option>
                ))}
              </select>
              <button onClick={exportChain} className="rounded-full border border-brand-border px-4 py-2 text-sm font-bold flex items-center gap-1 hover:border-brand-accent">
                <Download className="size-4" /> Export chain
              </button>
            </div>
          </div>
          {checked && (
            <div className={`mb-4 rounded-xl p-3 text-sm flex gap-2 ${result.ok ? "bg-emerald-50 text-emerald-900 border border-emerald-200" : "bg-red-50 text-red-900 border border-red-200"}`}>
              {result.ok ? <ShieldCheck className="size-4 mt-0.5" /> : <ShieldX className="size-4 mt-0.5" />}
              {result.ok
                ? `All ${shown.length} entries recompute to the stored hashes. No entry has been altered or removed.`
                : `Chain broken at entry #${result.brokenAt}: its recomputed hash no longer matches, so every later entry is suspect. A real correction would be a new entry referencing #${result.brokenAt}.`}
            </div>
          )}
          <LedgerTable entries={shown} brokenAt={result.ok ? null : result.brokenAt} highlight={(e) => e.corrects !== null || typeof e.data.exception === "string"} />
        </Card>

        <div className="flex justify-between text-sm font-bold">
          {idx > 0 ? (
            <Link to="/records/$kitId" params={{ kitId: siblings[idx - 1] }} className="text-brand-accent">← {siblings[idx - 1]}</Link>
          ) : <span />}
          {idx < siblings.length - 1 && (
            <Link to="/records/$kitId" params={{ kitId: siblings[idx + 1] }} className="text-brand-accent">{siblings[idx + 1]} →</Link>
          )}
        </div>
      </div>
    </SiteShell>
  );
}
