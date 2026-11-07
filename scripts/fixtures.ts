// Optional sample data. It is written into the user's own account as ordinary primary input
// (travellers, itineraries, staff, clearances, events); the engine derives everything else.
// Dates are shifted so the journeys sit in the two weeks before the day it is loaded.
import { deriveWorkspace, processInput } from "../src/lib/processing";
import type {
  ClearanceInput,
  EventInput,
  JourneyInput,
  Plan,
  StaffInput,
  TravellerInput,
  WorkspaceSnapshot,
} from "../src/lib/processing";
import type { Leg } from "../src/lib/jaap/engine";
import { sha256 } from "../src/lib/jaap/sha256";
import { addDays, addMin, at, dateOf, dayOfWeek, diffMin, toMin, type Naive } from "../src/lib/jaap/time";

const BASE_WED = "2027-04-21"; // the Wednesday the sample journeys were written around

// Most recent Wednesday at least 12 days before `today`, so every sample event is in the past.
export function sampleOffsetDays(today: string) {
  let d = addDays(today, -12);
  while (dayOfWeek(d) !== 3) d = addDays(d, -1);
  return diffMin(at(BASE_WED, "00:00"), at(d, "00:00")) / 1440;
}

const rand = (key: string, lo: number, hi: number) => lo + (parseInt(sha256(key).slice(0, 8), 16) % (hi - lo + 1));

export function buildSampleData(today: string): Omit<WorkspaceSnapshot, "plans"> & { plans: Plan[] } {
  const off = sampleOffsetDays(today);
  const S = (t: Naive) => addMin(t, off * 1440);
  const consentAt = `${today}T00:00`;

  const travellers: TravellerInput[] = [
    { id: "sample-T-B01", label: "Business traveller (sample)", allergens: ["peanut", "sesame"], severity: "Severe, auto-injector carried", preference: "South Asian", consentVersion: "1.2", consentAt, source: "sample" },
    { id: "sample-T-F01", label: "Child age 7, family trip (sample)", allergens: ["milk", "egg"], severity: "Severe (child, age 7)", preference: "Middle Eastern", consentVersion: "1.2", consentAt, source: "sample" },
    { id: "sample-T-C01A", label: "Employee A, coeliac (sample)", allergens: ["gluten"], severity: "Coeliac disease, diagnosed", preference: "British", consentVersion: "1.2", consentAt, source: "sample" },
    { id: "sample-T-C01B", label: "Employee B, fish and shellfish (sample)", allergens: ["fish", "crustacean", "mollusc"], severity: "Anaphylactic, auto-injector carried", preference: "East Asian", consentVersion: "1.2", consentAt, source: "sample" },
    // Profile edited after production: peanut added to a milk-only profile.
    { id: "sample-T-C01C", label: "Employee C, milk and peanut (sample)", allergens: ["milk", "peanut"], severity: "Severe, auto-injector carried", preference: "South Asian", consentVersion: "1.2", consentAt, source: "sample" },
  ];

  const legs = (xs: Leg[]): Leg[] =>
    xs.map((l) =>
      l.kind === "flight"
        ? { ...l, depart: S(l.depart), arrive: S(l.arrive) }
        : l.kind === "hotel"
          ? { ...l, checkIn: S(l.checkIn), checkOut: S(l.checkOut) }
          : { ...l, start: S(l.start), end: S(l.end) },
    );
  const journey = (id: string, travellerId: string, label: string, persons: number, created: Naive, ls: Leg[], extra: Partial<JourneyInput> = {}): JourneyInput => ({
    id,
    travellerId,
    label,
    persons,
    legs: legs(ls),
    declinedWindowKeys: [],
    accountProduct: null,
    status: "confirmed",
    createdAt: S(created),
    source: "sample",
    ...extra,
  });

  const journeys: JourneyInput[] = [
    journey("sample-J-B01", "sample-T-B01", "Edinburgh to London, three nights", 1, "2027-04-16T10:20", [
      { id: "f1", kind: "flight", ref: "FL 1463", from: "EDI", to: "LHR", depart: "2027-04-21T20:15", arrive: "2027-04-21T21:40", departsFromServiceArea: false },
      { id: "h1", kind: "hotel", name: "Riverside Hotel, Greenwich", location: "Greenwich, London SE10", checkIn: "2027-04-21T22:50", checkOut: "2027-04-24T09:30" },
      { id: "m1", kind: "meeting", title: "Client workshop", location: "Canary Wharf, London E14", start: "2027-04-22T11:30", end: "2027-04-22T15:00", catered: false },
      { id: "m2", kind: "meeting", title: "Client project meeting", location: "Holborn, London WC1", start: "2027-04-23T12:00", end: "2027-04-23T14:00", catered: false },
      { id: "f2", kind: "flight", ref: "FL 1470", from: "LHR", to: "EDI", depart: "2027-04-24T12:05", arrive: "2027-04-24T13:25", departsFromServiceArea: true },
    ]),
    journey("sample-J-F01", "sample-T-F01", "Glasgow to London, four nights, then Dubai", 2, "2027-04-15T14:05", [
      { id: "f1", kind: "flight", ref: "FL 2210", from: "GLA", to: "LCY", depart: "2027-04-21T19:55", arrive: "2027-04-21T21:30", departsFromServiceArea: false },
      { id: "h1", kind: "hotel", name: "Riverside Hotel, Greenwich", location: "Greenwich, London SE10", checkIn: "2027-04-21T22:20", checkOut: "2027-04-25T10:30" },
      { id: "m1", kind: "meeting", title: "Family museum day", location: "South Kensington, London SW7", start: "2027-04-23T10:30", end: "2027-04-23T15:00", catered: false },
      { id: "f2", kind: "flight", ref: "FL 0007", from: "LHR", to: "DXB", depart: "2027-04-25T14:20", arrive: "2027-04-25T21:20", departsFromServiceArea: true },
    ]),
    journey("sample-J-C01A", "sample-T-C01A", "London conference, then New York", 1, "2027-04-19T09:40", [
      { id: "h1", kind: "hotel", name: "ExCeL Waterfront Hotel, Royal Docks", location: "Royal Docks, London E16", checkIn: "2027-04-26T18:30", checkOut: "2027-04-28T08:00" },
      { id: "m1", kind: "meeting", title: "Industry conference, day 1", location: "Royal Docks, London E16", start: "2027-04-27T09:00", end: "2027-04-27T17:30", catered: false },
      { id: "m2", kind: "meeting", title: "Industry conference, day 2", location: "Royal Docks, London E16", start: "2027-04-28T09:00", end: "2027-04-28T13:00", catered: true },
      { id: "f1", kind: "flight", ref: "FL 0117", from: "LHR", to: "JFK", depart: "2027-04-28T18:30", arrive: "2027-04-29T02:20", departsFromServiceArea: true },
    ], { accountProduct: "corporate" }),
    journey("sample-J-C01B", "sample-T-C01B", "Aberdeen to London, two nights", 1, "2027-04-22T11:15", [
      { id: "f1", kind: "flight", ref: "FL 1306", from: "ABZ", to: "LGW", depart: "2027-04-28T20:40", arrive: "2027-04-28T22:15", departsFromServiceArea: false },
      { id: "h1", kind: "hotel", name: "Thameside Business Hotel, Canary Wharf", location: "Canary Wharf, London E14", checkIn: "2027-04-28T23:40", checkOut: "2027-04-30T08:30" },
      { id: "m1", kind: "meeting", title: "Supplier negotiation", location: "Canary Wharf, London E14", start: "2027-04-29T11:00", end: "2027-04-29T14:30", catered: false },
      { id: "f2", kind: "flight", ref: "FL 1311", from: "LGW", to: "ABZ", depart: "2027-04-30T12:10", arrive: "2027-04-30T13:45", departsFromServiceArea: true },
    ], { accountProduct: "corporate" }),
    journey("sample-J-C01C", "sample-T-C01C", "London day visit", 1, "2027-04-22T16:30", [
      { id: "m1", kind: "meeting", title: "Client meeting", location: "King's Cross, London N1", start: "2027-04-29T12:00", end: "2027-04-29T14:00", catered: false },
    ], { accountProduct: "corporate" }),
  ];
  journeys[0].declinedWindowKeys = [`R3:m2:${dateOf(S("2027-04-23T12:00"))}`];

  const staff: StaffInput[] = [
    { id: "sample-S-PS01", name: "Production supervisor", role: "Production supervisor (founder in year 1)", clearanceCompetent: true, source: "sample" },
    { id: "sample-S-PK02", name: "Kitchen staff A", role: "Partner kitchen staff", clearanceCompetent: true, source: "sample" },
    { id: "sample-S-PK03", name: "Kitchen staff B", role: "Partner kitchen staff", clearanceCompetent: false, source: "sample" },
  ];

  const computedAt = new Date().toISOString();
  const tById = new Map(travellers.map((t) => [t.id, t]));
  const plans = journeys.map((j) => processInput(j, tById.get(j.travellerId), computedAt));
  const ws = deriveWorkspace({ travellers, journeys, plans, staff, clearances: [], events: [] });

  // ------------------------------------------------ clearances: one per run
  const kitOf = (journeyId: string, type: string, date?: string, person = 1) =>
    ws.kits.find((k) => k.journeyId === journeyId && k.type === type && k.person === person && (!date || dateOf(k.occasionStart) === dateOf(S(at(date, "00:00")))))!;
  const sealKit = kitOf("sample-J-C01A", "breakfast", "2027-04-27");
  const clearances: ClearanceInput[] = ws.runs.map((r) => {
    const slotStart = addMin(at(r.date, "06:30"), r.slot * 100);
    const failed = r.kitIds.includes(sealKit.kitId);
    const attempts = failed
      ? [
          { staffId: "sample-S-PK03", at: addMin(slotStart, 10), checklistComplete: false },
          { staffId: "sample-S-PS01", at: addMin(slotStart, 52), checklistComplete: true },
        ]
      : [{ staffId: "sample-S-PS01", at: addMin(slotStart, 24), checklistComplete: true }];
    return {
      runId: r.id,
      setId: r.setId,
      kitIds: [...r.kitIds],
      attempts,
      swabs: ["Preparation bench", "Utensils and boards", "Sealing station"].map((surface, i) => ({ surface, at: addMin(slotStart, failed ? 35 + i * 4 : 8 + i * 4), aboveLimit: false })),
      declarations: [`DEC-A-${r.date.replace(/-/g, "")}-${r.setId}`, `DEC-B-${r.date.replace(/-/g, "")}-${r.setId}`],
      source: "sample",
    };
  });
  // Employee C's lunch kit was produced in a Set 3 run while the profile listed milk only.
  const cKit = kitOf("sample-J-C01C", "lunch");
  const oldRunDate = cKit.runDate;
  clearances.push({
    runId: `RUN-${oldRunDate.slice(2).replace(/-/g, "")}-S3`,
    setId: 3,
    kitIds: [cKit.kitId],
    attempts: [{ staffId: "sample-S-PS01", at: at(oldRunDate, "07:02"), checklistComplete: true }],
    swabs: [{ surface: "Preparation bench", at: at(oldRunDate, "06:50"), aboveLimit: false }],
    declarations: [`DEC-A-${oldRunDate.replace(/-/g, "")}-3`],
    source: "sample",
  });

  // ------------------------------------------------ handover events
  const events: EventInput[] = [];
  const ev = (kitId: string, journeyId: string, type: EventInput["type"], when: Naive, extra: Partial<EventInput> = {}) =>
    events.push({
      id: `sample-${kitId}-${type}`,
      kitId,
      journeyId,
      type,
      at: when,
      recordedAt: extra.recordedAt ?? when,
      tempC: null,
      sealPresented: null,
      releasedToTravellerId: null,
      resolves: null,
      actor: type === "dispatch" ? "Courier" : type === "confirm" ? "Traveller" : "Coordinator",
      note: "",
      source: "sample",
      ...extra,
    });

  const bizHotel = ws.plansById["sample-J-B01"].batches[0];
  const famLunch = ws.plansById["sample-J-F01"].batches.find((b) => b.mode === "venue")!;
  const tempKit = kitOf("sample-J-C01B", "lunch");
  const subKit = kitOf("sample-J-F01", "breakfast", "2027-04-23", 1);
  const bizFri = kitOf("sample-J-B01", "breakfast", "2027-04-23");

  for (const k of ws.kits) {
    if (k.kitId === cKit.kitId) continue; // replaced kit waits for the coordinator's decision
    const plan = ws.plansById[k.journeyId];
    const b = plan.batches.find((x) => x.key === k.batchKey)!;
    const len = Math.max(10, diffMin(b.start, b.end) - 12);
    let received = addMin(b.start, rand(`${b.key}-r`, 8, len));
    let recordedAt = received;
    if (b.key === bizHotel.key) {
      received = addMin(b.end, -42);
      recordedAt = addMin(b.end, 26);
    }
    if (b.key === famLunch.key) received = recordedAt = addMin(b.end, 27);
    const temp = (x: string, lo: number, hi: number) => rand(`${k.kitId}-${x}`, lo, hi) / 10;
    ev(k.kitId, k.journeyId, "dispatch", addMin(received, -rand(`${b.key}-d`, 40, 75)), { tempC: temp("d", 18, 40) });
    ev(k.kitId, k.journeyId, "receipt", received, {
      recordedAt,
      tempC: k.kitId === tempKit.kitId ? 7.6 : temp("r", 26, 46),
      sealPresented: k.kitId === sealKit.kitId ? "TS-099871" : k.sealNo,
      actor: b.receiver === "hotel" ? "Front desk" : "Traveller",
    });
    if (k.kitId === sealKit.kitId) {
      ev(k.kitId, k.journeyId, "resolution", addMin(received, 24), { resolves: `EX-seal-${k.kitId}`, note: "Kit withdrawn; traveller and employer notified before the meal; 1 kit-equivalent credited", actor: "Customer assurance" });
      continue;
    }
    if (k.kitId === tempKit.kitId) continue; // left open: courier investigation in progress
    if (b.receiver === "hotel") {
      const hotelLeg = journeys.find((j) => j.id === k.journeyId)!.legs.find((l) => l.kind === "hotel") as Extract<Leg, { kind: "hotel" }>;
      let release = k.type === "late_arrival" ? hotelLeg.checkIn : at(dateOf(k.occasionStart), `0${rand(`${k.kitId}-h`, 6, 8)}:${String(rand(`${k.kitId}-m`, 40, 59))}`);
      if (k.kitId === subKit.kitId) {
        const wrongAt = at(dateOf(k.occasionStart), "07:12");
        ev(k.kitId, k.journeyId, "release", wrongAt, { releasedToTravellerId: "sample-T-B01", actor: "Front desk" });
        ev(k.kitId, k.journeyId, "resolution", addMin(wrongAt, 23), { resolves: `EX-substitution-${k.kitId}`, note: "Kit left controlled custody and was withdrawn; family notified at 07:40; 1 kit-equivalent credited", actor: "Customer assurance" });
        continue;
      }
      if (k.kitId === bizFri.kitId) release = at(dateOf(k.occasionStart), "07:24");
      ev(k.kitId, k.journeyId, "release", release, { actor: "Front desk" });
      ev(k.kitId, k.journeyId, "confirm", addMin(release, 2));
    } else {
      ev(k.kitId, k.journeyId, "confirm", addMin(received, 2));
    }
  }

  return { travellers, journeys, plans, staff, clearances, events };
}

export const isBefore = (a: Naive, b: Naive) => toMin(a) < toMin(b);
