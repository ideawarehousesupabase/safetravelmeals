import { Link } from "@tanstack/react-router";
import { FlaskConical, Info, ShieldAlert, ShieldCheck, ShieldX } from "lucide-react";
import type { ReactNode } from "react";
import type { LedgerEntry } from "@/lib/jaap/demo";
import { setById } from "@/lib/jaap/protocol";
import { fmtDT } from "@/lib/jaap/time";

const tabs = [
  { to: "/protocol", label: "JAAP workflow" },
  { to: "/itinerary", label: "Itinerary planner" },
  { to: "/rules", label: "Rule matrix" },
  { to: "/records", label: "Meal-kit records" },
  { to: "/validation", label: "Validation" },
  { to: "/exceptions", label: "Exceptions" },
] as const;

export function JaapNav() {
  return (
    <div className="border-b border-brand-border bg-card/60">
      <div className="mx-auto max-w-7xl px-6 flex gap-1 overflow-x-auto">
        {tabs.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            activeOptions={{ exact: false }}
            activeProps={{ className: "border-brand-accent text-brand-accent" }}
            inactiveProps={{ className: "border-transparent text-muted-foreground hover:text-foreground" }}
            className="whitespace-nowrap border-b-2 px-3 py-3 text-sm font-semibold transition-colors"
          >
            {t.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function SimulatedBanner({ children }: { children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 text-sm text-amber-900 flex gap-3">
      <FlaskConical className="size-5 shrink-0 mt-0.5" />
      <div>
        <p className="font-bold uppercase tracking-wide text-xs">Simulated demonstration data</p>
        <p className="mt-1">
          {children ??
            "Journeys, runs, swabs, temperatures and handovers on this page are fictional. They are processed by the platform's real rule engine, scheduler and hash chain, but they are not laboratory testing, food safety certification, independent validation or live operational evidence."}
        </p>
      </div>
    </div>
  );
}

export function CapabilityNote({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-brand-border bg-secondary/50 px-4 py-3 text-xs text-muted-foreground flex gap-2">
      <Info className="size-4 shrink-0 text-brand-accent" />
      <div>{children}</div>
    </div>
  );
}

const SET_COLOURS: Record<number, string> = {
  1: "bg-amber-100 text-amber-900 border-amber-200",
  2: "bg-orange-100 text-orange-900 border-orange-200",
  3: "bg-sky-100 text-sky-900 border-sky-200",
  4: "bg-lime-100 text-lime-900 border-lime-200",
  5: "bg-teal-100 text-teal-900 border-teal-200",
  6: "bg-violet-100 text-violet-900 border-violet-200",
};

export function SetBadge({ setId, long = false }: { setId: number; long?: boolean }) {
  const s = setById(setId);
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-bold ${SET_COLOURS[setId]}`}>
      {s.code}
      {long && <span className="ml-1 font-medium">· excludes {s.excludes.length === 9 ? "all nine" : s.excludes.join(", ").replace(/_/g, " ")}</span>}
    </span>
  );
}

const PILL = {
  ok: "bg-emerald-100 text-emerald-800",
  warn: "bg-amber-100 text-amber-800",
  bad: "bg-red-100 text-red-800",
  info: "bg-secondary text-muted-foreground",
};

export function Pill({ tone, children }: { tone: keyof typeof PILL; children: ReactNode }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${PILL[tone]}`}>{children}</span>;
}

export function KitStatusPill({ status }: { status: string }) {
  return <Pill tone={status === "Withdrawn" ? "bad" : "ok"}>{status}</Pill>;
}

export function OutcomePill({ outcome }: { outcome: string }) {
  const tone = outcome === "Open" ? "bad" : outcome === "Resolved" ? "ok" : "warn";
  const Icon = outcome === "Open" ? ShieldX : outcome === "Resolved" ? ShieldCheck : ShieldAlert;
  return (
    <Pill tone={tone}>
      <Icon className="size-3" /> {outcome}
    </Pill>
  );
}

export const ACTOR_TONE = (to: string) =>
  ["held", "withdrawn", "unconfirmed"].includes(to) ? "bad" : to === "receipt confirmed" ? "ok" : "info";

export function LedgerTable({
  entries,
  brokenAt = null,
  highlight,
}: {
  entries: LedgerEntry[];
  brokenAt?: number | null;
  highlight?: (e: LedgerEntry) => boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-brand-border">
            <th className="py-2 pr-3">#</th>
            <th className="pr-3">Time</th>
            <th className="pr-3">Event</th>
            <th className="pr-3">State</th>
            <th className="pr-3">Actor</th>
            <th className="pr-3">Hash</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => {
            const broken = brokenAt !== null && e.seq >= brokenAt;
            const hl = highlight?.(e);
            return (
              <tr
                key={e.seq}
                className={`border-b border-brand-border/60 align-top ${broken ? "bg-red-50" : hl ? "bg-amber-50" : ""}`}
              >
                <td className="py-2 pr-3 font-mono text-muted-foreground">{e.seq}</td>
                <td className="pr-3 whitespace-nowrap">{fmtDT(e.ts)}</td>
                <td className="pr-3 py-2 min-w-[260px]">
                  <p className="font-semibold">{e.event}</p>
                  <p className="text-muted-foreground mt-0.5">{e.detail}</p>
                  {e.corrects !== null && <p className="mt-1 font-semibold text-amber-700">Corrects entry #{e.corrects} (original kept)</p>}
                </td>
                <td className="pr-3 whitespace-nowrap">
                  <span className="text-muted-foreground">{e.from}</span> →{" "}
                  <Pill tone={ACTOR_TONE(e.to)}>{e.to}</Pill>
                </td>
                <td className="pr-3 font-mono whitespace-nowrap">{e.actor}</td>
                <td className="pr-3 font-mono whitespace-nowrap">
                  <span title={e.hash} className={broken ? "text-red-700" : ""}>
                    {e.hash.slice(0, 10)}…
                  </span>
                  <p className="text-muted-foreground" title={e.prevHash}>
                    prev {e.prevHash.slice(0, 8)}…
                  </p>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-brand-border bg-card p-6 ${className}`}>{children}</div>;
}
