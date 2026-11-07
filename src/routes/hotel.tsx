import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteShell, PageHeader } from "@/components/site-shell";
import { JaapNav, KitStatusPill, SetBadge } from "@/components/jaap/jaap-ui";
import { EmptyState, WorkspaceGate } from "@/components/workspace-gate";
import { Hotel, Clock, Package, Refrigerator } from "lucide-react";
import type { Workspace } from "@/lib/processing";
import { WINDOW_TYPES } from "@/lib/jaap/protocol";
import { dateOf, fmtDay, fmtRange, fmtTime } from "@/lib/jaap/time";

export const Route = createFileRoute("/hotel")({
  head: () => ({
    meta: [
      { title: "Hotel Front Desk — SafeMeal" },
      { name: "description", content: "Incoming sealed kits, storage and release at each hotel." },
    ],
  }),
  component: HotelPage,
});

function HotelPage() {
  return (
    <SiteShell>
      <PageHeader eyebrow="Hotel front desk" title="Incoming kits by hotel" description="Every hotel handover in your journeys. Check each seal and temperature, record the receipt, store under the written storage acceptance and record every release." />
      <JaapNav />
      <WorkspaceGate>{(ws, uid) => <Desk ws={ws} uid={uid} />}</WorkspaceGate>
    </SiteShell>
  );
}

function Desk({ ws, uid }: { ws: Workspace; uid: string }) {
  const handovers = ws.journeys.flatMap((j) =>
    ws.plansById[j.id].batches
      .filter((b) => b.receiver === "hotel")
      .map((b) => ({ j, b, kits: ws.kits.filter((k) => k.journeyId === j.id && k.batchKey === b.key) })),
  );
  const hotels = [...new Set(handovers.map((h) => h.b.place))].sort();
  const [hotel, setHotel] = useState(hotels[0] ?? "");
  const atHotel = handovers.filter((h) => h.b.place === hotel);
  const dates = [...new Set(atHotel.map((h) => dateOf(h.b.start)))].sort();
  const [day, setDay] = useState<string>("all");
  const shown = atHotel.filter((h) => day === "all" || dateOf(h.b.start) === day).sort((a, b) => a.b.start.localeCompare(b.b.start));
  const totalKits = shown.reduce((n, h) => n + h.kits.length, 0);

  if (!hotels.length) return <div className="mx-auto max-w-7xl px-6 py-10"><EmptyState uid={uid} title="No hotel handovers yet" text="A hotel handover is planned when a journey has a late arrival or hotel breakfast window (rules R1 and R2)." /></div>;

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <select value={hotel} onChange={(e) => { setHotel(e.target.value); setDay("all"); }} className="rounded-lg border border-brand-border bg-background px-3 py-2 text-sm max-w-full">
          {hotels.map((h) => <option key={h}>{h}</option>)}
        </select>
        <button onClick={() => setDay("all")} className={`rounded-full border px-3 py-1 text-xs font-semibold ${day === "all" ? "border-brand-accent bg-brand-accent/10 text-brand-accent" : "border-brand-border"}`}>All dates</button>
        {dates.map((d) => (
          <button key={d} onClick={() => setDay(d)} className={`rounded-full border px-3 py-1 text-xs font-semibold ${d === day ? "border-brand-accent bg-brand-accent/10 text-brand-accent" : "border-brand-border"}`}>{fmtDay(d)}</button>
        ))}
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 min-w-0 rounded-2xl border border-brand-border bg-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display font-extrabold text-lg">Incoming handovers</h2>
            <span className="text-xs font-bold text-muted-foreground">{shown.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-brand-border">
                  <th className="py-3 pr-3">Traveller</th>
                  <th className="pr-3">Window</th>
                  <th className="pr-3">Kits</th>
                  <th className="pr-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {shown.map(({ j, b, kits }) => {
                  const t = ws.travellers.find((x) => x.id === j.travellerId);
                  const receipt = kits.flatMap((k) => k.events).find((e) => e.type === "receipt");
                  return (
                    <tr key={b.key} className="border-b border-brand-border/60 align-top">
                      <td className="py-4 pr-3">
                        <p className="font-semibold">{t?.label}</p>
                        <p className="text-xs text-muted-foreground">{j.label} · {j.persons} covered</p>
                        {kits[0] && <SetBadge setId={kits[0].setId} />}
                      </td>
                      <td className="pr-3 py-4 text-muted-foreground whitespace-nowrap"><Clock className="inline size-3 mr-1" />{fmtRange(b.start, b.end)}
                        {receipt && <p className="text-xs">Received {fmtTime(receipt.at)}</p>}
                      </td>
                      <td className="pr-3 py-4 text-xs space-y-1">
                        {kits.map((k) => (
                          <p key={k.kitId}>
                            <Link to="/tracking" search={{ kit: k.kitId }} className="font-mono font-bold text-brand-accent">{k.kitId}</Link> {WINDOW_TYPES[k.type].kit}
                          </p>
                        ))}
                      </td>
                      <td className="py-4 space-y-1">
                        {kits.map((k) => <div key={k.kitId}><KitStatusPill status={k.status} /></div>)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <aside className="space-y-6">
          <div className="rounded-2xl border border-brand-border bg-card p-6">
            <Hotel className="size-5 text-brand-accent mb-3" />
            <h3 className="font-display font-extrabold">At the front desk</h3>
            <ol className="mt-3 space-y-2 text-sm list-decimal pl-4">
              <li>Check the seal is intact and type its number.</li>
              <li>Record the temperature at acceptance.</li>
              <li>Record receipt before the declared window closes.</li>
              <li>Store breakfast kits in the refrigerator; hold arrival kits for check-in.</li>
              <li>Release only to the named traveller and record it.</li>
            </ol>
            <p className="mt-3 text-xs text-muted-foreground">Select a kit id to record its steps.</p>
          </div>
          <div className="rounded-2xl bg-secondary p-6">
            <Package className="size-5 text-brand-accent mb-2" />
            <p className="text-sm font-semibold">Kits shown</p>
            <p className="font-display text-3xl font-extrabold mt-1">{totalKits}</p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Refrigerator className="size-3" /> Held under written storage acceptance</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
