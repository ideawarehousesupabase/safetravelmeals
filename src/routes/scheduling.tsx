import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell, PageHeader } from "@/components/site-shell";
import { Sparkles, Plane, Hotel, Train, Clock, Zap, ArrowRight, ShieldCheck, Activity } from "lucide-react";

export const Route = createFileRoute("/scheduling")({
  head: () => ({
    meta: [
      { title: "AI Meal Scheduler — SafeMeal" },
      { name: "description", content: "AI-generated meal timeline that adapts to your travel in real time." },
    ],
  }),
  component: SchedulingPage,
});

const TIMELINE = [
  { time: "08:00", title: "Pre-departure Light Bowl", place: "Home delivery", venue: "London", icon: Sparkles, status: "delivered", tag: "Gluten-Free" },
  { time: "10:30", title: "Airport Pre-Flight Meal", place: "LHR · T5 Gate 12", venue: "Heathrow", icon: Plane, status: "in-transit", tag: "Vegan" },
  { time: "14:45", title: "In-Flight Safe Pack (handed at gate)", place: "Boarding · BA112", venue: "LHR", icon: Plane, status: "scheduled", tag: "Halal" },
  { time: "16:30", title: "Arrival Hydration Kit", place: "JFK · Arrivals", venue: "JFK", icon: Plane, status: "scheduled", tag: "Dairy-Free" },
  { time: "19:00", title: "Hotel Welcome Dinner", place: "The Edition NY", venue: "Manhattan", icon: Hotel, status: "scheduled", tag: "Gluten-Free" },
  { time: "07:30+1", title: "Train Breakfast Drop", place: "Penn Station · Acela", venue: "NYC", icon: Train, status: "scheduled", tag: "High-Protein" },
];

function SchedulingPage() {
  return (
    <SiteShell>
      <PageHeader eyebrow="AI Meal Scheduling" title="Your itinerary, decoded into safe meals." description="6 meals scheduled across 3 cities. Re-syncs every 60 seconds with live travel data.">
        <div className="rounded-full bg-brand-success/10 px-4 py-2 text-xs font-bold text-brand-success uppercase tracking-widest flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-brand-success animate-pulse" /> AI Live · 99.4% safe
        </div>
      </PageHeader>

      <div className="mx-auto max-w-7xl px-6 py-10 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-3xl border border-brand-border bg-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display font-extrabold text-lg flex items-center gap-2">
              <Sparkles className="size-5 text-brand-accent" /> AI Meal Timeline
            </h2>
            <button className="text-sm font-bold text-brand-accent">Regenerate</button>
          </div>

          <div className="relative pl-8 border-l-2 border-brand-accent/20 space-y-5">
            {TIMELINE.map((m) => (
              <div key={m.time} className="relative">
                <div className={`absolute -left-[37px] size-5 rounded-full grid place-items-center ${
                  m.status === "delivered" ? "bg-brand-success" :
                  m.status === "in-transit" ? "bg-brand-accent animate-pulse" : "bg-card border-2 border-brand-border"
                }`}>
                  {m.status === "delivered" && <span className="text-white text-[10px]">✓</span>}
                </div>
                <div className="rounded-2xl border border-brand-border p-4 hover:border-brand-accent transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold text-brand-accent">{m.time} · {m.venue}</p>
                    <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-secondary text-muted-foreground">
                      {m.status.replace("-", " ")}
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="size-10 rounded-xl bg-brand-accent/10 grid place-items-center text-brand-accent">
                      <m.icon className="size-4" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{m.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{m.place}</p>
                      <span className="mt-2 inline-block text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded uppercase">
                        {m.tag}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-2xl bg-gradient-to-br from-brand-primary to-slate-800 text-white p-6">
            <Zap className="size-5 text-brand-accent mb-3" />
            <h3 className="font-display font-extrabold text-lg">Smart Automation</h3>
            <ul className="mt-4 space-y-3 text-sm">
              {[
                "Real-time flight delay re-scheduling",
                "Gate change auto-rerouting",
                "Cabin pressure adjusted nutrition",
                "Time-zone aligned circadian meals",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <span className="size-1.5 rounded-full bg-brand-accent mt-1.5 shrink-0" />
                  <span className="text-white/80">{f}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-brand-border bg-card p-6">
            <h3 className="font-display font-extrabold mb-4">Live Adjustments</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
                <Clock className="size-4 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-900">BA112 delayed +25 min</p>
                  <p className="text-xs text-amber-800/80">Pre-flight meal pushed to 10:55</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <ShieldCheck className="size-4 text-emerald-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-emerald-900">Kitchen verified</p>
                  <p className="text-xs text-emerald-800/80">All 6 meals cleared safety scan</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-indigo-50 border border-indigo-200">
                <Activity className="size-4 text-indigo-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-indigo-900">Hydration boost added</p>
                  <p className="text-xs text-indigo-800/80">Long-haul auto-adjustment</p>
                </div>
              </div>
            </div>
          </div>

          <Link to="/checkout" className="block rounded-2xl bg-brand-accent text-white p-6 hover:scale-[1.02] transition-transform shadow-glow">
            <p className="text-xs font-bold uppercase tracking-widest text-white/70">Total · 6 meals</p>
            <p className="font-display text-3xl font-extrabold mt-1">$118</p>
            <p className="mt-3 text-sm font-bold flex items-center gap-1">Confirm & checkout <ArrowRight className="size-4" /></p>
          </Link>
        </aside>
      </div>
    </SiteShell>
  );
}