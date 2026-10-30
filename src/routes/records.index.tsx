import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SiteShell, PageHeader } from "@/components/site-shell";
import { Card, JaapNav, KitStatusPill, OutcomePill, SetBadge, SimulatedBanner } from "@/components/jaap/jaap-ui";
import { Briefcase, Building2, Users } from "lucide-react";
import { DEMO, FEATURED_IDS, allergenList, exceptionById, journeyById, type Journey } from "@/lib/jaap/demo";
import { EXCLUSION_SETS, WINDOW_TYPES } from "@/lib/jaap/protocol";
import { fmtDT, fmtRange } from "@/lib/jaap/time";

export const Route = createFileRoute("/records/")({
  validateSearch: (s: Record<string, unknown>) => ({ journey: typeof s.journey === "string" ? s.journey : undefined }),
  head: () => ({
    meta: [
      { title: "Meal-Kit Records — SafeMeal" },
      { name: "description", content: "Simulated meal-kit records followed from itinerary planning to final receipt." },
    ],
  }),
  component: RecordsPage,
});

const GROUPS = [
  { title: "Individual business travel", icon: Briefcase, ids: [FEATURED_IDS.business] },
  { title: "Family travel", icon: Users, ids: [FEATURED_IDS.family] },
  { title: "Corporate account", icon: Building2, ids: FEATURED_IDS.corporate },
];

function KitTable({ j }: { j: Journey }) {
  const kits = j.kitIds.map((id) => DEMO.kits.find((k) => k.id === id)!).sort((a, b) => a.id.localeCompare(b.id));
  return (
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
            const w = j.windows.find((x) => x.key === k.windowKey)!;
            const b = j.batches.find((x) => x.key === k.batchKey)!;
            return (
              <tr key={k.id} className="border-b border-brand-border/60 hover:bg-secondary/40">
                <td className="py-2 pr-3">
                  <Link to="/records/$kitId" params={{ kitId: k.id }} className="font-mono font-bold text-brand-accent">{k.id}</Link>
                  {j.persons > 1 && <span className="text-muted-foreground"> · p{k.person}</span>}
                </td>
                <td className="pr-3">{WINDOW_TYPES[k.type].kit}</td>
                <td className="pr-3 whitespace-nowrap">{fmtDT(w.occasionStart)}</td>
                <td className="pr-3 font-mono">{k.runId}</td>
                <td className="pr-3 font-mono">{k.sealNo}</td>
                <td className="pr-3 whitespace-nowrap">{b.key.split("-").pop()} · {fmtRange(b.start, b.end)}</td>
                <td className="pr-3 whitespace-nowrap">
                  <KitStatusPill status={k.status} />{" "}
                  {k.exceptionIds.map((e) => (
                    <Link key={e} to="/exceptions" hash={e} className="ml-1 font-bold text-amber-700">{e}</Link>
                  ))}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RecordsPage() {
  const { journey } = Route.useSearch();
  const [setFilter, setSetFilter] = useState(0);
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(0);
  const cohort = useMemo(
    () =>
      DEMO.kits.filter((k) => {
        const j = journeyById(k.journeyId)!;
        return !j.featured && (!setFilter || k.setId === setFilter) && (statusFilter === "All" || k.status === statusFilter);
      }),
    [setFilter, statusFilter],
  );
  const pages = Math.max(1, Math.ceil(cohort.length / 20));

  return (
    <SiteShell>
      <PageHeader
        eyebrow="Meal-kit records · JAAP stages 4–10"
        title="Every kit, from itinerary to receipt"
        description="Each record binds a kit to its exposure window, production run, clearance, seal and handovers. Open any kit to follow it through all ten stages and verify its chain."
      />
      <JaapNav />
      <div className="mx-auto max-w-7xl px-6 py-8 space-y-8">
        <SimulatedBanner />

        {GROUPS.map((g) => (
          <section key={g.title}>
            <h2 className="font-display text-xl font-extrabold mb-3 flex items-center gap-2">
              <g.icon className="size-5 text-brand-accent" /> {g.title}
            </h2>
            {g.ids.length > 1 && <p className="text-sm text-muted-foreground mb-3">{journeyById(g.ids[0])!.account}. Corporate or Airline Pack: 24 kit-equivalents and 6 handovers; this month's journeys use {g.ids.reduce((n, id) => n + journeyById(id)!.kitIds.length, 0)} kit-equivalents and {g.ids.reduce((n, id) => n + journeyById(id)!.batches.length, 0)} handovers.</p>}
            <div className="space-y-4">
              {g.ids.map((id) => {
                const j = journeyById(id)!;
                const excs = [...new Set(j.kitIds.flatMap((k) => DEMO.kits.find((x) => x.id === k)!.exceptionIds))];
                return (
                  <Card key={id} className={journey === id ? "ring-2 ring-brand-accent" : ""}>
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                      <div>
                        <p className="text-xs font-bold text-brand-accent">{j.id} · {j.travellerKey}</p>
                        <h3 className="font-display text-lg font-extrabold">{j.label}</h3>
                        <p className="text-sm text-muted-foreground">{j.persona}. Allergens: {allergenList(j.allergens)}.</p>
                      </div>
                      <div className="text-right text-xs space-y-1">
                        <SetBadge setId={j.set!.id} long />
                        <p className="font-semibold">{j.productInfo?.name} · {j.productInfo?.price}</p>
                        <p className="text-muted-foreground">
                          {j.windows.length} windows generated, {j.windows.filter((w) => w.accepted).length} accepted · {j.kitIds.length} kits · {j.batches.length} handovers
                        </p>
                        <Link to="/itinerary" search={{ journey: j.id }} className="font-bold text-brand-accent">Open itinerary plan →</Link>
                      </div>
                    </div>
                    <KitTable j={j} />
                    {excs.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {excs.map((e) => {
                          const x = exceptionById(e)!;
                          return (
                            <Link key={e} to="/exceptions" hash={e} className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs flex items-center gap-2">
                              <strong>{e}</strong> {x.type} <OutcomePill outcome={x.outcome} />
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </section>
        ))}

        <section>
          <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
            <div>
              <h2 className="font-display text-xl font-extrabold">Simulated validation cohort</h2>
              <p className="text-sm text-muted-foreground">{DEMO.journeys.filter((j) => !j.featured).length} further fictional journeys run through the same pipeline, so the validation dashboard has the sample sizes the plan requires.</p>
            </div>
            <div className="flex gap-2 text-sm">
              <select value={setFilter} onChange={(e) => { setSetFilter(+e.target.value); setPage(0); }} className="rounded-lg border border-brand-border bg-background px-3 py-2">
                <option value={0}>All sets</option>
                {EXCLUSION_SETS.map((s) => <option key={s.id} value={s.id}>{s.code}</option>)}
              </select>
              <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }} className="rounded-lg border border-brand-border bg-background px-3 py-2">
                {["All", "Receipt confirmed", "Withdrawn"].map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <Card className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-brand-border">
                    <th className="p-3">Kit</th>
                    <th className="p-3">Journey</th>
                    <th className="p-3">Set</th>
                    <th className="p-3">Kit type</th>
                    <th className="p-3">Run</th>
                    <th className="p-3">Seal</th>
                    <th className="p-3">Handed over</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {cohort.slice(page * 20, page * 20 + 20).map((k) => {
                    const j = journeyById(k.journeyId)!;
                    const b = j.batches.find((x) => x.key === k.batchKey)!;
                    return (
                      <tr key={k.id} className="border-b border-brand-border/60 hover:bg-secondary/40">
                        <td className="p-3"><Link to="/records/$kitId" params={{ kitId: k.id }} className="font-mono font-bold text-brand-accent">{k.id}</Link></td>
                        <td className="p-3">{j.id} · {j.label}</td>
                        <td className="p-3"><SetBadge setId={k.setId} /></td>
                        <td className="p-3">{WINDOW_TYPES[k.type].kit}</td>
                        <td className="p-3 font-mono">{k.runId}</td>
                        <td className="p-3 font-mono">{k.sealNo}</td>
                        <td className="p-3 whitespace-nowrap">{fmtDT(b.receivedAt)}</td>
                        <td className="p-3"><KitStatusPill status={k.status} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between p-3 text-xs text-muted-foreground">
              <span>{cohort.length} kits</span>
              <div className="flex gap-2">
                <button disabled={page === 0} onClick={() => setPage(page - 1)} className="rounded-full border border-brand-border px-3 py-1 disabled:opacity-40">Previous</button>
                <span className="py-1">{page + 1} / {pages}</span>
                <button disabled={page >= pages - 1} onClick={() => setPage(page + 1)} className="rounded-full border border-brand-border px-3 py-1 disabled:opacity-40">Next</button>
              </div>
            </div>
          </Card>
        </section>
      </div>
    </SiteShell>
  );
}
