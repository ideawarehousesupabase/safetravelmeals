import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell, PageHeader } from "@/components/site-shell";
import { JaapNav, Pill, SetBadge, SimulatedBanner } from "@/components/jaap/jaap-ui";
import { Hotel, Clock, Package, ArrowRight, Refrigerator } from "lucide-react";
import { DEMO } from "@/lib/jaap/demo";
import { WINDOW_TYPES } from "@/lib/jaap/protocol";
import { dateOf, fmtDay, fmtRange, fmtTime } from "@/lib/jaap/time";

export const Route = createFileRoute("/hotel")({
  head: () => ({
    meta: [
      { title: "Hotel Front Desk — SafeMeal" },
      { name: "description", content: "Incoming sealed kits, storage and release at a hotel front desk, from the simulated records." },
    ],
  }),
  component: HotelDashboard,
});

const HOTEL = "Riverside Hotel, Greenwich";
const DAY = "2027-04-21";

function HotelDashboard() {
  const arrivals = DEMO.journeys.flatMap((j) =>
    j.batches.filter((b) => b.place === HOTEL && dateOf(b.start) === DAY).map((b) => ({ j, b, kits: DEMO.kits.filter((k) => k.batchKey === b.key) })),
  );
  const totalKits = arrivals.reduce((n, a) => n + a.kits.length, 0);

  return (
    <SiteShell>
      <PageHeader eyebrow="Hotel front desk · demonstration partner" title={`${HOTEL} · ${fmtDay(DAY)}`} description="Sealed kits arriving today. Check each seal and temperature, sign the receipt, store under the written storage acceptance and record every release." />
      <JaapNav />
      <div className="mx-auto max-w-7xl px-6 py-10 space-y-6">
        <SimulatedBanner>The hotel name, guests and deliveries are fictional. Guests appear only by pseudonymous traveller key.</SimulatedBanner>
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 min-w-0 rounded-2xl border border-brand-border bg-card p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display font-extrabold text-lg">Incoming handovers</h2>
              <span className="text-xs font-bold text-muted-foreground">{arrivals.length} today</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-brand-border">
                    <th className="py-3 pr-3">Traveller</th>
                    <th className="pr-3">Window</th>
                    <th className="pr-3">Kits</th>
                    <th className="pr-3">Received</th>
                    <th className="pr-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {arrivals.map(({ j, b, kits }) => (
                    <tr key={b.key} className="border-b border-brand-border/60 align-top">
                      <td className="py-4 pr-3">
                        <p className="font-semibold font-mono">{j.travellerKey}</p>
                        <p className="text-xs text-muted-foreground">{j.id} · {j.persons} covered</p>
                        <SetBadge setId={j.set!.id} />
                      </td>
                      <td className="pr-3 py-4 text-muted-foreground whitespace-nowrap"><Clock className="inline size-3 mr-1" />{fmtRange(b.start, b.end)}</td>
                      <td className="pr-3 py-4 text-xs">
                        {[...new Set(kits.map((k) => k.type))].map((t) => (
                          <p key={t}>{kits.filter((k) => k.type === t).length} × {WINDOW_TYPES[t].kit}</p>
                        ))}
                      </td>
                      <td className="pr-3 py-4 whitespace-nowrap">
                        {fmtTime(b.receivedAt)}{" "}
                        {kits.some((k) => k.exceptionIds.includes("EXC-04")) ? <Pill tone="warn">Receipt logged late</Pill> : <Pill tone="ok">Signed</Pill>}
                      </td>
                      <td className="py-4">
                        <Link to="/records/$kitId" params={{ kitId: kits[0].id }} className="text-xs font-bold text-brand-accent flex items-center gap-1">Records <ArrowRight className="size-3" /></Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-brand-border bg-card p-6">
              <Hotel className="size-5 text-brand-accent mb-3" />
              <h3 className="font-display font-extrabold">At the front desk</h3>
              <ol className="mt-3 space-y-2 text-sm list-decimal pl-4">
                <li>Scan the kit; confirm the seal number matches and the seal is intact.</li>
                <li>Record the temperature reading at acceptance.</li>
                <li>Sign the receipt before the declared window closes.</li>
                <li>Store breakfast kits in the refrigerator; hold arrival kits for check-in.</li>
                <li>Release only to the named traveller; the traveller's scan checks the kit against their profile.</li>
              </ol>
            </div>
            <div className="rounded-2xl bg-secondary p-6">
              <Package className="size-5 text-brand-accent mb-2" />
              <p className="text-sm font-semibold">Kits received today</p>
              <p className="font-display text-3xl font-extrabold mt-1">{totalKits}</p>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Refrigerator className="size-3" /> Held under written storage acceptance</p>
            </div>
          </aside>
        </div>
      </div>
    </SiteShell>
  );
}
