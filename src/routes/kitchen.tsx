import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { SiteShell, PageHeader } from "@/components/site-shell";
import { Card, JaapNav, Pill, SampleBanner, SetBadge } from "@/components/jaap/jaap-ui";
import { EmptyState, WorkspaceGate } from "@/components/workspace-gate";
import { ChefHat, Package, ShieldCheck, Check, AlertTriangle, Clock, Plus, UserCheck } from "lucide-react";
import { KITCHEN, evaluateClearance, staffName, type Run, type StaffInput, type Workspace } from "@/lib/processing";
import { deleteStaff, newId, saveClearance, saveStaff } from "@/lib/data/store";
import { setById } from "@/lib/jaap/protocol";
import { addMin, fmtDay, fmtDT, fmtTime, nowLondon, toMin } from "@/lib/jaap/time";

export const Route = createFileRoute("/kitchen")({
  head: () => ({
    meta: [
      { title: "Partner Kitchen Run Sheet — SafeMeal" },
      { name: "description", content: "Production runs by day, with line clearance, swab results and the competency register." },
    ],
  }),
  component: KitchenPage,
});

const SURFACES = ["Preparation bench", "Utensils and boards", "Sealing station"];
const input = "rounded-lg border border-brand-border bg-background px-3 py-2 text-sm outline-none focus:border-brand-accent w-full";

function KitchenPage() {
  return (
    <SiteShell>
      <PageHeader eyebrow="Partner kitchen run sheet" title="Production runs" description={`${KITCHEN}. Kits are grouped into single-allergen runs, most restrictive set first. Record each clearance here; a run starts only after a valid clearance.`} />
      <JaapNav />
      <WorkspaceGate>{(ws, uid) => <RunSheet ws={ws} uid={uid} />}</WorkspaceGate>
    </SiteShell>
  );
}

function RunSheet({ ws, uid }: { ws: Workspace; uid: string }) {
  const dates = [...new Set(ws.runs.map((r) => r.date))].sort();
  const today = ws.now.slice(0, 10);
  const [day, setDay] = useState(dates.find((d) => d >= today) ?? dates.at(-1) ?? today);
  const runs = ws.runs.filter((r) => r.date === day).sort((a, b) => a.slot - b.slot);
  const swabs = runs.flatMap((r) => r.clearance?.swabs ?? []);
  const stats = [
    { label: "Runs this day", val: runs.length, icon: ChefHat },
    { label: "Kit-equivalents", val: runs.reduce((n, r) => n + r.kitIds.length, 0), icon: Package },
    { label: "Clearances accepted", val: `${runs.filter((r) => r.status === "accepted").length} / ${runs.length}`, icon: ShieldCheck },
    { label: "Swab detections", val: swabs.filter((s) => s.aboveLimit).length, icon: AlertTriangle },
  ];

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 space-y-6">
      {ws.hasSample && <SampleBanner />}
      {dates.length === 0 ? (
        <EmptyState uid={uid} title="No production runs yet" text="Runs appear once a saved journey has kits. Check that each traveller's allergens are covered by a published exclusion set." />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground mr-1">Production day</span>
            {dates.map((d) => (
              <button key={d} onClick={() => setDay(d)} className={`rounded-full border px-3 py-1 text-xs font-semibold ${d === day ? "border-brand-accent bg-brand-accent/10 text-brand-accent" : "border-brand-border"}`}>
                {fmtDay(d)}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((s) => (
              <div key={s.label} className="rounded-2xl border border-brand-border bg-card p-5 flex items-center justify-between">
                <div>
                  <p className="text-3xl font-display font-extrabold">{s.val}</p>
                  <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                </div>
                <div className="size-11 rounded-xl bg-brand-accent/10 text-brand-accent grid place-items-center">
                  <s.icon className="size-5" />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4 min-w-0">
          {runs.map((r) => (
            <RunCard key={r.id} run={r} ws={ws} uid={uid} />
          ))}
        </div>
        <aside className="space-y-6">
          <StaffRegister ws={ws} uid={uid} />
          <div className="rounded-2xl bg-secondary p-5 text-sm">
            <p className="font-semibold">A valid clearance needs</p>
            <ul className="mt-2 list-disc pl-4 text-xs text-muted-foreground space-y-1">
              <li>a signatory with recorded clearance competency (§13.8);</li>
              <li>the full checklist: line clearance, colour-controlled equipment, goods-in declarations;</li>
              <li>no swab above the method limit after the last re-clean.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

function RunCard({ run, ws, uid }: { run: Run; ws: Workspace; uid: string }) {
  const staffById = new Map(ws.staff.map((s) => [s.id, s]));
  const ev = run.clearance ? evaluateClearance(run.clearance, staffById) : null;
  const [open, setOpen] = useState(false);
  const plannedStart = addMin(`${run.date}T06:30`, run.slot * 100);
  const [staffId, setStaffId] = useState(ws.staff.find((s) => s.clearanceCompetent)?.id ?? ws.staff[0]?.id ?? "");
  const [at, setAt] = useState(run.clearance ? nowLondon() : addMin(plannedStart, 25));
  const [checklist, setChecklist] = useState(true);
  const [results, setResults] = useState<boolean[]>(SURFACES.map(() => false));
  const [declarations, setDeclarations] = useState(run.clearance?.declarations.join(", ") ?? "");
  const [busy, setBusy] = useState(false);

  async function record() {
    if (!staffId) return toast.error("Add a signatory to the staff register first.");
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(at)) return toast.error("Enter the clearance time.");
    setBusy(true);
    try {
      const prev = run.clearance;
      await saveClearance(uid, {
        runId: run.id,
        setId: run.setId,
        kitIds: [...run.kitIds],
        attempts: [...(prev?.attempts ?? []), { staffId, at, checklistComplete: checklist }],
        swabs: [...(prev?.swabs ?? []), ...SURFACES.map((surface, i) => ({ surface, at: addMin(at, -15 + i * 4), aboveLimit: results[i] }))],
        declarations: declarations.split(",").map((d) => d.trim()).filter(Boolean),
        source: prev?.source ?? "user",
      });
      toast.success(`Clearance recorded for ${run.id}`);
      setOpen(false);
      setResults(SURFACES.map(() => false));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`rounded-xl border bg-card p-4 ${run.status === "blocked" ? "border-red-300" : run.status === "accepted" ? "border-brand-border" : "border-amber-300"}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-brand-accent font-mono">{run.id}</span>
            <SetBadge setId={run.setId} />
            <Pill tone={run.status === "accepted" ? "ok" : run.status === "blocked" ? "bad" : "warn"}>{run.status === "not recorded" ? "Clearance not recorded" : run.status === "accepted" ? "Clearance accepted" : "Blocked"}</Pill>
          </div>
          <p className="text-sm mt-1">Excludes {setById(run.setId).excludes.join(", ").replace(/_/g, " ")}</p>
        </div>
        <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="size-3" /> {fmtTime(run.start)}–{fmtTime(run.end)} · {run.kitIds.length} KE of 55</p>
      </div>
      {run.clearance && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          {[...run.clearance.attempts].sort((a, b) => toMin(a.at) - toMin(b.at)).map((a, i) => (
            <Pill key={i} tone={ev?.valid(a) ? "ok" : "bad"}>
              {ev?.valid(a) ? <Check className="size-3" /> : <AlertTriangle className="size-3" />} {fmtTime(a.at)} {staffName(staffById, a.staffId)} {ev?.valid(a) ? "valid" : "not accepted"}
            </Pill>
          ))}
          <span className="text-muted-foreground">
            swabs {run.clearance.swabs.filter((s) => !s.aboveLimit).length}/{run.clearance.swabs.length} below method limit
          </span>
          {ws.exceptions.filter((x) => x.runId === run.id && (x.kind === "clearance" || x.kind === "swab")).map((x) => (
            <Link key={x.id} to="/exceptions" hash={x.id} className="font-bold text-amber-700">{x.type}</Link>
          ))}
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-1">
        {run.kitIds.map((k) => (
          <Link key={k} to="/records/$kitId" params={{ kitId: k }} className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[11px] font-bold text-brand-accent">{k}</Link>
        ))}
      </div>
      {run.status !== "accepted" && (
        <div className="mt-3">
          {!open ? (
            <button onClick={() => setOpen(true)} className="rounded-full bg-brand-primary px-4 py-2 text-xs font-bold text-white hover:bg-brand-accent">
              Record clearance
            </button>
          ) : (
            <div className="rounded-xl border border-brand-border p-3 space-y-3">
              <div className="grid sm:grid-cols-2 gap-2">
                <label className="text-[11px] font-semibold">
                  Signatory
                  <select value={staffId} onChange={(e) => setStaffId(e.target.value)} className={`${input} mt-1`}>
                    {ws.staff.length === 0 && <option value="">Add staff first</option>}
                    {ws.staff.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}{s.clearanceCompetent ? "" : " (no clearance competency)"}</option>
                    ))}
                  </select>
                </label>
                <label className="text-[11px] font-semibold">
                  Signed at
                  <input type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} className={`${input} mt-1`} />
                </label>
              </div>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={checklist} onChange={(e) => setChecklist(e.target.checked)} /> Checklist complete: line cleared, colour-controlled equipment, declarations checked
              </label>
              <div className="grid sm:grid-cols-3 gap-2">
                {SURFACES.map((s, i) => (
                  <label key={s} className="text-[11px] font-semibold">
                    {s} swab
                    <select value={results[i] ? "above" : "below"} onChange={(e) => setResults(results.map((x, j) => (j === i ? e.target.value === "above" : x)))} className={`${input} mt-1`}>
                      <option value="below">Below method limit</option>
                      <option value="above">Above method limit</option>
                    </select>
                  </label>
                ))}
              </div>
              <input value={declarations} onChange={(e) => setDeclarations(e.target.value)} placeholder="Supplier declaration references, comma separated" className={input} />
              <div className="flex gap-2">
                <button disabled={busy} onClick={record} className="rounded-full bg-brand-primary px-4 py-2 text-xs font-bold text-white hover:bg-brand-accent disabled:opacity-60">Save clearance</button>
                <button onClick={() => setOpen(false)} className="rounded-full px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-secondary">Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}
      {run.status === "accepted" && run.acceptedAt && <p className="mt-2 text-[11px] text-muted-foreground">Accepted {fmtDT(run.acceptedAt)}; kits in this run are produced and sealed.</p>}
    </div>
  );
}

function StaffRegister({ ws, uid }: { ws: Workspace; uid: string }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("Partner kitchen staff");
  const [competent, setCompetent] = useState(true);
  return (
    <Card>
      <h3 className="font-display font-extrabold flex items-center gap-2"><UserCheck className="size-4 text-brand-accent" /> Competency register</h3>
      <ul className="mt-3 space-y-2">
        {ws.staff.length === 0 && <li className="text-sm text-muted-foreground">No staff recorded yet.</li>}
        {ws.staff.map((s: StaffInput) => (
          <li key={s.id} className="flex items-center gap-2 text-sm">
            <span className="flex-1">
              <span className="font-semibold">{s.name}</span> <span className="text-xs text-muted-foreground">{s.role}</span>
            </span>
            <button onClick={() => saveStaff(uid, { ...s, clearanceCompetent: !s.clearanceCompetent })} className="text-[11px] font-bold">
              <Pill tone={s.clearanceCompetent ? "ok" : "bad"}>{s.clearanceCompetent ? "Can sign" : "Cannot sign"}</Pill>
            </button>
            <button onClick={() => deleteStaff(uid, s.id)} className="text-[11px] font-bold text-muted-foreground hover:text-red-700">Remove</button>
          </li>
        ))}
      </ul>
      <div className="mt-4 space-y-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className={input} />
        <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Role" className={input} />
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={competent} onChange={(e) => setCompetent(e.target.checked)} /> Trained and assessed to sign clearances
        </label>
        <button
          onClick={async () => {
            if (!name.trim()) return toast.error("Enter a name.");
            await saveStaff(uid, { id: newId(), name: name.trim(), role: role.trim(), clearanceCompetent: competent, source: "user" });
            setName("");
            toast.success("Staff member added");
          }}
          className="rounded-full border border-brand-border px-4 py-2 text-xs font-bold flex items-center gap-1 hover:border-brand-accent"
        >
          <Plus className="size-3.5" /> Add to register
        </button>
      </div>
    </Card>
  );
}
