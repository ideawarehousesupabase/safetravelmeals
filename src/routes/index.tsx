import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import {
  ShieldCheck,
  Plane,
  QrCode,
  Sparkles,
  MapPin,
  Clock,
  ArrowRight,
  Check,
  Hotel,
  Train,
  Utensils,
  Activity,
  Leaf,
} from "lucide-react";
import heroMeal from "@/assets/hero-meal.jpg";
import { SiteNav, SiteFooter } from "@/components/site-shell";

const QR_PATTERN = [
  1,0,1,1,0,1, 0,1,1,0,1,0, 1,1,0,1,0,1, 0,0,1,0,1,1, 1,0,1,1,1,0, 0,1,0,1,0,1,
].map(Boolean);

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SafeMeal — Your Safe Food Journey Starts Here" },
      {
        name: "description",
        content:
          "AI-powered allergy-safe meal kits scheduled around your travel itinerary and delivered to airports, hotels and stations.",
      },
    ],
  }),
  component: Landing,
});

function Hero() {
  return (
    <header className="relative overflow-hidden pt-16 pb-24">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,oklch(0.95_0.04_237/0.6),transparent)]" />
      <div className="mx-auto max-w-7xl px-6 grid lg:grid-cols-2 gap-12 items-center">
        <div className="animate-fade-in">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-accent/20 bg-brand-accent/5 px-3 py-1 mb-6">
            <Sparkles className="size-3.5 text-brand-accent" />
            <span className="text-xs font-bold tracking-wider text-brand-accent uppercase">
              AI-Powered Safety Engine
            </span>
          </div>
          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05]">
            Your Safe Food Journey{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-accent to-indigo-500">
              Starts Here.
            </span>
          </h1>
          <p className="mt-8 text-lg leading-8 text-muted-foreground max-w-xl">
            Precision food logistics for travelers with allergies, dietary, and religious needs.
            Verified, timed, and delivered to your gate, hotel, or station — using advanced
            dietary intelligence.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link to="/onboarding" className="group flex items-center gap-2 rounded-full bg-brand-primary px-7 py-4 text-base font-bold text-primary-foreground shadow-elegant transition-all hover:scale-[1.02]">
              Plan My Meals
              <ArrowRight className="size-4 opacity-70 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link to="/meals" className="rounded-full border border-brand-border bg-card px-7 py-4 text-base font-bold shadow-sm hover:bg-secondary transition-colors">
              Explore Safe Meals
            </Link>
          </div>
          <div className="mt-10 flex items-center gap-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5"><Check className="size-3.5 text-brand-success" /> ISO 22000 Certified</div>
            <div className="flex items-center gap-1.5"><Check className="size-3.5 text-brand-success" /> 450+ Airports</div>
            <div className="flex items-center gap-1.5"><Check className="size-3.5 text-brand-success" /> Lab Verified</div>
          </div>
        </div>

        <div className="relative animate-scale-in">
          <div className="relative rounded-3xl border border-brand-border bg-card p-6 shadow-elegant">
            <div className="flex items-center justify-between mb-6 border-b border-brand-border pb-4">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Active Itinerary</p>
                <h3 className="font-display font-bold text-lg">LHR → JFK · BA 112</h3>
              </div>
              <div className="rounded-full bg-brand-success/10 px-3 py-1 text-[10px] font-bold text-brand-success uppercase tracking-wider">
                Safety Verified
              </div>
            </div>

            <div className="space-y-5">
              {[
                { time: "10:30 AM", place: "Terminal 5 · Gate 12", title: "Airport Pre-Flight Meal", sub: "Gluten-Free Herb Chicken & Quinoa", icon: Plane },
                { time: "04:15 PM", place: "The Edition Hotel", title: "Check-in Welcome Kit", sub: "Nut-Free Protein Pack & Electrolytes", icon: Hotel },
                { time: "08:45 PM", place: "Penn Station", title: "Train Dinner Drop", sub: "Vegan Buddha Bowl", icon: Train },
              ].map((item) => (
                <div key={item.time} className="relative pl-7 border-l-2 border-brand-accent/20">
                  <div className="absolute -left-[9px] top-0.5 size-4 rounded-full border-2 border-brand-accent bg-card" />
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <p className="text-[11px] font-bold text-brand-accent">{item.time} · {item.place}</p>
                      <p className="font-bold text-sm mt-0.5">{item.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.sub}</p>
                    </div>
                    <div className="size-9 rounded-lg bg-secondary border border-brand-border grid place-items-center shrink-0">
                      <item.icon className="size-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl bg-brand-primary p-4 text-primary-foreground">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold tracking-[0.2em] text-white/60 uppercase">Safety Profile</span>
                <span className="text-[10px] font-bold text-brand-accent">AI SCORE 99.4%</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                <span className="px-2 py-1 rounded bg-red-500/20 text-red-300 text-[10px] font-bold border border-red-500/30">Celiac</span>
                <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-300 text-[10px] font-bold border border-blue-500/30">Dairy-Free</span>
                <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">Halal</span>
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
    { n: "01", title: "Build Your Safety Profile", desc: "Onboard with allergies, severity levels, religious and dietary preferences. Reviewed by our medical team.", icon: ShieldCheck },
    { n: "02", title: "Sync Your Itinerary", desc: "Connect flights, hotels, and trains. Our AI maps every safe-eating window across your trip.", icon: Plane },
    { n: "03", title: "AI Schedules Your Meals", desc: "Verified kitchens prepare allergy-safe kits, timed to your real-time arrival and gate changes.", icon: Sparkles },
    { n: "04", title: "Scan, Verify, Eat", desc: "Each kit ships sealed with a QR Safety Passport showing ingredients, batch, and kitchen approval.", icon: QrCode },
  ];
  return (
    <section id="how" className="py-24 bg-card">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-xs font-bold text-brand-accent uppercase tracking-[0.2em] mb-3">How it Works</p>
          <h2 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight">
            Travel without the compromise.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Four steps from booking to bite. Designed with allergists, operated by certified kitchens.
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
    { icon: ShieldCheck, color: "text-brand-accent", bg: "bg-brand-accent/10", title: "Allergy-Safe AI", desc: "Cross-references every meal against 14 major allergens, your sensitivity profile, and live kitchen logs." },
    { icon: MapPin, color: "text-brand-success", bg: "bg-brand-success/10", title: "GPS Timed Delivery", desc: "Real-time flight tracking adjusts prep so meals arrive the moment you clear security or check-in." },
    { icon: QrCode, color: "text-indigo-500", bg: "bg-indigo-500/10", title: "QR Safety Passport", desc: "Scan to view full ingredient traceability, batch number, and kitchen sterility certification." },
    { icon: Hotel, color: "text-amber-500", bg: "bg-amber-500/10", title: "Hotel & Hub Network", desc: "Direct integrations with Marriott, Hyatt, and SkyTeam lounges across 450+ airports worldwide." },
    { icon: Activity, color: "text-rose-500", bg: "bg-rose-500/10", title: "Severity Aware", desc: "Medical-grade screening matches kitchen cross-contamination protocols to your risk profile." },
    { icon: Clock, color: "text-cyan-500", bg: "bg-cyan-500/10", title: "Delay-Adaptive", desc: "Flight delayed? Gate changed? Our scheduler reroutes meals automatically — no calls needed." },
  ];
  return (
    <section id="features" className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-14">
          <div className="max-w-xl">
            <p className="text-xs font-bold text-brand-accent uppercase tracking-[0.2em] mb-3">The Platform</p>
            <h2 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight">
              Intelligent infrastructure for sensitive palates.
            </h2>
          </div>
          <p className="text-muted-foreground max-w-md">
            Healthcare-grade logistics, ambient safety telemetry, and a kitchen network audited monthly.
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

function Marketplace() {
  const meals = [
    { name: "The Transatlantic Salmon", desc: "Omega-3 rich for jet-lag recovery", price: "$24", tags: [["Gluten-Free", "bg-emerald-50 text-emerald-700"], ["Dairy-Free", "bg-blue-50 text-blue-700"]] },
    { name: "Altitude Zen Bowl", desc: "Vegan, designed for digestive ease", price: "$19", tags: [["Vegan", "bg-purple-50 text-purple-700"], ["Nut-Free", "bg-orange-50 text-orange-700"]] },
    { name: "Overnight Cabin Box", desc: "Slow-release energy for red-eyes", price: "$16", tags: [["High Protein", "bg-slate-100 text-slate-700"], ["Halal", "bg-emerald-50 text-emerald-700"]] },
  ];
  return (
    <section id="meals" className="py-24 bg-card">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex items-end justify-between mb-12">
          <div>
            <p className="text-xs font-bold text-brand-accent uppercase tracking-[0.2em] mb-3">Meal Marketplace</p>
            <h2 className="font-display text-4xl font-extrabold tracking-tight">Curated Safety Kits</h2>
            <p className="text-muted-foreground mt-2">Scientifically balanced for long-haul travel.</p>
          </div>
          <button className="text-sm font-bold text-brand-accent hidden sm:flex items-center gap-1 hover:gap-2 transition-all">
            Browse Menu <ArrowRight className="size-4" />
          </button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {meals.map((m, i) => (
            <div key={m.name} className="bg-card rounded-2xl border border-brand-border overflow-hidden group hover:shadow-elegant transition-all hover:-translate-y-1">
              <div className="aspect-square overflow-hidden bg-secondary border-b border-brand-border">
                {i === 0 ? (
                  <img src={heroMeal} alt={m.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" width={400} height={400} />
                ) : (
                  <div className={`w-full h-full grid place-items-center ${i === 1 ? "bg-gradient-to-br from-emerald-100 to-lime-50" : "bg-gradient-to-br from-amber-100 to-orange-50"}`}>
                    {i === 1 ? <Leaf className="size-16 text-emerald-600/60" /> : <Utensils className="size-16 text-amber-600/60" />}
                  </div>
                )}
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {m.tags.map(([t, c]) => (
                    <span key={t} className={`text-[10px] font-bold ${c} px-2 py-0.5 rounded uppercase`}>{t}</span>
                  ))}
                </div>
                <h4 className="font-bold">{m.name}</h4>
                <p className="text-xs text-muted-foreground mt-1">{m.desc}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="font-bold font-display">{m.price}</span>
                  <button className="size-9 rounded-full border border-brand-border grid place-items-center hover:bg-brand-primary hover:text-white hover:border-brand-primary transition-colors">
                    <ArrowRight className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          <div className="bg-gradient-to-br from-brand-primary to-slate-800 rounded-2xl p-6 text-white flex flex-col justify-between sm:col-span-2 lg:col-span-1">
            <div>
              <div className="size-11 rounded-2xl bg-white/10 backdrop-blur-sm mb-4 grid place-items-center">
                <ShieldCheck className="size-5 text-brand-accent" />
              </div>
              <h4 className="font-bold text-lg leading-tight">QR Safety Passport</h4>
              <p className="text-white/60 text-xs mt-3 leading-relaxed">
                Every kit ships with a tamper-evident seal and a verifiable digital signature.
              </p>
            </div>
            <button className="w-full py-2.5 bg-brand-accent rounded-lg text-xs font-bold uppercase tracking-widest mt-6 hover:bg-white hover:text-brand-primary transition-colors">
              Learn More
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const items = [
    { quote: "I have severe celiac. SafeMeal is the first time I've eaten in an airport without anxiety in 12 years.", name: "Sara L.", role: "Frequent Traveler" },
    { quote: "The QR passport saved us. Our daughter's nut allergy was respected at every transit.", name: "Daniel & Mia", role: "Family of Four" },
    { quote: "Healthcare-grade logistics — this isn't food delivery, it's safety infrastructure.", name: "Dr. R. Patel", role: "Allergist, Mt. Sinai" },
  ];
  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="text-xs font-bold text-brand-accent uppercase tracking-[0.2em] mb-3">Trust & Safety</p>
          <h2 className="font-display text-4xl font-extrabold tracking-tight">Travelers who eat with confidence.</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {items.map((t) => (
            <figure key={t.name} className="rounded-3xl bg-card border border-brand-border p-7">
              <div className="flex gap-1 mb-4 text-amber-400">{"★★★★★"}</div>
              <blockquote className="text-base leading-relaxed text-foreground">"{t.quote}"</blockquote>
              <figcaption className="mt-5 pt-4 border-t border-brand-border">
                <p className="font-bold text-sm">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.role}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function Partners() {
  return (
    <section id="partners" className="py-16 border-t border-brand-border">
      <div className="mx-auto max-w-7xl px-6">
        <p className="text-center text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-10">
          Partnering with the world's most trusted travel hubs
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 opacity-50">
          {["British Airways", "Marriott Bonvoy", "Lufthansa Group", "Changi Singapore", "SkyTeam", "Hyatt"].map((p) => (
            <span key={p} className="font-display font-extrabold text-xl tracking-tight">{p}</span>
          ))}
        </div>
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
              Your next trip deserves a safer plate.
            </h2>
            <p className="mt-5 text-white/70 max-w-xl mx-auto">
              Set up your safety profile in under three minutes. Sync your first itinerary today.
            </p>
            <div className="mt-9 flex flex-wrap gap-4 justify-center">
              <button className="rounded-full bg-brand-accent px-7 py-4 text-base font-bold text-white shadow-glow hover:bg-white hover:text-brand-primary transition-all">
                Plan My Meals
              </button>
              <button className="rounded-full border border-white/20 bg-white/5 backdrop-blur px-7 py-4 text-base font-bold text-white hover:bg-white/10 transition">
                Talk to Safety Team
              </button>
            </div>
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
        <Marketplace />
        <Testimonials />
        <Partners />
        <CTA />
      </main>
      <SiteFooter />
    </div>
  );
}
