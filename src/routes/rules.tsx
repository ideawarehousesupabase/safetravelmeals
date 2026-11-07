import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SiteShell, PageHeader } from "@/components/site-shell";
import { Card, JaapNav, Pill, SetBadge } from "@/components/jaap/jaap-ui";
import { WorkspaceGate } from "@/components/workspace-gate";
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  Check,
  CheckCircle2,
  ChefHat,
  Compass,
  FileText,
  Hotel,
  Info,
  ListChecks,
  MapPin,
  Minus,
  MinusCircle,
  Plane,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Truck,
  Utensils,
  XCircle,
} from "lucide-react";
import {
  ALLERGENS,
  EXCLUSION_SETS,
  RULES,
  RULE_SET_VERSION,
  RUN_ORDER,
  WINDOW_TYPES,
  productById,
  setById,
  type Allergen,
  type RuleCategory,
  type RuleDef,
} from "@/lib/jaap/protocol";
import { legLabel, matchExclusionSet } from "@/lib/jaap/engine";
import { fmtDay, fmtRange, fmtTime } from "@/lib/jaap/time";
import type { JourneyInput, Workspace } from "@/lib/processing";

export const Route = createFileRoute("/rules")({
  head: () => ({
    meta: [
      { title: "JAAP Rule Matrix — SafeMeal" },
      { name: "description", content: "Deterministic JAAP rules evaluated dynamically against your travel itineraries." },
    ],
  }),
  component: RulesPage,
});

const CATEGORIES: RuleCategory[] = [
  "Exposure Rules",
  "Allergen Rules",
  "Production Rules",
  "Handover Rules",
];

const CATEGORY_META: Record<
  RuleCategory,
  { icon: typeof Compass; title: string; subtitle: string; description: string }
> = {
  "Exposure Rules": {
    icon: Compass,
    title: "Exposure Rules (§4.1)",
    subtitle: "R1–R4: Itinerary-to-Exposure Mapping",
    description: "Evaluates flight times, hotel stays and meetings to find exact moments where travellers face uncontrolled food exposure.",
  },
  "Allergen Rules": {
    icon: ShieldCheck,
    title: "Allergen Rules (§4.7, §4.8)",
    subtitle: "R5: Single-Allergen Exclusion Set Assignment",
    description: "Maps diagnosed allergen profiles to the smallest covering published exclusion set (S1–S6) or triggers the honest refusal protocol.",
  },
  "Production Rules": {
    icon: ChefHat,
    title: "Production Rules (§4.2, §13.10)",
    subtitle: "P1–P2: Segregated Run Batching & Scheduling",
    description: "Groups meal-kits into single-allergen kitchen runs of up to 55 kit-equivalents, scheduled Wed/Thu/Fri with deepest clean first.",
  },
  "Handover Rules": {
    icon: Truck,
    title: "Handover Rules (§4.4, §13.7)",
    subtitle: "H1–H2: Custody Batches & Delivery Protocols",
    description: "Consolidates kits into hotel front desk batches and point-to-point courier handovers inside declared, verified delivery windows.",
  },
};

type RuleEvaluationStatus = "triggered" | "not_triggered" | "missing_info";

type RuleEvaluation = {
  status: RuleEvaluationStatus;
  statusLabel: string;
  summary: string;
  details: string[];
  recordsGenerated?: string[];
};

function evaluateRuleStatus(
  rule: RuleDef,
  j: JourneyInput | undefined,
  ws: Workspace,
): RuleEvaluation {
  if (!j) {
    return {
      status: "missing_info",
      statusLabel: "Could not be evaluated",
      summary: "No journey available to evaluate. Add a travel itinerary in the planner to run this rule dynamically.",
      details: ["A traveller allergen profile and itinerary legs are required for evaluation."],
    };
  }

  const plan = ws.plansById[j.id];
  const t = ws.travellers.find((x) => x.id === j.travellerId);
  const legs = j.legs || [];
  const flights = legs.filter((l) => l.kind === "flight");
  const hotels = legs.filter((l) => l.kind === "hotel");
  const meetings = legs.filter((l) => l.kind === "meeting");

  if (!plan) {
    return {
      status: "missing_info",
      statusLabel: "Could not be evaluated",
      summary: "Plan derivation pending for this journey.",
      details: ["The rule engine is synchronising inputs."],
    };
  }

  // R1: Late arrival
  if (rule.id === "R1") {
    if (flights.length === 0) {
      return {
        status: "missing_info",
        statusLabel: "Could not be evaluated",
        summary: "Missing flight data: No flight legs in itinerary.",
        details: ["R1 requires flight arrival timestamps and hotel check-in times to detect late arrival exposure (§4.1)."],
      };
    }
    const r1Trace = plan.trace.filter((x) => x.ruleId === "R1");
    const fired = r1Trace.some((x) => x.fired);
    if (fired) {
      const windows = plan.windows.filter((w) => w.ruleId === "R1");
      return {
        status: "triggered",
        statusLabel: "Triggered",
        summary: `Triggered: Late flight arrival detected; ${windows.length} Arrival Kit(s) scheduled for hotel check-in.`,
        details: r1Trace.map((x) => `${x.leg}: ${x.detail}`),
        recordsGenerated: windows.map((w) => `${WINDOW_TYPES[w.type].kit} at ${w.place} (Check-in: ${fmtTime(w.occasionStart)})`),
      };
    }
    const lateNoHotel = r1Trace.some((x) => !x.fired && x.detail.includes("no hotel check-in"));
    if (lateNoHotel) {
      return {
        status: "missing_info",
        statusLabel: "Missing hotel link",
        summary: "Flight lands after 21:00, but no hotel accommodation is registered for that night.",
        details: r1Trace.map((x) => `${x.leg}: ${x.detail}`),
      };
    }
    return {
      status: "not_triggered",
      statusLabel: "Not triggered",
      summary: "Not triggered: All flight arrivals occur before the 21:00 late-landing threshold.",
      details: r1Trace.map((x) => `${x.leg}: ${x.detail}`),
    };
  }

  // R2: Hotel breakfast
  if (rule.id === "R2") {
    if (hotels.length === 0) {
      return {
        status: "missing_info",
        statusLabel: "Could not be evaluated",
        summary: "Missing accommodation data: No hotel stays in itinerary.",
        details: ["R2 evaluates each full morning of a hotel stay (present at 07:30) against buffet cross-contact risk (§4.1)."],
      };
    }
    const r2Trace = plan.trace.filter((x) => x.ruleId === "R2");
    const fired = r2Trace.some((x) => x.fired);
    if (fired) {
      const windows = plan.windows.filter((w) => w.ruleId === "R2");
      return {
        status: "triggered",
        statusLabel: "Triggered",
        summary: `Triggered: ${windows.length} full morning(s) identified at hotel accommodation; Breakfast Kit(s) generated.`,
        details: r2Trace.map((x) => `${x.leg}: ${x.detail}`),
        recordsGenerated: windows.map((w) => `${WINDOW_TYPES[w.type].kit} on ${fmtDay(w.occasionStart)} (${w.place})`),
      };
    }
    return {
      status: "not_triggered",
      statusLabel: "Not triggered",
      summary: "Not triggered: Hotel stays do not include a full morning (guest checks out before 07:30).",
      details: r2Trace.map((x) => `${x.leg}: ${x.detail}`),
    };
  }

  // R3: Working lunch
  if (rule.id === "R3") {
    if (meetings.length === 0) {
      return {
        status: "missing_info",
        statusLabel: "Could not be evaluated",
        summary: "Missing meeting data: No business meeting or conference legs in itinerary.",
        details: ["R3 evaluates scheduled meetings spanning 12:00–14:00 with no verified catering line (§4.1)."],
      };
    }
    const r3Trace = plan.trace.filter((x) => x.ruleId === "R3");
    const fired = r3Trace.some((x) => x.fired);
    if (fired) {
      const windows = plan.windows.filter((w) => w.ruleId === "R3");
      return {
        status: "triggered",
        statusLabel: "Triggered",
        summary: `Triggered: Uncatered midday meeting detected spanning 12:00–14:00; ${windows.length} Lunch Kit(s) scheduled.`,
        details: r3Trace.map((x) => `${x.leg}: ${x.detail}`),
        recordsGenerated: windows.map((w) => `${WINDOW_TYPES[w.type].kit} at ${w.place} (${fmtRange(w.occasionStart, w.occasionEnd)})`),
      };
    }
    return {
      status: "not_triggered",
      statusLabel: "Not triggered",
      summary: "Not triggered: Meetings do not span 12:00–14:00, or a verified catering line is already declared.",
      details: r3Trace.map((x) => `${x.leg}: ${x.detail}`),
    };
  }

  // R4: In-transit
  if (rule.id === "R4") {
    if (flights.length === 0) {
      return {
        status: "missing_info",
        statusLabel: "Could not be evaluated",
        summary: "Missing flight data: No flight legs in itinerary.",
        details: ["R4 evaluates flight segments exceeding 3 hours (180 minutes) departing from service areas (§4.1, §4.4)."],
      };
    }
    const r4Trace = plan.trace.filter((x) => x.ruleId === "R4");
    const fired = r4Trace.some((x) => x.fired);
    if (fired) {
      const windows = plan.windows.filter((w) => w.ruleId === "R4");
      return {
        status: "triggered",
        statusLabel: "Triggered",
        summary: `Triggered: Long-duration flight (>3 hours) detected; ${windows.length} In-Transit Kit(s) scheduled for airport landside handover.`,
        details: r4Trace.map((x) => `${x.leg}: ${x.detail}`),
        recordsGenerated: windows.map((w) => `${WINDOW_TYPES[w.type].kit} for ${w.place}`),
      };
    }
    return {
      status: "not_triggered",
      statusLabel: "Not triggered",
      summary: "Not triggered: All scheduled flight legs are 3 hours (180 min) or under.",
      details: r4Trace.map((x) => `${x.leg}: ${x.detail}`),
    };
  }

  // R5: Exclusion-set assignment (Allergen Rules)
  if (rule.id === "R5") {
    if (!t || t.allergens.length === 0) {
      return {
        status: "missing_info",
        statusLabel: "Could not be evaluated",
        summary: "Missing allergen profile: Traveller has no diagnosed allergens recorded under explicit consent.",
        details: ["R5 requires diagnosed allergens to determine exclusion-set assignment or trigger refusal protocol (§4.7, §4.8)."],
      };
    }
    if (plan.setId) {
      const s = setById(plan.setId);
      return {
        status: "triggered",
        statusLabel: "Triggered",
        summary: `Triggered: Assigned to ${s.code}. Covers all diagnosed allergens with minimum necessary exclusion.`,
        details: [
          `Diagnosed allergens: ${t.allergens.map((a) => ALLERGENS[a]).join(", ")}`,
          `${s.code} excludes: ${s.excludes.map((a) => ALLERGENS[a]).join(", ")}`,
          plan.setReason,
        ],
        recordsGenerated: [`Assigned Exclusion Set: ${s.code}`],
      };
    }
    return {
      status: "not_triggered",
      statusLabel: "Refused (No covering set)",
      summary: `Order refused under JAAP Protocol §4.8: ${plan.setReason}`,
      details: [
        `Diagnosed allergens: ${t.allergens.map((a) => ALLERGENS[a]).join(", ")}`,
        "Refusal protocol active: No published exclusion set covers this combination without unstated cross-contact assumptions.",
      ],
      recordsGenerated: ["Refusal notice recorded (§4.8)"],
    };
  }

  // P1: Run grouping (Production Rules)
  if (rule.id === "P1") {
    const journeyKits = ws.kits.filter((k) => k.journeyId === j.id);
    if (journeyKits.length === 0) {
      if (plan.refused) {
        return {
          status: "not_triggered",
          statusLabel: "Not triggered (Refused)",
          summary: "Not triggered: No production runs assigned because allergen-set matching refused the order.",
          details: [plan.setReason],
        };
      }
      return {
        status: "missing_info",
        statusLabel: "Could not be evaluated",
        summary: "Missing kit requirements: No exposure windows generated or accepted.",
        details: ["P1 batches meal kits into single-allergen production runs of up to 55 kit-equivalents (§4.2)."],
      };
    }
    const runIds = [...new Set(journeyKits.map((k) => k.runId))];
    const details = runIds.map((rid) => {
      const r = ws.runs.find((x) => x.id === rid);
      return `${rid}: ${r ? `${r.kitIds.length}/55 kit-equivalents on ${fmtDay(r.date)} (${setById(r.setId).code})` : "Scheduled"}`;
    });
    return {
      status: "triggered",
      statusLabel: "Triggered",
      summary: `Triggered: ${journeyKits.length} kit-equivalent(s) segregated into ${runIds.length} single-allergen production run(s).`,
      details,
      recordsGenerated: runIds.map((rid) => `Run ${rid}`),
    };
  }

  // P2: Run sequencing and timing (Production Rules)
  if (rule.id === "P2") {
    const journeyKits = ws.kits.filter((k) => k.journeyId === j.id);
    if (journeyKits.length === 0) {
      return {
        status: "missing_info",
        statusLabel: "Could not be evaluated",
        summary: "Missing production runs: No kits scheduled for this journey.",
        details: ["P2 sequences runs on Wed/Thu/Fri (most restrictive set first after deepest clean) and verifies 5-day shelf life (§4.2, §13.10)."],
      };
    }
    const runDates = [...new Set(journeyKits.map((k) => k.runDate))];
    return {
      status: "triggered",
      statusLabel: "Triggered",
      summary: `Triggered: Runs scheduled on production cycle (${runDates.map(fmtDay).join(", ")}) adhering to deepest-clean order and 5-day shelf life limit.`,
      details: [
        "Single-allergen run sequence: S1 -> S2 -> S3 -> S4 -> S5 -> S6 (most restrictive first)",
        "Shelf life validation: Every kit is scheduled to be consumed within 5 days of its production run date (§13.10)",
      ],
      recordsGenerated: journeyKits.slice(0, 3).map((k) => `${k.kitId} (Run: ${k.runDate}, Delivery: ${fmtDay(k.occasionStart)})`),
    };
  }

  // H1: Hotel batch consolidation (Handover Rules)
  if (rule.id === "H1") {
    const hotelBatches = plan.batches.filter((b) => b.mode === "hotel");
    if (hotelBatches.length === 0) {
      const hotelWindows = plan.windows.filter((w) => w.hotelLegId);
      if (hotelWindows.length === 0) {
        return {
          status: "missing_info",
          statusLabel: "Could not be evaluated",
          summary: "Missing hotel exposure windows: No late arrival or breakfast kits in this itinerary.",
          details: ["H1 consolidates arrival and breakfast kits for the same hotel stay into a single front desk delivery (§4.4)."],
        };
      }
      return {
        status: "not_triggered",
        statusLabel: "Not triggered",
        summary: "Not triggered: Hotel exposure windows were declined by user.",
        details: hotelWindows.map((w) => `${w.type}: ${w.declineReason || "Declined"}`),
      };
    }
    return {
      status: "triggered",
      statusLabel: "Triggered",
      summary: `Triggered: Consolidated ${hotelBatches.reduce((n, b) => n + b.windowKeys.length, 0)} kit(s) into ${hotelBatches.length} hotel courier delivery batch(es).`,
      details: hotelBatches.map((b) => `${b.place}: ${b.windowKeys.length} kits scheduled for delivery between ${fmtRange(b.start, b.end)}`),
      recordsGenerated: hotelBatches.map((b) => `Batch ${b.key} -> ${b.place}`),
    };
  }

  // H2: Direct venue & transit handovers (Handover Rules)
  if (rule.id === "H2") {
    const directBatches = plan.batches.filter((b) => b.mode === "venue" || b.mode === "landside");
    if (directBatches.length === 0) {
      const directWindows = plan.windows.filter((w) => w.type === "lunch" || w.type === "in_transit");
      if (directWindows.length === 0) {
        return {
          status: "missing_info",
          statusLabel: "Could not be evaluated",
          summary: "Missing point-to-point windows: No meeting lunch or in-transit flight windows in this itinerary.",
          details: ["H2 manages direct venue (11:00–12:00) and airport landside (180–90 min pre-flight) point-to-point courier handovers (§4.4)."],
        };
      }
      return {
        status: "not_triggered",
        statusLabel: "Not triggered",
        summary: "Not triggered: Direct delivery windows were not servable or were declined.",
        details: directWindows.map((w) => `${w.type}: ${w.reason}`),
      };
    }
    return {
      status: "triggered",
      statusLabel: "Triggered",
      summary: `Triggered: ${directBatches.length} point-to-point courier handover batch(es) scheduled.`,
      details: directBatches.map((b) => `${b.mode === "venue" ? "Venue Reception" : "Airport Landside"}: ${b.place} (${fmtRange(b.start, b.end)})`),
      recordsGenerated: directBatches.map((b) => `Batch ${b.key}: ${b.place}`),
    };
  }

  return {
    status: "missing_info",
    statusLabel: "Could not be evaluated",
    summary: "Rule evaluation not configured.",
    details: [],
  };
}

function RulesPage() {
  return (
    <SiteShell>
      <PageHeader
        eyebrow={`Rule matrix · ${RULE_SET_VERSION}`}
        title="Dynamic JAAP Rule Matrix"
        description="The deterministic rules of the Journey Allergen Assurance Protocol (Patent GB2617886.3, business plan §4.1–§4.8). Every outcome is computed live from your itinerary and allergen data, with no simulated AI, hardcoded answers, or manual overrides."
      >
        <Link
          to="/itinerary"
          search={{ journey: undefined }}
          className="rounded-full bg-brand-primary px-5 py-3 text-sm font-bold text-white flex items-center gap-2 hover:bg-brand-accent transition-colors shadow-sm"
        >
          <ListChecks className="size-4" /> Open Itinerary Planner <ArrowRight className="size-4" />
        </Link>
      </PageHeader>
      <JaapNav />
      <WorkspaceGate requireData={false}>{(ws) => <Matrix ws={ws} />}</WorkspaceGate>
    </SiteShell>
  );
}

function Matrix({ ws }: { ws: Workspace }) {
  const [selectedJid, setSelectedJid] = useState<string>(ws.journeys[0]?.id ?? "");
  const [selectedCategory, setSelectedCategory] = useState<RuleCategory | "All">("All");

  const j = useMemo(() => {
    return ws.journeys.find((x) => x.id === selectedJid) ?? ws.journeys[0];
  }, [ws.journeys, selectedJid]);

  const traveller = useMemo(() => {
    return j ? ws.travellers.find((x) => x.id === j.travellerId) : undefined;
  }, [ws.travellers, j]);

  const plan = useMemo(() => {
    return j ? ws.plansById[j.id] : undefined;
  }, [ws.plansById, j]);

  const evaluations = useMemo(() => {
    const map = new Map<string, RuleEvaluation>();
    for (const r of RULES) {
      map.set(r.id, evaluateRuleStatus(r, j, ws));
    }
    return map;
  }, [j, ws]);

  const summaryCounts = useMemo(() => {
    let triggered = 0;
    let notTriggered = 0;
    let missing = 0;
    for (const ev of evaluations.values()) {
      if (ev.status === "triggered") triggered++;
      else if (ev.status === "not_triggered") notTriggered++;
      else missing++;
    }
    return { triggered, notTriggered, missing, total: RULES.length };
  }, [evaluations]);

  const filteredCategories = selectedCategory === "All" ? CATEGORIES : [selectedCategory];
  const exposureRules = RULES.filter((r) => r.group === "Exposure Rules");

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-8">
      {/* Journey Selection & Dynamic Execution Header */}
      <section className="rounded-2xl border border-brand-border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-brand-border pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-primary/10 px-2.5 py-0.5 text-xs font-bold text-brand-primary">
                <RefreshCw className="size-3" /> Live Rule Engine
              </span>
              <span className="text-xs text-muted-foreground">Deterministic JAAP Rules</span>
            </div>
            <h2 className="font-display text-xl font-extrabold mt-1">
              Active Evaluation Itinerary
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Select Trip:
            </label>
            <select
              value={j?.id ?? ""}
              onChange={(e) => setSelectedJid(e.target.value)}
              className="rounded-xl border border-brand-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground outline-none focus:border-brand-accent min-w-[280px]"
            >
              {ws.journeys.map((x) => {
                const tr = ws.travellers.find((y) => y.id === x.travellerId);
                return (
                  <option key={x.id} value={x.id}>
                    {x.label || "Corporate Travel Itinerary"} · {tr?.label || "Traveller"}
                  </option>
                );
              })}
              {!ws.journeys.length && (
                <option value="">No journeys yet (Empty Account)</option>
              )}
            </select>

            <Link
              to="/itinerary"
              search={{ journey: j?.id }}
              className="rounded-xl border border-brand-border px-3.5 py-2.5 text-xs font-bold hover:border-brand-accent hover:bg-secondary flex items-center gap-1.5 transition-all"
            >
              Modify in Planner <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>

        {j && traveller && plan ? (
          <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="p-3 rounded-xl bg-secondary/50 border border-brand-border/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Traveller</span>
              <p className="font-bold text-sm text-foreground mt-0.5 truncate">{traveller.label}</p>
              <p className="text-muted-foreground text-[11px] truncate">{traveller.severity || "Diagnosed"}</p>
            </div>
            <div className="p-3 rounded-xl bg-secondary/50 border border-brand-border/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Diagnosed Allergens</span>
              <p className="font-bold text-sm text-foreground mt-0.5 truncate">
                {traveller.allergens.length ? traveller.allergens.map((a) => ALLERGENS[a]).join(", ") : "None recorded"}
              </p>
              <p className="text-muted-foreground text-[11px]">{traveller.preference} menu</p>
            </div>
            <div className="p-3 rounded-xl bg-secondary/50 border border-brand-border/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Assigned Exclusion Set</span>
              <div className="mt-1">
                {plan.setId ? (
                  <SetBadge setId={plan.setId} long />
                ) : (
                  <span className="font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded text-[11px]">
                    Refused (§4.8)
                  </span>
                )}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-secondary/50 border border-brand-border/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Kits & Delivery</span>
              <p className="font-bold text-sm text-foreground mt-0.5">
                {plan.windows.filter((w) => w.accepted).length} windows · {plan.kits.length} kits
              </p>
              <p className="text-muted-foreground text-[11px]">
                {plan.batches.length} handover batch{plan.batches.length === 1 ? "" : "es"}
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-4 p-4 rounded-xl border border-dashed border-brand-border bg-secondary/30 text-sm text-muted-foreground flex items-center justify-between gap-4">
            <p>
              No traveller itinerary is currently loaded. You can view all predefined JAAP rules below. To run the dynamic evaluation against your trips, add an itinerary in the planner or import sample data.
            </p>
            <Link
              to="/itinerary"
              search={{ journey: undefined }}
              className="rounded-full bg-brand-primary px-4 py-2 text-xs font-bold text-white shrink-0 hover:bg-brand-accent transition-colors"
            >
              + Create Trip
            </Link>
          </div>
        )}
      </section>

      {/* KPI Evaluation Summary Bar */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-brand-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Triggered</span>
            <div className="size-6 rounded-full bg-emerald-100 text-emerald-700 grid place-items-center">
              <Check className="size-3.5" />
            </div>
          </div>
          <p className="font-display text-2xl font-extrabold text-emerald-700 mt-2">
            {summaryCounts.triggered}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Rules satisfied by current itinerary
          </p>
        </div>

        <div className="rounded-2xl border border-brand-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Not Triggered</span>
            <div className="size-6 rounded-full bg-slate-100 text-slate-700 grid place-items-center">
              <Minus className="size-3.5" />
            </div>
          </div>
          <p className="font-display text-2xl font-extrabold text-slate-700 mt-2">
            {summaryCounts.notTriggered}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Evaluated; condition not met
          </p>
        </div>

        <div className="rounded-2xl border border-brand-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Missing Info</span>
            <div className="size-6 rounded-full bg-amber-100 text-amber-700 grid place-items-center">
              <AlertCircle className="size-3.5" />
            </div>
          </div>
          <p className="font-display text-2xl font-extrabold text-amber-700 mt-2">
            {summaryCounts.missing}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Requires further itinerary data
          </p>
        </div>

        <div className="rounded-2xl border border-brand-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Published Rules</span>
            <div className="size-6 rounded-full bg-brand-primary/10 text-brand-primary grid place-items-center">
              <FileText className="size-3.5" />
            </div>
          </div>
          <p className="font-display text-2xl font-extrabold text-foreground mt-2">
            {summaryCounts.total}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Fixed JAAP Protocol Rules (§4.1–§4.8)
          </p>
        </div>
      </section>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-brand-border">
        <button
          onClick={() => setSelectedCategory("All")}
          className={`rounded-full px-4 py-2 text-xs font-bold whitespace-nowrap transition-all ${
            selectedCategory === "All"
              ? "bg-brand-primary text-white shadow-sm"
              : "border border-brand-border bg-card hover:bg-secondary text-muted-foreground"
          }`}
        >
          All Rules (9)
        </button>
        {CATEGORIES.map((cat) => {
          const count = RULES.filter((r) => r.group === cat).length;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-full px-4 py-2 text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? "bg-brand-primary text-white shadow-sm"
                  : "border border-brand-border bg-card hover:bg-secondary text-muted-foreground"
              }`}
            >
              {cat} ({count})
            </button>
          );
        })}
      </div>

      {/* Rules Display Grouped into the 4 Categories */}
      <div className="space-y-10">
        {filteredCategories.map((cat) => {
          const meta = CATEGORY_META[cat];
          const rulesInCat = RULES.filter((r) => r.group === cat);
          const Icon = meta.icon;

          return (
            <section key={cat} className="space-y-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-lg bg-brand-primary/10 text-brand-primary grid place-items-center">
                    <Icon className="size-4" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-extrabold">{meta.title}</h3>
                    <p className="text-xs text-muted-foreground">{meta.description}</p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-muted-foreground">{meta.subtitle}</span>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-brand-border bg-card shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-brand-border bg-secondary/40">
                      <th className="p-3.5 w-44">Rule</th>
                      <th className="p-3.5 w-1/4">Condition</th>
                      <th className="p-3.5 w-1/4">Expected Output</th>
                      <th className="p-3.5 w-1/5">Handover Protocol</th>
                      <th className="p-3.5 min-w-[280px]">Dynamic Evaluation Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border/60">
                    {rulesInCat.map((r) => {
                      const ev = evaluations.get(r.id)!;

                      return (
                        <tr
                          key={r.id}
                          id={r.id}
                          className="align-top hover:bg-secondary/20 transition-colors scroll-mt-24"
                        >
                          <td className="p-3.5">
                            <div className="flex items-center gap-2">
                              <span className="rounded bg-brand-primary px-2 py-0.5 text-xs font-extrabold text-white">
                                {r.id}
                              </span>
                              <span className="text-[11px] font-bold text-muted-foreground">
                                {r.planRef}
                              </span>
                            </div>
                            <p className="font-bold text-sm mt-1">{r.name}</p>
                          </td>

                          <td className="p-3.5 text-xs leading-relaxed text-foreground">
                            {r.condition}
                          </td>

                          <td className="p-3.5 text-xs leading-relaxed text-foreground">
                            {r.output}
                          </td>

                          <td className="p-3.5 text-xs leading-relaxed text-muted-foreground">
                            {r.handover}
                          </td>

                          {/* Evaluation Status Column */}
                          <td className="p-3.5">
                            {ev.status === "triggered" && (
                              <div className="rounded-xl border border-emerald-300 bg-emerald-50/90 p-3 space-y-1.5 shadow-sm">
                                <div className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-900">
                                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                                  <span>{ev.statusLabel}</span>
                                </div>
                                <p className="text-xs text-emerald-950 font-medium leading-relaxed">
                                  {ev.summary}
                                </p>
                                {ev.details.length > 0 && (
                                  <ul className="text-[11px] text-emerald-900/80 space-y-0.5 pl-4 list-disc mt-1">
                                    {ev.details.slice(0, 3).map((d, i) => (
                                      <li key={i}>{d}</li>
                                    ))}
                                  </ul>
                                )}
                                {ev.recordsGenerated && ev.recordsGenerated.length > 0 && (
                                  <div className="pt-1 border-t border-emerald-200/80 flex flex-wrap gap-1 mt-1">
                                    {ev.recordsGenerated.slice(0, 3).map((rec, i) => (
                                      <span
                                        key={i}
                                        className="rounded bg-emerald-200/70 px-1.5 py-0.5 text-[10px] font-bold text-emerald-950"
                                      >
                                        {rec}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            {ev.status === "not_triggered" && (
                              <div className="rounded-xl border border-slate-300 bg-slate-50 p-3 space-y-1.5">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                                  <MinusCircle className="size-4 text-slate-500 shrink-0" />
                                  <span>{ev.statusLabel}</span>
                                </div>
                                <p className="text-xs text-slate-700 leading-relaxed">
                                  {ev.summary}
                                </p>
                                {ev.details.length > 0 && (
                                  <ul className="text-[11px] text-slate-600 space-y-0.5 pl-4 list-disc mt-1">
                                    {ev.details.slice(0, 2).map((d, i) => (
                                      <li key={i}>{d}</li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            )}

                            {ev.status === "missing_info" && (
                              <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-3 space-y-1.5">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
                                  <AlertCircle className="size-4 text-amber-600 shrink-0" />
                                  <span>{ev.statusLabel}</span>
                                </div>
                                <p className="text-xs text-amber-900 leading-relaxed">
                                  {ev.summary}
                                </p>
                                {ev.details.length > 0 && (
                                  <p className="text-[11px] text-amber-800/80 italic">
                                    {ev.details[0]}
                                  </p>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      </div>

      {/* Itinerary Leg Matrix: Cross-Reference Table */}
      {j && j.legs.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-extrabold">
                Itinerary Leg & Exposure Mapping Cross-Reference
              </h3>
              <p className="text-xs text-muted-foreground">
                Trace of how each leg in <strong>{j.label || "Current Trip"}</strong> was evaluated across the 4 Exposure Rules.
              </p>
            </div>
            <span className="text-xs text-muted-foreground font-semibold">
              {j.legs.length} itinerary leg{j.legs.length === 1 ? "" : "s"} evaluated
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-brand-border bg-card shadow-sm">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-brand-border bg-secondary/40">
                  <th className="p-3 w-1/4">Itinerary Leg</th>
                  {exposureRules.map((r) => (
                    <th key={r.id} className="p-3 w-1/5">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-foreground">{r.id}</span>
                        <span>{r.name}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/60">
                {j.legs.map((l) => (
                  <tr key={l.id} className="align-top hover:bg-secondary/20">
                    <td className="p-3 font-semibold">
                      <div className="flex items-center gap-2">
                        {l.kind === "flight" && <Plane className="size-3.5 text-indigo-600" />}
                        {l.kind === "hotel" && <Hotel className="size-3.5 text-amber-600" />}
                        {l.kind === "meeting" && <Briefcase className="size-3.5 text-emerald-600" />}
                        <span>{legLabel(l)}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {l.kind === "flight" ? `${fmtTime(l.depart)} → ${fmtTime(l.arrive)}` : l.kind === "hotel" ? `${fmtDay(l.checkIn)} → ${fmtDay(l.checkOut)}` : `${fmtTime(l.start)} → ${fmtTime(l.end)}`}
                      </p>
                    </td>
                    {exposureRules.map((r) => {
                      const rows = plan ? plan.trace.filter((t) => t.legId === l.id && t.ruleId === r.id) : [];
                      return (
                        <td key={r.id} className="p-3">
                          {rows.length === 0 ? (
                            <span className="text-muted-foreground italic">n/a</span>
                          ) : (
                            <div className="space-y-1">
                              {rows.map((row, idx) => (
                                <div
                                  key={idx}
                                  className={`rounded p-1.5 text-[11px] leading-tight ${
                                    row.fired
                                      ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                                      : "bg-secondary text-muted-foreground"
                                  }`}
                                >
                                  <div className="flex items-center gap-1 font-bold">
                                    {row.fired ? (
                                      <Check className="size-3 text-emerald-600" />
                                    ) : (
                                      <Minus className="size-3" />
                                    )}
                                    <span>{row.fired ? "Triggered" : "Not Triggered"}</span>
                                  </div>
                                  <p className="mt-0.5">{row.detail}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Allergen Matrix Reference & Refusal Protocol Table (§4.7, §4.8) */}
      <section className="grid lg:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="size-5 text-brand-primary" />
            <h3 className="font-display text-lg font-extrabold">Published Exclusion Sets (§4.7)</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Six segregation sets (Patent GB2617886.3) manufactured during dedicated runs on Wed/Thu/Fri. Kitchen run order: {RUN_ORDER.map((id) => setById(id).code).join(" → ")} (most restrictive exclusion set first).
          </p>
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-brand-border">
                  <th className="py-2 pr-3">Set</th>
                  <th className="py-2 pr-3">Excluded Allergens</th>
                  <th className="py-2">Production Logic</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/60">
                {EXCLUSION_SETS.map((s) => (
                  <tr key={s.id} className="align-top">
                    <td className="py-2 pr-3">
                      <SetBadge setId={s.id} />
                    </td>
                    <td className="py-2 pr-3 font-semibold text-foreground">
                      {s.excludes.map((a) => ALLERGENS[a]).join(", ")}
                    </td>
                    <td className="py-2 text-[11px] text-muted-foreground">
                      {s.why}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="size-5 text-amber-600" />
            <h3 className="font-display text-lg font-extrabold">Rule R5 Refusal Protocol (§4.8)</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            SafeMeal evaluates allergy profiles against published sets. Any combination not strictly covered without unstated assumptions is refused at order time, never served on a best-efforts basis.
          </p>
          <ul className="mt-4 space-y-2.5 text-xs">
            {([
              { allergens: ["peanut"] as Allergen[], label: "Peanut only" },
              { allergens: ["peanut", "sesame"] as Allergen[], label: "Peanut + Sesame" },
              { allergens: ["milk"] as Allergen[], label: "Milk only" },
              { allergens: ["milk", "peanut"] as Allergen[], label: "Milk + Peanut" },
              { allergens: ["gluten"] as Allergen[], label: "Gluten / Coeliac" },
              { allergens: ["fish", "crustacean", "mollusc"] as Allergen[], label: "Fish & Shellfish" },
              { allergens: ["celery", "gluten"] as Allergen[], label: "Celery + Gluten (Uncovered)" },
            ]).map((example, idx) => {
              const m = matchExclusionSet(example.allergens);
              return (
                <li key={idx} className="flex items-center justify-between p-2 rounded-lg bg-secondary/50 border border-brand-border/60">
                  <span className="font-semibold text-foreground w-48 truncate">
                    {example.label}
                  </span>
                  <div className="flex items-center gap-2">
                    {m.set ? (
                      <SetBadge setId={m.set.id} />
                    ) : (
                      <span className="rounded bg-red-100 border border-red-200 px-2 py-0.5 text-[10px] font-bold text-red-800">
                        Refused
                      </span>
                    )}
                    <span className="text-[11px] text-muted-foreground max-w-[200px] truncate">
                      {m.set ? `Covered by ${m.set.code}` : "Refusal: not in published sets"}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      </section>

      {/* Resulting Meal-Kits & Physical Handover Batches */}
      {j && plan && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-extrabold">
                Derived Kits & Handover Batches for {j.label || "Active Trip"}
              </h3>
              <p className="text-xs text-muted-foreground">
                Computed directly by JAAP rules from your itinerary. Consistent with Meal Plan and Kit Records.
              </p>
            </div>
            <Link
              to="/records"
              search={{ journey: j.id }}
              className="text-xs font-bold text-brand-primary hover:underline"
            >
              View Full Kit Ledger →
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {plan.windows.map((w) => {
              const kits = plan.kits.filter((k) => k.windowKey === w.key);
              return (
                <div
                  key={w.key}
                  className={`rounded-2xl border p-4 text-xs transition-all ${
                    w.accepted
                      ? "border-brand-border bg-card shadow-sm"
                      : "border-dashed border-brand-border bg-secondary/30 opacity-70"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="rounded bg-brand-primary/10 text-brand-primary px-2 py-0.5 text-[10px] font-bold">
                      Rule {w.ruleId}
                    </span>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">
                      {WINDOW_TYPES[w.type].label}
                    </span>
                  </div>
                  <p className="font-bold text-sm text-foreground">{w.place}</p>
                  <p className="text-muted-foreground mt-1">
                    Occasion: {fmtRange(w.occasionStart, w.occasionEnd)}
                  </p>
                  {w.accepted ? (
                    <div className="mt-3 pt-3 border-t border-brand-border/60 flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-muted-foreground">
                        Meal Kits ({kits.length}):
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {kits.map((k) => (
                          <Link
                            key={k.kitId}
                            to="/records/$kitId"
                            params={{ kitId: k.kitId }}
                            className="font-mono font-bold text-[11px] text-brand-accent hover:underline bg-brand-accent/10 px-1.5 py-0.5 rounded"
                          >
                            {k.kitId}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="mt-2 text-muted-foreground italic text-[11px]">
                      Declined: {w.declineReason || "Removed from order"}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
