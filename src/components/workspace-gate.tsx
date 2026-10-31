import { Link } from "@tanstack/react-router";
import { AlertTriangle, Database, FileUp, Loader2, LogIn, Plus } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { loadSampleData } from "@/lib/data/store";
import { useWorkspace } from "@/lib/data/workspace-provider";
import type { Workspace } from "@/lib/processing";

function Panel({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "error" }) {
  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className={`rounded-2xl border p-8 text-center ${tone === "error" ? "border-red-200 bg-red-50" : "border-brand-border bg-card"}`}>{children}</div>
    </div>
  );
}

export function LoadSampleButton({ uid, className = "" }: { uid: string; className?: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await loadSampleData(uid);
          toast.success("Sample data added to your account");
        } catch (e) {
          toast.error(`Could not add sample data: ${(e as Error).message}`);
        } finally {
          setBusy(false);
        }
      }}
      className={`rounded-full border border-brand-border px-5 py-2.5 text-sm font-bold flex items-center justify-center gap-2 hover:border-brand-accent disabled:opacity-60 ${className}`}
    >
      {busy ? <Loader2 className="size-4 animate-spin" /> : <Database className="size-4" />} Load sample data
    </button>
  );
}

// A destructive action that needs a second click instead of a browser dialog.
export function ConfirmButton({ label, confirmLabel, onConfirm, className = "" }: { label: string; confirmLabel: string; onConfirm: () => Promise<void>; className?: string }) {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!armed)
    return (
      <button onClick={() => setArmed(true)} className={`rounded-full px-4 py-2 text-xs font-bold text-red-700 hover:bg-red-50 ${className}`}>
        {label}
      </button>
    );
  return (
    <span className="inline-flex items-center gap-1">
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await onConfirm();
          } catch (e) {
            toast.error((e as Error).message);
          } finally {
            setBusy(false);
            setArmed(false);
          }
        }}
        className="rounded-full bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-60"
      >
        {busy ? "Deleting…" : confirmLabel}
      </button>
      <button onClick={() => setArmed(false)} className="rounded-full px-3 py-2 text-xs font-bold text-muted-foreground hover:bg-secondary">
        Cancel
      </button>
    </span>
  );
}

export function EmptyState({ uid, title, text }: { uid: string; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-brand-border bg-card p-8 text-center">
      <p className="font-display text-xl font-extrabold">{title}</p>
      <p className="mt-2 text-sm text-muted-foreground max-w-xl mx-auto">{text}</p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <Link to="/itinerary" className="rounded-full bg-brand-primary px-5 py-2.5 text-sm font-bold text-white flex items-center gap-2 hover:bg-brand-accent">
          <Plus className="size-4" /> Add a journey
        </Link>
        <Link to="/import" className="rounded-full border border-brand-border px-5 py-2.5 text-sm font-bold flex items-center gap-2 hover:border-brand-accent">
          <FileUp className="size-4" /> Import CSV
        </Link>
        <LoadSampleButton uid={uid} />
      </div>
    </div>
  );
}

// Renders a page's content only when the signed-in account's workspace is ready.
export function WorkspaceGate({
  children,
  requireData = true,
  emptyTitle = "No journeys yet",
  emptyText = "Add a traveller's allergen profile and itinerary, or import them from CSV. The rule engine works out the exposure windows, kits, runs and handovers from that.",
}: {
  children: (ws: Workspace, uid: string) => ReactNode;
  requireData?: boolean;
  emptyTitle?: string;
  emptyText?: string;
}) {
  const s = useWorkspace();
  if (s.status === "loading")
    return (
      <Panel>
        <Loader2 className="size-6 animate-spin mx-auto text-brand-accent" />
        <p className="mt-3 text-sm text-muted-foreground">Loading your data…</p>
      </Panel>
    );
  if (s.status === "signed-out")
    return (
      <Panel>
        <p className="font-display text-xl font-extrabold">Sign in to see your data</p>
        <p className="mt-2 text-sm text-muted-foreground">Journeys, kits and records are private to each account.</p>
        <Link to="/onboarding" className="mt-5 inline-flex items-center gap-2 rounded-full bg-brand-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-accent">
          <LogIn className="size-4" /> Login or sign up
        </Link>
      </Panel>
    );
  if (s.status === "error")
    return (
      <Panel tone="error">
        <AlertTriangle className="size-6 mx-auto text-red-700" />
        <p className="mt-2 font-semibold text-red-900">Your data could not be loaded</p>
        <p className="mt-1 text-sm text-red-800">{s.error}</p>
      </Panel>
    );
  if (requireData && s.workspace.isEmpty)
    return (
      <div className="mx-auto max-w-7xl px-6 py-10">
        <EmptyState uid={s.user.uid} title={emptyTitle} text={emptyText} />
      </div>
    );
  return <>{children(s.workspace, s.user.uid)}</>;
}
