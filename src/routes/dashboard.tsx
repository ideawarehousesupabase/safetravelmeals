import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Plane, Hotel, Train, Utensils, Calendar as CalIcon,
  MessageSquare, Settings, LogOut, Search, Bell, ChevronLeft, ChevronRight,
  TrendingUp, ShieldCheck, MapPin, Sparkles, Plus, Compass, Bookmark, Image as ImgIcon,
} from "lucide-react";
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, PieChart, Pie, Cell,
} from "recharts";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — SafeMeal" },
      { name: "description", content: "Your travel meals, safety profile and AI recommendations." },
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

  async function logout() {
    await signOut(auth);
    toast.success("Logged out");
    navigate({ to: "/" });
  }

  if (!ready) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <div className="size-8 rounded-full border-2 border-brand-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50/40 via-background to-emerald-50/30 font-sans text-foreground">
      <div className="mx-auto max-w-[1400px] px-4 py-4 lg:px-6 lg:py-6 grid lg:grid-cols-[240px_1fr] gap-6">
        <Sidebar onLogout={logout} email={userEmail} name={userName} />
        <main className="min-w-0 space-y-6">
          <TopBar name={userName} />
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
        </main>
      </div>
    </div>
  );
}

/* ------------- Sidebar ------------- */

function Sidebar({ onLogout, email, name }: { onLogout: () => void; email: string; name: string }) {
  const items: { icon: any; label: string; to: string; active?: boolean }[] = [
    { icon: LayoutDashboard, label: "Dashboard", to: "/dashboard", active: true },
    { icon: Compass, label: "Itinerary", to: "/itinerary" },
    { icon: Sparkles, label: "AI Scheduler", to: "/scheduling" },
    { icon: Utensils, label: "Meals", to: "/meals" },
    { icon: MapPin, label: "Tracking", to: "/tracking" },
    { icon: CalIcon, label: "Calendar", to: "/scheduling" },
    { icon: Bookmark, label: "Saved", to: "/meals" },
    { icon: MessageSquare, label: "Messages", to: "/about" },
  ];

  return (
    <aside className="hidden lg:flex flex-col rounded-3xl border border-brand-border bg-white/70 backdrop-blur-xl p-5 sticky top-6 h-[calc(100vh-3rem)]">
      <Link to="/" className="flex items-center gap-2 mb-8 px-2">
        <div className="size-9 rounded-xl bg-gradient-to-br from-brand-accent to-brand-primary grid place-items-center shadow-md shadow-brand-accent/30">
          <ShieldCheck className="size-4 text-white" />
        </div>
        <span className="font-display text-lg font-extrabold tracking-tight">
          SAFE<span className="text-brand-accent">MEAL</span>
        </span>
      </Link>

      <nav className="flex-1 space-y-1">
        {items.map((it) => (
          <Link
            key={it.label}
            to={it.to}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              it.active
                ? "bg-brand-primary text-white shadow-md shadow-brand-primary/20"
                : "text-muted-foreground hover:bg-secondary"
            }`}
          >
            <it.icon className="size-4" />
            {it.label}
          </Link>
        ))}
      </nav>

      <div className="border-t border-brand-border pt-4 space-y-1">
        <Link to="/about" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:bg-secondary">
          <Settings className="size-4" /> Settings
        </Link>
        <button onClick={onLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-rose-600 hover:bg-rose-50">
          <LogOut className="size-4" /> Logout
        </button>
        <div className="mt-3 flex items-center gap-3 px-2 py-2">
          <div className="size-9 rounded-full bg-gradient-to-br from-brand-accent to-brand-primary text-white grid place-items-center font-bold text-sm">
            {name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold truncate">{name}</p>
            <p className="text-[10px] text-muted-foreground truncate">{email}</p>
          </div>
        </div>
      </div>
    </aside>
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
        <p className="text-sm text-muted-foreground mt-1">Here's a snapshot of your safe-travel cockpit.</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-full border border-brand-border bg-white/80 backdrop-blur px-4 py-2 w-72">
          <Search className="size-4 text-muted-foreground" />
          <input placeholder="Search trips, meals, kitchens…" className="flex-1 bg-transparent text-sm outline-none" />
        </div>
        <button className="relative size-10 rounded-full border border-brand-border bg-white grid place-items-center hover:bg-secondary">
          <Bell className="size-4" />
          <span className="absolute -top-0.5 -right-0.5 size-4 rounded-full bg-rose-500 text-[9px] text-white grid place-items-center font-bold">2</span>
        </button>
        <Link to="/itinerary" className="rounded-full bg-brand-primary px-4 py-2.5 text-sm font-bold text-white flex items-center gap-2 hover:bg-brand-accent shadow-md shadow-brand-primary/20">
          <Plus className="size-4" /> New trip
        </Link>
      </div>
    </div>
  );
}

/* ------------- KPI ------------- */

function KPIRow() {
  const stats = [
    { label: "Total Trips", val: "1,200", trend: "+2.98%", icon: Plane, tint: "from-indigo-100 to-indigo-50", color: "text-indigo-600" },
    { label: "Safe Meals Delivered", val: "2,845", trend: "+1.45%", icon: Utensils, tint: "from-emerald-100 to-emerald-50", color: "text-emerald-600" },
    { label: "Safety Score", val: "99.4%", trend: "+0.12%", icon: ShieldCheck, tint: "from-sky-100 to-sky-50", color: "text-sky-600" },
    { label: "Avg. Delivery", val: "6 min", trend: "−2 min", icon: TrendingUp, tint: "from-amber-100 to-amber-50", color: "text-amber-600" },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s) => (
        <div key={s.label} className={`relative overflow-hidden rounded-2xl border border-white/60 bg-gradient-to-br ${s.tint} p-5 shadow-sm hover:shadow-elegant transition-all`}>
          <div className="flex items-start justify-between">
            <div className={`size-10 rounded-xl bg-white grid place-items-center ${s.color} shadow-sm`}>
              <s.icon className="size-4" />
            </div>
            <span className="text-[10px] font-bold text-emerald-700 bg-white/80 px-2 py-0.5 rounded-full">{s.trend}</span>
          </div>
          <p className="mt-4 text-xs text-muted-foreground font-semibold">{s.label}</p>
          <p className="font-display text-2xl font-extrabold tracking-tight mt-0.5">{s.val}</p>
        </div>
      ))}
    </div>
  );
}

/* ------------- Revenue / Meals chart ------------- */

const chartData = [
  { d: "Sun", v: 220 }, { d: "Mon", v: 380 }, { d: "Tue", v: 310 },
  { d: "Wed", v: 540 }, { d: "Thu", v: 460 }, { d: "Fri", v: 635 }, { d: "Sat", v: 480 },
];

function RevenueCard() {
  return (
    <div className="lg:col-span-2 rounded-3xl border border-brand-border bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-extrabold text-lg">Meals Overview</h3>
          <p className="text-xs text-muted-foreground">Verified safe meals delivered this week</p>
        </div>
        <div className="inline-flex p-1 rounded-full border border-brand-border text-xs font-bold">
          {["Weekly", "Monthly"].map((t, i) => (
            <button key={t} className={`px-3 py-1 rounded-full ${i === 0 ? "bg-brand-primary text-white" : "text-muted-foreground"}`}>{t}</button>
          ))}
        </div>
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ left: -20, right: 0, top: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.685 0.169 237.323)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="oklch(0.685 0.169 237.323)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="d" stroke="oklch(0.65 0.01 240)" tickLine={false} axisLine={false} fontSize={11} />
            <YAxis stroke="oklch(0.65 0.01 240)" tickLine={false} axisLine={false} fontSize={11} />
            <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.92 0.01 240)", fontSize: 12 }} />
            <Area type="monotone" dataKey="v" stroke="oklch(0.685 0.169 237.323)" strokeWidth={3} fill="url(#g1)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ------------- Top Destinations ------------- */

const dests = [
  { name: "Tokyo, Japan", val: 35, color: "oklch(0.685 0.169 237.323)" },
  { name: "Sydney, AU", val: 28, color: "oklch(0.78 0.15 165)" },
  { name: "Paris, France", val: 22, color: "oklch(0.75 0.13 50)" },
  { name: "Venice, Italy", val: 15, color: "oklch(0.7 0.12 330)" },
];

function DestinationsCard() {
  return (
    <div className="rounded-3xl border border-brand-border bg-white p-6 shadow-sm">
      <h3 className="font-display font-extrabold text-lg mb-1">Top Destinations</h3>
      <p className="text-xs text-muted-foreground mb-4">This month</p>
      <div className="h-36">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={dests} dataKey="val" innerRadius={40} outerRadius={60} paddingAngle={3}>
              {dests.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-2 space-y-2">
        {dests.map((d) => (
          <li key={d.name} className="flex items-center gap-2 text-xs">
            <span className="size-2 rounded-full" style={{ background: d.color }} />
            <span className="flex-1 font-semibold">{d.name}</span>
            <span className="text-muted-foreground">{d.val}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------- Calendar ------------- */

function CalendarCard() {
  const [month, setMonth] = useState(new Date(2026, 6, 1)); // July 2026
  const today = 12;
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
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
            c === today ? "bg-brand-primary text-white font-bold" :
            c && [3, 16, 19, 22].includes(c) ? "bg-brand-accent/15 text-brand-accent font-bold" :
            c ? "hover:bg-secondary" : ""
          }`}>{c ?? ""}</div>
        ))}
      </div>
    </div>
  );
}

/* ------------- Total Trips progress card ------------- */

function TotalTripsCard() {
  return (
    <div className="rounded-3xl border border-brand-border bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-semibold">Total Meal Kits</p>
          <p className="font-display text-3xl font-extrabold mt-1">1,200</p>
        </div>
        <div className="size-10 rounded-xl bg-emerald-100 text-emerald-700 grid place-items-center">
          <Utensils className="size-4" />
        </div>
      </div>
      <div className="mt-6 space-y-3">
        {[
          ["Delivered", 620, "bg-emerald-500"],
          ["Booked", 465, "bg-brand-accent"],
          ["Cancelled", 115, "bg-rose-400"],
        ].map(([k, v, c]) => (
          <div key={k as string}>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-muted-foreground">{k}</span>
              <span>{v}</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div className={`h-full ${c}`} style={{ width: `${(Number(v) / 1200) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------- Upcoming Trips ------------- */

function UpcomingTripsCard() {
  const trips = [
    { route: "LHR → JFK", date: "Today · BA112", icon: Plane, tint: "bg-indigo-100 text-indigo-600" },
    { route: "Edition NY", date: "Fri · Hotel", icon: Hotel, tint: "bg-emerald-100 text-emerald-700" },
    { route: "Penn Station", date: "Sun · Train", icon: Train, tint: "bg-amber-100 text-amber-700" },
  ];
  return (
    <div className="rounded-3xl border border-brand-border bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-extrabold text-lg">Upcoming Trips</h3>
        <Link to="/itinerary" className="text-xs font-bold text-brand-accent">View all →</Link>
      </div>
      <div className="space-y-3">
        {trips.map((t) => (
          <div key={t.route} className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/60 transition-colors">
            <div className={`size-10 rounded-xl ${t.tint} grid place-items-center`}><t.icon className="size-4" /></div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{t.route}</p>
              <p className="text-xs text-muted-foreground">{t.date}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------- Meal Packages ------------- */

function MealPackagesCard() {
  const packs = [
    { name: "Hydration Plus Bowl", tag: "Vegan · Gluten-free", grad: "from-emerald-200 to-teal-100" },
    { name: "Jet-Lag Recovery", tag: "Low-histamine", grad: "from-indigo-200 to-sky-100" },
    { name: "Long-Haul Protein", tag: "Halal · High-protein", grad: "from-amber-200 to-rose-100" },
  ];
  return (
    <div className="rounded-3xl border border-brand-border bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-extrabold text-lg">AI-Recommended Meal Kits</h3>
          <p className="text-xs text-muted-foreground">Matched 100% to your safety profile</p>
        </div>
        <Link to="/meals" className="text-xs font-bold text-brand-accent">Browse all →</Link>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        {packs.map((p) => (
          <Link to="/meals" key={p.name} className="group rounded-2xl border border-brand-border overflow-hidden hover:shadow-elegant transition-all hover:-translate-y-0.5">
            <div className={`aspect-[4/3] bg-gradient-to-br ${p.grad} grid place-items-center relative`}>
              <ImgIcon className="size-8 text-white/80" />
              <span className="absolute top-2 left-2 text-[10px] font-bold uppercase tracking-widest bg-white/90 backdrop-blur px-2 py-0.5 rounded-full text-brand-primary">Safe</span>
            </div>
            <div className="p-3">
              <p className="font-semibold text-sm">{p.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{p.tag}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ------------- Messages ------------- */

function MessagesCard() {
  const msgs = [
    { from: "Europia Hotel", text: "We are pleased to announce…", time: "10:30 AM", c: "bg-rose-100 text-rose-700" },
    { from: "Global Travel Co.", text: "We have updated your trip itinerary.", time: "2:15 PM", c: "bg-indigo-100 text-indigo-700" },
    { from: "Kalendra Umbara", text: "Hi, I need assistance with…", time: "9:45 AM", c: "bg-emerald-100 text-emerald-700" },
    { from: "Osman Farooq", text: "Hello, I need an amazing time…", time: "8:30 AM", c: "bg-amber-100 text-amber-700" },
  ];
  return (
    <div className="rounded-3xl border border-brand-border bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-extrabold text-lg">Messages</h3>
        <button className="text-xs font-bold text-brand-accent">View all</button>
      </div>
      <div className="space-y-3">
        {msgs.map((m) => (
          <div key={m.from} className="flex items-start gap-3 p-2 rounded-xl hover:bg-secondary/60 transition-colors">
            <div className={`size-9 rounded-full ${m.c} grid place-items-center text-xs font-bold shrink-0`}>
              {m.from.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-semibold text-sm truncate">{m.from}</p>
                <span className="text-[10px] text-muted-foreground shrink-0">{m.time}</span>
              </div>
              <p className="text-xs text-muted-foreground truncate">{m.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}