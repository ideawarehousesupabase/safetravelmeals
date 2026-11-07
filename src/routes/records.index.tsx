import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteShell, PageHeader } from "@/components/site-shell";
import { Card, JaapNav, KitStatusPill, OutcomePill, SetBadge } from "@/components/jaap/jaap-ui";
import { EmptyState, WorkspaceGate } from "@/components/workspace-gate";
import { ALLERGENS, EXCLUSION_SETS, WINDOW_TYPES, productById } from "@/lib/jaap/protocol";
import { fmtDT, fmtRange } from "@/lib/jaap/time";
import type { JourneyInput, KitStatus, Workspace } from "@/lib/processing";

export const Route = createFileRoute("/records/")({
  validateSearch: (s: Record<string, unknown>) => ({ journey: typeof s.journey === "string" ? s.journey : undefined }),
  head: () => ({
    meta: [
      { title: "Meal-Kit Records — SafeMeal" },
      { name: "description", content: "Every kit in your account, from itinerary planning to final receipt." },
    ],
  }),
  component: RecordsPage,
});

const STATUSES: (KitStatus | "All")[] = ["All", "Planned", "Awaiting production", "Produced", "In transit", "Received", "Released", "Receipt confirmed", "On hold", "Withdrawn"];

function RecordsPage() {
  return (
    <SiteShell>
      <PageHeader
        eyebrow="Meal-kit records · JAAP stages 4–10"
        title="Every kit, from itinerary to receipt"
        description="Each record binds a kit to its exposure window, production run, clearance, seal and handovers. Open any kit to follow it through all ten stages and verify its chain."
      />
      <JaapNav />
      <WorkspaceGate>{(ws, uid) => <Records ws={ws} uid={uid} />}</WorkspaceGate>
    </SiteShell>
  );
}

function JourneyCard({ ws, j, highlight, setFilter, statusFilter }: { ws: Workspace; j: JourneyInput; highlight: boolean; setFilter: number; statusFilter: string }) {
  const t = ws.travellers.find((x) => x.id === j.travellerId);
  const plan = ws.plansById[j.id];
  const kits = ws.kits.filter((k) => k.journeyId === j.id && (!setFilter || k.setId === setFilter) && (statusFilter === "All" || k.status === statusFilter));
  const excs = [...new Set(ws.kits.filter((k) => k.journeyId === j.id).flatMap((k) => k.exceptionIds))].map((id) => ws.exceptions.find((x) => x.id === id)!).filter(Boolean);
  const product = plan.productId ? productById(plan.productId) : null;
  if ((setFilter || statusFilter !== "All") && !kits.length) return null;
  return (
    <Card className={highlight ? "ring-2 ring-brand-accent" : ""}>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-xs font-bold text-brand-accent">{t?.label}</p>
          <h3 className="font-display text-lg font-extrabold">{j.label}</h3>
          <p className="text-sm text-muted-foreground">Allergens: {t?.allergens.map((a) => ALLERGENS[a]).join(", ")} · status {j.status}</p>
        </div>
        <div className="text-right text-xs space-y-1">
          {plan.setId ? <SetBadge setId={plan.setId} long /> : <span className="font-semibold text-red-700">Refused: {plan.setReason}</span>}
          <p className="font-semibold">{product ? `${product.name} · ${product.price}` : "Coordinator quote (GBP £)"}</p>
          <p className="text-muted-foreground">
            {plan.windows.length} windows, {plan.windows.filter((w) => w.accepted).length} accepted · {plan.kits.length} kits · {plan.batches.length} handovers
          </p>
          <Link to="/itinerary" search={{ journey: j.id }} className="font-bold text-brand-accent">Edit itinerary →</Link>
        </div>
      </div>
      {kits.length === 0 ? (
        <p className="text-sm text-muted-foreground">No kits: {plan.refused ? "the profile is not covered by a published exclusion set." : "no exposure window was accepted."}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-brand-border">
                <th className="py-2 pr-3">Kit</th>
                <th className="pr-3">Kit type</th>
                <th className="pr-3">Meal occasion</th>
                <th className="pr-3">Run</th>
                <th className="pr-3">Seal</th>
                <th className="pr-3">Handover</th>
                <th className="pr-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {kits.map((k) => {
                const b = plan.batches.find((x) => x.key === k.batchKey)!;
                return (
                  <tr key={k.kitId} className="border-b border-brand-border/60 hover:bg-secondary/40">
                    <td className="py-2 pr-3">
                      <Link to="/records/$kitId" params={{ kitId: k.kitId }} className="font-mono font-bold text-brand-accent">{k.kitId}</Link>
                      {j.persons > 1 && <span className="text-muted-foreground"> · p{k.person}</span>}
                    </td>
                    <td className="pr-3">{WINDOW_TYPES[k.type].kit}</td>
                    <td className="pr-3 whitespace-nowrap">{fmtDT(k.occasionStart)}</td>
                    <td className="pr-3 font-mono">{k.runId}</td>
                    <td className="pr-3 font-mono">{k.sealNo}</td>
                    <td className="pr-3 whitespace-nowrap">{fmtRange(b.start, b.end)}</td>
                    <td className="pr-3 whitespace-nowrap"><KitStatusPill status={k.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {excs.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {excs.map((x) => (
            <Link key={x.id} to="/exceptions" hash={x.id} className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs flex items-center gap-2">
              {x.type} <OutcomePill outcome={x.outcome} />
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}

function Records({ ws, uid }: { ws: Workspace; uid: string }) {
  const { journey } = Route.useSearch();
  const [setFilter, setSetFilter] = useState(0);
  const [statusFilter, setStatusFilter] = useState("All");
  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {ws.journeys.length} journeys · {ws.kits.length} kits · {ws.runs.length} production runs
        </p>
        <div className="flex gap-2 text-sm">
          <select value={setFilter} onChange={(e) => setSetFilter(+e.target.value)} className="rounded-lg border border-brand-border bg-background px-3 py-2">
            <option value={0}>All sets</option>
            {EXCLUSION_SETS.map((s) => <option key={s.id} value={s.id}>{s.code}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-brand-border bg-background px-3 py-2">
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>
      {ws.journeys.length === 0 && <EmptyState uid={uid} title="No journeys yet" text="Kits appear here once a journey is saved." />}
      {ws.travellers.map((t) => {
        const js = ws.journeys.filter((j) => j.travellerId === t.id);
        if (!js.length) return null;
        return (
          <section key={t.id} className="space-y-4">
            {js.map((j) => (
              <JourneyCard key={j.id} ws={ws} j={j} highlight={journey === j.id} setFilter={setFilter} statusFilter={statusFilter} />
            ))}
          </section>
        );
      })}
    </div>
  );
}
