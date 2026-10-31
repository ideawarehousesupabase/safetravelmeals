// Cross-journey derivations: production runs, kit lifecycle, the hash-chained assurance
// record, exceptions and the validation endpoints, all from one account's primary data.
import { setCoversProfile } from "../jaap/engine";
import {
  ENDPOINTS,
  RECEIPT_GRACE_MIN,
  RUN_CAPACITY_KE,
  RUN_ORDER,
  TEMP_RANGE,
  setById,
  type Role,
} from "../jaap/protocol";
import { sha256 } from "../jaap/sha256";
import { addDays, addMin, at, dayOfWeek, diffMin, fmtDT, fmtTime, nowLondon, toMin, type Naive } from "../jaap/time";
import { RULE_ENGINE, planInputHash, processJourney } from "./rule-engine";
import type {
  ClearanceInput,
  EndpointResult,
  EventInput,
  ExceptionKind,
  ExceptionStep,
  ExceptionView,
  JourneyInput,
  KitStatus,
  KitView,
  LedgerEntry,
  Movement,
  Plan,
  PlanKit,
  Run,
  StaffInput,
  TravellerInput,
  Workspace,
  WorkspaceSnapshot,
} from "./types";

export const KITCHEN = "Partner kitchen, London (food hygiene rating 5)";
const HOLD_KINDS: ExceptionKind[] = ["seal", "temperature", "substitution", "profile-changed", "reaction", "no-clearance"];

// ---------------------------------------------------------------- hash chain
export const GENESIS = "0".repeat(64);

export function entryHash(e: Omit<LedgerEntry, "hash">) {
  // Fixed field order so the hash is reproducible from an export.
  return sha256(
    JSON.stringify([e.seq, e.kitId, e.runId, e.sealNo, e.exclusionSet, e.actor, e.role, e.location, e.ts, e.from, e.to, e.event, e.detail, e.data, e.corrects, e.prevHash]),
  );
}

export function verifyChain(entries: LedgerEntry[]): { ok: boolean; brokenAt: number | null } {
  let prev = GENESIS;
  for (const e of entries) {
    if (e.prevHash !== prev) return { ok: false, brokenAt: e.seq };
    const { hash, ...rest } = e;
    if (entryHash(rest) !== hash) return { ok: false, brokenAt: e.seq };
    prev = hash;
  }
  return { ok: true, brokenAt: null };
}

type Draft = {
  key: string;
  correctsKey?: string;
  ts: Naive;
  actor: string;
  role: Role;
  location: string;
  from: string;
  to: string;
  event: string;
  detail: string;
  data?: Record<string, string | number | boolean>;
};

function chain(kit: { kitId: string; sealNo: string }, runId: string, setCode: string, drafts: Draft[]): LedgerEntry[] {
  const sorted = drafts.map((d, i) => ({ d, i })).sort((a, b) => toMin(a.d.ts) - toMin(b.d.ts) || a.i - b.i);
  const seqOf = new Map(sorted.map(({ d }, seq) => [d.key, seq]));
  const out: LedgerEntry[] = [];
  let prev = GENESIS;
  sorted.forEach(({ d }, seq) => {
    const e = {
      seq,
      kitId: kit.kitId,
      runId,
      sealNo: kit.sealNo,
      exclusionSet: setCode,
      actor: d.actor,
      role: d.role,
      location: d.location,
      ts: d.ts,
      from: d.from,
      to: d.to,
      event: d.event,
      detail: d.detail,
      data: d.data ?? {},
      corrects: d.correctsKey !== undefined ? (seqOf.get(d.correctsKey) ?? null) : null,
      prevHash: prev,
    };
    const hash = entryHash(e);
    out.push({ ...e, hash });
    prev = hash;
  });
  return out;
}

// ---------------------------------------------------------------- helpers
const yymmdd = (d: string) => d.slice(2).replace(/-/g, "");
const sortEvents = (xs: EventInput[]) =>
  [...xs].sort((a, b) => toMin(a.at) - toMin(b.at) || toMin(a.recordedAt) - toMin(b.recordedAt) || a.id.localeCompare(b.id));
const after = (a: Naive, b: Naive) => toMin(a) > toMin(b);

export function evaluateClearance(c: ClearanceInput, staffById: Map<string, StaffInput>) {
  const valid = (a: ClearanceInput["attempts"][number]) => staffById.get(a.staffId)?.clearanceCompetent === true && a.checklistComplete;
  const attempts = [...c.attempts].sort((a, b) => toMin(a.at) - toMin(b.at));
  const detections = c.swabs.filter((s) => s.aboveLimit).sort((a, b) => toMin(a.at) - toMin(b.at));
  const lastDetection = detections.at(-1)?.at;
  const accepted = attempts.filter((a) => valid(a) && (!lastDetection || toMin(a.at) >= toMin(lastDetection))).at(-1) ?? null;
  return { accepted, rejected: attempts.filter((a) => !valid(a)), detections, valid };
}

export function staffName(staffById: Map<string, StaffInput>, id: string) {
  return staffById.get(id)?.name ?? "Unknown signatory";
}

// ---------------------------------------------------------------- main
export function processWorkspace(snap: WorkspaceSnapshot, now: Naive = nowLondon(), computedAt = new Date().toISOString()): Workspace {
  const travById = new Map(snap.travellers.map((t) => [t.id, t]));
  const journeyById = new Map(snap.journeys.map((j) => [j.id, j]));
  const staffById = new Map(snap.staff.map((s) => [s.id, s]));
  const stored = new Map(snap.plans.map((p) => [p.journeyId, p]));

  // Plans: reuse the stored derived plan when its inputs are unchanged, otherwise recompute.
  const plansById: Record<string, Plan> = {};
  const stalePlanIds: string[] = [];
  for (const j of snap.journeys) {
    const t = travById.get(j.travellerId);
    const s = stored.get(j.id);
    if (s && s.inputHash === planInputHash(j, t) && s.engine?.version === RULE_ENGINE.version) plansById[j.id] = s;
    else {
      plansById[j.id] = processJourney(j, t, computedAt);
      stalePlanIds.push(j.id);
    }
  }

  // ------------------------------------------------ production runs (P1, P2)
  type Draftkit = { kit: PlanKit; journey: JourneyInput; plan: Plan; setId: number };
  const groups = new Map<string, Draftkit[]>();
  for (const j of snap.journeys) {
    const plan = plansById[j.id];
    if (!plan.setId) continue;
    for (const kit of plan.kits) {
      const k = `${kit.runDate}|${plan.setId}`;
      groups.set(k, [...(groups.get(k) ?? []), { kit, journey: j, plan, setId: plan.setId }]);
    }
  }
  const runKeys = [...groups.keys()].sort((a, b) => {
    const [da, sa] = a.split("|");
    const [db, sb] = b.split("|");
    return da.localeCompare(db) || RUN_ORDER.indexOf(+sa) - RUN_ORDER.indexOf(+sb);
  });
  const clearanceByRun = new Map(snap.clearances.map((c) => [c.runId, c]));
  const runs: Run[] = [];
  const runOfKit = new Map<string, Run>();
  const draftOfKit = new Map<string, Draftkit>();
  const slotByDate = new Map<string, number>();
  for (const key of runKeys) {
    const [date, setStr] = key.split("|");
    const all = groups
      .get(key)!
      .sort((a, b) => a.journey.id.localeCompare(b.journey.id) || toMin(a.kit.occasionStart) - toMin(b.kit.occasionStart) || a.kit.person - b.kit.person);
    for (let part = 0; part * RUN_CAPACITY_KE < all.length; part++) {
      const members = all.slice(part * RUN_CAPACITY_KE, (part + 1) * RUN_CAPACITY_KE);
      const slot = slotByDate.get(date) ?? 0;
      slotByDate.set(date, slot + 1);
      const id = `RUN-${yymmdd(date)}-S${setStr}${part ? `-${part + 1}` : ""}`;
      const clearStart = addMin(at(date, "06:30"), slot * 100);
      const clearance = clearanceByRun.get(id) ?? null;
      const evalc = clearance ? evaluateClearance(clearance, staffById) : null;
      const acceptedAt = evalc?.accepted?.at ?? null;
      const start = acceptedAt ? addMin(acceptedAt, 8) : addMin(clearStart, 30);
      const run: Run = {
        id,
        setId: +setStr,
        date,
        slot,
        start,
        end: addMin(start, 65),
        kitIds: members.map((m) => m.kit.kitId),
        clearance,
        status: !clearance ? "not recorded" : acceptedAt ? "accepted" : "blocked",
        acceptedAt,
      };
      runs.push(run);
      for (const m of members) {
        runOfKit.set(m.kit.kitId, run);
        draftOfKit.set(m.kit.kitId, m);
      }
    }
  }

  // ------------------------------------------------ exceptions registry
  const exceptions = new Map<string, ExceptionView>();
  const resolutions = new Map<string, EventInput>();
  for (const e of snap.events) if (e.type === "resolution" && e.resolves) resolutions.set(e.resolves, e);
  const addException = (x: Omit<ExceptionView, "kitIds"> & { kitIds: string[] }) => {
    const existing = exceptions.get(x.id);
    if (existing) existing.kitIds = [...new Set([...existing.kitIds, ...x.kitIds])];
    else exceptions.set(x.id, x);
  };

  // Run-level exceptions from every clearance record, including runs the current plans no
  // longer use: a recorded failure stays visible after the plan changes.
  for (const clearance of snap.clearances) {
    const current = runs.find((r) => r.id === clearance.runId);
    const run = { id: clearance.runId, kitIds: current?.kitIds ?? clearance.kitIds };
    const ev = evaluateClearance(clearance, staffById);
    const firstKit = draftOfKit.get(run.kitIds[0]) ?? draftOfKit.get(clearance.kitIds[0]);
    if (ev.rejected.length) {
      const r = ev.rejected[0];
      const who = staffName(staffById, r.staffId);
      const reason = staffById.get(r.staffId)?.clearanceCompetent ? "the clearance checklist was incomplete" : "no clearance competency is recorded for this person";
      addException({
        id: `EX-clearance-${run.id}`,
        kind: "clearance",
        type: "Failed production clearance check",
        title: `Clearance for ${run.id} not accepted`,
        outcome: ev.accepted ? "Resolved" : "Open",
        stage: 5,
        journeyId: firstKit?.journey.id ?? "",
        kitIds: [...run.kitIds],
        runId: run.id,
        trigger: `${who} signed the clearance at ${fmtTime(r.at)}, but ${reason} (§13.8).`,
        detectedAt: r.at,
        alert: `Run ${run.id} BLOCKED; all ${run.kitIds.length} kits held until a valid clearance is recorded.`,
        responsible: "supervisor",
        steps: [
          { ts: r.at, action: "Signature refused; run blocked from starting", role: "platform", done: true },
          { ts: ev.accepted?.at ?? r.at, action: "Competent signatory completes the checklist, swabs and signs", role: "supervisor", done: !!ev.accepted },
          { ts: ev.accepted ? addMin(ev.accepted.at, 8) : r.at, action: "Hold released on every kit in the run", role: "platform", done: !!ev.accepted },
        ],
        result: ev.accepted ? `Accepted at ${fmtDT(ev.accepted.at)} by ${staffName(staffById, ev.accepted.staffId)}. Both attempts stay in the record.` : "Run still blocked.",
        endpoint: `Clearance control: ${ev.rejected.length} rejected attempt${ev.rejected.length > 1 ? "s" : ""}.`,
        planRef: "§4.2, §13.8",
        resolvable: false,
      });
    }
    if (ev.detections.length) {
      const d = ev.detections[0];
      addException({
        id: `EX-swab-${run.id}`,
        kind: "swab",
        type: "Swab above the method limit",
        title: `Verification swab failed before ${run.id}`,
        outcome: ev.accepted ? "Resolved" : "Open",
        stage: 5,
        journeyId: firstKit?.journey.id ?? "",
        kitIds: [...run.kitIds],
        runId: run.id,
        trigger: `${d.surface} swab at ${fmtTime(d.at)} detected the excluded allergen above the method limit.`,
        detectedAt: d.at,
        alert: `Run ${run.id} BLOCKED until the line is re-cleaned and re-verified.`,
        responsible: "supervisor",
        steps: [
          { ts: d.at, action: "Run blocked; line re-cleaned", role: "supervisor", done: true },
          { ts: ev.accepted?.at ?? d.at, action: "Swabs retaken below the method limit and clearance signed", role: "supervisor", done: !!ev.accepted },
        ],
        result: ev.accepted ? "Line re-verified and the run released. The detection still counts against the segregation endpoint." : "Run still blocked.",
        endpoint: "Segregation verification: counted as a detection.",
        planRef: "§4.2, §5.4",
        resolvable: false,
      });
    }
  }

  // ------------------------------------------------ kits
  const eventsByKit = new Map<string, EventInput[]>();
  for (const e of snap.events) eventsByKit.set(e.kitId, [...(eventsByKit.get(e.kitId) ?? []), e]);
  const kits: KitView[] = [];

  for (const run of runs) {
    for (const kitId of run.kitIds) {
      const { kit, journey, plan, setId } = draftOfKit.get(kitId)!;
      const traveller = travById.get(journey.travellerId)!;
      const set = setById(setId);
      const w = plan.windows.find((x) => x.key === kit.windowKey)!;
      const batch = plan.batches.find((b) => b.key === kit.batchKey)!;
      const events = sortEvents(eventsByKit.get(kitId) ?? []);
      const drafts: Draft[] = [];
      const kitExceptions: string[] = [];
      const due = addMin(batch.end, RECEIPT_GRACE_MIN);

      drafts.push({
        key: "window",
        ts: journey.createdAt,
        actor: "Coordinator",
        role: "coordinator",
        location: "Platform",
        from: "—",
        to: "planned",
        event: "Exposure window confirmed",
        detail: `${w.ruleId} ${w.reason}`,
        data: { window: w.key, rule: w.ruleId, ruleSet: plan.engine.version, occasion: w.occasionStart },
      });
      drafts.push({
        key: "assigned",
        ts: addMin(journey.createdAt, 1),
        actor: "Scheduler",
        role: "platform",
        location: "Platform",
        from: "planned",
        to: "scheduled",
        event: "Assigned to production run",
        detail: `Assigned to ${run.id} (${set.code}); ${run.kitIds.indexOf(kitId) + 1} of ${run.kitIds.length} kit-equivalents, capacity ${RUN_CAPACITY_KE}.`,
        data: { run: run.id, set: set.code },
      });

      // Produced in another run whose set no longer covers the profile (profile edited after production).
      for (const c of snap.clearances) {
        if (c.runId === run.id || !c.kitIds.includes(kitId)) continue;
        const ev = evaluateClearance(c, staffById);
        if (!ev.accepted || setCoversProfile(setById(c.setId), traveller.allergens)) continue;
        const id = `EX-profile-changed-${kitId}`;
        const resolved = resolutions.get(id);
        const changedAt = nowLondon(new Date(plan.computedAt));
        drafts.push({ key: `old-prod-${c.runId}`, ts: addMin(ev.accepted.at, 73), actor: staffName(staffById, ev.accepted.staffId), role: "supervisor", location: KITCHEN, from: "scheduled", to: "produced", event: "Produced in single-allergen run", detail: `Produced in ${c.runId} (${setById(c.setId).code}).`, data: { run: c.runId } });
        drafts.push({ key: "profile-changed", ts: after(changedAt, ev.accepted.at) ? changedAt : addMin(ev.accepted.at, 74), actor: "Platform", role: "platform", location: "Platform", from: "produced", to: "held", event: "Profile changed after production", detail: `The traveller's profile (${traveller.allergens.join(", ")}) is no longer covered by ${setById(c.setId).code}. Kit held; re-planned into ${run.id} (${set.code}).`, data: { exception: id } });
        kitExceptions.push(id);
        addException({
          id,
          kind: "profile-changed",
          type: "Incorrect allergen-exclusion set",
          title: "Kit produced under a set that no longer covers the profile",
          outcome: resolved ? "Closed with recorded outcome" : "Open",
          stage: 4,
          journeyId: journey.id,
          kitIds: [kitId],
          runId: c.runId,
          trigger: `The traveller's allergen profile was edited after this kit was produced in ${c.runId} (${setById(c.setId).code}). The scheduler now places it in ${run.id} (${set.code}).`,
          detectedAt: changedAt,
          alert: "Kit ON HOLD: the produced kit must not be released; a new kit is scheduled in the covering run.",
          responsible: "coordinator",
          steps: [
            { ts: changedAt, action: "Engine re-plans the journey and flags the produced kit", role: "platform", done: true },
            { ts: resolved?.at ?? changedAt, action: "Withdraw the produced kit and confirm the replacement run", role: "coordinator", done: !!resolved },
          ],
          result: resolved ? `Closed: ${resolved.note || "kit withdrawn"}.` : "Awaiting withdrawal of the produced kit.",
          endpoint: "Prevented release: no endpoint affected.",
          planRef: "§4.2, §4.7",
          resolvable: !resolved,
        });
      }

      // Clearance entries for this kit's run.
      let produced = false;
      if (run.clearance) {
        const ev = evaluateClearance(run.clearance, staffById);
        let firstHold: string | undefined;
        ev.rejected.forEach((r, i) => {
          const key = `hold-attempt-${i}`;
          firstHold ??= key;
          drafts.push({ key, ts: r.at, actor: "Platform", role: "platform", location: KITCHEN, from: "scheduled", to: "held", event: "Run held: clearance not accepted", detail: `${run.id} blocked. Signature by ${staffName(staffById, r.staffId)} not accepted.`, data: { exception: `EX-clearance-${run.id}` } });
        });
        ev.detections.forEach((d, i) => {
          const key = `hold-swab-${i}`;
          firstHold ??= key;
          drafts.push({ key, ts: d.at, actor: "Platform", role: "platform", location: KITCHEN, from: "scheduled", to: "held", event: "Run held: swab above method limit", detail: `${d.surface} swab above the method limit.`, data: { exception: `EX-swab-${run.id}` } });
        });
        if (ev.accepted) {
          if (firstHold) drafts.push({ key: "hold-released", correctsKey: firstHold, ts: ev.accepted.at, actor: staffName(staffById, ev.accepted.staffId), role: "supervisor", location: KITCHEN, from: "held", to: "scheduled", event: "Hold released", detail: "Valid clearance recorded; run released." });
          produced = run.clearance.kitIds.length === 0 || run.clearance.kitIds.includes(kitId);
          if (produced) {
            drafts.push({ key: "produced", ts: run.end, actor: staffName(staffById, ev.accepted.staffId), role: "supervisor", location: KITCHEN, from: "scheduled", to: "produced", event: "Produced in single-allergen run", detail: `${kit.dish}. Produced in ${run.id} after a clearance signed at ${fmtTime(ev.accepted.at)}.`, data: { clearance: run.id, swabs: `${run.clearance.swabs.filter((s) => !s.aboveLimit).length} of ${run.clearance.swabs.length} below method limit`, declarations: run.clearance.declarations.join(", ") } });
            drafts.push({ key: "sealed", ts: addMin(run.end, 8), actor: "Partner kitchen", role: "kitchen", location: KITCHEN, from: "produced", to: "sealed", event: "Sealed and labelled", detail: `Tamper-evident seal ${kit.sealNo} bound to ${run.id} and ${kitId}. Label carries the full ingredient list with allergens emphasised.`, data: { seal: kit.sealNo, useBy: kit.useBy } });
          }
        }
      }

      // Recorded events.
      let status: KitStatus = produced ? "Produced" : journey.status === "confirmed" ? "Awaiting production" : "Planned";
      const receipt = events.find((e) => e.type === "receipt");
      const dispatch = events.find((e) => e.type === "dispatch");
      const release = events.find((e) => e.type === "release");
      const confirm = events.find((e) => e.type === "confirm");
      let missingKey: string | undefined;
      if (receipt ? after(receipt.recordedAt, due) : dispatch && after(now, due)) {
        missingKey = "missing";
        drafts.push({ key: missingKey, ts: due, actor: "Platform", role: "platform", location: "Platform", from: "in transit", to: "unconfirmed", event: "Handover confirmation missing", detail: `No receipt entry ${RECEIPT_GRACE_MIN} minutes after the declared window closed at ${fmtTime(batch.end)}.`, data: { exception: `EX-missing-receipt-${batch.key}` } });
      }

      for (const e of events) {
        const base = { ts: e.at, actor: e.actor || "Coordinator", location: batch.place };
        if (e.type === "dispatch") {
          status = "In transit";
          drafts.push({ ...base, key: e.id, role: "courier", location: KITCHEN, from: "sealed", to: "in transit", event: "Dispatched to courier", detail: `Collected for ${batch.place}; declared window ${fmtTime(batch.start)}–${fmtTime(batch.end)}.`, data: e.tempC !== null ? { tempC: e.tempC } : {} });
        } else if (e.type === "receipt") {
          const presented = e.sealPresented?.trim().toUpperCase() || null;
          const mismatch = !!presented && presented !== kit.sealNo;
          const tempOut = e.tempC !== null && (e.tempC < TEMP_RANGE.min || e.tempC > TEMP_RANGE.max);
          const late = Math.max(0, diffMin(batch.end, e.at));
          const lateEntry = e.id === receipt?.id && missingKey !== undefined;
          const role: Role = batch.receiver === "hotel" ? "hotel" : "traveller";
          const data: Record<string, string | number | boolean> = { sealCheck: mismatch ? "MISMATCH" : presented ? "Intact, matches run record" : "Not recorded", window: late ? `outside by ${late} min` : "inside" };
          if (e.tempC !== null) data.tempC = e.tempC;
          if (presented) data.presentedSeal = presented;
          if (lateEntry) data.lateEntry = true;
          if (mismatch) {
            drafts.push({ ...base, key: e.id, correctsKey: lateEntry ? missingKey : undefined, role, from: "in transit", to: "held", event: "Seal mismatch at acceptance", detail: `Presented seal ${presented} does not match ${kit.sealNo}, the seal bound to this kit. Kit quarantined, not released.`, data: { ...data, exception: `EX-seal-${kitId}` } });
          } else if (tempOut) {
            drafts.push({ ...base, key: e.id, correctsKey: lateEntry ? missingKey : undefined, role, from: "in transit", to: "held", event: "Temperature excursion at acceptance", detail: `${e.tempC} °C at acceptance; declared range ${TEMP_RANGE.min}–${TEMP_RANGE.max} °C. Kit held.`, data: { ...data, exception: `EX-temperature-${kitId}` } });
          } else {
            status = "Received";
            drafts.push({ ...base, key: e.id, correctsKey: lateEntry ? missingKey : undefined, role, from: missingKey ? "unconfirmed" : "in transit", to: "received", event: lateEntry ? "Receipt recorded (late entry)" : batch.receiver === "hotel" ? "Received by hotel front desk" : "Received by traveller", detail: `${presented ? `Seal ${presented} matches the run record. ` : ""}Handover ${late ? `${late} min after` : "inside"} the declared window.`, data: late ? { ...data, exception: `EX-late-${batch.key}` } : data });
          }
          if (mismatch) kitExceptions.push(`EX-seal-${kitId}`);
          if (tempOut) kitExceptions.push(`EX-temperature-${kitId}`);
        } else if (e.type === "release") {
          const wrong = !!e.releasedToTravellerId && e.releasedToTravellerId !== journey.travellerId;
          if (!wrong) status = "Released";
          drafts.push({ ...base, key: e.id, role: "hotel", from: "received", to: wrong ? "held" : "released", event: wrong ? "Released to the wrong traveller" : "Released to traveller", detail: wrong ? `Released to a traveller whose profile this kit was not produced for. Kit quarantined.` : "Released to the kit's traveller.", data: wrong ? { exception: `EX-substitution-${kitId}` } : {} });
          if (wrong) kitExceptions.push(`EX-substitution-${kitId}`);
        } else if (e.type === "confirm") {
          status = "Receipt confirmed";
          drafts.push({ ...base, key: e.id, role: "traveller", from: "released", to: "receipt confirmed", event: "Receipt confirmed by traveller", detail: `Traveller scanned the kit; ${set.code} covers the profile.`, data: { profileMatch: true } });
        } else if (e.type === "reaction") {
          drafts.push({ ...base, key: e.id, role: "traveller", from: "receipt confirmed", to: "held", event: "Reaction reported", detail: e.note || "Allergic reaction reported against this kit.", data: { exception: `EX-reaction-${kitId}` } });
          kitExceptions.push(`EX-reaction-${kitId}`);
        } else if (e.type === "resolution") {
          drafts.push({ ...base, key: e.id, role: "assurance", from: "held", to: "withdrawn", event: "Exception closed", detail: e.note || "Exception closed with a recorded outcome.", data: e.resolves ? { exception: e.resolves } : {} });
        }
      }

      // Kit-level exceptions.
      const evAt = (id: string) => events.find((e) => e.id === id)?.at ?? now;
      if (receipt || missingKey) {
        if (missingKey) {
          const id = `EX-missing-receipt-${batch.key}`;
          kitExceptions.push(id);
          addException({
            id,
            kind: "missing-receipt",
            type: "Missing courier or hotel handover confirmation",
            title: `No receipt entry for ${batch.place}`,
            outcome: receipt ? "Resolved" : "Open",
            stage: 7,
            journeyId: journey.id,
            kitIds: [kitId],
            trigger: `No receipt entry ${RECEIPT_GRACE_MIN} minutes after the declared window (${fmtTime(batch.start)}–${fmtTime(batch.end)}) closed.`,
            detectedAt: due,
            alert: "Chain INCOMPLETE; kit custody unconfirmed until the receiving party records receipt.",
            responsible: "coordinator",
            steps: [
              { ts: due, action: "Platform raises the missing-receipt alert", role: "platform", done: true },
              { ts: receipt?.recordedAt ?? due, action: "Receiving party checks seal and temperature and records a late receipt", role: batch.receiver === "hotel" ? "hotel" : "traveller", done: !!receipt },
            ],
            result: receipt ? `Late entry recorded at ${fmtDT(receipt.recordedAt)}; the gap stays visible.` : "Custody still unconfirmed.",
            endpoint: "Handover record completeness: movement counted as incomplete.",
            planRef: "§4.3, §10.7",
            resolvable: false,
          });
        }
        if (receipt && after(receipt.at, batch.end)) {
          const id = `EX-late-${batch.key}`;
          kitExceptions.push(id);
          addException({
            id,
            kind: "late",
            type: "Delivery outside the required time window",
            title: `Handover at ${batch.place} after the window closed`,
            outcome: "Closed with recorded outcome",
            stage: 7,
            journeyId: journey.id,
            kitIds: [kitId],
            trigger: `Received at ${fmtTime(receipt.at)}; declared window ${fmtTime(batch.start)}–${fmtTime(batch.end)}.`,
            detectedAt: receipt.at,
            alert: "LATE handover recorded against the on-window endpoint.",
            responsible: "coordinator",
            steps: [{ ts: receipt.at, action: "Late handover recorded; kit checked at acceptance", role: "courier", done: true }],
            result: `Delivered ${diffMin(batch.end, receipt.at)} minutes after the window. The miss counts against the on-window endpoint.`,
            endpoint: "On-window delivery: 1 handover outside the window.",
            planRef: "§10.7, §5.4",
            resolvable: false,
          });
        }
      }
      const kitLevel: [ExceptionKind, string, string, string, number, Role, string, string][] = [
        ["seal", "Broken or mismatched security seal", "Seal at acceptance does not match the run record", "Kit QUARANTINED; release blocked.", 7, "assurance", "Seal integrity at acceptance: 1 failure.", "§4.2 item 6, §13.7"],
        ["temperature", "Temperature-control breach", "Temperature outside the declared range at acceptance", "Kit on HOLD; release blocked.", 7, "assurance", "Temperature integrity: 1 movement out of range.", "§4.3, §13.7"],
        ["substitution", "Unauthorised substitution of a meal kit", "Kit released to the wrong traveller", "Kit QUARANTINED; DO NOT CONSUME.", 8, "hotel", "Recorded as a release-control exception.", "§4.3, §13.7"],
        ["reaction", "Reaction incident", "Allergic reaction reported against a kit", "Production STOPPED for review; run kits held.", 8, "assurance", "Reaction incidents: any incident fails the endpoint.", "§5.4, §13.4"],
      ];
      for (const [kind, type, title, alert, stage, responsible, endpoint, planRef] of kitLevel) {
        const id = `EX-${kind}-${kitId}`;
        if (!kitExceptions.includes(id)) continue;
        const resolved = resolutions.get(id);
        const triggerEvent = events.find((e) => drafts.some((d) => d.key === e.id && d.data?.exception === id));
        addException({
          id,
          kind,
          type,
          title,
          outcome: resolved ? "Closed with recorded outcome" : "Open",
          stage,
          journeyId: journey.id,
          kitIds: [kitId],
          runId: run.id,
          trigger: drafts.find((d) => d.data?.exception === id)?.detail ?? title,
          detectedAt: triggerEvent ? evAt(triggerEvent.id) : now,
          alert,
          responsible,
          steps: [
            { ts: triggerEvent?.at ?? now, action: "Exception raised; kit held", role: "platform", done: true },
            { ts: resolved?.at ?? now, action: "Customer assurance records the outcome (withdraw, notify, credit)", role: "assurance", done: !!resolved },
          ],
          result: resolved ? `Closed: ${resolved.note || "outcome recorded"}.` : "Open: kit held until an outcome is recorded.",
          endpoint,
          planRef,
          resolvable: !resolved,
        });
      }

      // A kit must not leave the kitchen before its run has an accepted clearance (§4.2).
      const firstMove = dispatch ?? receipt;
      const producedFirst = produced && run.acceptedAt && !after(run.acceptedAt, firstMove?.at ?? run.acceptedAt);
      if (firstMove && !producedFirst) {
        const id = `EX-no-clearance-${kitId}`;
        const resolved = resolutions.get(id);
        kitExceptions.push(id);
        addException({
          id,
          kind: "no-clearance",
          type: "Kit moved without an accepted clearance",
          title: `Custody recorded before ${run.id} was cleared`,
          outcome: resolved ? "Closed with recorded outcome" : "Open",
          stage: 5,
          journeyId: journey.id,
          kitIds: [kitId],
          runId: run.id,
          trigger: `A ${firstMove.type} was recorded at ${fmtDT(firstMove.at)}, but ${run.id} ${run.acceptedAt ? `was only cleared at ${fmtDT(run.acceptedAt)}` : "has no accepted clearance"}. The kit cannot be shown to come from a segregated run.`,
          detectedAt: firstMove.at,
          alert: "Kit's production cannot be verified; treat as unverified food.",
          responsible: "supervisor",
          steps: [
            { ts: firstMove.at, action: "Movement recorded without a verified production run", role: "platform", done: true },
            { ts: resolved?.at ?? firstMove.at, action: "Supervisor investigates and records the outcome", role: "supervisor", done: !!resolved },
          ],
          result: resolved ? `Closed: ${resolved.note || "outcome recorded"}.` : "Open: production of this kit is unverified.",
          endpoint: "Clearance control: a kit moved without an accepted clearance.",
          planRef: "§4.2, §13.1",
          resolvable: !resolved,
        });
      }

      // Status after holds.
      const holds = kitExceptions.filter((id) => HOLD_KINDS.some((k) => id.startsWith(`EX-${k}-`)));
      if (holds.length) status = holds.every((id) => resolutions.has(id)) ? "Withdrawn" : "On hold";

      // Movements for the validation endpoints.
      const movements: Movement[] = [];
      if (dispatch || receipt || missingKey) {
        const temps = [dispatch?.tempC, receipt?.tempC].filter((t): t is number => typeof t === "number");
        const presented = receipt?.sealPresented?.trim().toUpperCase() || null;
        movements.push({
          id: `${kitId}-M1`,
          kitId,
          kind: "transport",
          start: dispatch?.at ?? receipt?.at ?? batch.start,
          end: receipt?.at ?? null,
          tempMax: temps.length ? Math.max(...temps) : null,
          inRange: temps.length ? temps.every((t) => t >= TEMP_RANGE.min && t <= TEMP_RANGE.max) : null,
          recordedOnTime: !!receipt && !after(receipt.recordedAt, due),
          sealOk: presented ? presented === kit.sealNo : null,
        });
      }
      if (release) {
        movements.push({
          id: `${kitId}-M2`,
          kitId,
          kind: "release",
          start: release.at,
          end: confirm?.at ?? null,
          tempMax: null,
          inRange: null,
          recordedOnTime: !!confirm || !after(now, addMin(release.at, 60)),
          sealOk: null,
        });
      }

      kits.push({
        ...kit,
        journeyId: journey.id,
        travellerId: journey.travellerId,
        setId,
        runId: run.id,
        status,
        exceptionIds: [...new Set(kitExceptions.concat(exceptions.get(`EX-clearance-${run.id}`) ? [`EX-clearance-${run.id}`] : [], exceptions.get(`EX-swab-${run.id}`) ? [`EX-swab-${run.id}`] : []))],
        events,
        ledger: chain(kit, run.id, set.code, drafts),
        movements,
        source: journey.source,
      });
    }
  }

  // ------------------------------------------------ validation endpoints (§5.4)
  const movements = kits.flatMap((k) => k.movements);
  const transports = movements.filter((m) => m.kind === "transport");
  const swabs = snap.clearances.flatMap((c) => c.swabs);
  const detections = swabs.filter((s) => s.aboveLimit);
  const batchReceipts = new Map<string, { late: boolean; label: string; kitId: string }>();
  for (const k of kits) {
    const r = k.events.find((e) => e.type === "receipt");
    if (!r) continue;
    const plan = plansById[k.journeyId];
    const b = plan.batches.find((x) => x.key === k.batchKey)!;
    if (!batchReceipts.has(b.key)) batchReceipts.set(b.key, { late: after(r.at, b.end) || toMin(r.at) < toMin(b.start) - 30, label: `${b.place}: ${Math.max(0, diffMin(b.end, r.at))} min late`, kitId: k.kitId });
  }
  const withTemp = movements.filter((m) => m.inRange !== null);
  const withSeal = transports.filter((m) => m.sealOk !== null);
  const reactions = snap.events.filter((e) => e.type === "reaction");
  const pct = (n: number, d: number) => (d ? (100 * n) / d : 0);
  const excFor = (kitId: string, prefix: string) => kits.find((k) => k.kitId === kitId)?.exceptionIds.find((x) => x.startsWith(prefix));
  const def = Object.fromEntries(ENDPOINTS.map((e) => [e.id, e]));
  const ep = (id: string, sample: number, sampleLabel: string, sampleMet: boolean, measured: boolean, value: string, pass: boolean, failures: EndpointResult["failures"]): EndpointResult => ({
    id,
    name: def[id].name,
    measure: def[id].measure,
    threshold: def[id].threshold,
    minSample: def[id].minSample,
    sample,
    sampleLabel,
    sampleMet,
    measured,
    value: measured ? value : "No data yet",
    pass: measured && pass,
    failures,
  });
  const incomplete = movements.filter((m) => !m.recordedOnTime);
  const late = [...batchReceipts.values()].filter((b) => b.late);
  const hot = withTemp.filter((m) => !m.inRange);
  const badSeal = withSeal.filter((m) => !m.sealOk);
  const endpoints: EndpointResult[] = [
    ep("segregation", snap.clearances.length, `${snap.clearances.length} clearance events, ${swabs.length} swabs`, snap.clearances.length >= 30, swabs.length > 0, `${detections.length} detection${detections.length === 1 ? "" : "s"}`, detections.length === 0, detections.map((s) => ({ label: `${s.surface} swab at ${fmtDT(s.at)}` }))),
    ep("completeness", movements.length, `${movements.length} physical movements`, movements.length >= 200, movements.length > 0, `${pct(movements.length - incomplete.length, movements.length).toFixed(1)}%`, pct(movements.length - incomplete.length, movements.length) >= 98, incomplete.map((m) => ({ label: `${m.id}: no entry by the deadline`, kitId: m.kitId, exceptionId: excFor(m.kitId, "EX-missing-receipt") }))),
    ep("on_window", batchReceipts.size, `${batchReceipts.size} handovers`, true, batchReceipts.size > 0, `${pct(batchReceipts.size - late.length, batchReceipts.size).toFixed(1)}%`, pct(batchReceipts.size - late.length, batchReceipts.size) >= 95, late.map((b) => ({ label: b.label, kitId: b.kitId, exceptionId: excFor(b.kitId, "EX-late") }))),
    ep("temperature", withTemp.length, `${withTemp.length} movements with a reading`, true, withTemp.length > 0, `${pct(withTemp.length - hot.length, withTemp.length).toFixed(1)}%`, pct(withTemp.length - hot.length, withTemp.length) >= 98, hot.map((m) => ({ label: `${m.id}: peak ${m.tempMax} °C`, kitId: m.kitId, exceptionId: excFor(m.kitId, "EX-temperature") }))),
    ep("seal", withSeal.length, `${withSeal.length} kits checked at acceptance`, true, withSeal.length > 0, `${pct(withSeal.length - badSeal.length, withSeal.length).toFixed(1)}%`, pct(withSeal.length - badSeal.length, withSeal.length) >= 99, badSeal.map((m) => ({ label: `${m.kitId}: seal does not match the run record`, kitId: m.kitId, exceptionId: excFor(m.kitId, "EX-seal") }))),
    ep("reactions", transports.filter((m) => m.end).length, `${transports.filter((m) => m.end).length} kits delivered`, true, transports.some((m) => m.end) || reactions.length > 0, `${reactions.length} incident${reactions.length === 1 ? "" : "s"}`, reactions.length === 0, reactions.map((r) => ({ label: `Reported ${fmtDT(r.at)}`, kitId: r.kitId, exceptionId: `EX-reaction-${r.kitId}` }))),
  ];

  const attempts = snap.clearances.flatMap((c) => c.attempts);
  const clearanceControl = {
    events: snap.clearances.length,
    attempts: attempts.length,
    rejected: snap.clearances.reduce((n, c) => n + evaluateClearance(c, staffById).rejected.length, 0),
    firstTime: snap.clearances.filter((c) => {
      const ev = evaluateClearance(c, staffById);
      const first = [...c.attempts].sort((a, b) => toMin(a.at) - toMin(b.at))[0];
      return !!first && ev.valid(first);
    }).length,
  };

  const exceptionList = [...exceptions.values()].sort((a, b) => toMin(b.detectedAt) - toMin(a.detectedAt));
  for (const k of kits) k.exceptionIds = k.exceptionIds.filter((id) => exceptions.has(id));

  return {
    ...snap,
    now,
    plansById,
    stalePlanIds,
    runs,
    kits,
    exceptions: exceptionList,
    endpoints,
    clearanceControl,
    isEmpty: snap.travellers.length === 0 && snap.journeys.length === 0,
    hasSample: [...snap.travellers, ...snap.journeys].some((x) => x.source === "sample"),
  };
}

// Monday of the run's week (the order book closes then, §13.10).
export const runWeekMonday = (date: string) => addDays(date, 1 - (dayOfWeek(date) || 7));

export type { TravellerInput };
