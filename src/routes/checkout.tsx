import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { SiteShell, PageHeader } from "@/components/site-shell";
import { CapabilityNote, Pill, SetBadge } from "@/components/jaap/jaap-ui";
import { WorkspaceGate } from "@/components/workspace-gate";
import { Plane, Hotel, Briefcase, ShieldCheck, Check, MapPin, Clock, Info, Loader2 } from "lucide-react";
import { setJourneyStatus } from "@/lib/data/store";
import type { Workspace } from "@/lib/processing";
import { WINDOW_TYPES, productById } from "@/lib/jaap/protocol";
import { fmtDT, fmtRange } from "@/lib/jaap/time";

export const Route = createFileRoute("/checkout")({
  validateSearch: (s: Record<string, unknown>) => ({ journey: typeof s.journey === "string" ? s.journey : undefined }),
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
  return (
    <SiteShell>
      <PageHeader eyebrow="Confirm kit plan" title="Confirm your kit plan" description="Each kit is tied to an exposure window and a declared handover window. Confirming tells the scheduler the journey is going ahead." />
      <WorkspaceGate>{(ws, uid) => <Confirm ws={ws} uid={uid} />}</WorkspaceGate>
    </SiteShell>
  );
}

function Confirm({ ws, uid }: { ws: Workspace; uid: string }) {
  const { journey } = Route.useSearch();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const j = ws.journeys.find((x) => x.id === journey) ?? ws.journeys.find((x) => x.status === "draft") ?? ws.journeys[0];
  const plan = ws.plansById[j.id];
  const kits = ws.kits.filter((k) => k.journeyId === j.id);
  const product = plan.productId ? productById(plan.productId) : null;

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6 min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <select value={j.id} onChange={(e) => navigate({ to: "/checkout", search: { journey: e.target.value }, replace: true })} className="rounded-lg border border-brand-border bg-background px-3 py-2 text-sm max-w-full">
            {ws.journeys.map((x) => <option key={x.id} value={x.id}>{x.label} ({x.status})</option>)}
          </select>
          <Pill tone={j.status === "confirmed" ? "ok" : "info"}>{j.status}</Pill>
        </div>
        <section className="rounded-2xl border border-brand-border bg-card p-6">
          <h2 className="font-display font-extrabold text-lg mb-5">Kits in this plan</h2>
          {kits.length === 0 && <p className="text-sm text-muted-foreground">{plan.refused ? `No kits: ${plan.setReason}` : "No accepted exposure windows."}</p>}
          <div className="space-y-3">
            {kits.map((k) => {
              const w = plan.windows.find((x) => x.key === k.windowKey)!;
              const Icon = ICON[k.type];
              return (
                <div key={k.kitId} className="flex items-center gap-4 p-4 rounded-xl border border-brand-border">
                  <div className="size-11 rounded-xl bg-brand-accent/10 grid place-items-center text-brand-accent"><Icon className="size-5" /></div>
                  <div className="flex-1">
                    <p className="font-semibold">{WINDOW_TYPES[k.type].kit}: {k.dish}{j.persons > 1 ? ` · person ${k.person}` : ""}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-3">
                      <span className="flex items-center gap-1"><MapPin className="size-3" /> {w.place}</span>
                      <span className="flex items-center gap-1"><Clock className="size-3" /> {fmtDT(k.occasionStart)}</span>
                    </p>
                  </div>
                  <span className="rounded bg-brand-primary px-1.5 py-0.5 text-[10px] font-bold text-white">{w.ruleId}</span>
                </div>
              );
            })}
          </div>
        </section>
        <section className="rounded-2xl border border-brand-border bg-card p-6">
          <h2 className="font-display font-extrabold text-lg mb-5">Handovers</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {plan.batches.map((b) => (
              <div key={b.key} className="p-4 rounded-xl border border-brand-border text-sm">
                <p className="font-semibold">{b.place}</p>
                <p className="text-xs text-muted-foreground mt-1">{fmtRange(b.start, b.end)}</p>
                <p className="text-xs text-muted-foreground mt-1">{b.modeLabel}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-2xl border border-brand-border bg-card p-6">
          <h2 className="font-display font-extrabold text-lg mb-3">Payment</h2>
          <div className="flex gap-3 rounded-xl bg-secondary p-4 text-sm">
            <Info className="size-4 shrink-0 mt-0.5 text-brand-accent" />
            <p>Online payment is not part of this MVP. Confirming records the plan as going ahead; invoicing happens outside the platform.</p>
          </div>
        </section>
      </div>
      <aside className="space-y-4">
        <div className="rounded-2xl border border-brand-border bg-card p-6 sticky top-24">
          <h3 className="font-display font-extrabold mb-5">Summary</h3>
          <div className="space-y-2 text-sm">
            <Row k="Product" v={product?.name ?? "Coordinator quote (GBP £)"} />
            <Row k="Kit-equivalents" v={product ? `${kits.length} of ${product.ke}` : String(kits.length)} />
            <Row k="Handovers" v={product ? `${plan.batches.length} of ${product.handovers}` : String(plan.batches.length)} />
            <div className="flex justify-between text-muted-foreground">
              <span>Exclusion set</span>
              {plan.setId ? <SetBadge setId={plan.setId} /> : <span className="text-red-700 font-semibold">Refused</span>}
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-brand-border flex justify-between items-baseline">
            <span className="font-bold">Total Price (GBP £)</span>
            <span className="font-display text-2xl font-extrabold text-brand-primary">{product?.price ?? "Custom Quote (GBP £)"}</span>
          </div>
          {j.status === "confirmed" ? (
            <div className="mt-5 rounded-full bg-brand-success/10 py-3 text-center text-sm font-bold text-brand-success flex items-center justify-center gap-2"><Check className="size-4" /> Plan confirmed</div>
          ) : (
            <button
              disabled={busy || kits.length === 0}
              onClick={async () => {
                setBusy(true);
                try {
                  await setJourneyStatus(uid, j, "confirmed", ws);
                  toast.success("Plan confirmed");
                } catch (e) {
                  toast.error((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
              className="mt-5 w-full rounded-full bg-brand-accent text-white py-3 font-bold flex items-center justify-center gap-2 shadow-glow disabled:opacity-60"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />} Confirm plan
            </button>
          )}
          <div className="mt-3">
            <CapabilityNote>
              Confirmed kits move to "Awaiting production". <Link to="/kitchen" className="font-bold text-brand-accent">Record the run clearance</Link> to produce them.
            </CapabilityNote>
          </div>
        </div>
      </aside>
    </div>
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
