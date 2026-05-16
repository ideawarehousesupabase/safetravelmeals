import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

const navLinks = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/itinerary", label: "Itinerary" },
  { to: "/scheduling", label: "AI Scheduler" },
  { to: "/meals", label: "Meals" },
  { to: "/tracking", label: "Tracking" },
  { to: "/about", label: "About" },
] as const;

export function SiteNav() {
  return (
    <nav className="sticky top-0 z-50 border-b border-brand-border/50 bg-white/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-gradient-to-br from-brand-accent to-brand-primary flex items-center justify-center shadow-md shadow-brand-accent/30">
            <ShieldCheck className="size-4 text-white" />
          </div>
          <span className="font-display text-xl font-extrabold tracking-tight">
            SAFE<span className="text-brand-accent">MEAL</span>
          </span>
        </Link>
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

export function SiteFooter() {
  return (
    <footer className="border-t border-brand-border bg-card mt-auto">
      <div className="mx-auto max-w-7xl px-6 py-10 flex flex-col md:flex-row justify-between gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="size-7 rounded-lg bg-gradient-to-br from-brand-accent to-brand-primary flex items-center justify-center">
            <ShieldCheck className="size-3.5 text-white" />
          </div>
          <span className="font-display font-extrabold text-foreground">SAFEMEAL</span>
          <span className="ml-3">© 2026 SafeMeal Technologies Inc.</span>
        </div>
        <div className="flex items-center gap-6">
          <Link to="/about" className="hover:text-brand-accent">About</Link>
          <Link to="/admin" className="hover:text-brand-accent">Admin</Link>
          <Link to="/kitchen" className="hover:text-brand-accent">Kitchens</Link>
          <Link to="/hotel" className="hover:text-brand-accent">Hotels</Link>
          <span className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-brand-success animate-pulse" />
            Operational
          </span>
        </div>
      </div>
    </footer>
  );
}

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background font-sans text-foreground">
      <SiteNav />
      <main className="flex-1">{children}</main>
      <SiteFooter />
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