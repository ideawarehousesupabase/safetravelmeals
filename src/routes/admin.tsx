import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell, PageHeader } from "@/components/site-shell";
import { JaapNav, OutcomePill, SampleBanner, SetBadge } from "@/components/jaap/jaap-ui";
import { WorkspaceGate } from "@/components/workspace-gate";
import { Users, Utensils, Truck, ChefHat, ShieldCheck } from "lucide-react";
import type { Workspace } from "@/lib/processing";
import { EXCLUSION_SETS } from "@/lib/jaap/protocol";
import { addDays, dayOfWeek, fmtDay } from "@/lib/jaap/time";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Operations Overview — SafeMeal" },
      { name: "description", content: "Operations overview computed from the records in your account." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  return (
    <SiteShell>
      <PageHeader eyebrow="Operations overview" title="Your operation at a glance" description="Every figure here is computed from your travellers, journeys, clearances and recorded custody steps." />
      <JaapNav />
      <WorkspaceGate>{(ws) => <Overview ws={ws} />}</WorkspaceGate>
    </SiteShell>
  );
}

function Overview({ ws }: { ws: Workspace }) {
  const handovers = ws.journeys.reduce((n, j) => n + ws.plansById[j.id].batches.length, 0);
  const kpis = [
    { label: "Journeys", val: ws.journeys.length, icon: Users, color: "text-brand-accent bg-brand-accent/10" },
    { label: "Kits planned", val: ws.kits.length, icon: Utensils, color: "text-emerald-600 bg-emerald-100" },
    { label: "Handovers planned", val: handovers, icon: Truck, color: "text-amber-600 bg-amber-100" },
    { label: "Production runs", val: ws.runs.length, icon: ChefHat, color: "text-indigo-600 bg-indigo-100" },
  ];
  const weekOf = (d: string) => addDays(d, 1 - (dayOfWeek(d) || 7));
  const weeks = new Map<string, number>();
  for (const r of ws.runs) weeks.set(weekOf(r.date), (weeks.get(weekOf(r.date)) ?? 0) + r.kitIds.length);
  const bars = [...weeks.entries()].sort(([a], [b]) => a.localeCompare(b));
  const max = Math.max(1, ...bars.map(([, v]) => v));

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 space-y-6">
      {ws.hasSample && <SampleBanner />}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl border border-brand-border bg-card p-5">
            <div className={`size-10 rounded-xl ${k.color} grid place-items-center mb-3`}><k.icon className="size-5" /></div>
            <p className="text-3xl font-display font-extrabold">{k.val}</p>
            <p className="text-xs text-muted-foreground mt-1">{k.label}</p>
          </div>
        ))}
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-brand-border bg-card p-6">
          <h2 className="font-display font-extrabold text-lg mb-6">Kit-equivalents scheduled per production week</h2>
          {bars.length === 0 ? (
            <p className="text-sm text-muted-foreground">No runs scheduled yet.</p>
          ) : (
            <div className="flex items-end justify-between gap-2 h-48">
              {bars.map(([w, v]) => (
                <div key={w} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                  <span className="text-[10px] font-bold">{v}</span>
                  <div className="w-full bg-brand-accent rounded-t" style={{ height: `${(v / max) * 85}%` }} />
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">{fmtDay(w).slice(4)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-brand-primary to-slate-800 text-white p-6">
          <ShieldCheck className="size-5 text-brand-accent mb-3" />
          <h3 className="font-display font-extrabold text-lg">Validation endpoints</h3>
          <div className="mt-5 space-y-3">
            {ws.endpoints.map((e) => (
              <div key={e.id} className="flex justify-between gap-3 text-sm">
                <span className="text-white/70">{e.name}</span>
                <span className="font-bold text-brand-accent whitespace-nowrap">{e.value}</span>
              </div>
            ))}
          </div>
          <Link to="/validation" className="mt-5 inline-block text-xs font-bold text-brand-accent">Thresholds and pass/fail →</Link>
        </div>
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-brand-border bg-card p-6">
          <h3 className="font-display font-extrabold text-lg mb-4">Runs by exclusion set</h3>
          <ul className="divide-y divide-brand-border">
            {EXCLUSION_SETS.map((s) => {
              const runs = ws.runs.filter((r) => r.setId === s.id);
              return (
                <li key={s.id} className="py-3 flex items-center justify-between text-sm">
                  <SetBadge setId={s.id} />
                  <span className="text-muted-foreground">{runs.length} runs</span>
                  <span className="font-bold">{runs.reduce((n, r) => n + r.kitIds.length, 0)} KE</span>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="rounded-2xl border border-brand-border bg-card p-6">
          <h3 className="font-display font-extrabold text-lg mb-4">Exceptions</h3>
          {ws.exceptions.length === 0 && <p className="text-sm text-muted-foreground">None detected.</p>}
          <ul className="space-y-3 text-sm">
            {ws.exceptions.map((e) => (
              <li key={e.id} className="flex items-center gap-3">
                <span className="text-muted-foreground font-mono text-xs w-24 shrink-0">{fmtDay(e.detectedAt)}</span>
                <Link to="/exceptions" hash={e.id} className="flex-1 hover:text-brand-accent">{e.type}</Link>
                <OutcomePill outcome={e.outcome} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
