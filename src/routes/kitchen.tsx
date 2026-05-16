import { createFileRoute } from "@tanstack/react-router";
import { SiteShell, PageHeader } from "@/components/site-shell";
import { ChefHat, Package, ShieldCheck, Truck, AlertTriangle, Clock, Check } from "lucide-react";

export const Route = createFileRoute("/kitchen")({
  head: () => ({
    meta: [
      { title: "Partner Kitchen Dashboard — SafeMeal" },
      { name: "description", content: "Operational console for partner kitchens." },
    ],
  }),
  component: KitchenDashboard,
});

function KitchenDashboard() {
  const orders = [
    { id: "SM-0142", meal: "Quinoa Salmon Bowl", allergy: ["Gluten", "Nuts"], severity: "Severe", stage: "prep", eta: "10:15" },
    { id: "SM-0143", meal: "Vegan Buddha Bowl", allergy: ["Dairy"], severity: "Moderate", stage: "packaging", eta: "10:25" },
    { id: "SM-0144", meal: "Halal Protein Box", allergy: ["Sesame"], severity: "Anaphylactic", stage: "verify", eta: "10:35" },
    { id: "SM-0145", meal: "Mediterranean Mezze", allergy: ["Shellfish"], severity: "Mild", stage: "incoming", eta: "10:55" },
  ];
  const stats = [
    { label: "Active Orders", val: "24", icon: Package },
    { label: "In Prep", val: "9", icon: ChefHat },
    { label: "Awaiting Dispatch", val: "6", icon: Truck },
    { label: "Safety Score", val: "100%", icon: ShieldCheck },
  ];

  const stageColors: Record<string, string> = {
    incoming: "bg-secondary text-foreground",
    prep: "bg-amber-100 text-amber-800",
    packaging: "bg-indigo-100 text-indigo-800",
    verify: "bg-emerald-100 text-emerald-800",
  };

  return (
    <SiteShell>
      <PageHeader eyebrow="Partner Kitchen Console" title="LHR Kitchen 04 — Live Operations" description="Heathrow Terminal 5 · Shift A · 06:00–14:00" />
      <div className="mx-auto max-w-7xl px-6 py-10 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-brand-border bg-card p-5 flex items-center justify-between">
              <div>
                <p className="text-2xl font-display font-extrabold">{s.val}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </div>
              <div className="size-11 rounded-xl bg-brand-accent/10 grid place-items-center text-brand-accent">
                <s.icon className="size-5" />
              </div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-2xl border border-brand-border bg-card p-6">
            <h2 className="font-display font-extrabold text-lg mb-5">Incoming Orders</h2>
            <div className="space-y-3">
              {orders.map((o) => (
                <div key={o.id} className="rounded-xl border border-brand-border p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-brand-accent">{o.id}</span>
                        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${stageColors[o.stage]}`}>{o.stage}</span>
                      </div>
                      <p className="font-semibold mt-1">{o.meal}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="size-3" /> ETA {o.eta}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      {o.allergy.map((a) => (
                        <span key={a} className="text-[10px] font-bold bg-red-50 text-red-700 px-2 py-0.5 rounded uppercase flex items-center gap-1">
                          <AlertTriangle className="size-3" /> {a}
                        </span>
                      ))}
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                        o.severity === "Anaphylactic" ? "bg-red-100 text-red-800" :
                        o.severity === "Severe" ? "bg-orange-100 text-orange-800" :
                        o.severity === "Moderate" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                      }`}>{o.severity}</span>
                    </div>
                    <button className="text-xs font-bold text-brand-accent">Advance →</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-brand-border bg-card p-6">
              <h3 className="font-display font-extrabold mb-4">Workflow</h3>
              <ol className="space-y-3 text-sm">
                {["Receive & log", "Prep in allergen-locked zone", "Photo & weight check", "QR seal application", "Dispatch handoff"].map((s, i) => (
                  <li key={s} className="flex items-center gap-3">
                    <span className="size-7 rounded-full bg-brand-accent/10 text-brand-accent grid place-items-center text-xs font-bold">{i + 1}</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5">
              <Check className="size-5 text-emerald-600 mb-2" />
              <p className="text-sm font-semibold text-emerald-900">All zones clean</p>
              <p className="text-xs text-emerald-800/80 mt-1">Last sterility check: 09:42 · Pass</p>
            </div>
          </aside>
        </div>
      </div>
    </SiteShell>
  );
}