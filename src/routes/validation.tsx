import { createFileRoute, Link } from "@tanstack/react-router";
import { Fragment, useState } from "react";
import { SiteShell, PageHeader } from "@/components/site-shell";
import { Card, CapabilityNote, JaapNav, OutcomePill, Pill, SimulatedBanner } from "@/components/jaap/jaap-ui";
import { ChevronDown, FlaskConical, Gauge } from "lucide-react";
import { VALIDATION } from "@/lib/jaap/validation";
import { DEMO } from "@/lib/jaap/demo";
import { PROGRAMME, TEMP_RANGE, RECEIPT_GRACE_MIN } from "@/lib/jaap/protocol";
import { fmtDT } from "@/lib/jaap/time";

export const Route = createFileRoute("/validation")({
  head: () => ({
    meta: [
      { title: "Validation Dashboard (Simulated) — SafeMeal" },
      { name: "description", content: "How the protocol will be tested against the pre-registered validation endpoints, shown on simulated demonstration data." },
    ],
  }),
  component: ValidationPage,
});

const DEFINITIONS: Record<string, string> = {
  segregation: "Count of verification swabs taken at clearance with a result above the method limit.",
  completeness: `A movement is complete when both custody entries exist within ${RECEIPT_GRACE_MIN} minutes of the declared window closing. Late entries still count as incomplete.`,
  on_window: "Courier handover receipt time inside the declared window shown to the customer at the point of order.",
  temperature: `Peak logged temperature across the movement within ${TEMP_RANGE.min}–${TEMP_RANGE.max} °C (declared chilled range).`,
  seal: "Seal number scanned at acceptance matches the number bound to the kit in the run record, and the seal is intact.",
  reactions: "Reaction reports attributed to a company kit. Any single incident stops the programme.",
};

function ValidationPage() {
  const v = VALIDATION;
  const [open, setOpen] = useState<string | null>(null);
  const rejected = v.clearance.rejected[0];

  return (
    <SiteShell>
      <PageHeader
        eyebrow="Validation programme · §5.4 and the month 6 gate"
        title="Testing the protocol against its endpoints"
        description="The endpoints and thresholds below are the ones the business plan pre-registers. The measurements are computed live from the simulated demonstration records, so you can trace every number to the kits behind it."
      />
      <JaapNav />
      <div className="mx-auto max-w-7xl px-6 py-8 space-y-6">
        <SimulatedBanner>
          Evaluation against the six pre-registered validation endpoints (§5.4 and Month 4 Gate Criteria). Live demonstration of swab clearance thresholds, SHA-256 ledger continuity across 150 test movements, temperature logging, and tamper-evident seal integrity in accordance with TRL 4 development status prior to commercial trading.
        </SimulatedBanner>

        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <div className="flex items-center gap-2">
              <Gauge className="size-5 text-brand-accent" />
              <h2 className="font-display text-lg font-extrabold">Validation Gate: Pre-Registered Endpoints</h2>
            </div>
            <p className="text-sm mt-2">
              {v.allPass ? "All six endpoints meet or exceed their pre-registered thresholds" : "At least one endpoint is below its threshold"} and {v.allSamples ? "all minimum statistical sample sizes are satisfied" : "some minimum sample sizes are not met"} across the cohort.{" "}
              {v.allPass && v.allSamples ? "This verifies that the JAAP protocol execution criteria meet the Month 4 validation gate specifications." : "The gate remains closed until all endpoints are satisfied."}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              The Month 4 gate decision (§6.3) requires all five criteria in writing before paid trading in Month 5: UKAS-accredited swab clearance across &ge;30 events, &ge;98% complete ledger records across &ge;150 movements, &ge;95% on-window delivery, &ge;98% temperature integrity, and counter-signature by an independent food safety consultant with cash reserve verified.
            </p>
          </Card>
          <Card>
            <h3 className="font-display font-extrabold">Simulated cohort</h3>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
              {[
                ["Journeys at intake", v.intake.journeys],
                ["Profiles refused (R5)", v.intake.refused.length],
                ["Windows generated", v.intake.windowsGenerated],
                ["Windows accepted", v.intake.windowsAccepted],
                ["Kits produced", DEMO.kits.length],
                ["Production runs", DEMO.runs.length],
                ["Receipt confirmed", v.statusCounts.confirmed],
                ["Withdrawn", v.statusCounts.withdrawn],
              ].map(([k, n]) => (
                <div key={k as string} className="rounded-lg bg-secondary p-2.5">
                  <dd className="font-display text-xl font-extrabold">{n}</dd>
                  <dt className="text-[11px] text-muted-foreground">{k}</dt>
                </div>
              ))}
            </dl>
          </Card>
        </div>

        <Card className="p-0">
          <div className="p-6 pb-2">
            <h2 className="font-display text-lg font-extrabold">Pre-registered endpoints (Table 11)</h2>
            <p className="text-xs text-muted-foreground">Thresholds are fixed before the first run and do not move once a result is known. Results are recorded whether they pass or fail.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-brand-border">
                  <th className="p-3">Endpoint</th>
                  <th className="p-3">Threshold to pass</th>
                  <th className="p-3">Sample (plan minimum)</th>
                  <th className="p-3">Simulated measurement</th>
                  <th className="p-3">Outcome</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {v.endpoints.map((e) => (
                  <Fragment key={e.id}>
                    <tr className="border-b border-brand-border/60 align-top">
                      <td className="p-3">
                        <p className="font-semibold">{e.name}</p>
                        <p className="text-xs text-muted-foreground">{e.measure}</p>
                      </td>
                      <td className="p-3 text-xs">{e.threshold}</td>
                      <td className="p-3 text-xs">
                        {e.sampleLabel}
                        <p className="text-muted-foreground">{e.minSample}</p>
                      </td>
                      <td className="p-3 font-display text-lg font-extrabold whitespace-nowrap">{e.value}</td>
                      <td className="p-3 whitespace-nowrap">
                        <Pill tone={e.pass ? "ok" : "bad"}>
                          <FlaskConical className="size-3" /> {e.pass ? "Pass (simulated)" : "Fail (simulated)"}
                        </Pill>
                        {!e.sampleMet && <Pill tone="warn">Below minimum sample</Pill>}
                      </td>
                      <td className="p-3">
                        <button onClick={() => setOpen(open === e.id ? null : e.id)} className="text-xs font-bold text-brand-accent flex items-center gap-1">
                          {e.failures.length} non-conforming <ChevronDown className={`size-3 transition-transform ${open === e.id ? "rotate-180" : ""}`} />
                        </button>
                      </td>
                    </tr>
                    {open === e.id && (
                      <tr key={`${e.id}-d`} className="border-b border-brand-border/60 bg-secondary/40">
                        <td colSpan={6} className="p-4 text-xs">
                          <p className="font-semibold">How it is computed</p>
                          <p className="text-muted-foreground">{DEFINITIONS[e.id]}</p>
                          {e.failures.length > 0 ? (
                            <ul className="mt-2 space-y-1">
                              {e.failures.map((f) => (
                                <li key={f.label}>
                                  {f.kitId ? <Link to="/records/$kitId" params={{ kitId: f.kitId }} className="font-mono font-bold text-brand-accent">{f.label}</Link> : f.label}
                                  {f.exceptionId && (
                                    <>
                                      {" "}· <Link to="/exceptions" hash={f.exceptionId} className="font-bold text-amber-700">{f.exceptionId}</Link>
                                    </>
                                  )}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="mt-2">No non-conforming records in the simulated cohort.</p>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <h2 className="font-display text-lg font-extrabold">Production-line clearance checks</h2>
            <p className="text-xs text-muted-foreground mt-1">A protocol control rather than a Table 11 endpoint: no run may start without an accepted clearance signed by a competent named signatory (§4.2, §13.8).</p>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-secondary p-3"><dd className="font-display text-xl font-extrabold">{v.clearance.events}</dd><dt className="text-[11px] text-muted-foreground">clearance events</dt></div>
              <div className="rounded-lg bg-secondary p-3"><dd className="font-display text-xl font-extrabold">{v.clearance.firstTime} / {v.clearance.events}</dd><dt className="text-[11px] text-muted-foreground">accepted at first attempt</dt></div>
              <div className="rounded-lg bg-secondary p-3"><dd className="font-display text-xl font-extrabold">{v.clearance.rejected.length}</dd><dt className="text-[11px] text-muted-foreground">signatures rejected</dt></div>
              <div className="rounded-lg bg-secondary p-3"><dd className="font-display text-xl font-extrabold">{v.clearance.startedWithoutAcceptance}</dd><dt className="text-[11px] text-muted-foreground">runs started without accepted clearance</dt></div>
            </dl>
            {rejected && (
              <p className="mt-3 text-sm">
                Rejected: {rejected.clearanceId} for {rejected.runId} at {fmtDT(rejected.ts)}. {rejected.note}{" "}
                <Link to="/exceptions" hash="EXC-02" className="font-bold text-amber-700">EXC-02</Link>
              </p>
            )}
          </Card>
          <Card>
            <h2 className="font-display text-lg font-extrabold">Exceptions recorded</h2>
            <p className="text-xs text-muted-foreground mt-1">Every non-conformance above is an exception in the assurance record. Resolving an exception never removes it from the count.</p>
            <ul className="mt-3 space-y-2">
              {v.exceptions.map((e) => (
                <li key={e.id} className="flex items-center gap-2 text-sm">
                  <Link to="/exceptions" hash={e.id} className="font-mono font-bold text-brand-accent w-16">{e.id}</Link>
                  <span className="flex-1">{e.type}</span>
                  <OutcomePill outcome={e.outcome} />
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <CapabilityNote>
          In the funded programme the founder measures none of these endpoints himself: results are recorded against the run and kit identifiers and reviewed by an independent food safety consultant with an Environmental Health background (§5.4). This page demonstrates the calculation the platform will run on those records.
        </CapabilityNote>
      </div>
    </SiteShell>
  );
}
