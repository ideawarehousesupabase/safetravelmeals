import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { SiteShell, PageHeader } from "@/components/site-shell";
import { Card, JaapNav } from "@/components/jaap/jaap-ui";
import { ConfirmButton, WorkspaceGate } from "@/components/workspace-gate";
import { Download, FileUp, Loader2, Upload } from "lucide-react";
import { EVENTS_TEMPLATE, JOURNEYS_TEMPLATE, validateEventsCsv, validateJourneysCsv, type EventImport, type JourneyImport } from "@/lib/data/csv";
import { deleteAllMyData, importRecords } from "@/lib/data/store";
import type { Workspace } from "@/lib/processing";

export const Route = createFileRoute("/import")({
  head: () => ({
    meta: [
      { title: "Import Data — SafeMeal" },
      { name: "description", content: "Import travellers, itineraries and handover events from CSV." },
    ],
  }),
  component: ImportPage,
});

function download(name: string, text: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

function ImportPage() {
  return (
    <SiteShell>
      <PageHeader
        eyebrow="Import data"
        title="Bring your own data"
        description="Import only primary data: travellers, their diagnosed allergens and itineraries, and the handover events you record. The rule engine derives exposure windows, kits, runs, exceptions and validation results from them."
      />
      <JaapNav />
      <WorkspaceGate requireData={false}>{(ws, uid) => <Importers ws={ws} uid={uid} />}</WorkspaceGate>
    </SiteShell>
  );
}

function Importer<T extends JourneyImport | EventImport>({
  title,
  text,
  templateName,
  template,
  validate,
  summary,
  onImport,
}: {
  title: string;
  text: string;
  templateName: string;
  template: string;
  validate: (csv: string) => T;
  summary: (r: T) => string;
  onImport: (r: T) => Promise<void>;
}) {
  const [result, setResult] = useState<T | null>(null);
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-extrabold">{title}</h2>
          <p className="text-sm text-muted-foreground mt-1">{text}</p>
        </div>
        <button onClick={() => download(templateName, template)} className="rounded-full border border-brand-border px-4 py-2 text-xs font-bold flex items-center gap-1 hover:border-brand-accent">
          <Download className="size-3.5" /> Template
        </button>
      </div>
      <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand-border p-5 text-sm font-semibold text-muted-foreground hover:border-brand-accent hover:text-brand-accent">
        <FileUp className="size-4" /> {fileName || "Choose a .csv file"}
        <input
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setFileName(f.name);
            setResult(validate(await f.text()));
            e.target.value = "";
          }}
        />
      </label>
      {result && (
        <div className="mt-4 space-y-3">
          <p className="text-sm">{summary(result)}</p>
          {result.errors.length > 0 ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">
              <p className="font-semibold">{result.errors.length} problem{result.errors.length > 1 ? "s" : ""} found; nothing has been imported.</p>
              <ul className="mt-2 space-y-1 text-xs">
                {result.errors.slice(0, 20).map((e, i) => (
                  <li key={i}>
                    Row {e.row}: {e.message}
                  </li>
                ))}
                {result.errors.length > 20 && <li>…and {result.errors.length - 20} more.</li>}
              </ul>
            </div>
          ) : (
            <button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await onImport(result);
                  toast.success("Imported; plans recalculated");
                  setResult(null);
                  setFileName("");
                } catch (e) {
                  toast.error(`Import failed: ${(e as Error).message}`);
                } finally {
                  setBusy(false);
                }
              }}
              className="rounded-full bg-brand-primary px-5 py-2.5 text-sm font-bold text-white flex items-center gap-2 hover:bg-brand-accent disabled:opacity-60"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} Import
            </button>
          )}
        </div>
      )}
    </Card>
  );
}

function Importers({ ws, uid }: { ws: Workspace; uid: string }) {
  const counts = [
    [ws.travellers.length, "travellers"],
    [ws.journeys.length, "journeys"],
    [ws.kits.length, "kits"],
    [ws.events.length, "recorded events"],
  ] as const;
  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {counts.map(([n, label]) => (
          <div key={label} className="rounded-xl border border-brand-border bg-card p-4">
            <p className="font-display text-2xl font-extrabold">{n}</p>
            <p className="text-xs text-muted-foreground">{label} in your account</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Importer
          title="Travellers and itineraries"
          text="One row per itinerary leg. Rows with the same journey_ref form one journey; travellers are matched to existing profiles by name. Allergens are separated by semicolons."
          templateName="journeys-template.csv"
          template={JOURNEYS_TEMPLATE}
          validate={(csv) => validateJourneysCsv(csv, ws)}
          summary={(r) => `${r.legCount} leg${r.legCount === 1 ? "" : "s"} → ${r.journeys.length} journey${r.journeys.length === 1 ? "" : "s"} for ${r.travellers.length} traveller${r.travellers.length === 1 ? "" : "s"}.`}
          onImport={(r) => importRecords(uid, { travellers: r.travellers, journeys: r.journeys }, ws)}
        />
        <Importer
          title="Handover events"
          text={`One row per event: dispatch, receipt, release, confirm, reaction or resolution. kit_id must be a kit in your account${ws.kits[0] ? ` (for example ${ws.kits[0].kitId})` : ""}.`}
          templateName="events-template.csv"
          template={EVENTS_TEMPLATE}
          validate={(csv) => validateEventsCsv(csv, ws)}
          summary={(r) => `${r.events.length} valid event${r.events.length === 1 ? "" : "s"}.`}
          onImport={(r) => importRecords(uid, { events: r.events }, ws)}
        />
      </div>

      <div>
        <Card className="border-red-200">
          <h2 className="font-display text-lg font-extrabold text-red-800">Delete all my data</h2>
          <p className="text-sm text-muted-foreground mt-1">Removes every traveller, journey, plan, staff record, clearance and event in your account. Your login stays.</p>
          <div className="mt-4">
            <ConfirmButton label="Delete all my data" confirmLabel="Yes, delete everything" onConfirm={() => deleteAllMyData(uid, ws)} />
          </div>
        </Card>
      </div>
    </div>
  );
}
