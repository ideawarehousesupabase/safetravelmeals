import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import {
  ShieldCheck,
  Plane,
  Sparkles,
  MapPin,
  Clock,
  ArrowRight,
  Check,
  Hotel,
  Briefcase,
  FileCheck2,
  Layers,
  Link2,
  ListChecks,
  Building2,
  FlaskConical,
} from "lucide-react";
import heroMeal from "@/assets/hero-meal.jpg";
import { SiteNav, SiteFooter } from "@/components/site-shell";
import { DEMO, FEATURED_IDS, journeyById } from "@/lib/jaap/demo";
import { DISHES, PRODUCTS, WINDOW_TYPES } from "@/lib/jaap/protocol";
import { fmtDT } from "@/lib/jaap/time";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SafeMeal — Safe Travel Meal Kits" },
      {
        name: "description",
        content:
          "Sealed, single-allergen-run meal kits for travellers with diagnosed food allergies, mapped to the itinerary and handed over at the hotel, venue or airport with a verifiable custody record.",
      },
    ],
  }),
  component: Landing,
});

const SAMPLE = journeyById(FEATURED_IDS.business)!;
const WINDOW_ICON = { late_arrival: Hotel, breakfast: Hotel, lunch: Briefcase, in_transit: Plane };

function Hero() {
  const shown = SAMPLE.windows.filter((w) => w.accepted).slice(0, 3);
  return (
    <header className="relative overflow-hidden pt-16 pb-24">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,oklch(0.95_0.04_237/0.6),transparent)]" />
      <div className="mx-auto max-w-7xl px-6 grid lg:grid-cols-2 gap-12 items-center">
        <div className="animate-fade-in">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-accent/20 bg-brand-accent/5 px-3 py-1 mb-6">
            <ShieldCheck className="size-3.5 text-brand-accent" />
            <span className="text-xs font-bold tracking-wider text-brand-accent uppercase">
              Journey Allergen Assurance Protocol
            </span>
          </div>
          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05]">
            Your Safe Food Journey{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-accent to-indigo-500">
              Starts Here.
            </span>
          </h1>
          <p className="mt-8 text-lg leading-8 text-muted-foreground max-w-xl">
            We take a traveller's itinerary, work out exactly where and when they will be at risk of eating food nobody has
            verified, and put a sealed, traceable, allergen-verified meal into their hands at each of those moments.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link to="/itinerary" className="group flex items-center gap-2 rounded-full bg-brand-primary px-7 py-4 text-base font-bold text-primary-foreground shadow-elegant transition-all hover:scale-[1.02]">
              Map my journey
              <ArrowRight className="size-4 opacity-70 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link to="/protocol" className="rounded-full border border-brand-border bg-card px-7 py-4 text-base font-bold shadow-sm hover:bg-secondary transition-colors">
              How the protocol works
            </Link>
          </div>
          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5"><Check className="size-3.5 text-brand-success" /> Single-allergen production runs</div>
            <div className="flex items-center gap-1.5"><Check className="size-3.5 text-brand-success" /> Hash-chained handover record</div>
            <div className="flex items-center gap-1.5"><Check className="size-3.5 text-brand-success" /> UK patent application GB2617886.3 filed</div>
          </div>
        </div>

        <div className="relative animate-scale-in">
          <div className="relative rounded-3xl border border-brand-border bg-card p-6 shadow-elegant">
            <div className="flex items-center justify-between mb-6 border-b border-brand-border pb-4">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Sample journey · {SAMPLE.id}</p>
                <h3 className="font-display font-bold text-lg">EDI → LHR · three nights in London</h3>
              </div>
              <div className="rounded-full bg-amber-100 px-3 py-1 text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                Simulated
              </div>
            </div>

            <div className="space-y-5">
              {shown.map((w) => {
                const Icon = WINDOW_ICON[w.type];
                return (
                  <div key={w.key} className="relative pl-7 border-l-2 border-brand-accent/20">
                    <div className="absolute -left-[9px] top-0.5 size-4 rounded-full border-2 border-brand-accent bg-card" />
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <p className="text-[11px] font-bold text-brand-accent">{fmtDT(w.occasionStart)} · {w.place}</p>
                        <p className="font-bold text-sm mt-0.5">{w.ruleId} · {WINDOW_TYPES[w.type].label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{DISHES[SAMPLE.preference][w.type]}</p>
                      </div>
                      <div className="size-9 rounded-lg bg-secondary border border-brand-border grid place-items-center shrink-0">
                        <Icon className="size-4 text-muted-foreground" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 rounded-2xl bg-brand-primary p-4 text-primary-foreground">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold tracking-[0.2em] text-white/60 uppercase">Allergen profile</span>
                <span className="text-[10px] font-bold text-brand-accent">{SAMPLE.set!.code} production run</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                <span className="px-2 py-1 rounded bg-red-500/20 text-red-300 text-[10px] font-bold border border-red-500/30">Peanut</span>
                <span className="px-2 py-1 rounded bg-red-500/20 text-red-300 text-[10px] font-bold border border-red-500/30">Sesame</span>
                <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">{SAMPLE.preference} menu</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function HowItWorks() {
  const steps = [
    { n: "01", title: "Itinerary and allergens", desc: "Flights, hotel stays and meetings, plus your diagnosed allergens and their severity, held under explicit consent.", icon: MapPin },
    { n: "02", title: "Exposure windows mapped", desc: "Deterministic rules find each meal occasion where you would otherwise eat unverified food: late arrival, hotel breakfast, working lunch, long flight.", icon: ListChecks },
    { n: "03", title: "Single-allergen production", desc: "Kits are produced in runs defined by exclusion set, after a signed line clearance and verification swabs, then sealed with a numbered seal.", icon: Layers },
    { n: "04", title: "Recorded handover", desc: "Every movement from kitchen to hotel, venue or airport is an entry in a hash-chained record you can export and check against the seal.", icon: Link2 },
  ];
  return (
    <section id="how" className="py-24 bg-card">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-xs font-bold text-brand-accent uppercase tracking-[0.2em] mb-3">How it Works</p>
          <h2 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight">
            Food produced against an itinerary, not an address.
          </h2>
          <p className="mt-4 text-muted-foreground">
            A written operating method designed by a professional chef with Level 3 food hygiene certification, working to HACCP principles. The software orchestrates it.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((s) => (
            <div key={s.n} className="group rounded-3xl border border-brand-border p-6 hover:border-brand-accent transition-all hover:shadow-glow">
              <div className="flex items-center justify-between mb-6">
                <span className="font-display text-3xl font-extrabold text-brand-border group-hover:text-brand-accent transition-colors">{s.n}</span>
                <div className="size-11 rounded-2xl bg-brand-accent/10 grid place-items-center text-brand-accent group-hover:bg-brand-accent group-hover:text-white transition-colors">
                  <s.icon className="size-5" />
                </div>
              </div>
              <h3 className="font-bold text-lg mb-2">{s.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  const features = [
    { icon: ListChecks, color: "text-brand-accent", bg: "bg-brand-accent/10", title: "Itinerary-to-exposure map", desc: "Rules, not statistics. Every window cites the rule and the itinerary facts that produced it, under a recorded rule-set version." },
    { icon: Layers, color: "text-brand-success", bg: "bg-brand-success/10", title: "Six published exclusion sets", desc: "From peanut and tree nut to a combined restrictive set. A profile no set covers is refused honestly, not served on a best-efforts basis." },
    { icon: ShieldCheck, color: "text-indigo-500", bg: "bg-indigo-500/10", title: "Tamper-evident seal", desc: "The seal number is bound to the production run and to the kit, and the label carries the full ingredient list with allergens emphasised." },
    { icon: Hotel, color: "text-amber-500", bg: "bg-amber-500/10", title: "Hotel, venue and landside handover", desc: "Breakfast kits held in the hotel refrigerator under written storage acceptance; lunch to the venue; in-transit kits handed over before security." },
    { icon: FileCheck2, color: "text-rose-500", bg: "bg-rose-500/10", title: "Exceptions you can see", desc: "A broken seal, a late handover or a temperature excursion is an entry in the record, visible to you, never corrected quietly." },
    { icon: Clock, color: "text-cyan-500", bg: "bg-cyan-500/10", title: "Itinerary changes", desc: "If a flight moves, the mapping rule regenerates the affected windows and the production and handover requirements move with them (year 1 build)." },
  ];
  return (
    <section id="features" className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-14">
          <div className="max-w-xl">
            <p className="text-xs font-bold text-brand-accent uppercase tracking-[0.2em] mb-3">The Protocol</p>
            <h2 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight">
              Continuity of assurance across a journey.
            </h2>
          </div>
          <p className="text-muted-foreground max-w-md">
            The record does not claim a kit is safe. It proves the chain of custody is complete and unaltered, and makes a gap visible instead of silent.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div key={f.title} className="rounded-3xl bg-card border border-brand-border p-7 hover:shadow-elegant transition-all hover:-translate-y-1">
              <div className={`size-12 rounded-2xl ${f.bg} ${f.color} grid place-items-center mb-5`}>
                <f.icon className="size-5" />
              </div>
              <h3 className="font-bold text-lg mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Products() {
  return (
    <section id="meals" className="py-24 bg-card">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-12">
          <div>
            <p className="text-xs font-bold text-brand-accent uppercase tracking-[0.2em] mb-3">Products</p>
            <h2 className="font-display text-4xl font-extrabold tracking-tight">Six products, one protocol</h2>
            <p className="text-muted-foreground mt-2">Every kit is produced under the same regime. Prices as set out in the business plan.</p>
          </div>
          <Link to="/meals" className="text-sm font-bold text-brand-accent flex items-center gap-1 hover:gap-2 transition-all">
            See the travel menu <ArrowRight className="size-4" />
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-card rounded-2xl border border-brand-border overflow-hidden sm:row-span-2">
            <img src={heroMeal} alt="Sealed travel meal kit" className="w-full h-full object-cover" loading="lazy" width={400} height={400} />
          </div>
          {PRODUCTS.map((p) => (
            <div key={p.id} className="rounded-2xl border border-brand-border p-5 flex flex-col">
              <h4 className="font-bold">{p.name}</h4>
              <p className="text-xs text-muted-foreground mt-1 flex-1">{p.what}</p>
              <div className="mt-4 flex items-end justify-between">
                <span className="font-display text-xl font-extrabold">{p.price}</span>
                <span className="text-[11px] text-muted-foreground text-right">{p.ke} kit-equivalents<br />{p.handovers} handover{p.handovers > 1 ? "s" : ""}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Evidence() {
  const stats = [
    { val: "73.4%", text: "find it difficult to find safe meals when travelling at least some of the time" },
    { val: "56.3%", text: "rank food safety as the most important factor when buying food on the move" },
    { val: "81.3%", text: "would trust a verified allergen meal service" },
  ];
  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="text-xs font-bold text-brand-accent uppercase tracking-[0.2em] mb-3">Why it matters</p>
          <h2 className="font-display text-4xl font-extrabold tracking-tight">What travellers told us.</h2>
          <p className="mt-4 text-muted-foreground">
            The company's own survey of 64 travellers. About 6% of UK adults, roughly 2.4 million people, have a clinically confirmed food allergy.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {stats.map((s) => (
            <figure key={s.val} className="rounded-3xl bg-card border border-brand-border p-7">
              <p className="font-display text-5xl font-extrabold text-brand-accent">{s.val}</p>
              <figcaption className="mt-4 text-sm leading-relaxed">{s.text}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function Stage() {
  const items = [
    { icon: FlaskConical, title: "Technology readiness level 4", text: "A working prototype of the ordering and itinerary interface. The validation programme with an independent food safety consultant runs in months 1 to 6." },
    { icon: Building2, title: "Hotel partnerships in development", text: "Two London hotels from two major UK hotel groups have signed expressions of interest in a food partnership. A controlled pilot comes before any expansion." },
    { icon: MapPin, title: "Greater London first", text: "Production runs in hired segregated capacity at a rated London partner kitchen. The service is United Kingdom only." },
  ];
  return (
    <section id="partners" className="py-16 border-t border-brand-border">
      <div className="mx-auto max-w-7xl px-6 grid md:grid-cols-3 gap-6">
        {items.map((i) => (
          <div key={i.title} className="flex gap-4">
            <div className="size-10 rounded-xl bg-secondary grid place-items-center shrink-0">
              <i.icon className="size-4 text-brand-accent" />
            </div>
            <div>
              <p className="font-bold">{i.title}</p>
              <p className="text-sm text-muted-foreground mt-1">{i.text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-5xl px-6">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-primary via-slate-800 to-brand-primary p-12 sm:p-16 text-center text-white shadow-elegant">
          <div className="absolute inset-0 bg-[radial-gradient(50%_60%_at_50%_0%,oklch(0.685_0.169_237.323/0.25),transparent)]" />
          <div className="relative">
            <h2 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight max-w-2xl mx-auto leading-tight">
              See where your next trip exposes you.
            </h2>
            <p className="mt-5 text-white/70 max-w-xl mx-auto">
              Enter an itinerary and an allergen profile, and the mapping rules show every exposure window and the kit plan that closes it.
            </p>
            <div className="mt-9 flex flex-wrap gap-4 justify-center">
              <Link to="/itinerary" className="rounded-full bg-brand-accent px-7 py-4 text-base font-bold text-white shadow-glow hover:bg-white hover:text-brand-primary transition-all">
                Map my journey
              </Link>
              <Link to="/records" className="rounded-full border border-white/20 bg-white/5 backdrop-blur px-7 py-4 text-base font-bold text-white hover:bg-white/10 transition flex items-center gap-2">
                <Sparkles className="size-4" /> Explore sample records
              </Link>
            </div>
            <p className="mt-6 text-xs text-white/50">{DEMO.kits.length} simulated kits across {DEMO.journeys.length} simulated journeys. Not operational data.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Landing() {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <SiteNav />
      <main>
        <Hero />
        <HowItWorks />
        <Features />
        <Products />
        <Evidence />
        <Stage />
        <CTA />
      </main>
      <SiteFooter />
    </div>
  );
}

