import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell, PageHeader } from "@/components/site-shell";
import { JaapNav, OutcomePill, SetBadge, SimulatedBanner } from "@/components/jaap/jaap-ui";
import { Users, Utensils, Truck, ChefHat, ShieldCheck } from "lucide-react";
import { DEMO } from "@/lib/jaap/demo";
import { VALIDATION } from "@/lib/jaap/validation";
import { EXCLUSION_SETS } from "@/lib/jaap/protocol";
import { addDays, dayOfWeek, fmtDay } from "@/lib/jaap/time";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Operations Overview — SafeMeal" },
      { name: "description", content: "Operations overview computed from the simulated validation records." },
    ],
  }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const handovers = DEMO.journeys.flatMap((j) => j.batches);
  const kpis = [
    { label: "Journeys mapped", val: DEMO.journeys.length, icon: Users, color: "text-brand-accent bg-brand-accent/10" },
    { label: "Kits produced", val: DEMO.kits.length, icon: Utensils, color: "text-emerald-600 bg-emerald-100" },
    { label: "Handovers", val: handovers.length, icon: Truck, color: "text-amber-600 bg-amber-100" },
    { label: "Production runs", val: DEMO.runs.length, icon: ChefHat, color: "text-indigo-600 bg-indigo-100" },
  ];

  // Kit-equivalents produced per programme week (weeks start on Monday).
  const weekOf = (d: string) => addDays(d, 1 - (dayOfWeek(d) || 7));
  const weeks = new Map<string, number>();
  for (const r of DEMO.runs) weeks.set(weekOf(r.date), (weeks.get(weekOf(r.date)) ?? 0) + r.kitIds.length);
  const bars = [...weeks.entries()].sort(([a], [b]) => a.localeCompare(b));
  const max = Math.max(...bars.map(([, v]) => v));

  return (
    <SiteShell>
      <PageHeader eyebrow="Operations overview" title="Simulated validation programme" description="Every figure here is computed from the same simulated records as the validation dashboard." />
      <JaapNav />
      <div className="mx-auto max-w-7xl px-6 py-10 space-y-6">
        <SimulatedBanner />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((k) => (
            <div key={k.label} className="rounded-2xl border border-brand-border bg-card p-5">
              <div className={`size-10 rounded-xl ${k.color} grid place-items-center mb-3`}>
                <k.icon className="size-5" />
              </div>
              <p className="text-3xl font-display font-extrabold">{k.val}</p>
              <p className="text-xs text-muted-foreground mt-1">{k.label}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-2xl border border-brand-border bg-card p-6">
            <h2 className="font-display font-extrabold text-lg mb-6">Kit-equivalents produced per week</h2>
            <div className="flex items-end justify-between gap-2 h-48">
              {bars.map(([w, v]) => (
                <div key={w} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                  <span className="text-[10px] font-bold">{v}</span>
                  <div className="w-full bg-brand-accent rounded-t" style={{ height: `${(v / max) * 85}%` }} />
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">{fmtDay(w).slice(4)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-brand-primary to-slate-800 text-white p-6">
            <ShieldCheck className="size-5 text-brand-accent mb-3" />
            <h3 className="font-display font-extrabold text-lg">Validation endpoints</h3>
            <div className="mt-5 space-y-3">
              {VALIDATION.endpoints.map((e) => (
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
          <Panel title="Runs by exclusion set">
            <ul className="divide-y divide-brand-border">
              {EXCLUSION_SETS.map((s) => {
                const runs = DEMO.runs.filter((r) => r.setId === s.id);
                return (
                  <li key={s.id} className="py-3 flex items-center justify-between text-sm">
                    <SetBadge setId={s.id} />
                    <span className="text-muted-foreground">{runs.length} runs</span>
                    <span className="font-bold">{runs.reduce((n, r) => n + r.kitIds.length, 0)} KE</span>
                  </li>
                );
              })}
            </ul>
          </Panel>
          <Panel title="Exceptions">
            <ul className="space-y-3 text-sm">
              {DEMO.exceptions.map((e) => (
                <li key={e.id} className="flex items-center gap-3">
                  <span className="text-muted-foreground font-mono text-xs w-24 shrink-0">{fmtDay(e.detectedAt)}</span>
                  <Link to="/exceptions" hash={e.id} className="flex-1 hover:text-brand-accent">{e.id} · {e.type}</Link>
                  <OutcomePill outcome={e.outcome} />
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </SiteShell>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-brand-border bg-card p-6">
      <h3 className="font-display font-extrabold text-lg mb-4">{title}</h3>
      {children}
    </div>
  );
}
