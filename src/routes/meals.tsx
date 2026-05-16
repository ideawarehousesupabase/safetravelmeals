import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteShell, PageHeader } from "@/components/site-shell";
import { ShieldCheck, Filter, ArrowRight, Plus, Check, X, Flame, Droplet, Wheat } from "lucide-react";
import mealSalmon from "@/assets/meal-salmon.jpg";
import mealZen from "@/assets/meal-zen.jpg";
import mealCabin from "@/assets/meal-cabin.jpg";
import mealHydration from "@/assets/meal-hydration.jpg";
import mealMezze from "@/assets/meal-mezze.jpg";
import mealProtein from "@/assets/meal-protein.jpg";

export const Route = createFileRoute("/meals")({
  head: () => ({
    meta: [
      { title: "Meal Marketplace — SafeMeal" },
      { name: "description", content: "Allergy-safe, vegan, gluten-free, halal & kosher meals — verified for travel." },
    ],
  }),
  component: MealsPage,
});

const FILTERS = ["All", "Gluten-Free", "Vegan", "Halal", "Kosher", "Dairy-Free", "Nut-Free"];

const MEALS = [
  { id: 1, name: "Transatlantic Salmon", brand: "Nordic Galley Co.", img: mealSalmon, desc: "Omega-3 rich for jet-lag recovery", price: "$24", tags: ["Gluten-Free", "Dairy-Free"], cal: 540, protein: 38 },
  { id: 2, name: "Altitude Zen Bowl", brand: "Verdant Kitchens", img: mealZen, desc: "Vegan, designed for digestive ease", price: "$19", tags: ["Vegan", "Nut-Free"], cal: 460, protein: 22 },
  { id: 3, name: "Overnight Cabin Box", brand: "Halal Skyline", img: mealCabin, desc: "Slow-release energy for red-eyes", price: "$16", tags: ["Halal", "High-Protein"], cal: 510, protein: 30 },
  { id: 4, name: "Hydration Plus Bowl", brand: "PureGrain Lab", img: mealHydration, desc: "Electrolyte-balanced grain salad", price: "$18", tags: ["Vegan", "Gluten-Free"], cal: 420, protein: 18 },
  { id: 5, name: "Mediterranean Mezze", brand: "Levant & Co.", img: mealMezze, desc: "Light, fragrant and Kosher-certified", price: "$22", tags: ["Kosher", "Dairy-Free"], cal: 480, protein: 24 },
  { id: 6, name: "Long-Haul Protein Box", brand: "Atlas Provisions", img: mealProtein, desc: "Designed for 8h+ flights", price: "$26", tags: ["High-Protein", "Halal"], cal: 620, protein: 44 },
];

function MealsPage() {
  const [filter, setFilter] = useState("All");
  const [open, setOpen] = useState<number | null>(null);
  const filtered = filter === "All" ? MEALS : MEALS.filter((m) => m.tags.includes(filter));
  const detail = MEALS.find((m) => m.id === open);

  return (
    <SiteShell>
      <PageHeader eyebrow="Meal Marketplace" title="Curated, verified, travel-ready." description="Every meal lab-screened against 14 allergens and audited monthly." />

      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
          <Filter className="size-4 text-muted-foreground shrink-0 mr-2" />
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
                filter === f ? "bg-brand-primary text-white" : "border border-brand-border bg-card hover:border-brand-accent"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((m) => (
            <article
              key={m.id}
              className="bg-card rounded-2xl border border-brand-border overflow-hidden group hover:shadow-elegant transition-all"
            >
              <div className="aspect-[4/3] overflow-hidden bg-secondary border-b border-brand-border">
                <img src={m.img} alt={m.name} width={800} height={600} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
              </div>
              <div className="p-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-brand-accent mb-1.5">{m.brand}</p>
                <div className="flex flex-wrap gap-1 mb-2">
                  {m.tags.map((t) => (
                    <span key={t} className="text-[10px] font-bold bg-secondary text-foreground px-2 py-0.5 rounded uppercase">{t}</span>
                  ))}
                </div>
                <h3 className="font-bold">{m.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">{m.desc}</p>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Flame className="size-3" /> {m.cal}cal</span>
                    <span className="flex items-center gap-1"><Droplet className="size-3" /> {m.protein}g</span>
                  </div>
                  <span className="font-bold font-display">{m.price}</span>
                </div>
                <div className="mt-4 flex gap-2">
                  <button onClick={() => setOpen(m.id)} className="flex-1 rounded-full border border-brand-border py-2 text-xs font-bold hover:bg-secondary">
                    Details
                  </button>
                  <Link to="/checkout" className="flex-1 rounded-full bg-brand-primary text-white py-2 text-xs font-bold flex items-center justify-center gap-1 hover:bg-brand-accent">
                    <Plus className="size-3.5" /> Add
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      {detail && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm grid place-items-center p-4" onClick={() => setOpen(null)}>
          <div className="bg-card rounded-3xl max-w-2xl w-full overflow-hidden shadow-elegant" onClick={(e) => e.stopPropagation()}>
            <div className="relative aspect-[16/9] bg-secondary">
              <img src={detail.img} alt={detail.name} className="w-full h-full object-cover" />
              <button onClick={() => setOpen(null)} className="absolute top-4 right-4 size-9 rounded-full bg-white/90 grid place-items-center hover:bg-white">
                <X className="size-4" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-2xl font-extrabold">{detail.name}</h2>
                <span className="font-display text-2xl font-extrabold">{detail.price}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">{detail.desc}</p>

              <div className="mt-5 grid grid-cols-3 gap-3">
                {[
                  ["Calories", `${detail.cal}`],
                  ["Protein", `${detail.protein}g`],
                  ["Carbs", "48g"],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-xl bg-secondary p-3 text-center">
                    <p className="text-xs text-muted-foreground">{k}</p>
                    <p className="font-display font-extrabold">{v}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Ingredients</p>
                <p className="text-sm">Wild salmon, quinoa, asparagus, lemon, olive oil, sea salt, fresh dill.</p>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {[["Lab Tested", ShieldCheck], ["Allergen Locked", Check], ["Gluten-Free", Wheat]].map(([t, I]: any) => (
                  <span key={t} className="flex items-center gap-1 text-xs font-bold bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full">
                    <I className="size-3" /> {t}
                  </span>
                ))}
              </div>

              <Link to="/checkout" className="mt-6 w-full rounded-full bg-brand-accent text-white py-3 font-bold flex items-center justify-center gap-2 shadow-glow">
                Add to itinerary <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </SiteShell>
  );
}