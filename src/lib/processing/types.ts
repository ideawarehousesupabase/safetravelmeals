// Data contracts for the MVP. Primary types are what users enter and Firestore stores;
// derived types are produced by the processing engine from them.
import type { ExposureWindow, HandoverBatch, Leg, TraceRow } from "../jaap/engine";
import type { Allergen, Preference, ProductId, Role, WindowType } from "../jaap/protocol";
import type { Naive } from "../jaap/time";

export type Source = "user" | "sample";

// ---------------------------------------------------------------- primary input
export type TravellerInput = {
  id: string;
  label: string;
  allergens: Allergen[];
  severity: string;
  preference: Preference;
  consentVersion: string;
  consentAt: string;
  source: Source;
};

export type JourneyInput = {
  id: string;
  travellerId: string;
  label: string;
  persons: number;
  legs: Leg[];
  declinedWindowKeys: string[];
  accountProduct: ProductId | null;
  status: "draft" | "confirmed";
  createdAt: Naive;
  source: Source;
};

export type StaffInput = {
  id: string;
  name: string;
  role: string;
  clearanceCompetent: boolean;
  source: Source;
};

export type ClearanceAttempt = { staffId: string; at: Naive; checklistComplete: boolean };
export type SwabResult = { surface: string; at: Naive; aboveLimit: boolean };

export type ClearanceInput = {
  runId: string;
  setId: number;
  // Kits in the run when production was recorded: lets the engine notice a kit whose
  // profile changed after it was produced.
  kitIds: string[];
  attempts: ClearanceAttempt[];
  swabs: SwabResult[];
  declarations: string[];
  source: Source;
};

export const EVENT_TYPES = ["dispatch", "receipt", "release", "confirm", "reaction", "resolution"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export type EventInput = {
  id: string;
  kitId: string;
  journeyId: string;
  type: EventType;
  at: Naive; // when it physically happened (Europe/London wall clock)
  recordedAt: Naive; // when the entry was made
  tempC: number | null;
  sealPresented: string | null;
  releasedToTravellerId: string | null;
  resolves: string | null; // exception id a resolution event closes
  actor: string;
  note: string;
  source: Source;
};

// ---------------------------------------------------------------- derived: per journey
export type PlanWindow = ExposureWindow & { accepted: boolean; declineReason: string | null };

export type PlanKit = {
  kitId: string;
  windowKey: string;
  person: number;
  type: WindowType;
  dish: string;
  sealNo: string;
  batchKey: string;
  runDate: string;
  occasionStart: Naive;
  useBy: string;
};

export type Plan = {
  journeyId: string;
  travellerId: string;
  inputHash: string;
  engine: { name: string; version: string };
  computedAt: string;
  setId: number | null;
  setReason: string;
  refused: boolean;
  windows: PlanWindow[];
  trace: TraceRow[];
  batches: HandoverBatch[];
  kits: PlanKit[];
  productId: ProductId | null;
  productNote: string;
};

// ---------------------------------------------------------------- derived: workspace
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

export type ClearanceStatus = "not recorded" | "blocked" | "accepted";

export type Run = {
  id: string;
  setId: number;
  date: string;
  slot: number;
  start: Naive;
  end: Naive;
  kitIds: string[];
  clearance: ClearanceInput | null;
  status: ClearanceStatus;
  acceptedAt: Naive | null;
};

export type KitStatus =
  | "Planned"
  | "Awaiting production"
  | "Produced"
  | "In transit"
  | "Received"
  | "Released"
  | "Receipt confirmed"
  | "On hold"
  | "Withdrawn";

export type Movement = {
  id: string;
  kitId: string;
  kind: "transport" | "release";
  start: Naive;
  end: Naive | null;
  tempMax: number | null;
  inRange: boolean | null;
  recordedOnTime: boolean;
  sealOk: boolean | null;
};

export type KitView = PlanKit & {
  journeyId: string;
  travellerId: string;
  setId: number;
  runId: string;
  status: KitStatus;
  exceptionIds: string[];
  events: EventInput[];
  ledger: LedgerEntry[];
  movements: Movement[];
  source: Source;
};

export type ExceptionKind =
  | "clearance"
  | "no-clearance"
  | "swab"
  | "seal"
  | "missing-receipt"
  | "late"
  | "temperature"
  | "substitution"
  | "profile-changed"
  | "reaction";

export type ExceptionStep = { ts: Naive; action: string; role: Role; done: boolean };

export type ExceptionView = {
  id: string;
  kind: ExceptionKind;
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
  // Whether the user can close it with a resolution event (kit-level, still open).
  resolvable: boolean;
};

export type EndpointResult = {
  id: string;
  name: string;
  measure: string;
  threshold: string;
  minSample: string;
  sample: number;
  sampleLabel: string;
  sampleMet: boolean;
  value: string;
  measured: boolean;
  pass: boolean;
  failures: { label: string; kitId?: string; exceptionId?: string }[];
};

export type WorkspaceSnapshot = {
  travellers: TravellerInput[];
  journeys: JourneyInput[];
  plans: Plan[];
  staff: StaffInput[];
  clearances: ClearanceInput[];
  events: EventInput[];
};

export type Workspace = WorkspaceSnapshot & {
  now: Naive;
  plansById: Record<string, Plan>;
  stalePlanIds: string[];
  runs: Run[];
  kits: KitView[];
  exceptions: ExceptionView[];
  endpoints: EndpointResult[];
  clearanceControl: { events: number; attempts: number; rejected: number; firstTime: number };
  isEmpty: boolean;
  hasSample: boolean;
};
