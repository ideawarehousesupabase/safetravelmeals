import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell, PageHeader } from "@/components/site-shell";
import { JaapNav, Pill, SetBadge, SimulatedBanner } from "@/components/jaap/jaap-ui";
import { ChefHat, Package, Truck, ShieldCheck, Check, AlertTriangle, Clock } from "lucide-react";
import { DEMO, KITCHEN, clearanceById } from "@/lib/jaap/demo";
import { setById } from "@/lib/jaap/protocol";
import { fmtDay, fmtTime } from "@/lib/jaap/time";

export const Route = createFileRoute("/kitchen")({
  head: () => ({
    meta: [
      { title: "Partner Kitchen Run Sheet — SafeMeal" },
      { name: "description", content: "A production day of single-allergen runs, from the simulated records." },
    ],
  }),
  component: KitchenDashboard,
});

const DAY = "2027-04-23";

function KitchenDashboard() {
  const runs = DEMO.runs.filter((r) => r.date === DAY).sort((a, b) => a.slot - b.slot);
  const kits = runs.reduce((n, r) => n + r.kitIds.length, 0);
  const swabs = runs.flatMap((r) => clearanceById(r.clearanceId)!.swabs);
  const stats = [
    { label: "Runs today", val: runs.length, icon: ChefHat },
    { label: "Kit-equivalents", val: kits, icon: Package },
    { label: "Swabs taken", val: swabs.length, icon: ShieldCheck },
    { label: "Swab detections", val: swabs.filter((s) => s.detected).length, icon: Truck },
  ];

  return (
    <SiteShell>
      <PageHeader eyebrow="Partner kitchen run sheet" title={`${fmtDay(DAY)} · production day`} description={`${KITCHEN}. Most restrictive exclusion sets first, after the deepest clean.`} />
      <JaapNav />
      <div className="mx-auto max-w-7xl px-6 py-10 space-y-6">
        <SimulatedBanner />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-brand-border bg-card p-5 flex items-center justify-between">
              <div>
                <p className="text-3xl font-display font-extrabold">{s.val}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </div>
              <div className="size-11 rounded-xl bg-brand-accent/10 text-brand-accent grid place-items-center">
                <s.icon className="size-5" />
              </div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-2xl border border-brand-border bg-card p-6">
            <h2 className="font-display font-extrabold text-lg mb-5">Run sequence</h2>
            <div className="space-y-3">
              {runs.map((r) => {
                const clr = clearanceById(r.clearanceId)!;
                const rejected = clr.attempts.filter((a) => !a.accepted);
                return (
                  <div key={r.id} className={`rounded-xl border p-4 ${rejected.length ? "border-amber-300" : "border-brand-border"}`}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-brand-accent font-mono">{r.id}</span>
                          <SetBadge setId={r.setId} />
                          {clr.deepClean && <Pill tone="info">Deep clean</Pill>}
                        </div>
                        <p className="text-sm mt-1">Excludes {setById(r.setId).excludes.join(", ").replace(/_/g, " ")}</p>
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="size-3" /> {fmtTime(r.start)}–{fmtTime(r.end)} · {r.kitIds.length} KE of 55</p>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-semibold">{clr.id}:</span>
                      {clr.attempts.map((a) => (
                        <Pill key={a.ts} tone={a.accepted ? "ok" : "bad"}>
                          {a.accepted ? <Check className="size-3" /> : <AlertTriangle className="size-3" />} {fmtTime(a.ts)} {a.actor} {a.accepted ? "accepted" : "rejected"}
                        </Pill>
                      ))}
                      <span className="text-muted-foreground">swabs {clr.swabs.filter((s) => !s.detected).length}/{clr.swabs.length} below method limit</span>
                      {rejected.length > 0 && <Link to="/exceptions" hash="EXC-02" className="font-bold text-amber-700">EXC-02</Link>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-brand-border bg-card p-6">
              <h3 className="font-display font-extrabold mb-4">Between every run (§4.2)</h3>
              <ol className="space-y-3 text-sm">
                {[
                  "Full line clearance and documented clean, signed by a named person",
                  "Dedicated, colour-controlled utensils, boards, containers and thermal boxes",
                  "Verification swabs recorded against the run",
                  "Goods-in checked against supplier allergen declarations",
                  "Tamper-evident seal bound to the run and the kit",
                ].map((s, i) => (
                  <li key={s} className="flex items-start gap-3">
                    <span className="size-7 shrink-0 rounded-full bg-brand-accent/10 text-brand-accent grid place-items-center text-xs font-bold">{i + 1}</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="rounded-2xl bg-secondary p-5 text-sm">
              <p className="font-semibold">Competency register</p>
              <p className="text-xs text-muted-foreground mt-1">The platform will not accept a clearance signature from a person with no recorded competency to give it (§13.8).</p>
            </div>
          </aside>
        </div>
      </div>
    </SiteShell>
  );
}
