import { Link, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  Calendar,
  ChefHat,
  Compass,
  FileText,
  FlaskConical,
  Gauge,
  Hotel,
  Info,
  LayoutDashboard,
  ListChecks,
  LogIn,
  LogOut,
  MapPin,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  ShieldCheck,
  Utensils,
  Workflow,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { toast } from "sonner";
import { auth } from "@/lib/firebase";

const navLinks = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/protocol", label: "Protocol" },
  { to: "/itinerary", label: "Itinerary" },
  { to: "/scheduling", label: "Meal Plan" },
  { to: "/meals", label: "Meals" },
  { to: "/tracking", label: "Tracking" },
  { to: "/about", label: "About" },
] as const;

// Sidebar sections for every page inside the app shell.
const sidebarSections = [
  {
    title: "Traveller",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/itinerary", label: "Itinerary", icon: Compass },
      { to: "/scheduling", label: "Meal Plan", icon: Calendar },
      { to: "/meals", label: "Meals", icon: Utensils },
      { to: "/tracking", label: "Tracking", icon: MapPin },
    ],
  },
  {
    title: "JAAP protocol",
    items: [
      { to: "/protocol", label: "Workflow", icon: Workflow },
      { to: "/rules", label: "Rule matrix", icon: ListChecks },
      { to: "/records", label: "Meal-kit records", icon: FileText },
      { to: "/validation", label: "Validation", icon: FlaskConical },
      { to: "/exceptions", label: "Exceptions", icon: AlertTriangle },
    ],
  },
  {
    title: "Operations (demo)",
    items: [
      { to: "/kitchen", label: "Partner kitchen", icon: ChefHat },
      { to: "/hotel", label: "Hotel front desk", icon: Hotel },
      { to: "/admin", label: "Overview", icon: Gauge },
    ],
  },
  {
    title: "Company",
    items: [{ to: "/about", label: "About & contact", icon: Info }],
  },
] as const;

const HIDDEN_KEY = "safemeal.sidebarHidden";

function readHidden() {
  try {
    return localStorage.getItem(HIDDEN_KEY) === "1";
  } catch {
    return false;
  }
}

function useAuthUser() {
  const [user, setUser] = useState<User | null>(() => auth.currentUser);
  useEffect(() => onAuthStateChanged(auth, setUser), []);
  return user;
}

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <div className="size-8 rounded-lg bg-gradient-to-br from-brand-accent to-brand-primary flex items-center justify-center shadow-md shadow-brand-accent/30">
        <ShieldCheck className="size-4 text-white" />
      </div>
      <span className="font-display text-xl font-extrabold tracking-tight">
        SAFE<span className="text-brand-accent">MEAL</span>
      </span>
    </Link>
  );
}

export function SiteNav() {
  return (
    <nav className="sticky top-0 z-50 border-b border-brand-border/50 bg-white/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Logo />
        <div className="hidden lg:flex items-center gap-7 text-sm font-medium text-muted-foreground">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeProps={{ className: "text-brand-accent" }}
              className="hover:text-brand-accent transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Link to="/onboarding" className="hidden sm:inline text-sm font-semibold">
            Login
          </Link>
          <Link
            to="/onboarding"
            className="rounded-full bg-brand-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-brand-primary/20 hover:bg-brand-accent transition-all"
          >
            Plan My Journey
          </Link>
        </div>
      </div>
    </nav>
  );
}

function AppSidebar({ onNavigate, onHide }: { onNavigate?: () => void; onHide: () => void }) {
  const user = useAuthUser();
  const navigate = useNavigate();

  async function logout() {
    await signOut(auth);
    toast.success("Logged out");
    onNavigate?.();
    navigate({ to: "/" });
  }

  const name = user ? user.displayName || user.email?.split("@")[0] || "Traveller" : "";

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <Logo />
        <button
          onClick={onHide}
          className="size-8 rounded-lg grid place-items-center text-muted-foreground hover:bg-secondary hover:text-foreground"
          aria-label="Hide sidebar"
          title="Hide sidebar"
        >
          <PanelLeftClose className="size-4 hidden lg:block" />
          <X className="size-4 lg:hidden" />
        </button>
      </div>

      <div className="px-4 pb-3">
        <Link
          to="/itinerary"
          onClick={onNavigate}
          className="flex items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-brand-primary/20 hover:bg-brand-accent transition-colors"
        >
          <Plus className="size-4" /> Plan my journey
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-5">
        {sidebarSections.map((section) => (
          <div key={section.title}>
            <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map((it) => (
                <Link
                  key={it.to}
                  to={it.to}
                  onClick={onNavigate}
                  activeProps={{ className: "bg-brand-primary text-white shadow-md shadow-brand-primary/20" }}
                  inactiveProps={{ className: "text-muted-foreground hover:bg-secondary hover:text-foreground" }}
                  className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-colors"
                >
                  <it.icon className="size-4 shrink-0" />
                  {it.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-brand-border p-3">
        {user ? (
          <div className="space-y-1">
            <div className="flex items-center gap-3 px-2 py-2">
              <div className="size-9 shrink-0 rounded-full bg-gradient-to-br from-brand-accent to-brand-primary text-white grid place-items-center font-bold text-sm">
                {name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold truncate">{name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50"
            >
              <LogOut className="size-4" /> Logout
            </button>
          </div>
        ) : (
          <Link
            to="/onboarding"
            onClick={onNavigate}
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <LogIn className="size-4" /> Login or sign up
          </Link>
        )}
      </div>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-brand-border bg-card mt-auto">
      <div className="mx-auto max-w-7xl px-6 py-10 flex flex-col md:flex-row justify-between gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="size-7 rounded-lg bg-gradient-to-br from-brand-accent to-brand-primary flex items-center justify-center">
            <ShieldCheck className="size-3.5 text-white" />
          </div>
          <span className="font-display font-extrabold text-foreground">SAFEMEAL</span>
          <span className="ml-3">© 2026 Safe Travel Meal Kits Limited · prototype (TRL 4)</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <Link to="/about" className="hover:text-brand-accent">About</Link>
          <Link to="/admin" className="hover:text-brand-accent">Admin</Link>
          <Link to="/kitchen" className="hover:text-brand-accent">Kitchens</Link>
          <Link to="/hotel" className="hover:text-brand-accent">Hotels</Link>
          <Link to="/protocol" className="hover:text-brand-accent">Protocol</Link>
          <Link to="/validation" className="hover:text-brand-accent">Validation</Link>
        </div>
      </div>
    </footer>
  );
}

// App pages: a sidebar that can be hidden on desktop and slides in as a drawer on phones.
export function SiteShell({ children, footer = true }: { children: ReactNode; footer?: boolean }) {
  const [hidden, setHidden] = useState(readHidden);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const setHiddenSaved = (value: boolean) => {
    setHidden(value);
    try {
      localStorage.setItem(HIDDEN_KEY, value ? "1" : "0");
    } catch {
      // Storage unavailable: the choice lasts for this page view only.
    }
  };

  return (
    <div className="min-h-screen flex bg-background font-sans text-foreground">
      <aside
        className={`${hidden ? "lg:hidden" : "lg:block"} hidden w-64 shrink-0 border-r border-brand-border bg-card sticky top-0 h-screen`}
      >
        <AppSidebar onHide={() => setHiddenSaved(true)} />
      </aside>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-card shadow-elegant">
            <AppSidebar onNavigate={() => setDrawerOpen(false)} onHide={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <div
          className={`${hidden ? "flex" : "flex lg:hidden"} sticky top-0 z-40 h-14 items-center gap-3 border-b border-brand-border/50 bg-white/70 px-4 backdrop-blur-xl`}
        >
          <button
            onClick={() => setDrawerOpen(true)}
            className="lg:hidden size-9 rounded-lg grid place-items-center hover:bg-secondary"
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </button>
          {hidden && (
            <button
              onClick={() => setHiddenSaved(false)}
              className="hidden lg:grid size-9 rounded-lg place-items-center hover:bg-secondary"
              aria-label="Show sidebar"
              title="Show sidebar"
            >
              <PanelLeftOpen className="size-5" />
            </button>
          )}
          <div className={hidden ? "" : "lg:hidden"}>
            <Logo />
          </div>
        </div>
        <main className="flex-1">{children}</main>
        {footer && <SiteFooter />}
      </div>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="border-b border-brand-border bg-gradient-to-b from-secondary/40 to-transparent">
      <div className="mx-auto max-w-7xl px-6 py-12 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div className="max-w-2xl">
          {eyebrow && (
            <p className="text-xs font-bold text-brand-accent uppercase tracking-[0.2em] mb-3">
              {eyebrow}
            </p>
          )}
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="mt-3 text-muted-foreground text-base">{description}</p>
          )}
        </div>
        {children && <div className="flex items-center gap-3">{children}</div>}
      </div>
    </div>
  );
}
