import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteShell, PageHeader } from "@/components/site-shell";
import { Card, JaapNav, Pill, SetBadge } from "@/components/jaap/jaap-ui";
import { ArrowRight, Check, Minus } from "lucide-react";
import { ALLERGENS, EXCLUSION_SETS, RULES, RULE_SET_VERSION, RUN_ORDER, WINDOW_TYPES, setById } from "@/lib/jaap/protocol";
import { DEMO, FEATURED_IDS, allergenList, journeyById, runById } from "@/lib/jaap/demo";
import { legLabel, matchExclusionSet } from "@/lib/jaap/engine";
import { fmtDay, fmtRange, fmtTime } from "@/lib/jaap/time";

export const Route = createFileRoute("/rules")({
  head: () => ({
    meta: [
      { title: "JAAP Rule Matrix — SafeMeal" },
      { name: "description", content: "The deterministic rules that turn an itinerary into exposure windows, exclusion sets, production runs and handovers." },
    ],
  }),
  component: RulesPage,
});

const FEATURED = [FEATURED_IDS.business, FEATURED_IDS.family, ...FEATURED_IDS.corporate].map((id) => journeyById(id)!);

function examples(ruleId: string) {
  const hit = FEATURED.flatMap((j) => j.trace.filter((t) => t.ruleId === ruleId && t.fired).map((t) => ({ j, t })))[0];
  const miss = FEATURED.flatMap((j) => j.trace.filter((t) => t.ruleId === ruleId && !t.fired).map((t) => ({ j, t })))[0];
  return { hit, miss };
}

function RulesPage() {
  const [jid, setJid] = useState(FEATURED_IDS.business);
  const j = journeyById(jid)!;
  const mapping = RULES.filter((r) => r.group === "Exposure mapping");
  const refused = DEMO.journeys.filter((x) => !x.set);
  const wedRuns = DEMO.runs.filter((r) => r.date === "2027-04-28");
  const bizHotel = journeyById(FEATURED_IDS.business)!.batches[0];
  const bizRun = runById(DEMO.kits.find((k) => k.journeyId === FEATURED_IDS.business)!.runId)!;

  return (
    <SiteShell>
      <PageHeader
        eyebrow={`Rule matrix · ${RULE_SET_VERSION}`}
        title="How exposure becomes a kit plan"
        description="The mapping rule is not a recommendation engine and is not statistical (§4.1). Each rule is a deterministic condition written by the founder from hotel service, and every generated plan records the rule-set version that produced it."
      >
        <Link to="/itinerary" search={{ journey: jid }} className="rounded-full bg-brand-primary px-5 py-3 text-sm font-bold text-white flex items-center gap-2 hover:bg-brand-accent">
          Run rules in the planner <ArrowRight className="size-4" />
        </Link>
      </PageHeader>
      <JaapNav />

      <div className="mx-auto max-w-7xl px-6 py-8 space-y-8">
        {(["Exposure mapping", "Exclusion and production", "Handover"] as const).map((group) => (
          <section key={group}>
            <h2 className="font-display text-xl font-extrabold mb-3">{group} rules</h2>
            <div className="overflow-x-auto rounded-2xl border border-brand-border bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-brand-border">
                    <th className="p-3">Rule</th>
                    <th className="p-3">Condition</th>
                    <th className="p-3">Expected output</th>
                    <th className="p-3">Handover</th>
                    <th className="p-3 min-w-[280px]">Example application</th>
                  </tr>
                </thead>
                <tbody>
                  {RULES.filter((r) => r.group === group).map((r) => {
                    const { hit, miss } = examples(r.id);
                    return (
                      <tr key={r.id} id={r.id} className="border-b border-brand-border/60 align-top scroll-mt-24 target:bg-brand-accent/5">
                        <td className="p-3 whitespace-nowrap">
                          <span className="rounded bg-brand-primary px-1.5 py-0.5 text-[10px] font-bold text-white">{r.id}</span>
                          <p className="font-semibold mt-1">{r.name}</p>
                          <p className="text-[11px] text-muted-foreground">{r.planRef}</p>
                        </td>
                        <td className="p-3">{r.condition}</td>
                        <td className="p-3">{r.output}</td>
                        <td className="p-3 text-muted-foreground">{r.handover}</td>
                        <td className="p-3 text-xs space-y-2">
                          {hit && (
                            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2">
                              <p className="font-bold text-emerald-800 flex items-center gap-1"><Check className="size-3" /> Fires · {hit.j.id}</p>
                              <p><strong>{legLabel(hit.j.legs.find((l) => l.id === hit.t.legId)!)}</strong>: {hit.t.detail}</p>
                            </div>
                          )}
                          {miss && (
                            <div className="rounded-lg bg-secondary p-2">
                              <p className="font-bold text-muted-foreground flex items-center gap-1"><Minus className="size-3" /> Does not fire · {miss.j.id}</p>
                              <p><strong>{legLabel(miss.j.legs.find((l) => l.id === miss.t.legId)!)}</strong>: {miss.t.detail}</p>
                            </div>
                          )}
                          {r.id === "R5" && (
                            <div className="space-y-1">
                              {FEATURED.slice(0, 5).map((x) => (
                                <p key={x.id}>{x.id}: {allergenList(x.allergens)} → <SetBadge setId={x.set!.id} /></p>
                              ))}
                              {refused.slice(0, 2).map((x) => (
                                <p key={x.id} className="text-red-700">{x.id}: {allergenList(x.allergens)} → refused</p>
                              ))}
                            </div>
                          )}
                          {r.id === "P1" && (
                            <p>
                              {FEATURED_IDS.business}'s five kits share <Link to="/records" search={{ journey: FEATURED_IDS.business }} className="font-semibold text-brand-accent">{bizRun.id}</Link>, a Set 2 run of {bizRun.kitIds.length} kit-equivalents. A manual move of a Set 6 kit into a Set 3 run is rejected:{" "}
                              <Link to="/exceptions" hash="EXC-01" className="font-semibold text-brand-accent">EXC-01</Link>.
                            </p>
                          )}
                          {r.id === "P2" && (
                            <div>
                              <p className="font-semibold">{fmtDay("2027-04-28")} run order:</p>
                              <ol className="list-decimal pl-4">
                                {wedRuns.map((x) => (
                                  <li key={x.id}>{fmtTime(x.start)} {x.id} <SetBadge setId={x.setId} /></li>
                                ))}
                              </ol>
                            </div>
                          )}
                          {r.id === "H1" && (
                            <p>
                              {FEATURED_IDS.business}: arrival kit and three breakfast kits go to {bizHotel.place} in one handover, {fmtRange(bizHotel.start, bizHotel.end)}, matching the Solo Traveller Meal Kit's two handovers.
                            </p>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ))}

        <section className="grid lg:grid-cols-2 gap-6">
          <Card>
            <h2 className="font-display text-lg font-extrabold">Published exclusion sets (§4.7)</h2>
            <p className="text-xs text-muted-foreground mt-1">Run order in the day: {RUN_ORDER.map((id) => setById(id).code).join(" → ")} (most restrictive first).</p>
            <table className="w-full text-sm mt-3">
              <tbody>
                {EXCLUSION_SETS.map((s) => (
                  <tr key={s.id} className="border-b border-brand-border/60 align-top">
                    <td className="py-2 pr-3"><SetBadge setId={s.id} /></td>
                    <td className="py-2 pr-3">{s.excludes.map((a) => ALLERGENS[a]).join(", ")}</td>
                    <td className="py-2 text-xs text-muted-foreground">{s.why}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Card>
            <h2 className="font-display text-lg font-extrabold">R5 worked examples</h2>
            <ul className="mt-3 space-y-3 text-sm">
              {([["peanut"], ["peanut", "sesame"], ["milk"], ["milk", "peanut"], ["soya"], ["celery", "gluten"]] as const).map((p) => {
                const m = matchExclusionSet([...p]);
                return (
                  <li key={p.join()} className="flex gap-3">
                    <span className="w-40 shrink-0 font-semibold">{p.map((a) => ALLERGENS[a]).join(" + ")}</span>
                    <span className="text-xs">
                      {m.set ? <SetBadge setId={m.set.id} /> : <Pill tone="bad">Refused</Pill>} <span className="text-muted-foreground">{m.reason}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">Simulated intake: {refused.length} of {DEMO.journeys.length} profiles refused at the point of order.</p>
          </Card>
        </section>

        <section>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <h2 className="font-display text-xl font-extrabold mr-2">Rules applied to a sample journey</h2>
            {FEATURED.map((x) => (
              <button key={x.id} onClick={() => setJid(x.id)} className={`rounded-full border px-3 py-1 text-xs font-semibold ${jid === x.id ? "border-brand-accent bg-brand-accent/10 text-brand-accent" : "border-brand-border"}`}>
                {x.id}
              </button>
            ))}
          </div>
          <Card>
            <p className="text-sm"><strong>{j.label}.</strong> {j.persona}. Profile: {allergenList(j.allergens)} → <SetBadge setId={j.set!.id} />. People covered: {j.persons}.</p>
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-brand-border">
                    <th className="py-2 pr-3">Itinerary leg</th>
                    {mapping.map((r) => (
                      <th key={r.id} className="pr-3">{r.id} {r.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {j.legs.map((l) => (
                    <tr key={l.id} className="border-b border-brand-border/60 align-top">
                      <td className="py-2 pr-3 font-semibold">{legLabel(l)}</td>
                      {mapping.map((r) => {
                        const rows = j.trace.filter((t) => t.legId === l.id && t.ruleId === r.id);
                        return (
                          <td key={r.id} className="py-2 pr-3">
                            {rows.length === 0 && <span className="text-muted-foreground">n/a</span>}
                            {rows.map((t, i) => (
                              <p key={i} className={t.fired ? "text-emerald-800" : "text-muted-foreground"}>
                                {t.fired ? "✓ " : "– "}
                                {t.detail}
                              </p>
                            ))}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <h3 className="font-display font-extrabold mt-6 mb-2">Resulting windows and kits</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {j.windows.map((w) => (
                <div key={w.key} className={`rounded-xl border p-3 text-xs ${w.accepted ? "border-brand-border" : "border-dashed border-brand-border opacity-70"}`}>
                  <p className="font-bold">{w.ruleId} · {WINDOW_TYPES[w.type].label}</p>
                  <p className="text-muted-foreground">{fmtRange(w.occasionStart, w.occasionEnd)} · {w.place}</p>
                  {w.accepted ? (
                    <p className="mt-1">
                      Kits:{" "}
                      {w.kitIds.map((k, i) => (
                        <span key={k}>
                          {i > 0 && ", "}
                          <Link to="/records/$kitId" params={{ kitId: k }} className="font-semibold text-brand-accent">{k}</Link>
                        </span>
                      ))}
                    </p>
                  ) : (
                    <p className="mt-1 text-muted-foreground">{w.declineReason}</p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </section>
      </div>
    </SiteShell>
  );
}
