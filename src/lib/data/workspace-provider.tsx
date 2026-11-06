// One set of live Firestore listeners for the signed-in account, mounted once at the app
// root. Every page reads the derived workspace from here, so all pages agree.
import { onAuthStateChanged, type User } from "firebase/auth";
import { collection, onSnapshot } from "firebase/firestore";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { auth, db } from "../firebase";
import { deriveWorkspace, type Workspace, type WorkspaceSnapshot } from "../processing";
import { nowLondon } from "../jaap/time";
import { COLLECTIONS, writeStalePlans, type CollectionName } from "./store";

export type WorkspaceState =
  | { status: "loading"; user: User | null; workspace: null; error: null }
  | { status: "signed-out"; user: null; workspace: null; error: null }
  | { status: "error"; user: User; workspace: null; error: string }
  | { status: "ready"; user: User; workspace: Workspace; error: null };

const Ctx = createContext<WorkspaceState>({ status: "loading", user: null, workspace: null, error: null });

type Raw = Partial<Record<CollectionName, Record<string, unknown>[]>>;

function toSnapshot(raw: Raw): WorkspaceSnapshot {
  const get = <T,>(name: CollectionName) => (raw[name] ?? []) as T[];
  return {
    travellers: get("travellers"),
    journeys: get("journeys"),
    plans: get("plans"),
    staff: get("staff"),
    clearances: get("clearances"),
    events: get("events"),
  };
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [raw, setRaw] = useState<Raw>({});
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(nowLondon());
  const written = useRef(new Set<string>());

  useEffect(() => onAuthStateChanged(auth, (u) => setUser(u)), []);

  // Real-time rules (a missing receipt after its deadline) re-evaluate every minute.
  useEffect(() => {
    const t = setInterval(() => setNow(nowLondon()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    setRaw({});
    setError(null);
    written.current.clear();
    if (!user) return;
    const unsubs = COLLECTIONS.map((name) =>
      onSnapshot(
        collection(db, "users", user.uid, name),
        (snap) => setRaw((r) => ({ ...r, [name]: snap.docs.map((d) => ({ id: d.id, ...d.data() })) })),
        (err) => setError(err.code === "permission-denied" ? "Firestore refused access. Deploy firestore.rules to this Firebase project, then reload." : err.message),
      ),
    );
    return () => unsubs.forEach((u) => u());
  }, [user]);

  const loaded = COLLECTIONS.every((n) => raw[n] !== undefined);
  const workspace = useMemo(() => (loaded ? deriveWorkspace(toSnapshot(raw), now) : null), [loaded, raw, now]);

  // Persist plans the engine had to recompute, once per input version.
  useEffect(() => {
    if (!user || !workspace || !workspace.stalePlanIds.length) return;
    const pending = workspace.stalePlanIds.filter((id) => !written.current.has(`${id}:${workspace.plansById[id].inputHash}`));
    if (!pending.length) return;
    pending.forEach((id) => written.current.add(`${id}:${workspace.plansById[id].inputHash}`));
    writeStalePlans(user.uid, { ...workspace, stalePlanIds: pending }).catch((e) => setError(String(e?.message ?? e)));
  }, [user, workspace]);

  const value: WorkspaceState =
    user === undefined
      ? { status: "loading", user: null, workspace: null, error: null }
      : user === null
        ? { status: "signed-out", user: null, workspace: null, error: null }
        : error
          ? { status: "error", user, workspace: null, error }
          : workspace
            ? { status: "ready", user, workspace, error: null }
            : { status: "loading", user, workspace: null, error: null };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useWorkspace = () => useContext(Ctx);
