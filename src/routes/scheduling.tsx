import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SiteShell, PageHeader } from "@/components/site-shell";
import { JaapNav, KitStatusPill, Pill, SetBadge } from "@/components/jaap/jaap-ui";
import { WorkspaceGate } from "@/components/workspace-gate";
import { Plane, Hotel, Briefcase, ArrowRight, ListChecks, FileText } from "lucide-react";
import type { Workspace } from "@/lib/processing";
import { WINDOW_TYPES, productById } from "@/lib/jaap/protocol";
import { fmtDT, fmtRange, toMin } from "@/lib/jaap/time";

export const Route = createFileRoute("/scheduling")({
  validateSearch: (s: Record<string, unknown>) => ({ journey: typeof s.journey === "string" ? s.journey : undefined }),
  head: () => ({
    meta: [
      { title: "Meal Plan — SafeMeal" },
      { name: "description", content: "A journey's exposure windows, production runs and handovers." },
    ],
  }),
  component: SchedulingPage,
});

const ICON = { late_arrival: Hotel, breakfast: Hotel, lunch: Briefcase, in_transit: Plane };

function SchedulingPage() {
  return (
    <SiteShell>
      <PageHeader eyebrow="Meal plan" title="Your itinerary, decoded into exposure windows." description="Pick a journey to see each exposure window the rule engine found, the kit that closes it and where that kit is now." />
      <JaapNav />
      <WorkspaceGate>{(ws) => <Plan ws={ws} />}</WorkspaceGate>
    </SiteShell>
  );
}

function Plan({ ws }: { ws: Workspace }) {
  const { journey } = Route.useSearch();
  const navigate = useNavigate();
  const j = ws.journeys.find((x) => x.id === journey) ?? ws.journeys[0];
  const plan = ws.plansById[j.id];
  const kits = ws.kits.filter((k) => k.journeyId === j.id);
  const recent = kits
    .flatMap((k) => k.ledger)
    .filter((e) => e.event !== "Exposure window confirmed" && e.event !== "Assigned to production run")
    .sort((a, b) => toMin(b.ts) - toMin(a.ts))
    .slice(0, 5);
  const runs = [...new Set(kits.map((k) => k.runId))];
  const product = plan.productId ? productById(plan.productId) : null;

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <select value={j.id} onChange={(e) => navigate({ to: "/scheduling", search: { journey: e.target.value }, replace: true })} className="rounded-lg border border-brand-border bg-background px-3 py-2 text-sm max-w-full">
          {ws.journeys.map((x) => (
            <option key={x.id} value={x.id}>{x.label} · {ws.travellers.find((t) => t.id === x.travellerId)?.label}</option>
          ))}
        </select>
        {plan.setId ? <SetBadge setId={plan.setId} long /> : <Pill tone="bad">Refused</Pill>}
        <span className="text-xs text-muted-foreground">{plan.windows.length} windows from {plan.engine.version}, {plan.windows.filter((w) => w.accepted).length} accepted</span>
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 min-w-0 rounded-3xl border border-brand-border bg-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display font-extrabold text-lg flex items-center gap-2"><ListChecks className="size-5 text-brand-accent" /> Exposure windows</h2>
            <Link to="/itinerary" search={{ journey: j.id }} className="text-sm font-bold text-brand-accent">Edit itinerary</Link>
          </div>
          {plan.windows.length === 0 && <p className="text-sm text-muted-foreground">No rule fired for this itinerary.</p>}
          <div className="relative pl-8 border-l-2 border-brand-accent/20 space-y-5">
            {plan.windows.map((w) => {
              const Icon = ICON[w.type];
              const wk = kits.filter((k) => k.windowKey === w.key);
              const done = wk.length > 0 && wk.every((k) => k.status === "Receipt confirmed");
              return (
                <div key={w.key} className="relative">
                  <div className={`absolute -left-[37px] size-5 rounded-full grid place-items-center ${done ? "bg-brand-success" : "bg-card border-2 border-brand-border"}`}>
                    {done && <span className="text-white text-[10px]">✓</span>}
                  </div>
                  <div className={`rounded-2xl border p-4 ${w.accepted ? "border-brand-border" : "border-dashed border-brand-border opacity-70"}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <p className="text-xs font-bold text-brand-accent">{fmtRange(w.occasionStart, w.occasionEnd)}</p>
                      {w.accepted ? <div className="flex gap-1">{wk.map((k) => <KitStatusPill key={k.kitId} status={k.status} />)}</div> : <Pill tone="info">Not planned</Pill>}
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="size-10 rounded-xl bg-brand-accent/10 grid place-items-center text-brand-accent"><Icon className="size-4" /></div>
                      <div className="flex-1">
                        <p className="font-semibold">{w.ruleId} · {WINDOW_TYPES[w.type].label}{wk[0] ? `: ${wk[0].dish}` : ""}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{w.place}</p>
                        <p className="text-xs mt-1">{w.reason}</p>
                        {wk.map((k) => (
                          <Link key={k.kitId} to="/records/$kitId" params={{ kitId: k.kitId }} className="mt-1 mr-3 inline-block text-xs font-bold text-brand-accent">
                            {k.kitId} · {k.runId} · seal {k.sealNo} →
                          </Link>
                        ))}
                        {!w.accepted && <p className="text-xs text-muted-foreground mt-1">{w.declineReason}</p>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <aside className="space-y-6">
          <div className="rounded-2xl bg-gradient-to-br from-brand-primary to-slate-800 text-white p-6">
            <h3 className="font-display font-extrabold text-lg">How the plan was built</h3>
            <ul className="mt-4 space-y-3 text-sm">
              {[
                `Deterministic mapping rules, ${plan.engine.version}, recorded against the plan`,
                runs.length ? `Kits grouped into single-allergen run${runs.length > 1 ? "s" : ""}: ${runs.join(", ")}` : "No kits to schedule",
                `${plan.batches.length} handover${plan.batches.length === 1 ? "" : "s"} inside declared windows`,
                "Edit the itinerary and the plan is recalculated and saved automatically",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <span className="size-1.5 rounded-full bg-brand-accent mt-1.5 shrink-0" />
                  <span className="text-white/80">{f}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-brand-border bg-card p-6">
            <h3 className="font-display font-extrabold mb-4">Latest record entries</h3>
            {recent.length === 0 && <p className="text-sm text-muted-foreground">Nothing recorded yet for this journey.</p>}
            <ul className="space-y-3 text-sm">
              {recent.map((e) => (
                <li key={`${e.kitId}-${e.seq}`} className="flex items-start gap-3">
                  <FileText className={`size-4 mt-0.5 shrink-0 ${e.data.exception ? "text-amber-600" : "text-brand-accent"}`} />
                  <div>
                    <p className="font-semibold">{e.event}</p>
                    <p className="text-xs text-muted-foreground">{e.kitId} · {fmtDT(e.ts)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <Link to="/checkout" search={{ journey: j.id }} className="block rounded-2xl bg-brand-accent text-white p-6 hover:scale-[1.02] transition-transform shadow-glow">
            <p className="text-xs font-bold uppercase tracking-widest text-white/70">{product?.name ?? "Coordinator quote"}</p>
            <p className="font-display text-3xl font-extrabold mt-1">{product?.price ?? "—"}</p>
            <p className="mt-3 text-sm font-bold flex items-center gap-1">{j.status === "confirmed" ? "Plan confirmed" : "Review and confirm"} <ArrowRight className="size-4" /></p>
          </Link>
        </aside>
      </div>
    </div>
  );
}
