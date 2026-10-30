// Projects one kit's records onto the ten JAAP stages, so the workflow diagram and the
// meal-kit record read the same underlying data.
import { clearanceById, exceptionById, journeyById, runById, verifyChain, type Kit, type LedgerEntry } from "./demo";
import { ALLERGENS, RULE_SET_VERSION, WINDOW_TYPES, setById } from "./protocol";
import { legLabel } from "./engine";
import { fmtDT, fmtRange } from "./time";

export type StageStatus = "ok" | "warn" | "fail" | "skip";
export type StageView = { n: number; status: StageStatus; fields: [string, string][]; entries: LedgerEntry[]; exceptionIds: string[] };

const EVENT_STAGE: Record<string, number> = {
  "Exposure window confirmed": 3,
  "Run assignment rejected": 5,
  "Assigned to production run": 5,
  "Run held: clearance not accepted": 6,
  "Hold released": 6,
  "Produced in single-allergen run": 6,
  "Sealed and labelled": 7,
  "Dispatched to courier": 7,
  "Courier delay reported": 8,
  "Handover confirmation missing": 8,
  "Receipt recorded (late entry)": 8,
  "Seal mismatch at acceptance": 8,
  "Temperature excursion at acceptance": 8,
  "Received by hotel front desk": 8,
  "Received by traveller": 8,
  "Held at front desk": 8,
  "Stored in hotel refrigerator": 8,
  "Released to traveller": 9,
  "Receipt scan rejected": 9,
  "Returned to quarantine": 9,
  "Kit withdrawn (precautionary)": 9,
  "Receipt confirmed by traveller": 9,
};

export function entryStage(e: LedgerEntry): number {
  if (EVENT_STAGE[e.event]) return EVENT_STAGE[e.event];
  const exc = typeof e.data.exception === "string" ? exceptionById(e.data.exception) : undefined;
  return exc ? exc.stage + 1 : 10;
}

export function kitStages(kit: Kit): StageView[] {
  const j = journeyById(kit.journeyId)!;
  const w = j.windows.find((x) => x.key === kit.windowKey)!;
  const run = runById(kit.runId)!;
  const clr = clearanceById(run.clearanceId)!;
  const b = j.batches.find((x) => x.key === kit.batchKey)!;
  const set = setById(kit.setId);
  const exceptions = kit.exceptionIds.map((id) => exceptionById(id)!);
  const chain = verifyChain(kit.ledger);
  const by = (n: number) => kit.ledger.filter((e) => entryStage(e) === n);
  const find = (ev: string) => kit.ledger.find((e) => e.event.startsWith(ev));
  const excAt = (n: number) => exceptions.filter((x) => x.stage + 1 === n);
  const withdrawal = kit.ledger.find((e) => e.to === "withdrawn");
  const status = (n: number): StageStatus => {
    if (withdrawal && entryStage(withdrawal) === n) return "fail";
    const xs = excAt(n);
    if (!xs.length) return "ok";
    return xs.some((x) => x.outcome !== "Resolved") ? "fail" : "warn";
  };
  const receipt = kit.ledger.find((e) => e.from === "in transit" || e.from === "unconfirmed");
  const confirm = find("Receipt confirmed");
  const release = find("Released to traveller");

  const fields: Record<number, [string, string][]> = {
    1: [
      ["Journey", `${j.id} · ${j.label}`],
      ["Legs", j.legs.map(legLabel).join(" → ")],
      ["Booked", fmtDT(j.bookedAt)],
    ],
    2: [
      ["Traveller key", j.travellerKey],
      ["Consent", j.consentRef],
      ["Diagnosed allergens", j.allergens.map((a) => ALLERGENS[a]).join(", ")],
      ["Exclusion set (R5)", `${set.code}: ${j.setReason}`],
    ],
    3: [
      ["Window", w.key],
      ["Rule", `${w.ruleId} · ${WINDOW_TYPES[w.type].label} · ${RULE_SET_VERSION}`],
      ["Why it fired", w.reason],
      ["Occasion", `${fmtRange(w.occasionStart, w.occasionEnd)} at ${w.place}`],
    ],
    4: [
      ["Kit", `${kit.id} · ${WINDOW_TYPES[kit.type].kit}${j.persons > 1 ? ` · person ${kit.person} of ${j.persons}` : ""}`],
      ["Dish", kit.dish],
      ["Product", j.productInfo ? `${j.productInfo.name} (${j.productInfo.price})` : "Coordinator quote"],
      ["Handover batch", `${b.key} · ${b.place}`],
    ],
    5: [
      ["Run", `${run.id} · ${fmtDT(run.start)}`],
      ["Position", `Run ${run.slot + 1} of the day; ${run.kitIds.length} kit-equivalents of 55`],
      ["Use by", kit.useBy],
    ],
    6: [
      ["Clearance", `${clr.id} · ${clr.deepClean ? "deep clean" : "line clearance"}`],
      ["Signatory", clr.attempts.map((a) => `${a.actor} ${a.accepted ? "accepted" : "rejected"} ${fmtDT(a.ts)}`).join("; ")],
      ["Swabs", clr.swabs.map((s) => `${s.surface}: ${s.result}`).join("; ")],
      ["Declarations", clr.declarations.join(", ")],
    ],
    7: [
      ["Seal", `${kit.sealNo} bound to ${run.id}`],
      ["Dispatched", `${fmtDT(b.dispatchAt)} · ${b.courier} · ${find("Dispatched")?.data.tempC ?? "—"} °C`],
    ],
    8: [
      ["Declared window", fmtRange(b.start, b.end)],
      ["Receipt", receipt ? `${fmtDT(receipt.ts)} · ${receipt.actor} · ${receipt.event}` : "—"],
      ["Seal check", String(receipt?.data.sealCheck ?? "—")],
      ["Temperature", receipt?.data.tempC !== undefined ? `${receipt.data.tempC} °C${receipt.data.transitPeakC ? ` (peak ${receipt.data.transitPeakC} °C)` : ""}` : "—"],
    ],
    9: [
      ["Release", release ? `${fmtDT(release.ts)} · ${release.detail}` : b.receiver === "hotel" ? "Not released" : "Direct handover to traveller"],
      ["Receipt confirmation", confirm ? `${fmtDT(confirm.ts)} · ${confirm.detail}` : "None: kit withdrawn"],
      ["Status", kit.status],
    ],
    10: [
      ["Entries", `${kit.ledger.length} append-only entries`],
      ["Head hash", kit.ledger[kit.ledger.length - 1].hash],
      ["Verification", chain.ok ? "Chain recomputes: no entry altered or removed" : `Chain broken at entry ${chain.brokenAt}`],
    ],
  };

  // Stages after a failure the kit never recovered from are "not reached"; the record (10) always continues.
  let stopped = false;
  return Array.from({ length: 10 }, (_, i) => {
    const n = i + 1;
    let st: StageStatus = n === 10 ? (chain.ok ? "ok" : "fail") : stopped ? "skip" : status(n);
    if (st === "fail" && kit.status === "Withdrawn") stopped = true;
    return { n, status: st, fields: fields[n], entries: by(n), exceptionIds: excAt(n).map((x) => x.id) };
  });
}
