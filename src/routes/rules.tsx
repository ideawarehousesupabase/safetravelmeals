import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteShell, PageHeader } from "@/components/site-shell";
import { Card, JaapNav, Pill, SetBadge } from "@/components/jaap/jaap-ui";
import { WorkspaceGate } from "@/components/workspace-gate";
import { ArrowRight, Check, Minus } from "lucide-react";
import { ALLERGENS, EXCLUSION_SETS, RULES, RULE_SET_VERSION, RUN_ORDER, WINDOW_TYPES, setById } from "@/lib/jaap/protocol";
import { legLabel, matchExclusionSet } from "@/lib/jaap/engine";
import { fmtDay, fmtRange, fmtTime } from "@/lib/jaap/time";
import type { JourneyInput, Workspace } from "@/lib/processing";

export const Route = createFileRoute("/rules")({
  head: () => ({
    meta: [
      { title: "JAAP Rule Matrix — SafeMeal" },
      { name: "description", content: "The deterministic rules that turn an itinerary into exposure windows, exclusion sets, production runs and handovers." },
    ],
  }),
  component: RulesPage,
});

function RulesPage() {
  return (
    <SiteShell>
      <PageHeader
        eyebrow={`Rule matrix · ${RULE_SET_VERSION}`}
        title="How exposure becomes a kit plan"
        description="The mapping rule is not a recommendation engine and is not statistical (§4.1). Each rule is a deterministic condition written by the founder from hotel service, and every generated plan records the rule-set version that produced it."
      >
        <Link to="/itinerary" search={{ journey: undefined }} className="rounded-full bg-brand-primary px-5 py-3 text-sm font-bold text-white flex items-center gap-2 hover:bg-brand-accent">
          Run rules in the planner <ArrowRight className="size-4" />
        </Link>
      </PageHeader>
      <JaapNav />
      <WorkspaceGate requireData={false}>{(ws) => <Matrix ws={ws} />}</WorkspaceGate>
    </SiteShell>
  );
}

function Matrix({ ws }: { ws: Workspace }) {
  const [jid, setJid] = useState(ws.journeys[0]?.id ?? "");
  const j = ws.journeys.find((x) => x.id === jid);
  const mapping = RULES.filter((r) => r.group === "Exposure mapping");
  const refused = ws.journeys.filter((x) => ws.plansById[x.id].refused);
  const firstDate = ws.runs[0]?.date;
  const dayRuns = ws.runs.filter((r) => r.date === firstDate);
  const hotelBatch = ws.journeys.flatMap((x) => ws.plansById[x.id].batches.filter((b) => b.mode === "hotel").map((b) => ({ j: x, b })))[0];
  const firstRun = ws.runs[0];
  const legOf = (journey: JourneyInput, legId: string) => journey.legs.find((l) => l.id === legId);

  const examples = (ruleId: string) => {
    const rows = ws.journeys.flatMap((x) => ws.plansById[x.id].trace.filter((t) => t.ruleId === ruleId).map((t) => ({ j: x, t })));
    return { hit: rows.find((r) => r.t.fired), miss: rows.find((r) => !r.t.fired) };
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-8">
      {!ws.journeys.length && (
        <p className="rounded-xl border border-dashed border-brand-border bg-card p-4 text-sm text-muted-foreground">
          The examples column fills in from your own journeys. <Link to="/itinerary" search={{ journey: undefined }} className="font-bold text-brand-accent">Add a journey</Link> to see where each rule fires and where it does not.
        </p>
      )}
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
                  <th className="p-3 min-w-[280px]">Applied to your journeys</th>
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
                            <p className="font-bold text-emerald-800 flex items-center gap-1"><Check className="size-3" /> Fires · {hit.j.label}</p>
                            <p><strong>{legOf(hit.j, hit.t.legId) ? legLabel(legOf(hit.j, hit.t.legId)!) : hit.t.leg}</strong>: {hit.t.detail}</p>
                          </div>
                        )}
                        {miss && (
                          <div className="rounded-lg bg-secondary p-2">
                            <p className="font-bold text-muted-foreground flex items-center gap-1"><Minus className="size-3" /> Does not fire · {miss.j.label}</p>
                            <p><strong>{legOf(miss.j, miss.t.legId) ? legLabel(legOf(miss.j, miss.t.legId)!) : miss.t.leg}</strong>: {miss.t.detail}</p>
                          </div>
                        )}
                        {r.group === "Exposure mapping" && !hit && !miss && <p className="text-muted-foreground">No leg in your journeys tests this rule yet.</p>}
                        {r.id === "R5" && (
                          <div className="space-y-1">
                            {ws.journeys.slice(0, 5).map((x) => {
                              const t = ws.travellers.find((y) => y.id === x.travellerId);
                              const p = ws.plansById[x.id];
                              return (
                                <p key={x.id}>
                                  {t?.label}: {t?.allergens.map((a) => ALLERGENS[a]).join(", ")} → {p.setId ? <SetBadge setId={p.setId} /> : <span className="text-red-700">refused</span>}
                                </p>
                              );
                            })}
                            {!ws.journeys.length && <p className="text-muted-foreground">See the worked examples below.</p>}
                          </div>
                        )}
                        {r.id === "P1" && (firstRun ? <p>{firstRun.id} holds {firstRun.kitIds.length} kit-equivalents of {setById(firstRun.setId).code}; the scheduler never places a kit in a run whose set does not cover its profile.</p> : <p className="text-muted-foreground">No runs yet.</p>)}
                        {r.id === "P2" && (dayRuns.length ? (
                          <div>
                            <p className="font-semibold">{fmtDay(firstDate!)} run order:</p>
                            <ol className="list-decimal pl-4">
                              {dayRuns.map((x) => (
                                <li key={x.id}>{fmtTime(x.start)} {x.id} <SetBadge setId={x.setId} /></li>
                              ))}
                            </ol>
                          </div>
                        ) : <p className="text-muted-foreground">No runs yet.</p>)}
                        {r.id === "H1" && (hotelBatch ? <p>{hotelBatch.j.label}: {hotelBatch.b.windowKeys.length} window(s) delivered to {hotelBatch.b.place} in one handover, {fmtRange(hotelBatch.b.start, hotelBatch.b.end)}.</p> : <p className="text-muted-foreground">No hotel stay in your journeys yet.</p>)}
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
          <p className="mt-3 text-xs text-muted-foreground">Your journeys: {refused.length} of {ws.journeys.length} refused at the point of order.</p>
        </Card>
      </section>

      {j && (
        <section>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <h2 className="font-display text-xl font-extrabold mr-2">Rules applied to a journey</h2>
            <select value={jid} onChange={(e) => setJid(e.target.value)} className="rounded-lg border border-brand-border bg-background px-3 py-2 text-sm max-w-full">
              {ws.journeys.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
            </select>
          </div>
          <Card>
            {(() => {
              const t = ws.travellers.find((y) => y.id === j.travellerId);
              const plan = ws.plansById[j.id];
              return (
                <>
                  <p className="text-sm">
                    <strong>{j.label}.</strong> {t?.label}. Profile: {t?.allergens.map((a) => ALLERGENS[a]).join(", ")} → {plan.setId ? <SetBadge setId={plan.setId} /> : "refused"}. People covered: {j.persons}.
                  </p>
                  <div className="overflow-x-auto mt-4">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-brand-border">
                          <th className="py-2 pr-3">Itinerary leg</th>
                          {mapping.map((r) => <th key={r.id} className="pr-3">{r.id} {r.name}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {j.legs.map((l) => (
                          <tr key={l.id} className="border-b border-brand-border/60 align-top">
                            <td className="py-2 pr-3 font-semibold">{legLabel(l)}</td>
                            {mapping.map((r) => {
                              const rows = plan.trace.filter((t) => t.legId === l.id && t.ruleId === r.id);
                              return (
                                <td key={r.id} className="py-2 pr-3">
                                  {rows.length === 0 && <span className="text-muted-foreground">n/a</span>}
                                  {rows.map((t, i) => (
                                    <p key={i} className={t.fired ? "text-emerald-800" : "text-muted-foreground"}>{t.fired ? "✓ " : "– "}{t.detail}</p>
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
                    {plan.windows.map((w) => (
                      <div key={w.key} className={`rounded-xl border p-3 text-xs ${w.accepted ? "border-brand-border" : "border-dashed border-brand-border opacity-70"}`}>
                        <p className="font-bold">{w.ruleId} · {WINDOW_TYPES[w.type].label}</p>
                        <p className="text-muted-foreground">{fmtRange(w.occasionStart, w.occasionEnd)} · {w.place}</p>
                        {w.accepted ? (
                          <p className="mt-1">
                            Kits:{" "}
                            {plan.kits.filter((k) => k.windowKey === w.key).map((k, i) => (
                              <span key={k.kitId}>{i > 0 && ", "}<Link to="/records/$kitId" params={{ kitId: k.kitId }} className="font-semibold text-brand-accent">{k.kitId}</Link></span>
                            ))}
                          </p>
                        ) : (
                          <p className="mt-1 text-muted-foreground">{w.declineReason}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}
          </Card>
        </section>
      )}
    </div>
  );
}
