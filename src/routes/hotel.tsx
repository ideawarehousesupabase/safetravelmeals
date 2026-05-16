import { createFileRoute } from "@tanstack/react-router";
import { SiteShell, PageHeader } from "@/components/site-shell";
import { Hotel, Clock, User, Package, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/hotel")({
  head: () => ({
    meta: [
      { title: "Hotel Partner Dashboard — SafeMeal" },
      { name: "description", content: "Reception handoff console for hotel partners." },
    ],
  }),
  component: HotelDashboard,
});

function HotelDashboard() {
  const arrivals = [
    { guest: "Sara Lawson", room: "1208", eta: "16:15", meal: "Welcome Pack · GF/DF", driver: "M. Khan" },
    { guest: "Daniel Reyes", room: "0902", eta: "17:40", meal: "Vegan Buddha Bowl", driver: "K. Patel" },
    { guest: "Yuki Tanaka", room: "1505", eta: "18:25", meal: "Halal Protein Box", driver: "A. Singh" },
    { guest: "M. Brown", room: "0411", eta: "19:00", meal: "Mediterranean Mezze", driver: "L. Bauer" },
  ];

  return (
    <SiteShell>
      <PageHeader eyebrow="Hotel Partner Console" title="The Edition NY · Front Desk" description="Manhattan · Today's incoming meal deliveries" />
      <div className="mx-auto max-w-7xl px-6 py-10 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-brand-border bg-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display font-extrabold text-lg">Incoming Deliveries</h2>
            <span className="text-xs font-bold text-muted-foreground">{arrivals.length} today</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-brand-border">
                  <th className="py-3">Guest</th>
                  <th>Room</th>
                  <th>ETA</th>
                  <th>Meal</th>
                  <th>Driver</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {arrivals.map((a) => (
                  <tr key={a.room} className="border-b border-brand-border/60 hover:bg-secondary/40">
                    <td className="py-4 font-semibold flex items-center gap-2"><User className="size-4 text-muted-foreground" /> {a.guest}</td>
                    <td className="font-display font-extrabold">{a.room}</td>
                    <td className="text-muted-foreground"><Clock className="inline size-3 mr-1" />{a.eta}</td>
                    <td>{a.meal}</td>
                    <td className="text-muted-foreground">{a.driver}</td>
                    <td><button className="text-xs font-bold text-brand-accent flex items-center gap-1">Confirm <ArrowRight className="size-3" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-brand-border bg-card p-6">
            <Hotel className="size-5 text-brand-accent mb-3" />
            <h3 className="font-display font-extrabold">Pickup Coordination</h3>
            <p className="text-sm text-muted-foreground mt-2">Drivers arrive at the loading dock. Front desk receives QR-sealed kits and routes to room.</p>
            <button className="mt-4 w-full rounded-full bg-brand-primary text-white py-2.5 text-sm font-bold">Open dock map</button>
          </div>
          <div className="rounded-2xl bg-secondary p-6">
            <Package className="size-5 text-brand-accent mb-2" />
            <p className="text-sm font-semibold">Today's volume</p>
            <p className="font-display text-3xl font-extrabold mt-1">28 deliveries</p>
            <p className="text-xs text-muted-foreground mt-1">Avg. handoff: 47s</p>
          </div>
        </aside>
      </div>
    </SiteShell>
  );
}