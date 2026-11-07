// Engine checks: run with `npm run check:engine`. Exits non-zero on the first failure.
import { buildSampleData } from "./fixtures";
import { deriveWorkspace, processInput, verifyChain, type EventInput, type JourneyInput, type TravellerInput } from "../src/lib/processing";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
  if (!ok) failures++;
};

const today = "2026-10-31";
const now = "2026-10-31T12:00";
const sample = buildSampleData(today);

// 1. Determinism: same input, same plan (apart from the timestamp) and same workspace.
const strip = (x: unknown) => JSON.stringify(x, (k, v) => (k === "computedAt" ? undefined : v));
const again = buildSampleData(today);
check("sample data is deterministic", strip(sample) === strip(again));
const ws1 = deriveWorkspace(sample, now);
const ws2 = deriveWorkspace(again, now);
check("workspace is deterministic", strip({ k: ws1.kits, e: ws1.exceptions, p: ws1.endpoints }) === strip({ k: ws2.kits, e: ws2.exceptions, p: ws2.endpoints }));
check("stored plans are not stale", ws1.stalePlanIds.length === 0, ws1.stalePlanIds.join(","));

// 2. Sample produces the expected structure.
check("5 journeys, kits planned", sample.journeys.length === 5 && ws1.kits.length > 20, `${ws1.kits.length} kits`);
check("every kit chain verifies", ws1.kits.every((k) => verifyChain(k.ledger).ok));
const kinds = new Set(ws1.exceptions.map((e) => e.kind));
for (const k of ["clearance", "seal", "missing-receipt", "late", "temperature", "substitution", "profile-changed"]) check(`exception fires: ${k}`, kinds.has(k as never));
check("no reaction, swab or unverified-production exception in sample", !kinds.has("reaction") && !kinds.has("swab") && !kinds.has("no-clearance"));
const byKind = (k: string) => ws1.exceptions.find((e) => e.kind === k)!;
check("seal exception closed by resolution event", byKind("seal").outcome === "Closed with recorded outcome");
check("temperature exception left open", byKind("temperature").outcome === "Open");
check("clearance exception resolved by later valid attempt", byKind("clearance").outcome === "Resolved");
check("missing receipt resolved by late entry", byKind("missing-receipt").outcome === "Resolved");
check("withdrawn kits", ws1.kits.filter((k) => k.status === "Withdrawn").length === 2, ws1.kits.filter((k) => k.status === "Withdrawn").map((k) => k.kitId).join(","));
check("on-hold kits (temp + profile changed)", ws1.kits.filter((k) => k.status === "On hold").length === 2);
for (const e of ws1.endpoints) console.log(`      ${e.name}: ${e.value} ${e.pass ? "pass" : "fail"} (${e.sampleLabel})`);

// 3. A brand-new account: one traveller, one journey, no events.
const t: TravellerInput = { id: "t1", label: "Me", allergens: ["sesame"], severity: "Severe", preference: "British", consentVersion: "1.2", consentAt: now, source: "user" };
const j: JourneyInput = {
  id: "j1", travellerId: "t1", label: "Trip", persons: 1, declinedWindowKeys: [], accountProduct: null, status: "draft", createdAt: "2026-11-01T09:00", source: "user",
  legs: [
    { id: "f1", kind: "flight", ref: "FL 1", from: "EDI", to: "LHR", depart: "2026-11-11T20:00", arrive: "2026-11-11T21:30", departsFromServiceArea: false },
    { id: "h1", kind: "hotel", name: "Hotel", location: "London", checkIn: "2026-11-11T22:30", checkOut: "2026-11-13T09:00" },
  ],
};
const empty = deriveWorkspace({ travellers: [], journeys: [], plans: [], staff: [], clearances: [], events: [] }, now);
check("empty workspace", empty.isEmpty && empty.kits.length === 0 && empty.endpoints.every((e) => !e.measured));
const p1 = processInput(j, t, "x");
check("new journey: set 2 for sesame", p1.setId === 2);
check("new journey: arrival + 2 breakfasts", p1.kits.map((k) => k.type).join(",") === "late_arrival,breakfast,breakfast");
const w1 = deriveWorkspace({ travellers: [t], journeys: [j], plans: [p1], staff: [], clearances: [], events: [] }, now);
check("new journey: kits planned, no exceptions", w1.kits.length === 3 && w1.exceptions.length === 0 && w1.kits.every((k) => k.status === "Planned"));

// 4. Editing primary data recalculates: a stored plan goes stale and the set changes.
const t2 = { ...t, allergens: ["sesame", "milk"] as TravellerInput["allergens"] };
const w2 = deriveWorkspace({ travellers: [t2], journeys: [j], plans: [p1], staff: [], clearances: [], events: [] }, now);
check("allergen edit marks the plan stale", w2.stalePlanIds.includes("j1"));
check("allergen edit moves kits to set 6", w2.kits.every((k) => k.setId === 6));

// 5. Real-time rule: dispatched but no receipt after the window closes.
const kit = w1.kits[0];
const dispatch: EventInput = { id: "e1", kitId: kit.kitId, journeyId: "j1", type: "dispatch", at: "2026-11-11T19:30", recordedAt: "2026-11-11T19:30", tempC: 3, sealPresented: null, releasedToTravellerId: null, resolves: null, actor: "Courier", note: "", source: "user" };
const before = deriveWorkspace({ travellers: [t], journeys: [j], plans: [p1], staff: [], clearances: [], events: [dispatch] }, "2026-11-11T20:00");
const afterDue = deriveWorkspace({ travellers: [t], journeys: [j], plans: [p1], staff: [], clearances: [], events: [dispatch] }, "2026-11-11T23:59");
check("missing receipt not raised before the deadline", !before.exceptions.some((e) => e.kind === "missing-receipt"));
check("missing receipt raised after the deadline", afterDue.exceptions.some((e) => e.kind === "missing-receipt" && e.outcome === "Open"));

check("dispatch before any clearance is flagged", afterDue.exceptions.some((e) => e.kind === "no-clearance"));

// 6. Deleting a journey removes its kits.
const w3 = deriveWorkspace({ travellers: [t], journeys: [], plans: [p1], staff: [], clearances: [], events: [dispatch] }, now);
check("deleted journey leaves no kits", w3.kits.length === 0);

console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
if (failures) process.exit(1);
