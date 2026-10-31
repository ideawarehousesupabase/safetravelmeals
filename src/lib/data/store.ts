// Firestore access for one account. Everything lives under users/{uid}/…; primary records
// are written by the user, plans are written by the engine whenever their inputs change.
import { collection, doc, writeBatch, type DocumentReference } from "firebase/firestore";
import { db } from "../firebase";
import { processInput, type ClearanceInput, type EventInput, type JourneyInput, type StaffInput, type TravellerInput, type Workspace } from "../processing";
import { nowLondon } from "../jaap/time";
import { buildSampleData } from "./sample";

export const COLLECTIONS = ["travellers", "journeys", "plans", "staff", "clearances", "events"] as const;
export type CollectionName = (typeof COLLECTIONS)[number];

const ref = (uid: string, name: CollectionName, id: string) => doc(db, "users", uid, name, id);
export const newId = () => doc(collection(db, "ids")).id;

type Op = { kind: "set"; ref: DocumentReference; data: object } | { kind: "delete"; ref: DocumentReference };

// Firestore batches hold 500 writes; larger jobs are split.
async function commit(ops: Op[]) {
  for (let i = 0; i < ops.length; i += 450) {
    const batch = writeBatch(db);
    for (const op of ops.slice(i, i + 450)) {
      if (op.kind === "set") batch.set(op.ref, op.data);
      else batch.delete(op.ref);
    }
    await batch.commit();
  }
}

const planOp = (uid: string, j: JourneyInput, t: TravellerInput | undefined): Op => ({
  kind: "set",
  ref: ref(uid, "plans", j.id),
  data: processInput(j, t, new Date().toISOString()),
});

// ------------------------------------------------ travellers
export async function saveTraveller(uid: string, t: TravellerInput, ws: Workspace) {
  const ops: Op[] = [{ kind: "set", ref: ref(uid, "travellers", t.id), data: t }];
  for (const j of ws.journeys.filter((x) => x.travellerId === t.id)) ops.push(planOp(uid, j, t));
  await commit(ops);
}

export async function deleteTraveller(uid: string, travellerId: string, ws: Workspace) {
  const journeys = ws.journeys.filter((j) => j.travellerId === travellerId);
  const ops: Op[] = [{ kind: "delete", ref: ref(uid, "travellers", travellerId) }];
  for (const j of journeys) ops.push(...journeyDeleteOps(uid, j.id, ws));
  await commit(ops);
}

// ------------------------------------------------ journeys
export async function saveJourney(uid: string, j: JourneyInput, ws: Workspace, traveller?: TravellerInput) {
  const t = traveller ?? ws.travellers.find((x) => x.id === j.travellerId);
  const ops: Op[] = [{ kind: "set", ref: ref(uid, "journeys", j.id), data: j }, planOp(uid, j, t)];
  if (traveller) ops.push({ kind: "set", ref: ref(uid, "travellers", traveller.id), data: traveller });
  await commit(ops);
}

function journeyDeleteOps(uid: string, journeyId: string, ws: Workspace): Op[] {
  return [
    { kind: "delete", ref: ref(uid, "journeys", journeyId) },
    { kind: "delete", ref: ref(uid, "plans", journeyId) },
    ...ws.events.filter((e) => e.journeyId === journeyId).map((e): Op => ({ kind: "delete", ref: ref(uid, "events", e.id) })),
  ];
}

export async function deleteJourney(uid: string, journeyId: string, ws: Workspace) {
  await commit(journeyDeleteOps(uid, journeyId, ws));
}

export async function setJourneyStatus(uid: string, j: JourneyInput, status: JourneyInput["status"], ws: Workspace) {
  await saveJourney(uid, { ...j, status }, ws);
}

// Rewrites plans whose stored inputs no longer match (edited elsewhere, or a new engine version).
export async function writeStalePlans(uid: string, ws: Workspace) {
  const ops: Op[] = ws.stalePlanIds.map((id) => ({ kind: "set", ref: ref(uid, "plans", id), data: ws.plansById[id] }));
  await commit(ops);
}

// ------------------------------------------------ operations
export async function recordEvent(uid: string, e: Omit<EventInput, "id" | "recordedAt" | "source"> & Partial<Pick<EventInput, "recordedAt">>) {
  const full: EventInput = { ...e, id: newId(), recordedAt: e.recordedAt ?? nowLondon(), source: "user" };
  await commit([{ kind: "set", ref: ref(uid, "events", full.id), data: full }]);
  return full;
}

export async function saveStaff(uid: string, s: StaffInput) {
  await commit([{ kind: "set", ref: ref(uid, "staff", s.id), data: s }]);
}

export async function deleteStaff(uid: string, id: string) {
  await commit([{ kind: "delete", ref: ref(uid, "staff", id) }]);
}

export async function saveClearance(uid: string, c: ClearanceInput) {
  await commit([{ kind: "set", ref: ref(uid, "clearances", c.runId), data: c }]);
}

// ------------------------------------------------ bulk
export async function importRecords(
  uid: string,
  records: { travellers?: TravellerInput[]; journeys?: JourneyInput[]; events?: EventInput[] },
  ws: Workspace,
) {
  const travellers = new Map(ws.travellers.map((t) => [t.id, t]));
  for (const t of records.travellers ?? []) travellers.set(t.id, t);
  const ops: Op[] = [];
  for (const t of records.travellers ?? []) ops.push({ kind: "set", ref: ref(uid, "travellers", t.id), data: t });
  for (const j of records.journeys ?? []) {
    ops.push({ kind: "set", ref: ref(uid, "journeys", j.id), data: j });
    ops.push(planOp(uid, j, travellers.get(j.travellerId)));
  }
  // Journeys of updated travellers need fresh plans too.
  const touched = new Set((records.travellers ?? []).map((t) => t.id));
  const imported = new Set((records.journeys ?? []).map((j) => j.id));
  for (const j of ws.journeys) if (touched.has(j.travellerId) && !imported.has(j.id)) ops.push(planOp(uid, j, travellers.get(j.travellerId)));
  for (const e of records.events ?? []) ops.push({ kind: "set", ref: ref(uid, "events", e.id), data: e });
  await commit(ops);
}

export async function loadSampleData(uid: string) {
  const s = buildSampleData(nowLondon().slice(0, 10));
  const ops: Op[] = [
    ...s.travellers.map((x): Op => ({ kind: "set", ref: ref(uid, "travellers", x.id), data: x })),
    ...s.journeys.map((x): Op => ({ kind: "set", ref: ref(uid, "journeys", x.id), data: x })),
    ...s.plans.map((x): Op => ({ kind: "set", ref: ref(uid, "plans", x.journeyId), data: x })),
    ...s.staff.map((x): Op => ({ kind: "set", ref: ref(uid, "staff", x.id), data: x })),
    ...s.clearances.map((x): Op => ({ kind: "set", ref: ref(uid, "clearances", x.runId), data: x })),
    ...s.events.map((x): Op => ({ kind: "set", ref: ref(uid, "events", x.id), data: x })),
  ];
  await commit(ops);
}

export async function deleteSampleData(uid: string, ws: Workspace) {
  await commit(dataDeleteOps(uid, ws, (x) => x.source === "sample"));
}

export async function deleteAllMyData(uid: string, ws: Workspace) {
  await commit(dataDeleteOps(uid, ws, () => true));
}

function dataDeleteOps(uid: string, ws: Workspace, keep: (x: { source: string }) => boolean): Op[] {
  const del = (name: CollectionName, id: string): Op => ({ kind: "delete", ref: ref(uid, name, id) });
  const journeys = ws.journeys.filter(keep);
  const journeyIds = new Set(journeys.map((j) => j.id));
  return [
    ...ws.travellers.filter(keep).map((x) => del("travellers", x.id)),
    ...journeys.map((x) => del("journeys", x.id)),
    ...ws.plans.filter((p) => journeyIds.has(p.journeyId) || !ws.journeys.some((j) => j.id === p.journeyId)).map((p) => del("plans", p.journeyId)),
    ...ws.staff.filter(keep).map((x) => del("staff", x.id)),
    ...ws.clearances.filter(keep).map((x) => del("clearances", x.runId)),
    ...ws.events.filter((e) => keep(e) || journeyIds.has(e.journeyId)).map((x) => del("events", x.id)),
  ];
}
