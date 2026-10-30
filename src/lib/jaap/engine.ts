// The itinerary-to-exposure mapping rule (§4.1) and the exclusion-set and handover rules
// that turn exposure windows into a kit plan. Pure and deterministic: the same itinerary
// and rule-set version always produce the same plan.
import {
  COVERED_ALLERGENS,
  EXCLUSION_SETS,
  PRODUCTS,
  RUN_WEEKDAYS,
  USE_BY_DAYS,
  WINDOW_TYPES,
  type Allergen,
  type ExclusionSet,
  type Product,
  type Role,
  type WindowType,
  ALLERGENS,
} from "./protocol";
import {
  addDays,
  addMin,
  at,
  dateOf,
  dayOfWeek,
  diffMin,
  fmtDay,
  fmtDuration,
  fmtTime,
  minuteOfDay,
  toMin,
  type Naive,
} from "./time";

export type FlightLeg = {
  id: string;
  kind: "flight";
  ref: string;
  from: string;
  to: string;
  depart: Naive;
  arrive: Naive;
  departsFromServiceArea: boolean;
};
export type HotelLeg = { id: string; kind: "hotel"; name: string; location: string; checkIn: Naive; checkOut: Naive };
export type MeetingLeg = {
  id: string;
  kind: "meeting";
  title: string;
  location: string;
  start: Naive;
  end: Naive;
  catered: boolean;
};
export type Leg = FlightLeg | HotelLeg | MeetingLeg;

export type ExposureWindow = {
  key: string;
  ruleId: string;
  type: WindowType;
  legId: string;
  hotelLegId?: string;
  occasionStart: Naive;
  occasionEnd: Naive;
  place: string;
  location: string;
  reason: string;
  servable: boolean;
  // Assigned by planHandovers
  batchKey?: string;
  handoverStart?: Naive;
  handoverEnd?: Naive;
};

export type TraceRow = { ruleId: string; legId: string; leg: string; fired: boolean; detail: string };

export type HandoverBatch = {
  key: string;
  mode: "hotel" | "venue" | "landside";
  modeLabel: string;
  place: string;
  location: string;
  receiver: Role;
  start: Naive;
  end: Naive;
  windowKeys: string[];
};

export function legLabel(leg: Leg) {
  if (leg.kind === "flight") return `${leg.ref} ${leg.from} → ${leg.to}`;
  if (leg.kind === "hotel") return leg.name;
  return leg.title;
}

const isLateLanding = (t: Naive) => minuteOfDay(t) > 21 * 60 || minuteOfDay(t) < 4 * 60;

export function mapItinerary(legs: Leg[]): { windows: ExposureWindow[]; trace: TraceRow[] } {
  const windows: ExposureWindow[] = [];
  const trace: TraceRow[] = [];
  const hotels = legs.filter((l): l is HotelLeg => l.kind === "hotel");

  for (const leg of legs) {
    if (leg.kind === "flight") {
      // R1 late arrival
      if (!isLateLanding(leg.arrive)) {
        trace.push({ ruleId: "R1", legId: leg.id, leg: legLabel(leg), fired: false, detail: `Lands ${fmtTime(leg.arrive)}, not after 21:00.` });
      } else {
        const hotel = hotels.find((h) => toMin(h.checkIn) >= toMin(leg.arrive) && diffMin(leg.arrive, h.checkIn) <= 360);
        if (!hotel) {
          trace.push({ ruleId: "R1", legId: leg.id, leg: legLabel(leg), fired: false, detail: `Lands ${fmtTime(leg.arrive)}, but there is no hotel check-in the same night.` });
        } else {
          const reason = `Lands ${fmtTime(leg.arrive)} (after 21:00) with check-in at ${hotel.name} at ${fmtTime(hotel.checkIn)} the same night.`;
          trace.push({ ruleId: "R1", legId: leg.id, leg: legLabel(leg), fired: true, detail: reason });
          windows.push({
            key: `R1:${leg.id}:${dateOf(leg.arrive)}`,
            ruleId: "R1",
            type: "late_arrival",
            legId: leg.id,
            hotelLegId: hotel.id,
            occasionStart: hotel.checkIn,
            occasionEnd: addMin(hotel.checkIn, 90),
            place: hotel.name,
            location: hotel.location,
            reason,
            servable: true,
          });
        }
      }
      // R4 in-transit
      const dur = diffMin(leg.depart, leg.arrive);
      if (dur <= 180) {
        trace.push({ ruleId: "R4", legId: leg.id, leg: legLabel(leg), fired: false, detail: `Flight time ${fmtDuration(dur)}, not longer than 3 hours.` });
      } else {
        const reason = `Flight time ${fmtDuration(dur)}, longer than 3 hours.`;
        const servable = leg.departsFromServiceArea;
        trace.push({
          ruleId: "R4",
          legId: leg.id,
          leg: legLabel(leg),
          fired: true,
          detail: servable ? reason : `${reason} Departure airport is outside the UK service area, so the window is shown but cannot be fulfilled.`,
        });
        windows.push({
          key: `R4:${leg.id}:${dateOf(leg.depart)}`,
          ruleId: "R4",
          type: "in_transit",
          legId: leg.id,
          occasionStart: leg.depart,
          occasionEnd: leg.arrive,
          place: `${leg.from} landside, before security`,
          location: leg.from,
          reason,
          servable,
        });
      }
    }

    if (leg.kind === "hotel") {
      // R2 breakfast for each full morning
      const last = dateOf(leg.checkOut);
      for (let d = addDays(dateOf(leg.checkIn), 1); d <= last; d = addDays(d, 1)) {
        const present = d < last || minuteOfDay(leg.checkOut) >= 7 * 60 + 30;
        if (!present) {
          trace.push({ ruleId: "R2", legId: leg.id, leg: legLabel(leg), fired: false, detail: `${fmtDay(d)}: check-out ${fmtTime(leg.checkOut)} is before 07:30, so not a full morning.` });
          continue;
        }
        const reason = `${fmtDay(d)}: a full morning of the stay at ${leg.name}; hotel breakfast is a buffet on shared equipment.`;
        trace.push({ ruleId: "R2", legId: leg.id, leg: legLabel(leg), fired: true, detail: reason });
        windows.push({
          key: `R2:${leg.id}:${d}`,
          ruleId: "R2",
          type: "breakfast",
          legId: leg.id,
          hotelLegId: leg.id,
          occasionStart: at(d, "06:30"),
          occasionEnd: at(d, "09:30"),
          place: leg.name,
          location: leg.location,
          reason,
          servable: true,
        });
      }
    }

    if (leg.kind === "meeting") {
      // R3 working lunch
      const d = dateOf(leg.start);
      const spans = toMin(leg.start) <= toMin(at(d, "12:00")) && toMin(leg.end) >= toMin(at(d, "14:00"));
      const span = `${fmtTime(leg.start)}–${fmtTime(leg.end)}`;
      if (!spans) {
        trace.push({ ruleId: "R3", legId: leg.id, leg: legLabel(leg), fired: false, detail: `${span} does not span 12:00–14:00.` });
      } else if (leg.catered) {
        trace.push({ ruleId: "R3", legId: leg.id, leg: legLabel(leg), fired: false, detail: `${span} spans midday, but a catering line is declared.` });
      } else {
        const reason = `${span} spans 12:00–14:00 with no catering line.`;
        trace.push({ ruleId: "R3", legId: leg.id, leg: legLabel(leg), fired: true, detail: reason });
        windows.push({
          key: `R3:${leg.id}:${d}`,
          ruleId: "R3",
          type: "lunch",
          legId: leg.id,
          occasionStart: at(d, "12:00"),
          occasionEnd: at(d, "14:00"),
          place: leg.title,
          location: leg.location,
          reason,
          servable: true,
        });
      }
    }
  }

  windows.sort((a, b) => toMin(a.occasionStart) - toMin(b.occasionStart));
  return { windows, trace };
}

export type SetMatch = { set: ExclusionSet | null; uncovered: Allergen[]; reason: string };

// R5: the smallest published exclusion set that covers the whole profile, or an honest refusal.
export function matchExclusionSet(allergens: Allergen[]): SetMatch {
  if (allergens.length === 0) return { set: null, uncovered: [], reason: "No diagnosed allergen entered." };
  const uncovered = allergens.filter((a) => !COVERED_ALLERGENS.includes(a));
  if (uncovered.length) {
    return {
      set: null,
      uncovered,
      reason: `${uncovered.map((a) => ALLERGENS[a]).join(", ")} ${uncovered.length > 1 ? "are" : "is"} not excluded by any published exclusion set. The order is refused rather than served on a best-efforts basis.`,
    };
  }
  const set = EXCLUSION_SETS.filter((s) => allergens.every((a) => s.excludes.includes(a))).sort(
    (a, b) => a.excludes.length - b.excludes.length,
  )[0];
  return {
    set,
    uncovered: [],
    reason: `${set.code} excludes ${set.excludes.map((a) => ALLERGENS[a]).join(", ")}, covering every allergen in the profile with the fewest exclusions.`,
  };
}

export const setCoversProfile = (set: ExclusionSet, allergens: Allergen[]) => allergens.every((a) => set.excludes.includes(a));

// H1 plus venue and landside handovers. Returns the batches and the windows annotated with them.
export function planHandovers(
  accepted: ExposureWindow[],
  legs: Leg[],
  keyPrefix = "H",
): { batches: HandoverBatch[]; windows: ExposureWindow[] } {
  const batches: HandoverBatch[] = [];
  const out = accepted.map((w) => ({ ...w }));
  const push = (b: Omit<HandoverBatch, "key">) => {
    const batch = { ...b, key: `${keyPrefix}${batches.length + 1}` };
    batches.push(batch);
    for (const w of out) if (b.windowKeys.includes(w.key)) Object.assign(w, { batchKey: batch.key, handoverStart: b.start, handoverEnd: b.end });
  };

  const hotelIds = [...new Set(out.filter((w) => w.hotelLegId).map((w) => w.hotelLegId!))];
  for (const hid of hotelIds) {
    const hotel = legs.find((l) => l.id === hid) as HotelLeg;
    const group = out.filter((w) => w.hotelLegId === hid);
    const arrival = group.find((w) => w.type === "late_arrival");
    const flight = arrival ? (legs.find((l) => l.id === arrival.legId) as FlightLeg) : undefined;
    let start = flight ? addMin(flight.arrive, -150) : addMin(hotel.checkIn, -180);
    let end = flight ? flight.arrive : hotel.checkIn;
    let chunk: ExposureWindow[] = [];
    const flush = () => {
      if (!chunk.length) return;
      push({
        mode: "hotel",
        modeLabel: "Hotel front desk; kits held in the hotel refrigerator and released to the traveller",
        place: hotel.name,
        location: hotel.location,
        receiver: "hotel",
        start,
        end,
        windowKeys: chunk.map((w) => w.key),
      });
      chunk = [];
    };
    for (const w of group) {
      const limit = addDays(dateOf(start), USE_BY_DAYS - 1);
      if (dateOf(w.occasionStart) > limit) {
        flush();
        const eve = addDays(dateOf(w.occasionStart), -1);
        start = at(eve, "17:00");
        end = at(eve, "20:00");
      }
      chunk.push(w);
    }
    flush();
  }

  for (const w of out.filter((w) => w.type === "lunch")) {
    const d = dateOf(w.occasionStart);
    push({
      mode: "venue",
      modeLabel: "Delivered to the meeting venue inside the declared window",
      place: w.place,
      location: w.location,
      receiver: "traveller",
      start: at(d, "11:00"),
      end: at(d, "12:00"),
      windowKeys: [w.key],
    });
  }
  for (const w of out.filter((w) => w.type === "in_transit")) {
    push({
      mode: "landside",
      modeLabel: "Handed to the traveller landside before security",
      place: w.place,
      location: w.location,
      receiver: "traveller",
      start: addMin(w.occasionStart, -180),
      end: addMin(w.occasionStart, -90),
      windowKeys: [w.key],
    });
  }
  batches.sort((a, b) => toMin(a.start) - toMin(b.start));
  return { batches, windows: out };
}

export function suggestProduct(accepted: ExposureWindow[], persons: number, handovers: number): { product: Product | null; note: string } {
  const ke = accepted.length * persons;
  const fits = (p: Product) => ke <= p.ke && handovers <= p.handovers;
  const byId = (id: string) => PRODUCTS.find((p) => p.id === id)!;
  if (ke === 0) return { product: null, note: "No accepted exposure windows." };
  if (persons > 1) {
    const family = byId("family");
    return fits(family)
      ? { product: family, note: `${ke} kit-equivalents and ${handovers} handovers fit the family allowance.` }
      : { product: null, note: "Exceeds the Family or Group Travel Kit allowance: coordinator quote." };
  }
  if (ke === 1 && handovers === 1 && accepted[0].type === "late_arrival")
    return { product: byId("single"), note: "One verified meal on arrival." };
  if (ke === 2 && handovers === 1 && accepted.some((w) => w.type === "breakfast"))
    return { product: byId("daily"), note: "Breakfast plus one further occasion in a single handover." };
  if (fits(byId("solo"))) return { product: byId("solo"), note: `${ke} kit-equivalents and ${handovers} handovers fit the solo allowance.` };
  return {
    product: null,
    note: "Exceeds a standard trip allowance: covered by a Frequent Traveller Subscription, a Corporate or Airline Pack, or a coordinator quote.",
  };
}

// P2: production runs on Wed/Thu/Fri; a handover starting before 18:00 on a run day uses the previous run day.
export function latestRunDay(handoverStart: Naive): string {
  let d = dateOf(handoverStart);
  if (RUN_WEEKDAYS.includes(dayOfWeek(d)) && minuteOfDay(handoverStart) >= 18 * 60) return d;
  do d = addDays(d, -1);
  while (!RUN_WEEKDAYS.includes(dayOfWeek(d)));
  return d;
}

export const windowTypeLabel = (t: WindowType) => WINDOW_TYPES[t].label;
