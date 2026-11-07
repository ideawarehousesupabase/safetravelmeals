// CSV import of primary data only. Derived data (windows, kits, runs, exceptions) is never
// imported; the engine produces it from these rows.
import type { Leg } from "../jaap/engine";
import { ALLERGENS, PREFERENCES, type Allergen, type Preference } from "../jaap/protocol";
import { nowLondon, toMin, type Naive } from "../jaap/time";
import { EVENT_TYPES, type EventInput, type EventType, type JourneyInput, type TravellerInput, type Workspace } from "../processing";
import { newId } from "./store";

export const JOURNEYS_TEMPLATE = `journey_ref,traveller,allergens,severity,preference,persons,leg_type,name,location,from,to,start,end,catered,departs_from_uk
London Executive Summit,Alex Morgan,peanut;sesame,Severe,South Asian,1,flight,FL 1463,,EDI,LHR,2026-12-02 20:15,2026-12-02 21:40,,no
London Executive Summit,Alex Morgan,peanut;sesame,Severe,South Asian,1,hotel,Riverside Hotel,"Greenwich, London SE10",,,2026-12-02 22:50,2026-12-04 09:30,,
London Executive Summit,Alex Morgan,peanut;sesame,Severe,South Asian,1,meeting,Client workshop,"Canary Wharf, London E14",,,2026-12-03 11:30,2026-12-03 15:00,no,
`;

export const EVENTS_TEMPLATE = `kit_id,event,time,recorded_time,temp_c,seal,released_to,resolves,actor,note
K-1A2B3C4D,dispatch,2026-12-02 19:20,,3.1,,,,Courier,
K-1A2B3C4D,receipt,2026-12-02 20:05,,3.8,TS-123456,,,Front desk,
K-1A2B3C4D,release,2026-12-02 22:55,,,,,,Front desk,
K-1A2B3C4D,confirm,2026-12-02 22:57,,,,,,Traveller,
`;

export type RowError = { row: number; message: string };

// RFC 4180-style parser: quoted fields, escaped quotes, CRLF.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((x) => x.trim() !== ""));
}

function table(text: string, required: string[]) {
  const rows = parseCsv(text.replace(/^﻿/, ""));
  if (!rows.length) return { error: "The file is empty.", records: [] as Record<string, string>[] };
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const missing = required.filter((r) => !header.includes(r));
  if (missing.length) return { error: `Missing column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}.`, records: [] };
  return {
    error: null,
    records: rows.slice(1).map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? "").trim()]))),
  };
}

const parseTime = (s: string): Naive | null => {
  const m = s.trim().match(/^(\d{4}-\d{2}-\d{2})[T ](\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const t = `${m[1]}T${m[2].padStart(2, "0")}:${m[3]}`;
  return Number.isNaN(toMin(t)) ? null : t;
};
const yes = (s: string) => /^(y|yes|true|1)$/i.test(s.trim());
const allergenByName = new Map<string, Allergen>(
  Object.entries(ALLERGENS).flatMap(([k, label]) => [
    [k.toLowerCase(), k as Allergen],
    [k.replace("_", " ").toLowerCase(), k as Allergen],
    [label.toLowerCase(), k as Allergen],
  ]),
);

export type JourneyImport = { travellers: TravellerInput[]; journeys: JourneyInput[]; errors: RowError[]; legCount: number };

export function validateJourneysCsv(text: string, ws: Workspace): JourneyImport {
  const required = ["journey_ref", "traveller", "allergens", "leg_type", "name", "start", "end"];
  const { error, records } = table(text, required);
  const errors: RowError[] = [];
  if (error) return { travellers: [], journeys: [], errors: [{ row: 1, message: error }], legCount: 0 };

  const travellers = new Map<string, TravellerInput>();
  const journeys = new Map<string, JourneyInput>();
  const createdAt = nowLondon();
  records.forEach((r, i) => {
    const row = i + 2;
    const name = r.traveller;
    if (!r.journey_ref) return errors.push({ row, message: "journey_ref is empty." });
    if (!name) return errors.push({ row, message: "traveller is empty." });

    // Traveller: matched to an existing profile by name, else created.
    const key = name.toLowerCase();
    if (!travellers.has(key)) {
      const allergens: Allergen[] = [];
      for (const a of r.allergens.split(/[;|]/).map((x) => x.trim().toLowerCase()).filter(Boolean)) {
        const found = allergenByName.get(a);
        if (!found) errors.push({ row, message: `Unknown allergen "${a}". Use one of: ${Object.keys(ALLERGENS).join(", ")}.` });
        else allergens.push(found);
      }
      if (!allergens.length) errors.push({ row, message: "At least one diagnosed allergen is required." });
      const pref = (PREFERENCES.find((p) => p.toLowerCase() === (r.preference || "British").toLowerCase()) ?? null) as Preference | null;
      if (!pref) errors.push({ row, message: `Unknown preference "${r.preference}". Use one of: ${PREFERENCES.join(", ")}.` });
      const existing = ws.travellers.find((t) => t.label.toLowerCase() === key);
      travellers.set(key, {
        id: existing?.id ?? newId(),
        label: name,
        allergens: [...new Set(allergens)],
        severity: r.severity || existing?.severity || "Diagnosed",
        preference: pref ?? "British",
        consentVersion: "1.2",
        consentAt: existing?.consentAt ?? createdAt,
        source: "user",
      });
    }
    const traveller = travellers.get(key)!;

    const jkey = `${key}|${r.journey_ref}`;
    if (!journeys.has(jkey)) {
      const persons = r.persons ? Number(r.persons) : 1;
      if (!Number.isInteger(persons) || persons < 1 || persons > 6) errors.push({ row, message: "persons must be a whole number from 1 to 6." });
      journeys.set(jkey, {
        id: newId(),
        travellerId: traveller.id,
        label: r.journey_ref,
        persons: Number.isInteger(persons) ? Math.min(6, Math.max(1, persons)) : 1,
        legs: [],
        declinedWindowKeys: [],
        accountProduct: null,
        status: "draft",
        createdAt,
        source: "user",
      });
    }
    const journey = journeys.get(jkey)!;

    const start = parseTime(r.start);
    const end = parseTime(r.end);
    if (!start || !end) return errors.push({ row, message: 'start and end must look like "2026-12-02 20:15".' });
    if (toMin(end) <= toMin(start)) return errors.push({ row, message: "end must be after start." });
    const id = `${r.leg_type[0] ?? "x"}${journey.legs.length + 1}`;
    const type = r.leg_type.toLowerCase();
    let leg: Leg;
    if (type === "flight") {
      if (!r.from || !r.to) return errors.push({ row, message: "A flight needs from and to airports." });
      leg = { id, kind: "flight", ref: r.name, from: r.from.toUpperCase(), to: r.to.toUpperCase(), depart: start, arrive: end, departsFromServiceArea: yes(r.departs_from_uk ?? "") };
    } else if (type === "hotel") {
      leg = { id, kind: "hotel", name: r.name, location: r.location || r.name, checkIn: start, checkOut: end };
    } else if (type === "meeting" || type === "event") {
      leg = { id, kind: "meeting", title: r.name, location: r.location || "", start, end, catered: yes(r.catered ?? "") };
    } else return errors.push({ row, message: `leg_type must be flight, hotel or meeting (got "${r.leg_type}").` });
    journey.legs.push(leg);
  });

  return { travellers: [...travellers.values()], journeys: [...journeys.values()], errors, legCount: records.length };
}

export type EventImport = { events: EventInput[]; errors: RowError[] };

export function validateEventsCsv(text: string, ws: Workspace): EventImport {
  const { error, records } = table(text, ["kit_id", "event", "time"]);
  if (error) return { events: [], errors: [{ row: 1, message: error }] };
  const errors: RowError[] = [];
  const events: EventInput[] = [];
  const kits = new Map(ws.kits.map((k) => [k.kitId, k]));
  records.forEach((r, i) => {
    const row = i + 2;
    const kit = kits.get(r.kit_id.toUpperCase());
    if (!kit) return errors.push({ row, message: `No kit "${r.kit_id}" in your account.` });
    const type = r.event.toLowerCase() as EventType;
    if (!EVENT_TYPES.includes(type)) return errors.push({ row, message: `event must be one of ${EVENT_TYPES.join(", ")}.` });
    const at = parseTime(r.time);
    if (!at) return errors.push({ row, message: 'time must look like "2026-12-02 20:05".' });
    const recordedAt = r.recorded_time ? parseTime(r.recorded_time) : at;
    if (!recordedAt) return errors.push({ row, message: "recorded_time is not a valid time." });
    let tempC: number | null = null;
    if (r.temp_c) {
      tempC = Number(r.temp_c);
      if (!Number.isFinite(tempC) || tempC < -30 || tempC > 60) return errors.push({ row, message: "temp_c must be a number of degrees Celsius." });
    }
    let releasedTo: string | null = null;
    if (r.released_to) {
      const t = ws.travellers.find((x) => x.label.toLowerCase() === r.released_to.toLowerCase() || x.id === r.released_to);
      if (!t) return errors.push({ row, message: `No traveller "${r.released_to}".` });
      releasedTo = t.id;
    }
    if (type === "resolution" && !r.resolves) return errors.push({ row, message: "A resolution needs the exception id in resolves." });
    events.push({
      id: newId(),
      kitId: kit.kitId,
      journeyId: kit.journeyId,
      type,
      at,
      recordedAt,
      tempC,
      sealPresented: r.seal ? r.seal.toUpperCase() : null,
      releasedToTravellerId: releasedTo,
      resolves: r.resolves || null,
      actor: r.actor || "Coordinator",
      note: r.note || "",
      source: "user",
    });
  });
  return { events, errors };
}
