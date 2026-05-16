import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteShell, PageHeader } from "@/components/site-shell";
import { Plane, Hotel, Train, CreditCard, ShieldCheck, Lock, Check, MapPin, Clock } from "lucide-react";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — SafeMeal" },
      { name: "description", content: "Confirm your safe travel meals." },
    ],
  }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const [done, setDone] = useState(false);
  const items = [
    { name: "Pre-flight Quinoa Bowl", venue: "LHR · T5", time: "10:30", price: 18, icon: Plane },
    { name: "Hotel Welcome Pack", venue: "Edition NY", time: "16:15", price: 22, icon: Hotel },
    { name: "Train Vegan Bowl", venue: "Penn Station", time: "20:45", price: 19, icon: Train },
  ];
  const total = items.reduce((a, b) => a + b.price, 0);

  if (done) {
    return (
      <SiteShell>
        <div className="mx-auto max-w-xl px-6 py-24 text-center">
          <div className="size-16 rounded-full bg-brand-success/10 grid place-items-center mx-auto mb-6">
            <Check className="size-8 text-brand-success" />
          </div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight">Order confirmed</h1>
          <p className="mt-3 text-muted-foreground">Your safe meals are scheduled. Track them live as your trip unfolds.</p>
          <div className="mt-8 flex justify-center gap-3">
            <Link to="/tracking" className="rounded-full bg-brand-primary text-white px-6 py-3 font-bold text-sm hover:bg-brand-accent">Track delivery</Link>
            <Link to="/dashboard" className="rounded-full border border-brand-border px-6 py-3 font-bold text-sm">Back to dashboard</Link>
          </div>
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <PageHeader eyebrow="Checkout" title="Confirm your safe meals" description="Linked to your itinerary · timed to the minute" />

      <div className="mx-auto max-w-7xl px-6 py-10 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Section title="Selected meals">
            <div className="space-y-3">
              {items.map((it) => (
                <div key={it.name} className="flex items-center gap-4 p-4 rounded-xl border border-brand-border">
                  <div className="size-11 rounded-xl bg-brand-accent/10 grid place-items-center text-brand-accent">
                    <it.icon className="size-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{it.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3">
                      <span className="flex items-center gap-1"><MapPin className="size-3" /> {it.venue}</span>
                      <span className="flex items-center gap-1"><Clock className="size-3" /> {it.time}</span>
                    </p>
                  </div>
                  <span className="font-display font-extrabold">${it.price}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Delivery">
            <div className="grid sm:grid-cols-2 gap-3">
              {["Airport gate handoff", "Hotel concierge", "Lounge pickup", "Train seat delivery"].map((d, i) => (
                <label key={d} className="flex items-center gap-3 p-4 rounded-xl border border-brand-border hover:border-brand-accent cursor-pointer">
                  <input type="radio" name="delivery" defaultChecked={i === 0} className="accent-brand-accent" />
                  <span className="text-sm font-semibold">{d}</span>
                </label>
              ))}
            </div>
          </Section>

          <Section title="Payment">
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-4 rounded-xl border border-brand-border">
                <CreditCard className="size-4 text-muted-foreground" />
                <input placeholder="Card number" className="flex-1 bg-transparent outline-none text-sm" />
                <Lock className="size-3.5 text-muted-foreground" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="MM / YY" className="p-4 rounded-xl border border-brand-border bg-transparent outline-none text-sm" />
                <input placeholder="CVC" className="p-4 rounded-xl border border-brand-border bg-transparent outline-none text-sm" />
              </div>
            </div>
          </Section>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-brand-border bg-card p-6 sticky top-24">
            <h3 className="font-display font-extrabold mb-5">Summary</h3>
            <div className="space-y-2 text-sm">
              <Row k="Subtotal" v={`$${total}`} />
              <Row k="Delivery" v="Included" />
              <Row k="Safety screening" v="Included" />
              <Row k="Tax" v={`$${(total * 0.08).toFixed(2)}`} />
            </div>
            <div className="mt-4 pt-4 border-t border-brand-border flex justify-between">
              <span className="font-bold">Total</span>
              <span className="font-display text-2xl font-extrabold">${(total * 1.08).toFixed(2)}</span>
            </div>
            <button onClick={() => setDone(true)} className="mt-5 w-full rounded-full bg-brand-accent text-white py-3 font-bold flex items-center justify-center gap-2 shadow-glow">
              <Lock className="size-4" /> Pay & Confirm
            </button>
            <p className="mt-3 text-[11px] text-center text-muted-foreground flex items-center justify-center gap-1">
              <ShieldCheck className="size-3 text-brand-success" /> PCI-DSS · ISO 22000
            </p>
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
    <div className="flex justify-between text-muted-foreground">
      <span>{k}</span>
      <span className="text-foreground font-semibold">{v}</span>
    </div>
  );
}