import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteShell, PageHeader } from "@/components/site-shell";
import { CapabilityNote, SetBadge } from "@/components/jaap/jaap-ui";
import { Plane, Hotel, Briefcase, ShieldCheck, Check, MapPin, Clock, Info } from "lucide-react";
import { FEATURED_IDS, journeyById } from "@/lib/jaap/demo";
import { DISHES, WINDOW_TYPES } from "@/lib/jaap/protocol";
import { fmtDT, fmtRange } from "@/lib/jaap/time";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Confirm Kit Plan — SafeMeal" },
      { name: "description", content: "Confirm the kit plan for a mapped journey." },
    ],
  }),
  component: CheckoutPage,
});

const ICON = { late_arrival: Hotel, breakfast: Hotel, lunch: Briefcase, in_transit: Plane };

function CheckoutPage() {
  const [done, setDone] = useState(false);
  const j = journeyById(FEATURED_IDS.business)!;
  const items = j.windows.filter((w) => w.accepted);
  const product = j.productInfo!;

  if (done) {
    return (
      <SiteShell>
        <div className="mx-auto max-w-xl px-6 py-24 text-center">
          <div className="size-16 rounded-full bg-brand-success/10 grid place-items-center mx-auto mb-6">
            <Check className="size-8 text-brand-success" />
          </div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight">Demonstration plan confirmed</h1>
          <p className="mt-3 text-muted-foreground">No order was placed and no payment was taken. Follow the sample journey's kits through production and handover in the simulated records.</p>
          <div className="mt-8 flex justify-center gap-3">
            <Link to="/records" search={{ journey: j.id }} className="rounded-full bg-brand-primary text-white px-6 py-3 font-bold text-sm hover:bg-brand-accent">View sample records</Link>
            <Link to="/itinerary" className="rounded-full border border-brand-border px-6 py-3 font-bold text-sm">Back to planner</Link>
          </div>
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <PageHeader eyebrow="Confirm kit plan" title="Confirm your kit plan" description={`Sample journey ${j.id}: ${j.label}. Each kit is tied to an exposure window and a declared handover window.`} />

      <div className="mx-auto max-w-7xl px-6 py-10 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Section title="Kits in this plan">
            <div className="space-y-3">
              {items.map((w) => {
                const Icon = ICON[w.type];
                return (
                  <div key={w.key} className="flex items-center gap-4 p-4 rounded-xl border border-brand-border">
                    <div className="size-11 rounded-xl bg-brand-accent/10 grid place-items-center text-brand-accent">
                      <Icon className="size-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{WINDOW_TYPES[w.type].kit}: {DISHES[j.preference][w.type]}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-3">
                        <span className="flex items-center gap-1"><MapPin className="size-3" /> {w.place}</span>
                        <span className="flex items-center gap-1"><Clock className="size-3" /> {fmtDT(w.occasionStart)}</span>
                      </p>
                    </div>
                    <span className="rounded bg-brand-primary px-1.5 py-0.5 text-[10px] font-bold text-white">{w.ruleId}</span>
                  </div>
                );
              })}
            </div>
          </Section>

          <Section title="Handovers">
            <div className="grid sm:grid-cols-2 gap-3">
              {j.batches.map((b) => (
                <div key={b.key} className="p-4 rounded-xl border border-brand-border text-sm">
                  <p className="font-semibold">{b.place}</p>
                  <p className="text-xs text-muted-foreground mt-1">{fmtRange(b.start, b.end)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{b.modeLabel}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Payment">
            <div className="flex gap-3 rounded-xl bg-secondary p-4 text-sm">
              <Info className="size-4 shrink-0 mt-0.5 text-brand-accent" />
              <p>Payment through a payments provider is part of the year 1 platform build. This prototype does not collect card details or take payment.</p>
            </div>
          </Section>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-brand-border bg-card p-6 sticky top-24">
            <h3 className="font-display font-extrabold mb-5">Summary</h3>
            <div className="space-y-2 text-sm">
              <Row k="Product" v={product.name} />
              <Row k="Kit-equivalents" v={`${items.length * j.persons} of ${product.ke}`} />
              <Row k="Handovers" v={`${j.batches.length} of ${product.handovers}`} />
              <div className="flex justify-between text-muted-foreground">
                <span>Exclusion set</span>
                <SetBadge setId={j.set!.id} />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-brand-border flex justify-between">
              <span className="font-bold">Price</span>
              <span className="font-display text-2xl font-extrabold">{product.price}</span>
            </div>
            <button onClick={() => setDone(true)} className="mt-5 w-full rounded-full bg-brand-accent text-white py-3 font-bold flex items-center justify-center gap-2 shadow-glow">
              <ShieldCheck className="size-4" /> Confirm plan (demonstration)
            </button>
            <div className="mt-3">
              <CapabilityNote>Sample journey with simulated data. No order is placed.</CapabilityNote>
            </div>
          </div>
        </aside>
      </div>
    </SiteShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-brand-border bg-card p-6">
      <h2 className="font-display font-extrabold text-lg mb-5">{title}</h2>
      {children}
    </section>
  );
}
function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 text-muted-foreground">
      <span>{k}</span>
      <span className="text-foreground font-semibold text-right">{v}</span>
    </div>
  );
}
