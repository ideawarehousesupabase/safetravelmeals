import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteShell, PageHeader } from "@/components/site-shell";
import { CapabilityNote, SetBadge } from "@/components/jaap/jaap-ui";
import { Filter, ArrowRight } from "lucide-react";
import mealSalmon from "@/assets/meal-salmon.jpg";
import mealZen from "@/assets/meal-zen.jpg";
import mealCabin from "@/assets/meal-cabin.jpg";
import mealMezze from "@/assets/meal-mezze.jpg";
import { DISHES, EXCLUSION_SETS, PREFERENCES, WINDOW_TYPES, type Preference, type WindowType } from "@/lib/jaap/protocol";

export const Route = createFileRoute("/meals")({
  head: () => ({
    meta: [
      { title: "Travel Menu System — SafeMeal" },
      { name: "description", content: "Breakfast-led, culturally tailored travel dishes produced in single-allergen runs." },
    ],
  }),
  component: MealsPage,
});

const IMAGES: Record<Preference, string> = {
  "South Asian": mealCabin,
  "Middle Eastern": mealMezze,
  "East Asian": mealZen,
  British: mealSalmon,
};
const TYPES: WindowType[] = ["breakfast", "late_arrival", "lunch", "in_transit"];

function MealsPage() {
  const [filter, setFilter] = useState<WindowType | "all">("all");

  return (
    <SiteShell>
      <PageHeader
        eyebrow="Travel menu system"
        title="Food you still want on the fourth morning."
        description="Breakfast-led because hotel breakfast is the highest-risk routine occasion of a trip, and culturally tailored because the same three Western free-from dishes every morning is not a menu. Every dish must survive a cold chain, a thermal transport box and a hotel refrigerator, and be edible without a kitchen."
      />

      <div className="mx-auto max-w-7xl px-6 py-10 space-y-8">
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <Filter className="size-4 text-muted-foreground shrink-0 mr-2" />
          {(["all", ...TYPES] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
                filter === f ? "bg-brand-primary text-white" : "border border-brand-border bg-card hover:border-brand-accent"
              }`}
            >
              {f === "all" ? "All kit types" : WINDOW_TYPES[f].kit}
            </button>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {PREFERENCES.map((p) => (
            <article key={p} className="bg-card rounded-2xl border border-brand-border overflow-hidden">
              <div className="aspect-[4/3] overflow-hidden bg-secondary border-b border-brand-border">
                <img src={IMAGES[p]} alt={`${p} travel dish`} width={800} height={600} className="w-full h-full object-cover" loading="lazy" />
              </div>
              <div className="p-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-brand-accent mb-2">{p}</p>
                <ul className="space-y-2.5">
                  {TYPES.filter((t) => filter === "all" || t === filter).map((t) => (
                    <li key={t}>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{WINDOW_TYPES[t].kit}</p>
                      <p className="text-sm font-semibold">{DISHES[p][t]}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>

        <div className="rounded-2xl border border-brand-border bg-card p-6">
          <h2 className="font-display font-extrabold text-lg">Produced in your exclusion set's run</h2>
          <p className="text-sm text-muted-foreground mt-1">
            A dish is not chosen by filtering a menu. Your profile is assigned to one of six published exclusion sets, and your kits are produced in a single-allergen run for that set, after line clearance and verification swabs.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {EXCLUSION_SETS.map((s) => (
              <SetBadge key={s.id} setId={s.id} long />
            ))}
          </div>
          <Link to="/itinerary" className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-brand-accent">
            Map a journey to see your kit plan <ArrowRight className="size-4" />
          </Link>
        </div>

        <CapabilityNote>
          Dish names and photographs are illustrative examples for this prototype. The founder's tested menu system is not reproduced here. Every kit label carries the full ingredient list with allergens emphasised.
        </CapabilityNote>
      </div>
    </SiteShell>
  );
}
