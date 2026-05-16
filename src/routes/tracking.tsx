import { createFileRoute } from "@tanstack/react-router";
import { SiteShell, PageHeader } from "@/components/site-shell";
import { MapPin, Clock, ShieldCheck, QrCode, Check, Package, Plane, ChefHat, Truck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
export const Route = createFileRoute("/tracking")({
  head: () => ({
    meta: [
      { title: "Live Tracking & QR Safety Passport — SafeMeal" },
      { name: "description", content: "GPS delivery tracking and verified QR safety passport for every meal." },
    ],
  }),
  component: TrackingPage,
});

const QR_PATTERN = [
  1,0,1,1,0,1,1,0, 0,1,1,0,1,0,1,1, 1,1,0,1,0,1,0,1, 0,0,1,0,1,1,1,0,
  1,0,1,1,1,0,0,1, 0,1,0,1,0,1,1,0, 1,1,0,1,1,0,1,0, 0,1,1,0,0,1,0,1,
].map(Boolean);

function TrackingPage() {
  const stages = [
    { label: "Order received", icon: Check, done: true },
    { label: "Kitchen prep", icon: ChefHat, done: true },
    { label: "Sealed & QR-locked", icon: ShieldCheck, done: true },
    { label: "Out for delivery", icon: Truck, done: true, current: true },
    { label: "Handed over at gate", icon: Plane, done: false },
  ];

  const [verified, setVerified] = useState(false);

  function handleVerify() {
    setVerified(true);
    toast.success("Meal verified! Ingredients and seal are intact.");
  }

  return (
    <SiteShell>
      <PageHeader eyebrow="Live Delivery" title="Pre-flight Quinoa Bowl" description="LHR · Terminal 5 · Gate 12 · ETA 6 min" />

      <div className="mx-auto max-w-7xl px-6 py-10 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-3xl border border-brand-border bg-card overflow-hidden">
            <div className="relative aspect-[16/9] bg-gradient-to-br from-indigo-50 via-sky-50 to-emerald-50 overflow-hidden">
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="none">
                <defs>
                  <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-brand-border" />
                  </pattern>
                </defs>
                <rect width="400" height="200" fill="url(#grid)" />
                <path d="M40,160 Q120,40 240,90 T360,40" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" fill="none" className="text-brand-accent" />
                <circle cx="40" cy="160" r="6" className="fill-brand-success" />
                <circle cx="360" cy="40" r="8" className="fill-brand-accent">
                  <animate attributeName="r" values="8;14;8" dur="2s" repeatCount="indefinite" />
                </circle>
                <circle cx="240" cy="90" r="9" className="fill-brand-primary">
                  <animate attributeName="cx" values="40;360" dur="6s" repeatCount="indefinite" />
                  <animate attributeName="cy" values="160;40" dur="6s" repeatCount="indefinite" />
                </circle>
              </svg>
              <div className="absolute top-4 left-4 rounded-full bg-white/90 backdrop-blur px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-brand-primary shadow flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-brand-success animate-pulse" /> Live · GPS
              </div>
              <div className="absolute bottom-4 right-4 rounded-2xl bg-white/95 backdrop-blur p-3 shadow-elegant text-xs">
                <p className="font-bold flex items-center gap-1"><MapPin className="size-3 text-brand-accent" /> 600m to gate</p>
                <p className="text-muted-foreground mt-0.5 flex items-center gap-1"><Clock className="size-3" /> ETA 6 min</p>
              </div>
            </div>

            <div className="p-6">
              <h3 className="font-display font-extrabold text-lg mb-5">Delivery Progress</h3>
              <div className="grid grid-cols-5 gap-2">
                {stages.map((s) => (
                  <div key={s.label} className="text-center">
                    <div className={`size-10 rounded-full mx-auto grid place-items-center ${
                      s.current ? "bg-brand-accent text-white animate-pulse" :
                      s.done ? "bg-brand-success/15 text-brand-success" : "bg-secondary text-muted-foreground"
                    }`}>
                      <s.icon className="size-4" />
                    </div>
                    <p className={`mt-2 text-[10px] font-bold uppercase tracking-wider ${s.current ? "text-brand-accent" : "text-muted-foreground"}`}>
                      {s.label}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-5 h-1.5 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-brand-success to-brand-accent" style={{ width: "75%" }} />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-brand-border bg-card p-6">
            <h3 className="font-display font-extrabold text-lg mb-4">Ingredient Traceability</h3>
            <div className="space-y-3 text-sm">
              {[
                ["Quinoa · Lot QN-2493", "Sourced: Bolivia · Tested 12 Mar"],
                ["Wild Salmon · Lot SL-118", "Sourced: Norway · Tested 13 Mar"],
                ["Asparagus · Lot AS-771", "Sourced: Peru · Tested 13 Mar"],
              ].map(([name, meta]) => (
                <div key={name} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
                  <Package className="size-4 text-brand-accent" />
                  <div className="flex-1">
                    <p className="font-semibold">{name}</p>
                    <p className="text-xs text-muted-foreground">{meta}</p>
                  </div>
                  <Check className="size-4 text-brand-success" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-3xl bg-gradient-to-br from-brand-primary via-slate-800 to-brand-primary text-white p-6 shadow-elegant">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">QR Safety Passport</p>
                <p className="font-display font-extrabold text-lg">SM-2026-0142</p>
              </div>
              <ShieldCheck className="size-6 text-brand-accent" />
            </div>
            <div className="rounded-2xl bg-white p-4 mx-auto w-full max-w-[220px]">
              <div className="grid grid-cols-8 gap-px aspect-square">
                {QR_PATTERN.map((on, i) => (
                  <div key={i} className={`rounded-[1px] ${on ? "bg-brand-primary" : ""}`} />
                ))}
              </div>
            </div>
            <div className="mt-5 space-y-2 text-xs">
              {[
                ["Allergen scan", "Cleared"],
                ["Kitchen sterility", "Verified"],
                ["Temperature seal", "4.1°C"],
                ["Tamper indicator", "Intact"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-white/60">{k}</span>
                  <span className="font-bold text-brand-accent flex items-center gap-1">
                    <Check className="size-3" /> {v}
                  </span>
                </div>
              ))}
            </div>
            <button 
              onClick={handleVerify}
              disabled={verified}
              className={`mt-5 w-full rounded-full py-2.5 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors ${
                verified 
                  ? "bg-brand-success text-white" 
                  : "bg-brand-accent text-white hover:bg-white hover:text-brand-primary"
              }`}
            >
              {verified ? <Check className="size-3.5" /> : <QrCode className="size-3.5" />} 
              {verified ? "Verified Safe" : "Scan to verify"}
            </button>
          </div>

          <div className="rounded-2xl border border-brand-border bg-card p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Certified by</p>
            <p className="mt-2 font-semibold">SafeMeal Lab · NY</p>
            <p className="text-xs text-muted-foreground mt-1">ISO 22000 · HACCP · FSMA-aligned</p>
          </div>
        </aside>
      </div>
    </SiteShell>
  );
}