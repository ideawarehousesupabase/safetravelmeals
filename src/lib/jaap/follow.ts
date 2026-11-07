// Projects one kit's records onto the ten JAAP stages, so the workflow diagram and the
// meal-kit record read the same underlying data.
import { evaluateClearance, staffName, verifyChain, type KitView, type LedgerEntry, type Workspace } from "../processing";
import { ALLERGENS, WINDOW_TYPES, productById, setById } from "./protocol";
import { legLabel } from "./engine";
import { fmtDT, fmtRange } from "./time";

export type StageStatus = "ok" | "warn" | "fail" | "skip";
export type StageView = { n: number; status: StageStatus; fields: [string, string][]; entries: LedgerEntry[]; exceptionIds: string[] };

const EVENT_STAGE: Record<string, number> = {
  "Exposure window confirmed": 3,
  "Assigned to production run": 5,
  "Profile changed after production": 5,
  "Run held: clearance not accepted": 6,
  "Run held: swab above method limit": 6,
  "Hold released": 6,
  "Produced in single-allergen run": 6,
  "Sealed and labelled": 7,
  "Dispatched to courier": 7,
  "Handover confirmation missing": 8,
  "Receipt recorded (late entry)": 8,
  "Seal mismatch at acceptance": 8,
  "Temperature excursion at acceptance": 8,
  "Received by hotel front desk": 8,
  "Received by traveller": 8,
  "Released to traveller": 9,
  "Released to the wrong traveller": 9,
  "Receipt confirmed by traveller": 9,
  "Reaction reported": 9,
};

export function entryStage(e: LedgerEntry, ws: Workspace): number {
  if (EVENT_STAGE[e.event]) return EVENT_STAGE[e.event];
  const exc = typeof e.data.exception === "string" ? ws.exceptions.find((x) => x.id === e.data.exception) : undefined;
  return exc ? exc.stage + 1 : 10;
}

export function kitStages(ws: Workspace, kit: KitView): StageView[] {
  const j = ws.journeys.find((x) => x.id === kit.journeyId)!;
  const t = ws.travellers.find((x) => x.id === kit.travellerId);
  const plan = ws.plansById[kit.journeyId];
  const w = plan.windows.find((x) => x.key === kit.windowKey)!;
  const run = ws.runs.find((r) => r.id === kit.runId)!;
  const b = plan.batches.find((x) => x.key === kit.batchKey)!;
  const set = setById(kit.setId);
  const staffById = new Map(ws.staff.map((s) => [s.id, s]));
  const exceptions = kit.exceptionIds.map((id) => ws.exceptions.find((x) => x.id === id)!).filter(Boolean);
  const chain = verifyChain(kit.ledger);
  const by = (n: number) => kit.ledger.filter((e) => entryStage(e, ws) === n);
  const find = (ev: string) => kit.ledger.find((e) => e.event.startsWith(ev));
  const excAt = (n: number) => exceptions.filter((x) => x.stage + 1 === n);
  const withdrawal = kit.ledger.find((e) => e.to === "withdrawn" || e.to === "held");
  const status = (n: number): StageStatus => {
    const xs = excAt(n);
    if (withdrawal && entryStage(withdrawal, ws) === n && (kit.status === "Withdrawn" || kit.status === "On hold")) return "fail";
    if (!xs.length) return "ok";
    return xs.some((x) => x.outcome === "Open") ? "fail" : "warn";
  };
  const receipt = kit.ledger.find((e) => e.from === "in transit" || e.from === "unconfirmed");
  const confirm = find("Receipt confirmed");
  const release = find("Released");
  const ev = run.clearance ? evaluateClearance(run.clearance, staffById) : null;
  const product = plan.productId ? productById(plan.productId) : null;

  const fields: Record<number, [string, string][]> = {
    1: [
      ["Journey", j.label],
      ["Legs", j.legs.map(legLabel).join(" → ")],
      ["Created", fmtDT(j.createdAt)],
    ],
    2: [
      ["Traveller", t?.label ?? "—"],
      ["Consent", t ? `Explicit consent v${t.consentVersion}, ${fmtDT(t.consentAt)}` : "—"],
      ["Diagnosed allergens", t ? t.allergens.map((a) => ALLERGENS[a]).join(", ") : "—"],
      ["Exclusion set (R5)", `${set.code}: ${plan.setReason}`],
    ],
    3: [
      ["Window", w.key],
      ["Rule", `${w.ruleId} · ${WINDOW_TYPES[w.type].label} · ${plan.engine.version}`],
      ["Why it fired", w.reason],
      ["Occasion", `${fmtRange(w.occasionStart, w.occasionEnd)} at ${w.place}`],
    ],
    4: [
      ["Kit", `${kit.kitId} · ${WINDOW_TYPES[kit.type].kit}${j.persons > 1 ? ` · person ${kit.person} of ${j.persons}` : ""}`],
      ["Dish", kit.dish],
      ["Product", product ? `${product.name} (${product.price})` : "Coordinator quote (GBP £)"],
      ["Handover", `${b.place}, ${fmtRange(b.start, b.end)}`],
    ],
    5: [
      ["Run", `${run.id} · ${fmtDT(run.start)}`],
      ["Position", `Run ${run.slot + 1} of the day; ${run.kitIds.length} kit-equivalents of 55`],
      ["Use by", kit.useBy],
    ],
    6: [
      ["Clearance", run.clearance ? (ev?.accepted ? `Accepted ${fmtDT(ev.accepted.at)}` : "Recorded, not accepted") : "Not recorded yet"],
      ["Signatory", run.clearance ? run.clearance.attempts.map((a) => `${staffName(staffById, a.staffId)} ${fmtDT(a.at)}`).join("; ") : "—"],
      ["Swabs", run.clearance?.swabs.length ? run.clearance.swabs.map((s) => `${s.surface}: ${s.aboveLimit ? "ABOVE method limit" : "below method limit"}`).join("; ") : "—"],
      ["Declarations", run.clearance?.declarations.join(", ") || "—"],
    ],
    7: [
      ["Seal", `${kit.sealNo} bound to ${run.id}`],
      ["Dispatched", find("Dispatched") ? `${fmtDT(find("Dispatched")!.ts)}${find("Dispatched")!.data.tempC !== undefined ? ` · ${find("Dispatched")!.data.tempC} °C` : ""}` : "Not yet"],
    ],
    8: [
      ["Declared window", fmtRange(b.start, b.end)],
      ["Receipt", receipt ? `${fmtDT(receipt.ts)} · ${receipt.actor} · ${receipt.event}` : "Not recorded"],
      ["Seal check", String(receipt?.data.sealCheck ?? "—")],
      ["Temperature", receipt?.data.tempC !== undefined ? `${receipt.data.tempC} °C` : "—"],
    ],
    9: [
      ["Release", release ? `${fmtDT(release.ts)} · ${release.detail}` : b.receiver === "hotel" ? "Not released" : "Direct handover to traveller"],
      ["Receipt confirmation", confirm ? `${fmtDT(confirm.ts)} · ${confirm.detail}` : "Not confirmed"],
      ["Status", kit.status],
    ],
    10: [
      ["Entries", `${kit.ledger.length} entries`],
      ["Head hash", kit.ledger.at(-1)?.hash ?? "—"],
      ["Verification", chain.ok ? "Chain recomputes: no entry altered or removed" : `Chain broken at entry ${chain.brokenAt}`],
    ],
  };

  // Stages after a failure the kit has not recovered from are "not reached"; stages it
  // has not got to yet are "not reached" too.
  const reached = (n: number) => {
    if (n <= 5) return true;
    if (n === 6) return !!run.clearance;
    if (n === 7) return by(7).length > 0 || by(6).some((e) => e.event.startsWith("Produced"));
    if (n === 8) return by(8).length > 0;
    if (n === 9) return by(9).length > 0;
    return true;
  };
  let stopped = false;
  return Array.from({ length: 10 }, (_, i) => {
    const n = i + 1;
    let st: StageStatus = n === 10 ? (chain.ok ? "ok" : "fail") : stopped || !reached(n) ? "skip" : status(n);
    if (st === "fail" && (kit.status === "Withdrawn" || kit.status === "On hold")) stopped = true;
    return { n, status: st, fields: fields[n], entries: by(n), exceptionIds: excAt(n).map((x) => x.id) };
  });
}
