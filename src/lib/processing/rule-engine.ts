// Deterministic rule engine: the MVP stand-in for an AI model. Same input, same plan.
// Normalise the input, match the founder's rules (§4.1, §4.7), then schedule kits.
import {
  latestRunDay,
  mapItinerary,
  matchExclusionSet,
  planHandovers,
  suggestProduct,
  type Leg,
} from "../jaap/engine";
import { ALLERGENS, DISHES, RULE_SET_VERSION, USE_BY_DAYS, productById, type Allergen } from "../jaap/protocol";
import { sha256 } from "../jaap/sha256";
import { addDays, toMin } from "../jaap/time";
import type { JourneyInput, Plan, PlanKit, PlanWindow, TravellerInput } from "./types";

export const RULE_ENGINE = { name: "rule-engine", version: RULE_SET_VERSION };

const isNaive = (t: unknown): t is string => typeof t === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(t);

export function validLeg(l: Leg) {
  const [a, b] = l.kind === "flight" ? [l.depart, l.arrive] : l.kind === "hotel" ? [l.checkIn, l.checkOut] : [l.start, l.end];
  return isNaive(a) && isNaive(b) && toMin(b) > toMin(a);
}

const normalAllergens = (xs: Allergen[]) => [...new Set(xs)].filter((a) => a in ALLERGENS).sort();

export function kitIdFor(journeyId: string, windowKey: string, person: number) {
  return `K-${sha256(`${journeyId}|${windowKey}|${person}`).slice(0, 8).toUpperCase()}`;
}

export function sealFor(kitId: string) {
  return `TS-${String(parseInt(sha256(`seal|${kitId}`).slice(0, 8), 16) % 1000000).padStart(6, "0")}`;
}

// Hash of exactly the inputs a plan depends on, so a stored plan can be checked for staleness.
export function planInputHash(journey: JourneyInput, traveller: TravellerInput | undefined) {
  return sha256(
    JSON.stringify([
      RULE_ENGINE.version,
      journey.id,
      journey.legs,
      journey.persons,
      [...journey.declinedWindowKeys].sort(),
      journey.accountProduct,
      traveller ? normalAllergens(traveller.allergens) : null,
      traveller?.preference ?? null,
    ]),
  ).slice(0, 16);
}

export function processJourney(journey: JourneyInput, traveller: TravellerInput | undefined, computedAt: string): Plan {
  const base = {
    journeyId: journey.id,
    travellerId: journey.travellerId,
    inputHash: planInputHash(journey, traveller),
    engine: RULE_ENGINE,
    computedAt,
  };
  const legs = journey.legs.filter(validLeg);
  const { windows, trace } = mapItinerary(legs);

  if (!traveller) {
    return {
      ...base,
      setId: null,
      setReason: "No traveller profile is linked to this journey.",
      refused: true,
      windows: windows.map((w) => ({ ...w, accepted: false, declineReason: "No traveller profile." })),
      trace,
      batches: [],
      kits: [],
      productId: null,
      productNote: "No traveller profile.",
    };
  }

  const match = matchExclusionSet(normalAllergens(traveller.allergens));
  const declined = new Set(journey.declinedWindowKeys);
  const marked: PlanWindow[] = windows.map((w) => {
    const declineReason = declined.has(w.key)
      ? "Removed by the traveller at confirmation."
      : !w.servable
        ? "Departure airport outside the UK service area."
        : !match.set
          ? "Profile not covered by a published exclusion set."
          : null;
    return { ...w, accepted: declineReason === null, declineReason };
  });
  const accepted = marked.filter((w) => w.accepted);
  const { batches, windows: annotated } = planHandovers(accepted, legs, `${journey.id}-H`);
  const finalWindows = marked.map((w) => ({ ...w, ...(annotated.find((a) => a.key === w.key) ?? {}) }));

  const persons = Math.max(1, Math.min(6, Math.round(journey.persons || 1)));
  const kits: PlanKit[] = [];
  if (match.set) {
    for (const w of annotated) {
      const runDate = latestRunDay(w.handoverStart!);
      for (let p = 1; p <= persons; p++) {
        const kitId = kitIdFor(journey.id, w.key, p);
        kits.push({
          kitId,
          windowKey: w.key,
          person: p,
          type: w.type,
          dish: DISHES[traveller.preference]?.[w.type] ?? DISHES.British[w.type],
          sealNo: sealFor(kitId),
          batchKey: w.batchKey!,
          runDate,
          occasionStart: w.occasionStart,
          useBy: addDays(runDate, USE_BY_DAYS),
        });
      }
    }
  }

  const suggestion = journey.accountProduct
    ? { product: productById(journey.accountProduct), note: "Drawn from the account's product allowance." }
    : suggestProduct(annotated, persons, batches.length);

  return {
    ...base,
    setId: match.set?.id ?? null,
    setReason: match.reason,
    refused: !match.set,
    windows: finalWindows,
    trace,
    batches,
    kits,
    productId: suggestion.product?.id ?? null,
    productNote: suggestion.note,
  };
}
