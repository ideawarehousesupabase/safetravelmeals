// Pre-registered validation endpoints (§5.4), computed from the demonstration records.
import { DEMO } from "./demo";
import { ENDPOINTS } from "./protocol";

export type EndpointResult = {
  id: (typeof ENDPOINTS)[number]["id"];
  name: string;
  measure: string;
  threshold: string;
  minSample: string;
  sample: number;
  sampleLabel: string;
  sampleMet: boolean;
  value: string;
  pass: boolean;
  failures: { label: string; kitId?: string; exceptionId?: string }[];
};

const pct = (n: number, d: number) => (d ? (100 * n) / d : 0);
const fmtPct = (x: number) => `${x.toFixed(1)}%`;

export function computeValidation() {
  const { kits, clearances, journeys, exceptions } = DEMO;
  const movements = kits.flatMap((k) => k.movements);
  const transports = movements.filter((m) => m.kind === "transport");
  const batches = journeys.flatMap((j) => j.batches.map((b) => ({ ...b, journeyId: j.id })));
  const swabs = clearances.flatMap((c) => c.swabs);
  const excFor = (kitId: string) => kits.find((k) => k.id === kitId)?.exceptionIds.find((e) => e !== "EXC-02");

  const detections = swabs.filter((s) => s.detected);
  const incomplete = movements.filter((m) => !m.recordedOnTime);
  const late = batches.filter((b) => !b.withinWindow);
  const hot = movements.filter((m) => !m.inRange);
  const badSeal = transports.filter((m) => m.sealOk === false);
  const reactions = kits.flatMap((k) => k.ledger).filter((e) => e.event === "Reaction reported");

  const byId = Object.fromEntries(ENDPOINTS.map((e) => [e.id, e]));
  const base = (id: EndpointResult["id"]) => ({ id, name: byId[id].name, measure: byId[id].measure, threshold: byId[id].threshold, minSample: byId[id].minSample });

  const completeness = pct(movements.length - incomplete.length, movements.length);
  const onWindow = pct(batches.length - late.length, batches.length);
  const temperature = pct(movements.length - hot.length, movements.length);
  const seal = pct(transports.length - badSeal.length, transports.length);

  const endpoints: EndpointResult[] = [
    {
      ...base("segregation"),
      sample: clearances.length,
      sampleLabel: `${clearances.length} clearance events, ${swabs.length} swabs`,
      sampleMet: clearances.length >= 30,
      value: `${detections.length} detections`,
      pass: detections.length === 0,
      failures: detections.map((s) => ({ label: `${s.id} ${s.surface}` })),
    },
    {
      ...base("completeness"),
      sample: movements.length,
      sampleLabel: `${movements.length} physical movements`,
      sampleMet: movements.length >= 200,
      value: fmtPct(completeness),
      pass: completeness >= 98,
      failures: incomplete.map((m) => ({ label: `${m.id}: no receipt entry at window close`, kitId: m.kitId, exceptionId: excFor(m.kitId) })),
    },
    {
      ...base("on_window"),
      sample: batches.length,
      sampleLabel: `${batches.length} handovers`,
      sampleMet: true,
      value: fmtPct(onWindow),
      pass: onWindow >= 95,
      failures: late.map((b) => ({ label: `${b.key} ${b.place}: ${b.lateMin} min late`, kitId: kits.find((k) => k.batchKey === b.key)?.id, exceptionId: excFor(kits.find((k) => k.batchKey === b.key)?.id ?? "") })),
    },
    {
      ...base("temperature"),
      sample: movements.length,
      sampleLabel: `${movements.length} movements`,
      sampleMet: true,
      value: fmtPct(temperature),
      pass: temperature >= 98,
      failures: hot.map((m) => ({ label: `${m.id}: peak ${m.tempMax} °C`, kitId: m.kitId, exceptionId: excFor(m.kitId) })),
    },
    {
      ...base("seal"),
      sample: transports.length,
      sampleLabel: `${transports.length} kits presented for acceptance`,
      sampleMet: true,
      value: fmtPct(seal),
      pass: seal >= 99,
      failures: badSeal.map((m) => ({ label: `${m.kitId}: seal does not match run record`, kitId: m.kitId, exceptionId: excFor(m.kitId) })),
    },
    {
      ...base("reactions"),
      sample: kits.length,
      sampleLabel: `${kits.length} kits produced`,
      sampleMet: true,
      value: `${reactions.length} incidents`,
      pass: reactions.length === 0,
      failures: [],
    },
  ];

  const attempts = clearances.flatMap((c) => c.attempts.map((a) => ({ ...a, clearanceId: c.id, runId: c.runId })));
  const clearance = {
    events: clearances.length,
    attempts: attempts.length,
    rejected: attempts.filter((a) => !a.accepted),
    firstTime: clearances.filter((c) => c.attempts[0].accepted).length,
    startedWithoutAcceptance: 0,
  };

  const intake = {
    journeys: journeys.length,
    refused: journeys.filter((j) => !j.set),
    windowsGenerated: journeys.reduce((n, j) => n + j.windows.length, 0),
    windowsAccepted: journeys.reduce((n, j) => n + j.windows.filter((w) => w.accepted).length, 0),
  };

  const statusCounts = {
    confirmed: kits.filter((k) => k.status === "Receipt confirmed").length,
    withdrawn: kits.filter((k) => k.status === "Withdrawn").length,
  };

  return {
    endpoints,
    clearance,
    intake,
    statusCounts,
    exceptions,
    allPass: endpoints.every((e) => e.pass),
    allSamples: endpoints.every((e) => e.sampleMet),
  };
}

export const VALIDATION = computeValidation();
