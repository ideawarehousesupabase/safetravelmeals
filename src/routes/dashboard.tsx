import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Plane, Hotel, Train, Utensils, Calendar as CalIcon,
  MessageSquare, Settings, LogOut, Search, Bell, ChevronLeft, ChevronRight,
  TrendingUp, ShieldCheck, MapPin, Sparkles, Plus, Compass, Bookmark, Image as ImgIcon,
} from "lucide-react";
import { KitStatusPill, SetBadge, SimulatedBanner } from "@/components/jaap/jaap-ui";
import { FEATURED_IDS, allergenList, journeyById, kitById } from "@/lib/jaap/demo";
import { DISHES, WINDOW_TYPES } from "@/lib/jaap/protocol";
import { legLabel } from "@/lib/jaap/engine";
import { fmtDT, fmtDay, toMin } from "@/lib/jaap/time";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { SiteShell } from "@/components/site-shell";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — SafeMeal" },
      { name: "description", content: "Your journeys, allergen profile, kits and custody records." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate({ to: "/onboarding" });
      } else {
        setUserName(user.displayName || user.email?.split("@")[0] || "Traveler");
        setUserEmail(user.email ?? "");
        setReady(true);
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  if (!ready) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <div className="size-8 rounded-full border-2 border-brand-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <SiteShell footer={false}>
      <div className="min-h-full bg-gradient-to-br from-indigo-50/40 via-background to-emerald-50/30">
        <div className="mx-auto max-w-[1400px] px-4 py-6 lg:px-8 space-y-6">
          <TopBar name={userName} />
          <SimulatedBanner>This account has no journeys yet. The dashboard below shows sample journey {SAMPLE.id} so you can see what it will hold; every figure is simulated demonstration data.</SimulatedBanner>
          <KPIRow />
          <div className="grid lg:grid-cols-3 gap-6">
            <RevenueCard />
            <DestinationsCard />
          </div>
          <div className="grid lg:grid-cols-3 gap-6">
            <CalendarCard />
            <TotalTripsCard />
            <UpcomingTripsCard />
          </div>
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2"><MealPackagesCard /></div>
            <MessagesCard />
          </div>
        </div>
      </div>
    </SiteShell>
  );
}

/* ------------- Top Bar ------------- */

function TopBar({ name }: { name: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-brand-accent">Welcome back</p>
        <h1 className="font-display text-3xl font-extrabold tracking-tight mt-1">
          Hello, {name} 👋
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Your journeys, kits and custody records in one place.</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center gap-2 rounded-full border border-brand-border bg-white/80 backdrop-blur px-4 py-2 w-72">
          <Search className="size-4 text-muted-foreground" />
          <input placeholder="Search journeys and kits…" className="flex-1 bg-transparent text-sm outline-none" />
        </div>
        <Link to="/itinerary" className="rounded-full bg-brand-primary px-4 py-2.5 text-sm font-bold text-white flex items-center gap-2 hover:bg-brand-accent shadow-md shadow-brand-primary/20">
          <Plus className="size-4" /> New trip
        </Link>
      </div>
    </div>
  );
}

/* ------------- Sample journey ------------- */

const SAMPLE = journeyById(FEATURED_IDS.business)!;
const SAMPLE_KITS = SAMPLE.kitIds.map((id) => kitById(id)!);
const LEG_ICON = { flight: Plane, hotel: Hotel, meeting: Compass };

/* ------------- KPI ------------- */

function KPIRow() {
  const stats = [
    { label: "Exposure windows mapped", val: SAMPLE.windows.length, icon: Compass, tint: "from-indigo-100 to-indigo-50", color: "text-indigo-600" },
    { label: "Kits in plan", val: SAMPLE_KITS.length, icon: Utensils, tint: "from-emerald-100 to-emerald-50", color: "text-emerald-600" },
    { label: "Handovers", val: SAMPLE.batches.length, icon: MapPin, tint: "from-sky-100 to-sky-50", color: "text-sky-600" },
    { label: "Custody entries", val: SAMPLE_KITS.reduce((n, k) => n + k.ledger.length, 0), icon: ShieldCheck, tint: "from-amber-100 to-amber-50", color: "text-amber-600" },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s) => (
        <div key={s.label} className={`relative overflow-hidden rounded-2xl border border-white/60 bg-gradient-to-br ${s.tint} p-5 shadow-sm`}>
          <div className={`size-10 rounded-xl bg-white grid place-items-center ${s.color} shadow-sm`}>
            <s.icon className="size-4" />
          </div>
          <p className="mt-4 text-xs text-muted-foreground font-semibold">{s.label}</p>
          <p className="font-display text-2xl font-extrabold tracking-tight mt-0.5">{s.val}</p>
        </div>
      ))}
    </div>
  );
}

/* ------------- Exposure windows ------------- */

function RevenueCard() {
  return (
    <div className="lg:col-span-2 rounded-3xl border border-brand-border bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-extrabold text-lg">Exposure windows</h3>
          <p className="text-xs text-muted-foreground">{SAMPLE.label}</p>
        </div>
        <Link to="/scheduling" className="text-xs font-bold text-brand-accent">Meal plan →</Link>
      </div>
      <ul className="divide-y divide-brand-border/70">
        {SAMPLE.windows.map((w) => (
          <li key={w.key} className={`py-3 flex items-center gap-3 text-sm ${w.accepted ? "" : "opacity-60"}`}>
            <span className="rounded bg-brand-primary px-1.5 py-0.5 text-[10px] font-bold text-white">{w.ruleId}</span>
            <span className="flex-1">
              <span className="font-semibold">{WINDOW_TYPES[w.type].label}</span> · {w.place}
            </span>
            <span className="text-xs text-muted-foreground whitespace-nowrap">{w.accepted ? fmtDT(w.occasionStart) : "Removed"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------- Allergen profile ------------- */

function DestinationsCard() {
  return (
    <div className="rounded-3xl border border-brand-border bg-white p-6 shadow-sm">
      <h3 className="font-display font-extrabold text-lg mb-1">Allergen profile</h3>
      <p className="text-xs text-muted-foreground mb-4">Held under explicit consent</p>
      <dl className="space-y-3 text-sm">
        <div><dt className="text-xs text-muted-foreground">Diagnosed allergens</dt><dd className="font-semibold">{allergenList(SAMPLE.allergens)}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Severity</dt><dd className="font-semibold">{SAMPLE.severity}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Exclusion set</dt><dd><SetBadge setId={SAMPLE.set!.id} long /></dd></div>
        <div><dt className="text-xs text-muted-foreground">Menu preference</dt><dd className="font-semibold">{SAMPLE.preference}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Record key</dt><dd className="font-mono text-xs">{SAMPLE.travellerKey}</dd></div>
      </dl>
    </div>
  );
}

/* ------------- Calendar ------------- */

function CalendarCard() {
  const [month, setMonth] = useState(new Date(2027, 3, 1)); // April 2027, the sample journey
  const occasionDays = SAMPLE.windows.filter((w) => w.accepted).map((w) => w.occasionStart.slice(0, 10));
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const iso = (d: number) => `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const monthName = month.toLocaleString("en", { month: "long", year: "numeric" });
  return (
    <div className="rounded-3xl border border-brand-border bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-extrabold text-lg">{monthName}</h3>
        <div className="flex gap-1">
          <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="size-7 rounded-full border border-brand-border grid place-items-center hover:bg-secondary"><ChevronLeft className="size-3.5" /></button>
          <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="size-7 rounded-full border border-brand-border grid place-items-center hover:bg-secondary"><ChevronRight className="size-3.5" /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase text-muted-foreground mb-2">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <span key={i}>{d}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((c, i) => (
          <div key={i} className={`aspect-square grid place-items-center text-xs rounded-lg ${
            c && occasionDays.includes(iso(c)) ? "bg-brand-accent/15 text-brand-accent font-bold" : c ? "hover:bg-secondary" : ""
          }`}>{c ?? ""}</div>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">Highlighted: days with a kit occasion.</p>
    </div>
  );
}

/* ------------- Kit status ------------- */

function TotalTripsCard() {
  const rows: [string, number, string][] = [
    ["Receipt confirmed", SAMPLE_KITS.filter((k) => k.status === "Receipt confirmed").length, "bg-emerald-500"],
    ["Withdrawn", SAMPLE_KITS.filter((k) => k.status === "Withdrawn").length, "bg-rose-400"],
    ["With an exception recorded", SAMPLE_KITS.filter((k) => k.exceptionIds.length).length, "bg-amber-400"],
  ];
  return (
    <div className="rounded-3xl border border-brand-border bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-semibold">Kits in this journey</p>
          <p className="font-display text-3xl font-extrabold mt-1">{SAMPLE_KITS.length}</p>
        </div>
        <div className="size-10 rounded-xl bg-emerald-100 text-emerald-700 grid place-items-center">
          <Utensils className="size-4" />
        </div>
      </div>
      <div className="mt-6 space-y-3">
        {rows.map(([k, v, c]) => (
          <div key={k}>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-muted-foreground">{k}</span>
              <span>{v}</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div className={`h-full ${c}`} style={{ width: `${(v / SAMPLE_KITS.length) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------- Itinerary ------------- */

function UpcomingTripsCard() {
  return (
    <div className="rounded-3xl border border-brand-border bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-extrabold text-lg">Itinerary</h3>
        <Link to="/itinerary" search={{ journey: SAMPLE.id }} className="text-xs font-bold text-brand-accent">Open →</Link>
      </div>
      <div className="space-y-3">
        {SAMPLE.legs.map((l) => {
          const Icon = LEG_ICON[l.kind];
          const when = l.kind === "flight" ? l.depart : l.kind === "hotel" ? l.checkIn : l.start;
          return (
            <div key={l.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/60 transition-colors">
              <div className="size-10 rounded-xl bg-indigo-100 text-indigo-600 grid place-items-center"><Icon className="size-4" /></div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{legLabel(l)}</p>
                <p className="text-xs text-muted-foreground">{fmtDT(when)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------- Kits ------------- */

function MealPackagesCard() {
  return (
    <div className="rounded-3xl border border-brand-border bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-extrabold text-lg">Your kits</h3>
          <p className="text-xs text-muted-foreground">{SAMPLE.productInfo?.name} · {SAMPLE.productInfo?.price}</p>
        </div>
        <Link to="/records" search={{ journey: SAMPLE.id }} className="text-xs font-bold text-brand-accent">All records →</Link>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        {SAMPLE_KITS.slice(0, 3).map((k) => (
          <Link to="/records/$kitId" params={{ kitId: k.id }} key={k.id} className="group rounded-2xl border border-brand-border overflow-hidden hover:shadow-elegant transition-all hover:-translate-y-0.5">
            <div className="aspect-[4/3] bg-gradient-to-br from-emerald-200 to-teal-100 grid place-items-center relative">
              <ImgIcon className="size-8 text-white/80" />
              <span className="absolute top-2 left-2 text-[10px] font-bold uppercase tracking-widest bg-white/90 backdrop-blur px-2 py-0.5 rounded-full text-brand-primary">{k.sealNo}</span>
            </div>
            <div className="p-3">
              <p className="font-semibold text-sm">{DISHES[SAMPLE.preference][k.type]}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{WINDOW_TYPES[k.type].kit} · {k.id}</p>
              <div className="mt-1"><KitStatusPill status={k.status} /></div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ------------- Record updates ------------- */

function MessagesCard() {
  const entries = SAMPLE_KITS.flatMap((k) => k.ledger)
    .sort((a, b) => toMin(b.ts) - toMin(a.ts))
    .slice(0, 5);
  return (
    <div className="rounded-3xl border border-brand-border bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-extrabold text-lg">Record updates</h3>
        <Link to="/exceptions" className="text-xs font-bold text-brand-accent">Exceptions</Link>
      </div>
      <div className="space-y-3">
        {entries.map((e) => (
          <div key={`${e.kitId}-${e.seq}`} className="flex items-start gap-3 p-2 rounded-xl hover:bg-secondary/60 transition-colors">
            <div className={`size-9 rounded-full ${e.data.exception ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"} grid place-items-center text-[10px] font-bold shrink-0`}>
              #{e.seq}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-semibold text-sm truncate">{e.event}</p>
                <span className="text-[10px] text-muted-foreground shrink-0">{fmtDay(e.ts)}</span>
              </div>
              <p className="text-xs text-muted-foreground truncate">{e.kitId} · {e.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
