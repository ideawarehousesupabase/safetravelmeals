import { createFileRoute } from "@tanstack/react-router";
import { SiteShell, PageHeader } from "@/components/site-shell";
import { Users, Utensils, Truck, ChefHat, ShieldCheck, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Console — SafeMeal" },
      { name: "description", content: "Platform analytics, monitoring and compliance overview." },
    ],
  }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const kpis = [
    { label: "Active Travelers", val: "24,891", delta: "+8.2%", icon: Users, color: "text-brand-accent bg-brand-accent/10" },
    { label: "Meals Today", val: "8,142", delta: "+3.1%", icon: Utensils, color: "text-emerald-600 bg-emerald-100" },
    { label: "Deliveries Live", val: "1,204", delta: "+12%", icon: Truck, color: "text-amber-600 bg-amber-100" },
    { label: "Kitchens Online", val: "184 / 187", delta: "98.4%", icon: ChefHat, color: "text-indigo-600 bg-indigo-100" },
  ];

  const bars = [42, 68, 51, 73, 84, 92, 76, 88, 95, 70, 82, 90];
  const max = Math.max(...bars);

  return (
    <SiteShell>
      <PageHeader eyebrow="Platform Admin" title="Operations Overview" description="Live monitoring across all hubs and partners." />
      <div className="mx-auto max-w-7xl px-6 py-10 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((k) => (
            <div key={k.label} className="rounded-2xl border border-brand-border bg-card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className={`size-10 rounded-xl ${k.color} grid place-items-center`}>
                  <k.icon className="size-5" />
                </div>
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1"><TrendingUp className="size-3" /> {k.delta}</span>
              </div>
              <p className="text-3xl font-display font-extrabold">{k.val}</p>
              <p className="text-xs text-muted-foreground mt-1">{k.label}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-2xl border border-brand-border bg-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display font-extrabold text-lg">Meals delivered · last 12 hours</h2>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-brand-accent" /> Airport</span>
                <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-emerald-500" /> Hotel</span>
              </div>
            </div>
            <div className="flex items-end justify-between gap-2 h-48">
              {bars.map((b, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex flex-col gap-0.5 h-full justify-end">
                    <div className="w-full bg-emerald-500 rounded-t" style={{ height: `${(b * 0.4 / max) * 100}%` }} />
                    <div className="w-full bg-brand-accent rounded-t" style={{ height: `${(b * 0.6 / max) * 100}%` }} />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{i}h</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-brand-primary to-slate-800 text-white p-6">
            <ShieldCheck className="size-5 text-brand-accent mb-3" />
            <h3 className="font-display font-extrabold text-lg">Safety Compliance</h3>
            <div className="mt-5 space-y-4">
              {[
                ["Allergen scans passed", "99.97%"],
                ["Cold-chain compliance", "100%"],
                ["Audit-ready kitchens", "184 / 187"],
                ["Open incidents", "0"],
              ].map(([k, v]) => (
                <div key={k}>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/70">{k}</span>
                    <span className="font-bold text-brand-accent">{v}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Panel title="Top Performing Kitchens">
            <ul className="divide-y divide-brand-border">
              {[
                ["LHR Kitchen 04", "1,284 meals", "100%"],
                ["JFK Kitchen 02", "1,148 meals", "99.9%"],
                ["DXB Kitchen 01", "982 meals", "99.8%"],
                ["SIN Kitchen 03", "871 meals", "100%"],
              ].map(([n, v, s]) => (
                <li key={n} className="py-3 flex items-center justify-between text-sm">
                  <span className="font-semibold">{n}</span>
                  <span className="text-muted-foreground">{v}</span>
                  <span className="text-emerald-600 font-bold">{s}</span>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="Recent Activity">
            <ul className="space-y-3 text-sm">
              {[
                ["09:42", "Sterility check passed at LHR-04"],
                ["09:31", "New hotel partner: Park Hyatt Tokyo"],
                ["09:08", "AI re-routed 12 meals (BA112 delay)"],
                ["08:55", "Allergen audit cleared at JFK-02"],
              ].map(([t, m]) => (
                <li key={t} className="flex gap-3">
                  <span className="text-muted-foreground font-mono text-xs w-12 shrink-0">{t}</span>
                  <span>{m}</span>
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