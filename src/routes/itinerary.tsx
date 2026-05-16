import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteShell, PageHeader } from "@/components/site-shell";
import { Plane, Hotel, Train, Plus, MapPin, Clock, Sparkles, ArrowRight, Trash2, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/itinerary")({
  head: () => ({
    meta: [
      { title: "Travel Itinerary Planner — SafeMeal" },
      { name: "description", content: "Add flights, hotels and trains. Our AI maps every safe meal." },
    ],
  }),
  component: ItineraryPage,
});

type Leg = { id: number; type: "flight" | "hotel" | "train"; title: string; from: string; to: string; date: string; time: string };

const ICONS = { flight: Plane, hotel: Hotel, train: Train };

function ItineraryPage() {
  const [legs, setLegs] = useState<Leg[]>([
    { id: 1, type: "flight", title: "BA 112", from: "London LHR", to: "New York JFK", date: "Mar 14", time: "11:30 → 14:45" },
    { id: 2, type: "hotel", title: "The Edition NY", from: "Manhattan", to: "Check-in", date: "Mar 14", time: "16:00" },
    { id: 3, type: "train", title: "Amtrak Acela 2151", from: "Penn Station", to: "Boston South", date: "Mar 16", time: "07:45 → 11:25" },
  ]);
  const [draft, setDraft] = useState<{ type: Leg["type"]; title: string; from: string; to: string; when: string }>({
    type: "flight", title: "", from: "", to: "", when: "",
  });
  const [toast, setToast] = useState<string | null>(null);

  const remove = (id: number) => setLegs((l) => l.filter((x) => x.id !== id));

  const add = () => {
    if (!draft.title.trim() || !draft.from.trim() || !draft.to.trim()) {
      setToast("Please fill flight/hotel name, From and To.");
      setTimeout(() => setToast(null), 2500);
      return;
    }
    const d = draft.when ? new Date(draft.when) : new Date();
    const date = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    const time = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    setLegs((l) => [...l, { id: Date.now(), type: draft.type, title: draft.title, from: draft.from, to: draft.to, date, time }]);
    setDraft({ type: draft.type, title: "", from: "", to: "", when: "" });
    setToast(`${draft.type === "flight" ? "Flight" : draft.type === "hotel" ? "Hotel" : "Train"} added to itinerary.`);
    setTimeout(() => setToast(null), 2500);
  };

  return (
    <SiteShell>
      <PageHeader eyebrow="Trip Planner" title="Build your travel itinerary" description="Add every leg of your journey. Our AI schedules safe meals around it.">
        <Link to="/scheduling" className="rounded-full bg-brand-primary px-5 py-3 text-sm font-bold text-white flex items-center gap-2 hover:bg-brand-accent transition-colors">
          <Sparkles className="size-4" /> Generate Meals
        </Link>
      </PageHeader>

      <div className="mx-auto max-w-7xl px-6 py-10 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-brand-border bg-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display font-extrabold text-lg">Trip Timeline · LHR → JFK → BOS</h2>
              <span className="text-xs font-bold text-muted-foreground">3 days · 3 legs</span>
            </div>

            <div className="relative pl-6 border-l-2 border-brand-border space-y-5">
              {legs.map((leg) => {
                const Icon = ICONS[leg.type];
                return (
                  <div key={leg.id} className="relative">
                    <div className="absolute -left-[31px] size-4 rounded-full border-2 border-brand-accent bg-card" />
                    <div className="rounded-xl border border-brand-border p-4 hover:border-brand-accent transition-colors group">
                      <div className="flex items-start gap-4">
                        <div className="size-11 rounded-xl bg-brand-accent/10 grid place-items-center text-brand-accent shrink-0">
                          <Icon className="size-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold">{leg.title}</p>
                            <span className="text-xs font-bold text-brand-accent">{leg.date}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {leg.from} → {leg.to}
                          </p>
                          <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Clock className="size-3" /> {leg.time}</span>
                            <span className="flex items-center gap-1"><MapPin className="size-3" /> Live tracking</span>
                          </div>
                        </div>
                        <button
                          onClick={() => remove(leg.id)}
                          className="opacity-0 group-hover:opacity-100 size-8 rounded-full grid place-items-center text-muted-foreground hover:bg-red-50 hover:text-red-600 transition"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div className="relative">
                <div className="absolute -left-[31px] size-4 rounded-full border-2 border-dashed border-brand-border bg-card" />
                <button className="w-full rounded-xl border-2 border-dashed border-brand-border p-4 text-sm font-bold text-muted-foreground hover:border-brand-accent hover:text-brand-accent flex items-center justify-center gap-2 transition-colors">
                  <Plus className="size-4" /> Add another leg
                </button>
              </div>
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-brand-border bg-card p-6">
            <h3 className="font-display font-extrabold text-base mb-4">Add Travel Leg</h3>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {(["flight", "hotel", "train"] as const).map((t) => {
                const Icon = ICONS[t];
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, type: t }))}
                    className={`rounded-xl border p-3 transition-colors flex flex-col items-center gap-2 ${
                      draft.type === t
                        ? "border-brand-accent bg-brand-accent/10"
                        : "border-brand-border hover:border-brand-accent hover:bg-brand-accent/5"
                    }`}
                  >
                    <Icon className={`size-4 ${draft.type === t ? "text-brand-accent" : "text-muted-foreground"}`} />
                    <span className="text-xs font-semibold capitalize">{t}</span>
                  </button>
                );
              })}
            </div>
            <div className="space-y-3">
              <input
                value={draft.title}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                placeholder={draft.type === "flight" ? "e.g. BA 112" : draft.type === "hotel" ? "e.g. The Edition NY" : "e.g. Acela 2151"}
                className="w-full rounded-xl border border-brand-border bg-background px-4 py-2.5 text-sm outline-none focus:border-brand-accent"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  value={draft.from}
                  onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))}
                  placeholder="From"
                  className="rounded-xl border border-brand-border bg-background px-4 py-2.5 text-sm outline-none focus:border-brand-accent"
                />
                <input
                  value={draft.to}
                  onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))}
                  placeholder="To"
                  className="rounded-xl border border-brand-border bg-background px-4 py-2.5 text-sm outline-none focus:border-brand-accent"
                />
              </div>
              <input
                type="datetime-local"
                value={draft.when}
                onChange={(e) => setDraft((d) => ({ ...d, when: e.target.value }))}
                className="w-full rounded-xl border border-brand-border bg-background px-4 py-2.5 text-sm outline-none focus:border-brand-accent"
              />
              <button onClick={add} type="button" className="w-full rounded-full bg-brand-primary text-white py-2.5 text-sm font-bold hover:bg-brand-accent transition-colors flex items-center justify-center gap-2">
                <Plus className="size-4" /> Add to itinerary
              </button>
            </div>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-brand-accent/10 to-indigo-100 border border-brand-accent/20 p-6">
            <Sparkles className="size-5 text-brand-accent mb-2" />
            <h3 className="font-display font-extrabold">AI Meal Mapping Ready</h3>
            <p className="text-sm text-muted-foreground mt-2">We've identified 8 safe-eating windows across this trip.</p>
            <Link to="/scheduling" className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-brand-accent">
              Generate AI schedule <ArrowRight className="size-4" />
            </Link>
          </div>
        </aside>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-full bg-brand-primary text-white px-5 py-3 text-sm font-semibold shadow-elegant flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="size-4 text-emerald-300" /> {toast}
        </div>
      )}
    </SiteShell>
  );
}