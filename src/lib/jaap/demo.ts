// SIMULATED DEMONSTRATION DATA.
// Every journey below is fictional. Itineraries are run through the real rule engine,
// scheduler and hash chain in this codebase; only the inputs and the physical events
// (times, temperatures, seal checks) are simulated. Nothing here is operational evidence.
import {
  latestRunDay,
  mapItinerary,
  matchExclusionSet,
  planHandovers,
  suggestProduct,
  type ExposureWindow,
  type HandoverBatch,
  type Leg,
  type TraceRow,
} from "./engine";
import {
  ALLERGENS,
  DISHES,
  PREFERENCES,
  PROGRAMME,
  RUN_CAPACITY_KE,
  RUN_ORDER,
  RULE_SET_VERSION,
  TEMP_RANGE,
  RECEIPT_GRACE_MIN,
  USE_BY_DAYS,
  productById,
  setById,
  type Allergen,
  type ExclusionSet,
  type Preference,
  type Product,
  type ProductId,
  type Role,
  type WindowType,
} from "./protocol";
import { sha256 } from "./sha256";
import { addDays, addMin, at, dateOf, dayOfWeek, diffMin, fmtTime, toMin, type Naive } from "./time";

export type Segment = "Business" | "Family" | "Corporate";

type JourneyDef = {
  id: string;
  label: string;
  segment: Segment;
  persona: string;
  featured: boolean;
  allergens: Allergen[];
  severity: string;
  preference: Preference;
  persons: number;
  legs: Leg[];
  declined?: Record<string, string>;
  product?: ProductId;
  account?: string;
};

export type JourneyWindow = ExposureWindow & { accepted: boolean; declineReason?: string; kitIds: string[] };

export type Journey = Omit<JourneyDef, "declined"> & {
  travellerKey: string;
  consentRef: string;
  bookedAt: Naive;
  set: ExclusionSet | null;
  setReason: string;
  windows: JourneyWindow[];
  trace: TraceRow[];
  batches: (HandoverBatch & { dispatchAt: Naive; receivedAt: Naive; courier: string; withinWindow: boolean; lateMin: number })[];
  productInfo: Product | null;
  kitIds: string[];
};

export type Run = {
  id: string;
  setId: number;
  date: string;
  slot: number;
  plannedStart: Naive;
  start: Naive;
  end: Naive;
  kitIds: string[];
  clearanceId: string;
};

export type Clearance = {
  id: string;
  runId: string;
  deepClean: boolean;
  attempts: { ts: Naive; actor: string; role: Role; accepted: boolean; note: string }[];
  acceptedAt: Naive;
  steps: string[];
  swabs: { id: string; surface: string; ts: Naive; detected: boolean; result: string }[];
  declarations: string[];
};

export type Movement = {
  id: string;
  kitId: string;
  kind: "transport" | "release";
  from: string;
  to: string;
  start: Naive;
  end: Naive;
  tempMax: number;
  inRange: boolean;
  recordedOnTime: boolean;
  sealOk?: boolean;
};

export type LedgerEntry = {
  seq: number;
  kitId: string;
  runId: string;
  sealNo: string;
  exclusionSet: string;
  actor: string;
  role: Role;
  location: string;
  ts: Naive;
  from: string;
  to: string;
  event: string;
  detail: string;
  data: Record<string, string | number | boolean>;
  corrects: number | null;
  prevHash: string;
  hash: string;
};

export type KitStatus = "Receipt confirmed" | "Withdrawn";

export type Kit = {
  id: string;
  journeyId: string;
  windowKey: string;
  person: number;
  type: WindowType;
  setId: number;
  dish: string;
  runId: string;
  sealNo: string;
  batchKey: string;
  useBy: string;
  status: KitStatus;
  exceptionIds: string[];
  movements: Movement[];
  ledger: LedgerEntry[];
};

export type ExceptionStep = { ts: Naive; action: string; role: Role; done: boolean };

export type ExceptionRecord = {
  id: string;
  type: string;
  title: string;
  outcome: "Resolved" | "Closed with recorded outcome" | "Open";
  stage: number;
  journeyId: string;
  kitIds: string[];
  runId?: string;
  trigger: string;
  detectedAt: Naive;
  alert: string;
  responsible: Role;
  steps: ExceptionStep[];
  result: string;
  endpoint: string;
  planRef: string;
};

// ---------------------------------------------------------------- helpers
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const seeded = (key: string) => mulberry32(parseInt(sha256(key).slice(0, 8), 16));
const between = (r: () => number, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
const pick = <T,>(r: () => number, xs: readonly T[]) => xs[Math.floor(r() * xs.length)];
const round1 = (x: number) => Math.round(x * 10) / 10;
const yymmdd = (d: string) => d.slice(2).replace(/-/g, "");

export const KITCHEN = "Partner kitchen, London (food hygiene rating 5)";
export const ACTORS: Record<string, { role: Role; label: string }> = {
  "SYS-JAAP": { role: "platform", label: "Platform rule engine and scheduler" },
  "ACT-CO-01": { role: "coordinator", label: "Journey coordinator" },
  "ACT-PS-01": { role: "supervisor", label: "Production supervisor (founder in year 1)" },
  "ACT-PK-02": { role: "kitchen", label: "Partner kitchen staff, clearance competency recorded" },
  "ACT-PK-03": { role: "kitchen", label: "Partner kitchen staff, no clearance competency recorded" },
  "ACT-CA-01": { role: "assurance", label: "Customer assurance (founder until hire)" },
  "ACT-FS-01": { role: "consultant", label: "Independent food safety consultant" },
  "ACT-CR-05": { role: "courier", label: "Named backup courier" },
};
const COURIERS = ["ACT-CR-01", "ACT-CR-02", "ACT-CR-03", "ACT-CR-04"];
for (const c of COURIERS) ACTORS[c] = { role: "courier", label: "Time-windowed courier" };

const HOTELS = [
  { code: "RVG", name: "Riverside Hotel, Greenwich", location: "Greenwich, London SE10" },
  { code: "TBC", name: "Thameside Business Hotel, Canary Wharf", location: "Canary Wharf, London E14" },
  { code: "BKS", name: "Bankside Hotel, Southwark", location: "Southwark, London SE1" },
  { code: "EXW", name: "ExCeL Waterfront Hotel, Royal Docks", location: "Royal Docks, London E16" },
  { code: "KXC", name: "King's Cross Central Hotel", location: "King's Cross, London N1" },
  { code: "LHA", name: "Airport Hotel, Heathrow", location: "Heathrow, London TW6" },
];
for (const h of HOTELS) ACTORS[`ACT-HT-${h.code}`] = { role: "hotel", label: `Front desk / duty manager, ${h.name}` };
const hotelActor = (name: string) => `ACT-HT-${HOTELS.find((h) => h.name === name)?.code ?? "XXX"}`;

const VENUES = [
  { title: "Client workshop", location: "Canary Wharf, London E14" },
  { title: "Board meeting", location: "City of London EC2" },
  { title: "Training day", location: "Westminster, London SW1" },
  { title: "Project review", location: "Shoreditch, London E1" },
];
const DOMESTIC = [
  ["EDI", 85],
  ["GLA", 90],
  ["ABZ", 95],
  ["BHD", 80],
  ["NCL", 70],
  ["INV", 100],
  ["JER", 60],
] as const;
const LONG_HAUL = [
  ["JFK", 470],
  ["DXB", 420],
  ["SIN", 790],
  ["DEL", 520],
  ["BOS", 435],
  ["YYZ", 490],
] as const;
const LONDON_AIRPORTS = ["LHR", "LGW", "LCY", "STN"];
const SEVERITIES = ["Severe", "Anaphylactic, auto-injector carried", "Moderate, diagnosed"];

// ---------------------------------------------------------------- featured journeys
const BUSINESS = "J-B01";
const FAMILY = "J-F01";
const CORP_A = "J-C01A";
const CORP_B = "J-C01B";
const CORP_C = "J-C01C";
const CORPORATE_ACCOUNT = "Demo employer account: 40 travelling staff, 3 with declared allergies";

const FEATURED: JourneyDef[] = [
  {
    id: BUSINESS,
    label: "Frequent business traveller: Edinburgh to London, three nights",
    segment: "Business",
    persona: "Business traveller with diagnosed peanut and sesame allergy (§3.7)",
    featured: true,
    allergens: ["peanut", "sesame"],
    severity: "Severe, auto-injector carried",
    preference: "South Asian",
    persons: 1,
    legs: [
      { id: "f1", kind: "flight", ref: "FL 1463", from: "EDI", to: "LHR", depart: "2027-04-21T20:15", arrive: "2027-04-21T21:40", departsFromServiceArea: false },
      { id: "h1", kind: "hotel", name: "Riverside Hotel, Greenwich", location: "Greenwich, London SE10", checkIn: "2027-04-21T22:50", checkOut: "2027-04-24T09:30" },
      { id: "m1", kind: "meeting", title: "Client workshop", location: "Canary Wharf, London E14", start: "2027-04-22T11:30", end: "2027-04-22T15:00", catered: false },
      { id: "m2", kind: "meeting", title: "Client project meeting", location: "Holborn, London WC1", start: "2027-04-23T12:00", end: "2027-04-23T14:00", catered: false },
      { id: "f2", kind: "flight", ref: "FL 1470", from: "LHR", to: "EDI", depart: "2027-04-24T12:05", arrive: "2027-04-24T13:25", departsFromServiceArea: true },
    ],
    declined: { "R3:m2:2027-04-23": "Removed by the traveller at confirmation: bringing their own food to this meeting." },
  },
  {
    id: FAMILY,
    label: "Family with an allergic child: Glasgow to London, four nights, then Dubai",
    segment: "Family",
    persona: "Seven-year-old with diagnosed milk and egg allergy, travelling with a parent (§3.7)",
    featured: true,
    allergens: ["milk", "egg"],
    severity: "Severe (child, age 7)",
    preference: "Middle Eastern",
    persons: 2,
    legs: [
      { id: "f1", kind: "flight", ref: "FL 2210", from: "GLA", to: "LCY", depart: "2027-04-21T19:55", arrive: "2027-04-21T21:30", departsFromServiceArea: false },
      { id: "h1", kind: "hotel", name: "Riverside Hotel, Greenwich", location: "Greenwich, London SE10", checkIn: "2027-04-21T22:20", checkOut: "2027-04-25T10:30" },
      { id: "m1", kind: "meeting", title: "Family museum day", location: "South Kensington, London SW7", start: "2027-04-23T10:30", end: "2027-04-23T15:00", catered: false },
      { id: "f2", kind: "flight", ref: "FL 0007", from: "LHR", to: "DXB", depart: "2027-04-25T14:20", arrive: "2027-04-25T21:20", departsFromServiceArea: true },
    ],
  },
  {
    id: CORP_A,
    label: "Corporate employee A: London conference, then New York",
    segment: "Corporate",
    persona: "Employee with coeliac disease (§3.7, employer profile)",
    featured: true,
    allergens: ["gluten"],
    severity: "Coeliac disease, diagnosed",
    preference: "British",
    persons: 1,
    product: "corporate",
    account: CORPORATE_ACCOUNT,
    legs: [
      { id: "h1", kind: "hotel", name: "ExCeL Waterfront Hotel, Royal Docks", location: "Royal Docks, London E16", checkIn: "2027-04-26T18:30", checkOut: "2027-04-28T08:00" },
      { id: "m1", kind: "meeting", title: "Industry conference, day 1", location: "Royal Docks, London E16", start: "2027-04-27T09:00", end: "2027-04-27T17:30", catered: false },
      { id: "m2", kind: "meeting", title: "Industry conference, day 2", location: "Royal Docks, London E16", start: "2027-04-28T09:00", end: "2027-04-28T13:00", catered: true },
      { id: "f1", kind: "flight", ref: "FL 0117", from: "LHR", to: "JFK", depart: "2027-04-28T18:30", arrive: "2027-04-29T02:20", departsFromServiceArea: true },
    ],
  },
  {
    id: CORP_B,
    label: "Corporate employee B: Aberdeen to London, two nights",
    segment: "Corporate",
    persona: "Employee with diagnosed fish and shellfish allergy",
    featured: true,
    allergens: ["fish", "crustacean", "mollusc"],
    severity: "Anaphylactic, auto-injector carried",
    preference: "East Asian",
    persons: 1,
    product: "corporate",
    account: CORPORATE_ACCOUNT,
    legs: [
      { id: "f1", kind: "flight", ref: "FL 1306", from: "ABZ", to: "LGW", depart: "2027-04-28T20:40", arrive: "2027-04-28T22:15", departsFromServiceArea: false },
      { id: "h1", kind: "hotel", name: "Thameside Business Hotel, Canary Wharf", location: "Canary Wharf, London E14", checkIn: "2027-04-28T23:40", checkOut: "2027-04-30T08:30" },
      { id: "m1", kind: "meeting", title: "Supplier negotiation", location: "Canary Wharf, London E14", start: "2027-04-29T11:00", end: "2027-04-29T14:30", catered: false },
      { id: "f2", kind: "flight", ref: "FL 1311", from: "LGW", to: "ABZ", depart: "2027-04-30T12:10", arrive: "2027-04-30T13:45", departsFromServiceArea: true },
    ],
  },
  {
    id: CORP_C,
    label: "Corporate employee C: London day visit",
    segment: "Corporate",
    persona: "Employee with diagnosed milk and peanut allergy",
    featured: true,
    allergens: ["milk", "peanut"],
    severity: "Severe, auto-injector carried",
    preference: "South Asian",
    persons: 1,
    product: "corporate",
    account: CORPORATE_ACCOUNT,
    legs: [{ id: "m1", kind: "meeting", title: "Client meeting", location: "King's Cross, London N1", start: "2027-04-29T12:00", end: "2027-04-29T14:00", catered: false }],
  },
];

// ---------------------------------------------------------------- simulated cohort
const SET_PROFILES: Record<number, Allergen[][]> = {
  1: [["peanut"], ["tree_nut"], ["peanut", "tree_nut"]],
  2: [["sesame"], ["peanut", "sesame"], ["tree_nut", "sesame"]],
  3: [["milk"], ["egg"], ["milk", "egg"]],
  4: [["gluten"]],
  5: [["fish"], ["crustacean", "mollusc"], ["fish", "crustacean"]],
  6: [["milk", "peanut"], ["gluten", "egg"], ["sesame", "fish"]],
};
const SET_WEIGHTS = [
  [1, 0.28],
  [2, 0.14],
  [3, 0.2],
  [4, 0.22],
  [5, 0.08],
  [6, 0.08],
] as const;
const REFUSED_PROFILES: Allergen[][] = [["soya"], ["peanut", "mustard"], ["celery"], ["milk", "lupin"]];

function cohortLegs(r: () => number, template: string, day: string): { legs: Leg[]; persons: number } {
  const hotel = pick(r, HOTELS.slice(0, 5));
  const [origin, dur] = pick(r, DOMESTIC);
  const arrive = addMin(at(day, "21:00"), between(r, 5, 140));
  const inbound: Leg = {
    id: "f1",
    kind: "flight",
    ref: `FL ${between(r, 1000, 2999)}`,
    from: origin,
    to: pick(r, LONDON_AIRPORTS),
    depart: addMin(arrive, -dur),
    arrive,
    departsFromServiceArea: false,
  };
  const checkIn = addMin(arrive, between(r, 50, 85));
  const stay = (nights: number, out: string): Leg => ({
    id: "h1",
    kind: "hotel",
    name: hotel.name,
    location: hotel.location,
    checkIn,
    checkOut: at(addDays(day, nights), out),
  });
  switch (template) {
    case "single":
      return { legs: [inbound, stay(1, `0${between(r, 5, 6)}:${pick(r, ["00", "15", "30"])}`)], persons: 1 };
    case "daily":
      return { legs: [inbound, stay(1, `0${between(r, 8, 9)}:${pick(r, ["00", "30"])}`)], persons: 1 };
    case "family":
      return { legs: [inbound, stay(2, "10:00")], persons: between(r, 2, 3) };
    case "outbound": {
      const [dest, lh] = pick(r, LONG_HAUL);
      const ah = HOTELS[5];
      const depart = at(addDays(day, 1), `${between(r, 13, 20)}:${pick(r, ["05", "35"])}`);
      return {
        legs: [
          { id: "h1", kind: "hotel", name: ah.name, location: ah.location, checkIn: at(day, "19:00"), checkOut: at(addDays(day, 1), "08:30") },
          { id: "f1", kind: "flight", ref: `FL ${between(r, 1, 999).toString().padStart(4, "0")}`, from: "LHR", to: dest, depart, arrive: addMin(depart, lh), departsFromServiceArea: true },
        ],
        persons: 1,
      };
    }
    default: {
      const venue = pick(r, VENUES);
      const d1 = addDays(day, 1);
      return {
        legs: [
          inbound,
          stay(2, "09:00"),
          { id: "m1", kind: "meeting", title: venue.title, location: venue.location, start: at(d1, "11:00"), end: at(d1, "15:00"), catered: false },
        ],
        persons: 1,
      };
    }
  }
}

function buildCohort(): JourneyDef[] {
  const r = mulberry32(2027);
  const defs: JourneyDef[] = [];
  const start = "2027-04-15";
  const span = diffMin(at(start, "00:00"), at("2027-06-01", "00:00")) / 1440;
  const templates = ["daily", "daily", "daily", "solo", "solo", "solo", "single", "single", "outbound", "outbound", "family"];
  let n = 0;
  while (defs.length < 62) {
    const template = pick(r, templates);
    const day = addDays(start, between(r, 0, span));
    const roll = r();
    let acc = 0;
    const setId = SET_WEIGHTS.find(([, w]) => (acc += w) >= roll)?.[0] ?? 1;
    const { legs, persons } = cohortLegs(r, template, day);
    // Keep every kit inside its use-by: retry dates that the run calendar cannot serve.
    const { windows } = mapItinerary(legs);
    const { batches, windows: annotated } = planHandovers(windows.filter((w) => w.servable), legs);
    const ok = annotated.every((w) => {
      const b = batches.find((x) => x.key === w.batchKey)!;
      return dateOf(w.occasionStart) <= addDays(latestRunDay(b.start), USE_BY_DAYS);
    });
    if (!ok || !windows.length) continue;
    n++;
    const subscription = template === "solo" && r() < 0.4;
    defs.push({
      id: `J-${String(n).padStart(4, "0")}`,
      label: { single: "Late arrival, early departure", daily: "Overnight business trip", solo: "Short business trip", outbound: "Overnight before a long-haul departure", family: "Family weekend" }[template] ?? "Trip",
      segment: template === "family" ? "Family" : "Business",
      persona: "Simulated cohort traveller",
      featured: false,
      allergens: pick(r, SET_PROFILES[setId]),
      severity: pick(r, SEVERITIES),
      preference: pick(r, PREFERENCES),
      persons,
      legs,
      product: subscription ? "subscription" : undefined,
    });
  }
  // Fixed cohort journey: a Set 3 run on Wed 28 Apr, the run EXC-01 tries to misuse.
  defs.push({
    id: "J-0063",
    label: "Overnight business trip",
    segment: "Business",
    persona: "Simulated cohort traveller",
    featured: false,
    allergens: ["milk", "egg"],
    severity: "Severe",
    preference: "British",
    persons: 1,
    legs: [
      { id: "f1", kind: "flight", ref: "FL 2286", from: "NCL", to: "LHR", depart: "2027-04-28T20:10", arrive: "2027-04-28T21:20", departsFromServiceArea: false },
      { id: "h1", kind: "hotel", name: "Bankside Hotel, Southwark", location: "Southwark, London SE1", checkIn: "2027-04-28T22:30", checkOut: "2027-04-29T08:45" },
    ],
  });
  REFUSED_PROFILES.forEach((allergens, i) => {
    const day = addDays(start, 7 + i * 9);
    defs.push({
      id: `J-R${i + 1}`,
      label: "Intake refused: profile outside published exclusion sets",
      segment: "Business",
      persona: "Simulated cohort traveller",
      featured: false,
      allergens,
      severity: "Severe",
      preference: "British",
      persons: 1,
      legs: cohortLegs(mulberry32(i + 99), "daily", day).legs,
    });
  });
  return defs;
}

// ---------------------------------------------------------------- pipeline
function build() {
  const defs = [...FEATURED, ...buildCohort()];
  const journeys: Journey[] = [];
  type Draft = { journeyId: string; w: JourneyWindow; person: number; setId: number; runDate: string; dish: string };
  const drafts: Draft[] = [];

  for (const def of defs) {
    const match = matchExclusionSet(def.allergens);
    const { windows, trace } = mapItinerary(def.legs);
    const marked: JourneyWindow[] = windows.map((w) => {
      const declineReason = def.declined?.[w.key] ?? (!w.servable ? "Departure airport outside the UK service area." : undefined);
      return { ...w, accepted: !!match.set && !declineReason, declineReason, kitIds: [] };
    });
    const { batches, windows: annotated } = planHandovers(marked.filter((w) => w.accepted), def.legs, `${def.id}-H`);
    const final = marked.map((w) => ({ ...w, ...(annotated.find((a) => a.key === w.key) ?? {}) }));
    const r = seeded(def.id);
    const firstBatch = batches[0]?.start ?? final[0]?.occasionStart ?? at(PROGRAMME.firstRunDate, "09:00");
    const bookedAt = at(addDays(latestRunDay(firstBatch), -between(r, 4, 9)), `${between(r, 9, 16)}:${pick(r, ["05", "20", "40", "55"])}`);
    const productInfo = def.product
      ? productById(def.product)
      : suggestProduct(final.filter((w) => w.accepted), def.persons, batches.length).product;
    const { declined: _d, ...rest } = def;

    const timedBatches = batches.map((b) => {
      const br = seeded(b.key);
      const len = diffMin(b.start, b.end);
      const receivedAt = addMin(b.start, between(br, 8, Math.max(10, len - 12)));
      return {
        ...b,
        receivedAt,
        dispatchAt: addMin(receivedAt, -between(br, 40, 75)),
        courier: pick(br, COURIERS),
        withinWindow: true,
        lateMin: 0,
      };
    });

    journeys.push({
      ...rest,
      travellerKey: `TRV-${sha256(`traveller:${def.id}`).slice(0, 6).toUpperCase()}`,
      consentRef: `CNS-${sha256(`consent:${def.id}`).slice(0, 6).toUpperCase()} (explicit consent v1.2)`,
      bookedAt,
      set: match.set,
      setReason: match.reason,
      windows: final,
      trace,
      batches: timedBatches,
      productInfo,
      kitIds: [],
    });

    if (!match.set) continue;
    for (const w of final.filter((x) => x.accepted)) {
      for (let p = 1; p <= def.persons; p++) {
        drafts.push({
          journeyId: def.id,
          w,
          person: p,
          setId: match.set.id,
          runDate: latestRunDay(w.handoverStart!),
          dish: DISHES[def.preference][w.type],
        });
      }
    }
  }

  // Featured physical-event overrides that drive the exception scenarios.
  const jById = (id: string) => journeys.find((j) => j.id === id)!;
  const batchFor = (jid: string, windowKey: string) => {
    const j = jById(jid);
    return j.batches.find((b) => b.windowKeys.includes(windowKey))!;
  };
  // EXC-04: courier hands over inside the window, but no receipt entry is made.
  const b4 = batchFor(BUSINESS, "R1:f1:2027-04-21");
  b4.receivedAt = "2027-04-21T20:58";
  b4.dispatchAt = "2027-04-21T19:55";
  // EXC-05: museum lunch arrives 27 minutes after the window closes.
  const b5 = batchFor(FAMILY, "R3:m1:2027-04-23");
  b5.receivedAt = addMin(b5.end, 27);
  b5.dispatchAt = addMin(b5.end, -75);
  for (const j of journeys)
    for (const b of j.batches) {
      b.lateMin = Math.max(0, diffMin(b.end, b.receivedAt));
      b.withinWindow = toMin(b.receivedAt) >= toMin(b.start) && b.lateMin === 0;
    }

  // ------------------------------------------------ scheduling (P1, P2)
  const groups = new Map<string, Draft[]>();
  for (const d of drafts) {
    const k = `${d.runDate}|${d.setId}`;
    groups.set(k, [...(groups.get(k) ?? []), d]);
  }
  const runKeys = [...groups.keys()].sort((a, b) => {
    const [da, sa] = a.split("|");
    const [db, sb] = b.split("|");
    return da.localeCompare(db) || RUN_ORDER.indexOf(+sa) - RUN_ORDER.indexOf(+sb);
  });
  const runs: Run[] = [];
  const clearances: Clearance[] = [];
  const kits: Kit[] = [];
  const slotByDate = new Map<string, number>();
  let kitN = 0;
  for (const key of runKeys) {
    const [date, setStr] = key.split("|");
    const setId = +setStr;
    const all = groups.get(key)!.sort(
      (a, b) => a.journeyId.localeCompare(b.journeyId) || toMin(a.w.occasionStart) - toMin(b.w.occasionStart) || a.person - b.person,
    );
    for (let part = 0; part * RUN_CAPACITY_KE < all.length; part++) {
      const members = all.slice(part * RUN_CAPACITY_KE, (part + 1) * RUN_CAPACITY_KE);
      const slot = slotByDate.get(date) ?? 0;
      slotByDate.set(date, slot + 1);
      const clearStart = addMin(at(date, "06:30"), slot * 100);
      const id = `RUN-${yymmdd(date)}-S${setId}${part ? `-${part + 1}` : ""}`;
      const clrId = `CLR-${yymmdd(date)}-${slot + 1}`;
      const cr = seeded(clrId);
      const acceptedAt = addMin(clearStart, between(cr, 22, 28));
      clearances.push({
        id: clrId,
        runId: id,
        deepClean: slot === 0,
        attempts: [{ ts: acceptedAt, actor: "ACT-PS-01", role: "supervisor", accepted: true, note: "Checklist complete; swabs below method limit; signed by named signatory." }],
        acceptedAt,
        steps: [
          slot === 0 ? "Deep clean after goods-in (first run of the day)" : "Full line clearance and documented clean between exclusion sets",
          `Colour-controlled utensils, boards, containers and thermal boxes for ${setById(setId).code}`,
          "Verification swabs at defined contact points",
          "Goods-in declarations checked against batch",
          "Named signatory with recorded competency signs clearance",
        ],
        swabs: ["Preparation bench", "Utensils and boards", "Sealing station"].map((surface, i) => ({
          id: `SWB-${yymmdd(date)}-${slot + 1}${String.fromCharCode(65 + i)}`,
          surface,
          ts: addMin(clearStart, 8 + i * 4),
          detected: false,
          result: "Below method limit (not detected)",
        })),
        declarations: [`DEC-A-${yymmdd(date)}-${setId}`, `DEC-B-${yymmdd(date)}-${setId}`],
      });
      const run: Run = {
        id,
        setId,
        date,
        slot,
        plannedStart: addMin(clearStart, 30),
        start: addMin(clearStart, 30),
        end: addMin(clearStart, 95),
        kitIds: [],
        clearanceId: clrId,
      };
      runs.push(run);
      for (const m of members) {
        kitN++;
        const kit: Kit = {
          id: `KIT-${String(kitN).padStart(4, "0")}`,
          journeyId: m.journeyId,
          windowKey: m.w.key,
          person: m.person,
          type: m.w.type,
          setId,
          dish: m.dish,
          runId: id,
          sealNo: `TS-${104200 + kitN}`,
          batchKey: m.w.batchKey!,
          useBy: addDays(date, USE_BY_DAYS),
          status: "Receipt confirmed",
          exceptionIds: [],
          movements: [],
          ledger: [],
        };
        run.kitIds.push(kit.id);
        kits.push(kit);
        const j = jById(m.journeyId);
        j.kitIds.push(kit.id);
        j.windows.find((w) => w.key === m.w.key)!.kitIds.push(kit.id);
      }
    }
  }

  const kitAt = (jid: string, windowKey: string, person = 1) =>
    kits.find((k) => k.journeyId === jid && k.windowKey === windowKey && k.person === person)!;
  const runById = (id: string) => runs.find((r) => r.id === id)!;
  const clrById = (id: string) => clearances.find((c) => c.id === id)!;

  // ------------------------------------------------ exception scenarios
  const exc: ExceptionRecord[] = [];
  const tag = (k: Kit, id: string) => k.exceptionIds.push(id);

  // EXC-01 incorrect exclusion set
  const k1 = kitAt(CORP_C, "R3:m1:2027-04-29");
  const wrongRun = runs.find((r) => r.date === runById(k1.runId).date && r.setId === 3)!;
  const e1At = "2027-04-26T14:20";
  tag(k1, "EXC-01");

  // EXC-02 failed clearance on the Set 4 run that produces employee A's kits
  const k2 = kitAt(CORP_A, "R2:h1:2027-04-27");
  const run2 = runById(k2.runId);
  const clr2 = clrById(run2.clearanceId);
  const rejectAt = addMin(run2.plannedStart, -20);
  const reAccept = addMin(run2.plannedStart, 22);
  clr2.attempts = [
    { ts: rejectAt, actor: "ACT-PK-03", role: "kitchen", accepted: false, note: "Signature rejected: no recorded competency to sign a clearance (§13.8). Utensil colour-control check not completed." },
    { ts: reAccept, actor: "ACT-PS-01", role: "supervisor", accepted: true, note: "Line re-inspected, colour-control check completed, swabs retaken and below method limit; clearance signed." },
  ];
  clr2.acceptedAt = reAccept;
  clr2.swabs = clr2.swabs.map((s, i) => ({ ...s, ts: addMin(rejectAt, 25 + i * 4) }));
  run2.start = addMin(reAccept, 8);
  run2.end = addMin(run2.start, 65);
  for (const id of run2.kitIds) tag(kits.find((k) => k.id === id)!, "EXC-02");

  // EXC-03 seal mismatch
  const k3 = kitAt(CORP_A, "R2:h1:2027-04-27");
  tag(k3, "EXC-03");
  const presentedSeal = "TS-099871";

  // EXC-04 missing handover confirmation (business hotel batch)
  const k4s = kits.filter((k) => k.journeyId === BUSINESS && k.batchKey === b4.key);
  k4s.forEach((k) => tag(k, "EXC-04"));
  const e4Alert = addMin(b4.end, RECEIPT_GRACE_MIN);
  const e4Late = addMin(e4Alert, 11);

  // EXC-05 late delivery (family museum lunch)
  const k5s = kits.filter((k) => k.journeyId === FAMILY && k.batchKey === b5.key);
  k5s.forEach((k) => tag(k, "EXC-05"));
  const e5Report = addMin(b5.end, -22);

  // EXC-06 temperature breach (employee B lunch)
  const k6 = kitAt(CORP_B, "R3:m1:2027-04-29");
  tag(k6, "EXC-06");

  // EXC-07 unauthorised substitution at hotel release
  const k7 = kitAt(FAMILY, "R2:h1:2027-04-23", 1);
  const k7ok = kitAt(BUSINESS, "R2:h1:2027-04-23");
  tag(k7, "EXC-07");
  tag(k7ok, "EXC-07");
  const e7Release = "2027-04-23T07:12";

  // ------------------------------------------------ movements and ledger per kit
  for (const kit of kits) {
    const j = jById(kit.journeyId);
    const set = setById(kit.setId);
    const run = runById(kit.runId);
    const clr = clrById(run.clearanceId);
    const w = j.windows.find((x) => x.key === kit.windowKey)!;
    const b = j.batches.find((x) => x.key === kit.batchKey)!;
    const r = seeded(kit.id);
    const traveller = j.travellerKey;
    const receiver = b.receiver === "hotel" ? hotelActor(b.place) : traveller;
    const receiverRole: Role = b.receiver === "hotel" ? "hotel" : "traveller";
    const entries: Omit<LedgerEntry, "seq" | "prevHash" | "hash" | "kitId" | "runId" | "sealNo" | "exclusionSet">[] = [];
    const add = (e: Partial<(typeof entries)[number]> & Pick<(typeof entries)[number], "actor" | "ts" | "from" | "to" | "event" | "detail">) => {
      entries.push({ role: ACTORS[e.actor]?.role ?? "traveller", location: KITCHEN, data: {}, corrects: null, ...e } as (typeof entries)[number]);
      return entries.length - 1;
    };
    const dispatchTemp = round1(1.8 + r() * 2.2);
    const recvTemp = round1(2.6 + r() * 2.0);
    const tempMax = round1(Math.max(recvTemp, dispatchTemp) + r() * 0.3);

    add({
      actor: "ACT-CO-01",
      ts: j.bookedAt,
      location: "Platform",
      from: "—",
      to: "planned",
      event: "Exposure window confirmed",
      detail: `${w.ruleId} ${w.reason}`,
      data: { window: w.key, rule: w.ruleId, ruleSet: RULE_SET_VERSION, occasion: w.occasionStart },
    });

    const monday = addDays(run.date, 1 - dayOfWeek(run.date));
    let assignAt = at(monday, "12:00");
    if (toMin(assignAt) <= toMin(j.bookedAt)) assignAt = addMin(j.bookedAt, 30);
    let fromState = "planned";
    let corrects: number | null = null;
    if (kit.exceptionIds.includes("EXC-01")) {
      corrects = add({
        actor: "ACT-CO-01",
        ts: e1At,
        location: "Platform",
        from: "planned",
        to: "held",
        event: "Run assignment rejected",
        detail: `Manual assignment to ${wrongRun.id} (Set 3: milk, egg) rejected by the scheduler: peanut is in the profile and is not excluded by Set 3. Kit held before production.`,
        data: { attemptedRun: wrongRun.id, exception: "EXC-01" },
      });
      add({ actor: "SYS-JAAP", ts: addMin(e1At, 1), location: "Platform", from: "held", to: "held", event: "Exception raised", detail: "EXC-01 opened; coordinator and production supervisor alerted.", data: { exception: "EXC-01" } });
      assignAt = addMin(e1At, 4);
      fromState = "held";
    }
    const pos = run.kitIds.indexOf(kit.id) + 1;
    add({
      actor: "SYS-JAAP",
      ts: assignAt,
      location: "Platform",
      from: fromState,
      to: "scheduled",
      event: "Assigned to production run",
      detail: `Assigned to ${run.id} (${set.code}); ${pos} of ${run.kitIds.length} kit-equivalents, capacity ${RUN_CAPACITY_KE}.${corrects !== null ? " Corrects the rejected assignment (EXC-01)." : ""}`,
      data: { run: run.id, set: set.code },
      corrects,
    });
    if (kit.exceptionIds.includes("EXC-01"))
      add({ actor: "ACT-CO-01", ts: addMin(assignAt, 6), location: "Platform", from: "scheduled", to: "scheduled", event: "Exception closed", detail: "EXC-01 closed: wrong-set assignment blocked before production; kit reassigned to a covering Set 6 run.", data: { exception: "EXC-01" } });

    if (kit.exceptionIds.includes("EXC-02")) {
      const h = add({ actor: "SYS-JAAP", ts: rejectAt, from: "scheduled", to: "held", event: "Run held: clearance not accepted", detail: `${run.id} blocked. Clearance ${clr.id} signature by ACT-PK-03 rejected: no recorded clearance competency.`, data: { exception: "EXC-02", clearance: clr.id } });
      add({ actor: "ACT-PS-01", ts: reAccept, from: "held", to: "scheduled", event: "Hold released", detail: `Clearance ${clr.id} re-inspected, swabbed and signed by the production supervisor. Run released ${diffMin(run.plannedStart, run.start)} minutes late.`, data: { exception: "EXC-02" }, corrects: h });
    }

    add({
      actor: "ACT-PS-01",
      ts: run.end,
      from: "scheduled",
      to: "produced",
      event: "Produced in single-allergen run",
      detail: `${kit.dish}. Produced in ${run.id} after clearance ${clr.id}.`,
      data: { clearance: clr.id, swabs: `${clr.swabs.length} of ${clr.swabs.length} below method limit`, declarations: clr.declarations.join(", ") },
    });
    add({
      actor: "ACT-PK-02",
      ts: addMin(run.end, 8),
      from: "produced",
      to: "sealed",
      event: "Sealed and labelled",
      detail: `Tamper-evident seal ${kit.sealNo} bound to ${run.id} and ${kit.id}. Label carries the full ingredient list with allergens emphasised.`,
      data: { seal: kit.sealNo, useBy: kit.useBy },
    });
    add({
      actor: b.courier,
      ts: b.dispatchAt,
      from: "sealed",
      to: "in transit",
      event: "Dispatched to courier",
      detail: `Collected for ${b.place}; declared window ${fmtTime(b.start)}–${fmtTime(b.end)}.`,
      data: { tempC: dispatchTemp, destination: b.place },
    });

    let transportTempMax = tempMax;
    let sealOk = true;
    let recordedOnTime = true;

    if (kit.exceptionIds.includes("EXC-05")) {
      add({
        actor: b.courier,
        ts: e5Report,
        location: "In transit",
        from: "in transit",
        to: "in transit",
        event: "Courier delay reported",
        detail: `Traffic delay; ETA ${fmtTime(b.receivedAt)}, outside the declared window. Named backup courier ACT-CR-05 instructed; coordinator informed the traveller.`,
        data: { exception: "EXC-05" },
      });
    }

    const windowNote = b.lateMin ? `outside by ${b.lateMin} min` : "inside";
    if (kit.exceptionIds.includes("EXC-04")) {
      const miss = add({
        actor: "SYS-JAAP",
        ts: e4Alert,
        location: "Platform",
        from: "in transit",
        to: "unconfirmed",
        event: "Handover confirmation missing",
        detail: `No receipt entry ${RECEIPT_GRACE_MIN} minutes after the declared window closed at ${fmtTime(b.end)}. Coordinator alerted; kit not yet in a confirmed custody state.`,
        data: { exception: "EXC-04" },
      });
      recordedOnTime = false;
      add({
        actor: receiver,
        ts: e4Late,
        location: b.place,
        from: "unconfirmed",
        to: "received",
        event: "Receipt recorded (late entry)",
        detail: `Duty manager confirms physical receipt at ${fmtTime(b.receivedAt)} against courier proof of delivery. Seal intact and matches run record.`,
        data: { lateEntry: true, physicalReceipt: b.receivedAt, sealCheck: "Intact, matches run record", tempC: recvTemp, window: windowNote },
        corrects: miss,
      });
    } else if (kit.exceptionIds.includes("EXC-03")) {
      sealOk = false;
      add({
        actor: receiver,
        ts: b.receivedAt,
        location: b.place,
        from: "in transit",
        to: "held",
        event: "Seal mismatch at acceptance",
        detail: `Presented seal ${presentedSeal} does not match ${kit.sealNo}, the seal bound to this kit in the run record. Kit quarantined at the front desk, not released.`,
        data: { sealCheck: "MISMATCH", presentedSeal, tempC: recvTemp, window: windowNote, exception: "EXC-03" },
      });
      add({ actor: "SYS-JAAP", ts: addMin(b.receivedAt, 1), location: "Platform", from: "held", to: "held", event: "Exception raised", detail: "EXC-03 opened; customer assurance alerted.", data: { exception: "EXC-03" } });
      add({
        actor: "ACT-CA-01",
        ts: addMin(b.receivedAt, 24),
        location: b.place,
        from: "held",
        to: "withdrawn",
        event: "Kit withdrawn",
        detail: "Seal cannot be reconciled with the run record. Traveller and employer notified before the meal occasion; 1 kit-equivalent credited to the corporate block.",
        data: { exception: "EXC-03" },
      });
      kit.status = "Withdrawn";
    } else if (kit.exceptionIds.includes("EXC-06")) {
      transportTempMax = 8.3;
      add({
        actor: receiver,
        ts: b.receivedAt,
        location: b.place,
        from: "in transit",
        to: "held",
        event: "Temperature excursion at acceptance",
        detail: `Courier logger peaked at 8.3 °C for 46 minutes; 7.6 °C at acceptance. Declared range ${TEMP_RANGE.min}–${TEMP_RANGE.max} °C. Kit held, not eaten.`,
        data: { tempC: 7.6, transitPeakC: 8.3, sealCheck: "Intact, matches run record", window: windowNote, exception: "EXC-06" },
      });
      add({ actor: "SYS-JAAP", ts: addMin(b.receivedAt, 1), location: "Platform", from: "held", to: "held", event: "Exception raised", detail: "EXC-06 opened; customer assurance alerted.", data: { exception: "EXC-06" } });
      add({
        actor: "ACT-CA-01",
        ts: addMin(b.receivedAt, 12),
        location: b.place,
        from: "held",
        to: "withdrawn",
        event: "Kit withdrawn",
        detail: "Withdrawn. Traveller notified before lunch; 1 kit-equivalent credited to the corporate block. Courier thermal-box investigation open.",
        data: { exception: "EXC-06" },
      });
      kit.status = "Withdrawn";
    } else {
      add({
        actor: receiver,
        ts: b.receivedAt,
        location: b.place,
        from: "in transit",
        to: "received",
        event: receiverRole === "hotel" ? "Received by hotel front desk" : "Received by traveller",
        detail: `Seal ${kit.sealNo} intact and matches run record. Handover ${windowNote} the declared window.`,
        data: { sealCheck: "Intact, matches run record", tempC: recvTemp, window: windowNote, ...(b.lateMin ? { exception: "EXC-05" } : {}) },
      });
    }

    kit.movements.push({
      id: `${kit.id}-M1`,
      kitId: kit.id,
      kind: "transport",
      from: KITCHEN,
      to: b.place,
      start: b.dispatchAt,
      end: b.receivedAt,
      tempMax: transportTempMax,
      inRange: transportTempMax <= TEMP_RANGE.max && dispatchTemp >= TEMP_RANGE.min,
      recordedOnTime,
      sealOk,
    });

    if (kit.status !== "Withdrawn") {
      if (receiverRole === "hotel") {
        const hotelLeg = j.legs.find((l) => l.id === w.hotelLegId) as Extract<Leg, { kind: "hotel" }>;
        const storedAt = addMin(kit.exceptionIds.includes("EXC-04") ? e4Late : b.receivedAt, 4);
        add({
          actor: receiver,
          ts: storedAt,
          location: b.place,
          from: "received",
          to: "stored",
          event: kit.type === "late_arrival" ? "Held at front desk" : "Stored in hotel refrigerator",
          detail: kit.type === "late_arrival" ? "Held at the front desk for the traveller's check-in." : `Held in the hotel refrigerator under written storage acceptance HSA-${b.place.slice(0, 3).toUpperCase()}-01.`,
          data: { tempC: round1(recvTemp - 0.4) },
        });
        let releaseAt =
          kit.type === "late_arrival" ? hotelLeg.checkIn : at(dateOf(w.occasionStart), `0${between(r, 6, 8)}:${String(between(r, 40, 59)).padStart(2, "0")}`);
        const releaseTemp = round1(3 + r() * 1.4);
        if (kit.id === k7.id) {
          add({ actor: receiver, ts: e7Release, location: b.place, from: "stored", to: "released", event: "Released to traveller", detail: `Released by the front desk to ${jById(BUSINESS).travellerKey}, who is not this kit's traveller.`, data: { releasedTo: jById(BUSINESS).travellerKey, exception: "EXC-07" } });
          add({ actor: jById(BUSINESS).travellerKey, ts: addMin(e7Release, 2), location: b.place, from: "released", to: "held", event: "Receipt scan rejected", detail: "Kit exclusion set Set 3 does not cover the scanning traveller's profile (peanut, sesame). DO NOT CONSUME shown; front desk alerted.", data: { exception: "EXC-07", profileMatch: false } });
          add({ actor: receiver, ts: addMin(e7Release, 8), location: b.place, from: "held", to: "held", event: "Returned to quarantine", detail: "Kit returned unopened; seal intact. Quarantined pending customer assurance decision.", data: { exception: "EXC-07" } });
          add({ actor: "ACT-CA-01", ts: addMin(e7Release, 23), location: b.place, from: "held", to: "withdrawn", event: "Kit withdrawn (precautionary)", detail: "Kit left controlled custody. Family notified at 07:40; replacement not possible inside the breakfast window; 1 kit-equivalent credited.", data: { exception: "EXC-07" } });
          kit.status = "Withdrawn";
          kit.movements.push({ id: `${kit.id}-M2`, kitId: kit.id, kind: "release", from: "Hotel storage", to: jById(BUSINESS).travellerKey, start: e7Release, end: addMin(e7Release, 2), tempMax: releaseTemp, inRange: true, recordedOnTime: true });
          continue_ledger(kit, entries);
          continue;
        }
        if (kit.id === k7ok.id) releaseAt = addMin(e7Release, 12);
        add({
          actor: receiver,
          ts: releaseAt,
          location: b.place,
          from: "stored",
          to: "released",
          event: "Released to traveller",
          detail: kit.id === k7ok.id ? "Released after the EXC-07 correction; kit ID and seal checked against the traveller before release." : `Released to ${traveller}.`,
          data: kit.id === k7ok.id ? { exception: "EXC-07" } : {},
        });
        add({ actor: traveller, ts: addMin(releaseAt, 2), location: b.place, from: "released", to: "receipt confirmed", event: "Receipt confirmed by traveller", detail: `Traveller scanned the kit; ${set.code} covers the profile.`, data: { profileMatch: true, tempC: releaseTemp } });
        kit.movements.push({ id: `${kit.id}-M2`, kitId: kit.id, kind: "release", from: "Hotel storage", to: traveller, start: releaseAt, end: addMin(releaseAt, 2), tempMax: releaseTemp, inRange: releaseTemp <= TEMP_RANGE.max, recordedOnTime: true });
      } else {
        add({ actor: traveller, ts: addMin(b.receivedAt, 2), location: b.place, from: "received", to: "receipt confirmed", event: "Receipt confirmed by traveller", detail: `Traveller scanned the kit; ${set.code} covers the profile.${b.lateMin ? " Accepted despite late delivery." : ""}`, data: { profileMatch: true } });
      }
    }
    continue_ledger(kit, entries);
  }

  function continue_ledger(kit: Kit, entries: Omit<LedgerEntry, "seq" | "prevHash" | "hash" | "kitId" | "runId" | "sealNo" | "exclusionSet">[]) {
    const set = setById(kit.setId);
    kit.ledger = chain(
      entries.map((e, seq) => ({ seq, kitId: kit.id, runId: kit.runId, sealNo: kit.sealNo, exclusionSet: set.code, ...e })),
    );
  }

  // ------------------------------------------------ exception records
  const bJ = jById(BUSINESS);
  exc.push(
    {
      id: "EXC-01",
      type: "Incorrect allergen-exclusion set",
      title: "Kit manually assigned to a run that does not cover the profile",
      outcome: "Resolved",
      stage: 4,
      journeyId: CORP_C,
      kitIds: [k1.id],
      runId: wrongRun.id,
      trigger: `The coordinator moved ${k1.id} (profile: milk, peanut) into ${wrongRun.id} (Set 3: milk, egg) to use spare capacity. The scheduler checks that the run's exclusion set covers the profile; peanut is not excluded by Set 3.`,
      detectedAt: e1At,
      alert: "Assignment rejected; kit placed on HOLD before production. No kit is produced under the wrong set.",
      responsible: "coordinator",
      steps: [
        { ts: e1At, action: `Scheduler rejects the manual assignment to ${wrongRun.id} and holds the kit`, role: "platform", done: true },
        { ts: addMin(e1At, 1), action: "EXC-01 raised; coordinator and production supervisor alerted", role: "platform", done: true },
        { ts: addMin(e1At, 4), action: `Kit reassigned to ${k1.runId} (Set 6, combined restrictive set), first run of the day`, role: "platform", done: true },
        { ts: addMin(e1At, 10), action: "Exception closed with outcome recorded; correction entry references the rejected entry", role: "coordinator", done: true },
      ],
      result: "Prevented before production. The rejected assignment stays visible in the chain next to the correction.",
      endpoint: "Prevented control: no endpoint affected.",
      planRef: "§4.2, §4.7, §5.3",
    },
    {
      id: "EXC-02",
      type: "Failed production clearance check",
      title: "Clearance signed by a person without recorded competency",
      outcome: "Resolved",
      stage: 5,
      journeyId: CORP_A,
      kitIds: [...run2.kitIds],
      runId: run2.id,
      trigger: `Partner kitchen staff ACT-PK-03 tried to sign clearance ${clr2.id} for ${run2.id}. The competency register holds no clearance sign-off for this person, and the utensil colour-control step was incomplete.`,
      detectedAt: rejectAt,
      alert: `Clearance rejected; ${run2.id} BLOCKED. All ${run2.kitIds.length} kits in the run placed on hold.`,
      responsible: "supervisor",
      steps: [
        { ts: rejectAt, action: "System refuses the signature and blocks the run from starting", role: "platform", done: true },
        { ts: addMin(rejectAt, 5), action: "Production supervisor re-inspects the line and completes the colour-control check", role: "supervisor", done: true },
        { ts: addMin(rejectAt, 25), action: "Verification swabs retaken at three contact points: all below method limit", role: "supervisor", done: true },
        { ts: reAccept, action: "Clearance signed by a competent signatory; hold released on every kit in the run", role: "supervisor", done: true },
        { ts: addMin(reAccept, 30), action: "Retraining for ACT-PK-03 scheduled before any future clearance signature", role: "supervisor", done: true },
      ],
      result: `Run started ${diffMin(run2.plannedStart, run2.start)} minutes late. Both clearance attempts stay in the record.`,
      endpoint: "Clearance control: 1 rejected attempt. Segregation endpoint unaffected (no swab detection).",
      planRef: "§4.2, §13.8",
    },
    {
      id: "EXC-03",
      type: "Broken or mismatched security seal",
      title: "Seal number at acceptance does not match the run record",
      outcome: "Closed with recorded outcome",
      stage: 7,
      journeyId: CORP_A,
      kitIds: [k3.id],
      runId: k3.runId,
      trigger: `At acceptance, the ExCeL Waterfront Hotel front desk scanned seal ${presentedSeal} on ${k3.id}. The run record binds ${k3.sealNo} to this kit, and ${presentedSeal} is not issued to any run.`,
      detectedAt: jById(CORP_A).batches.find((x) => x.key === k3.batchKey)!.receivedAt,
      alert: "Kit QUARANTINED at the front desk; release to the traveller blocked.",
      responsible: "assurance",
      steps: [
        { ts: jById(CORP_A).batches.find((x) => x.key === k3.batchKey)!.receivedAt, action: "Front desk records the mismatch; kit quarantined", role: "hotel", done: true },
        { ts: addMin(jById(CORP_A).batches.find((x) => x.key === k3.batchKey)!.receivedAt, 1), action: "EXC-03 raised; customer assurance alerted", role: "platform", done: true },
        { ts: addMin(jById(CORP_A).batches.find((x) => x.key === k3.batchKey)!.receivedAt, 24), action: "Kit withdrawn; traveller and employer notified before the breakfast occasion; 1 KE credited", role: "assurance", done: true },
        { ts: addMin(jById(CORP_A).batches.find((x) => x.key === k3.batchKey)!.receivedAt, 900), action: "Root cause: seal reel issued out of sequence at the sealing station; sealing step changed to scan-verify each seal against the kit", role: "supervisor", done: true },
      ],
      result: "Kit withdrawn and never eaten. Other kits in the batch were accepted with matching seals.",
      endpoint: "Seal integrity at acceptance: counted as 1 failure.",
      planRef: "§4.2 item 6, §13.7",
    },
    {
      id: "EXC-04",
      type: "Missing courier or hotel handover confirmation",
      title: "Hotel batch handed over, but no receipt entry made",
      outcome: "Resolved",
      stage: 7,
      journeyId: BUSINESS,
      kitIds: k4s.map((k) => k.id),
      runId: k4s[0].runId,
      trigger: `The courier handed ${k4s.length} kits to the Riverside Hotel front desk at ${fmtTime(b4.receivedAt)}, inside the window. Nobody recorded the receipt. The platform checks every handover for a receipt entry ${RECEIPT_GRACE_MIN} minutes after the window closes.`,
      detectedAt: e4Alert,
      alert: `Chain INCOMPLETE alert for ${k4s.length} kits; status "unconfirmed" until the receiving party signs.`,
      responsible: "coordinator",
      steps: [
        { ts: e4Alert, action: "Platform raises EXC-04: no receipt entry for the batch", role: "platform", done: true },
        { ts: addMin(e4Alert, 3), action: "Coordinator calls the duty manager; courier proof of delivery checked", role: "coordinator", done: true },
        { ts: e4Late, action: "Duty manager checks seals and temperature and signs a late receipt entry that references the missing entry", role: "hotel", done: true },
        { ts: (bJ.legs.find((l) => l.kind === "hotel") as Extract<Leg, { kind: "hotel" }>).checkIn, action: "Arrival kit released to the traveller at check-in; front desk reminded of the receipt step", role: "hotel", done: true },
      ],
      result: "Custody confirmed; kits used as planned. The late entry is marked as late and the gap stays visible.",
      endpoint: `Handover record completeness: ${k4s.length} movements counted as incomplete.`,
      planRef: "§4.3, §10.7",
    },
    {
      id: "EXC-05",
      type: "Delivery outside the required time window",
      title: "Museum lunch delivered 27 minutes after the window closed",
      outcome: "Closed with recorded outcome",
      stage: 7,
      journeyId: FAMILY,
      kitIds: k5s.map((k) => k.id),
      runId: k5s[0].runId,
      trigger: `Courier reported a traffic delay at ${fmtTime(e5Report)}; declared window ${fmtTime(b5.start)}–${fmtTime(b5.end)}.`,
      detectedAt: e5Report,
      alert: "LATE alert; named backup courier instructed; traveller informed before the window closed.",
      responsible: "coordinator",
      steps: [
        { ts: e5Report, action: "Courier reports delay; EXC-05 raised", role: "courier", done: true },
        { ts: addMin(e5Report, 2), action: "Named backup courier ACT-CR-05 instructed (§10.7)", role: "coordinator", done: true },
        { ts: addMin(e5Report, 4), action: "Coordinator informs the family of the new ETA", role: "coordinator", done: true },
        { ts: b5.receivedAt, action: "Original courier arrives first; seals intact, temperature in range; family accepts", role: "traveller", done: true },
        { ts: addMin(b5.receivedAt, 1440 * 2), action: "Friday exception review: route timing for South Kensington moved 30 minutes earlier", role: "assurance", done: true },
      ],
      result: "Kits accepted and eaten; assurance intact. The miss counts against the on-window endpoint.",
      endpoint: "On-window delivery: 1 handover counted as outside the window.",
      planRef: "§10.7, §5.4",
    },
    {
      id: "EXC-06",
      type: "Temperature-control breach",
      title: "Courier thermal box above the declared range",
      outcome: "Open",
      stage: 7,
      journeyId: CORP_B,
      kitIds: [k6.id],
      runId: k6.runId,
      trigger: `The courier temperature logger on ${k6.id} peaked at 8.3 °C for 46 minutes; 7.6 °C at acceptance. Declared range ${TEMP_RANGE.min}–${TEMP_RANGE.max} °C.`,
      detectedAt: jById(CORP_B).batches.find((x) => x.key === k6.batchKey)!.receivedAt,
      alert: "Kit on HOLD at acceptance; release blocked; temperature exception visible to the customer.",
      responsible: "assurance",
      steps: [
        { ts: jById(CORP_B).batches.find((x) => x.key === k6.batchKey)!.receivedAt, action: "Excursion recorded at acceptance; kit held", role: "traveller", done: true },
        { ts: addMin(jById(CORP_B).batches.find((x) => x.key === k6.batchKey)!.receivedAt, 12), action: "Kit withdrawn; traveller and employer notified; 1 KE credited", role: "assurance", done: true },
        { ts: addMin(jById(CORP_B).batches.find((x) => x.key === k6.batchKey)!.receivedAt, 60), action: "Other kits carried in the same box checked: none in this box", role: "assurance", done: true },
        { ts: addMin(jById(CORP_B).batches.find((x) => x.key === k6.batchKey)!.receivedAt, 1440), action: "Courier investigation: gel-pack conditioning and box assignment", role: "assurance", done: false },
        { ts: addMin(jById(CORP_B).batches.find((x) => x.key === k6.batchKey)!.receivedAt, 1440 * 2), action: "Review with the independent food safety consultant; close with recorded outcome", role: "consultant", done: false },
      ],
      result: "Kit withdrawn and not eaten. Investigation still open, so the exception stays open.",
      endpoint: "Temperature integrity: 1 movement out of range.",
      planRef: "§4.3, §13.7",
    },
    {
      id: "EXC-07",
      type: "Unauthorised substitution of a meal kit",
      title: "Front desk released another guest's kit",
      outcome: "Resolved",
      stage: 8,
      journeyId: FAMILY,
      kitIds: [k7.id, k7ok.id],
      runId: k7.runId,
      trigger: `At ${fmtTime(e7Release)} the Riverside Hotel front desk released ${k7.id} (family, Set 3) to the business traveller instead of ${k7ok.id} (Set 2). The traveller's receipt scan checks the kit's exclusion set against their profile.`,
      detectedAt: addMin(e7Release, 2),
      alert: "DO NOT CONSUME shown on the traveller's scan; substituted kit on HOLD.",
      responsible: "hotel",
      steps: [
        { ts: addMin(e7Release, 2), action: "Receipt scan rejected; EXC-07 raised; front desk alerted", role: "traveller", done: true },
        { ts: addMin(e7Release, 8), action: "Substituted kit returned unopened and quarantined", role: "hotel", done: true },
        { ts: addMin(e7Release, 12), action: `Correct kit ${k7ok.id} released after kit ID and seal checked against the traveller`, role: "hotel", done: true },
        { ts: addMin(e7Release, 23), action: `${k7.id} withdrawn as a precaution: it left controlled custody`, role: "assurance", done: true },
        { ts: addMin(e7Release, 28), action: "Family notified; 1 KE credited; front desk release procedure re-briefed", role: "assurance", done: true },
      ],
      result: "Substitution caught before consumption. Both kits' chains show the wrong release, the rejection and the correction.",
      endpoint: "No endpoint threshold; recorded as a release-control exception.",
      planRef: "§4.3, §13.7",
    },
  );

  return { journeys, runs, clearances, kits, exceptions: exc };
}

// ---------------------------------------------------------------- hash chain
export const GENESIS = "0".repeat(64);

export function entryHash(e: Omit<LedgerEntry, "hash">) {
  // Fixed field order so the hash is reproducible from an export.
  return sha256(
    JSON.stringify([e.seq, e.kitId, e.runId, e.sealNo, e.exclusionSet, e.actor, e.role, e.location, e.ts, e.from, e.to, e.event, e.detail, e.data, e.corrects, e.prevHash]),
  );
}

function chain(entries: Omit<LedgerEntry, "prevHash" | "hash">[]): LedgerEntry[] {
  const out: LedgerEntry[] = [];
  let prev = GENESIS;
  for (const e of entries) {
    const withPrev = { ...e, prevHash: prev };
    const hash = entryHash(withPrev);
    out.push({ ...withPrev, hash });
    prev = hash;
  }
  return out;
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

// ---------------------------------------------------------------- exports
export const DEMO = build();

export const FEATURED_IDS = { business: BUSINESS, family: FAMILY, corporate: [CORP_A, CORP_B, CORP_C] };
export const journeyById = (id: string) => DEMO.journeys.find((j) => j.id === id);
export const kitById = (id: string) => DEMO.kits.find((k) => k.id === id);
export const runById = (id: string) => DEMO.runs.find((r) => r.id === id);
export const clearanceById = (id: string) => DEMO.clearances.find((c) => c.id === id);
export const exceptionById = (id: string) => DEMO.exceptions.find((e) => e.id === id);
export const allergenList = (xs: Allergen[]) => xs.map((a) => ALLERGENS[a]).join(", ");
