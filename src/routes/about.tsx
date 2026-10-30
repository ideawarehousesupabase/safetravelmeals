import { createFileRoute } from "@tanstack/react-router";
import { SiteShell, PageHeader } from "@/components/site-shell";
import { ShieldCheck, Heart, Globe, Mail, MapPin, Send, Building2, Loader2 } from "lucide-react";
import { useState } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { toast } from "sonner";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About & Contact — SafeMeal" },
      { name: "description", content: "Safe Travel Meal Kits Limited: who we are, what stage we are at, and how to reach us." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email || !message) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, "contacts"), {
        name,
        email,
        subject,
        message,
        createdAt: new Date().toISOString(),
      });
      toast.success("Message sent successfully!");
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to send message");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SiteShell>
      <PageHeader eyebrow="About Safe Travel Meal Kits" title="Continuity of assurance across a journey." description="Each counter a traveller meets discharges its own allergen duty. Nobody holds assurance across the whole trip. We built a protocol to do that, for the 2.4 million UK adults with a clinically confirmed food allergy." />

      <section className="mx-auto max-w-7xl px-6 py-14 grid lg:grid-cols-3 gap-6">
        {[
          { icon: Heart, title: "Where it started", desc: "Our founder is a professional chef in London hotel kitchens with Level 3 food hygiene certification who works to HACCP every day. He saw, from behind the pass, that a shared breakfast line can reduce allergen risk but cannot verify its absence." },
          { icon: ShieldCheck, title: "What we sell", desc: "A stated production regime and a verifiable record of it: single-allergen runs, signed line clearance, numbered seals and a hash-chained handover record. Our CTO, a full-stack engineer, builds the platform that executes it." },
          { icon: Globe, title: "Where we are", desc: "Technology readiness level 4 with a working prototype. UK patent application GB2617886.3 filed. Greater London first; the service is United Kingdom only." },
        ].map((c) => (
          <div key={c.title} className="rounded-3xl border border-brand-border bg-card p-7">
            <div className="size-12 rounded-2xl bg-brand-accent/10 text-brand-accent grid place-items-center mb-5">
              <c.icon className="size-5" />
            </div>
            <h3 className="font-display font-extrabold text-lg">{c.title}</h3>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{c.desc}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14 grid lg:grid-cols-2 gap-10">
        <div className="rounded-3xl border border-brand-border bg-card p-8">
          <p className="text-xs font-bold text-brand-accent uppercase tracking-[0.2em]">Get in touch</p>
          <h2 className="font-display text-3xl font-extrabold mt-2">We'd love to hear from you</h2>
          <p className="text-muted-foreground mt-3 text-sm">Questions, feedback or accessibility requests. Your message goes straight to the founding team.</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Your name" className="rounded-xl border border-brand-border bg-background px-4 py-3 text-sm outline-none focus:border-brand-accent" />
              <input value={email} onChange={(e) => setEmail(e.target.value)} required type="email" placeholder="Email" className="rounded-xl border border-brand-border bg-background px-4 py-3 text-sm outline-none focus:border-brand-accent" />
            </div>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className="w-full rounded-xl border border-brand-border bg-background px-4 py-3 text-sm outline-none focus:border-brand-accent" />
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} required rows={5} placeholder="How can we help?" className="w-full rounded-xl border border-brand-border bg-background px-4 py-3 text-sm outline-none focus:border-brand-accent resize-none" />
            <button disabled={loading} type="submit" className="rounded-full bg-brand-primary text-white px-6 py-3 font-bold text-sm flex items-center gap-2 hover:bg-brand-accent transition-colors disabled:opacity-70">
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Send message
            </button>
          </form>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl bg-gradient-to-br from-brand-primary via-slate-800 to-brand-primary text-white p-8">
            <Building2 className="size-5 text-brand-accent mb-3" />
            <h3 className="font-display font-extrabold text-xl">Partnership Inquiries</h3>
            <p className="text-white/70 text-sm mt-2 leading-relaxed">Hotel, venue, employer or kitchen operator? Each partnership follows the same path: engagement, a food safety assessment, a controlled pilot, then a commercial review.</p>
            <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-brand-accent text-white px-5 py-2.5 text-sm font-bold">
              <Mail className="size-4" /> Use the form, subject "Partnership"
            </p>
          </div>

          <div className="rounded-3xl border border-brand-border bg-card p-8 space-y-4 text-sm">
            <Detail icon={Building2} label="Company" value="Safe Travel Meal Kits Limited" />
            <Detail icon={MapPin} label="Based in" value="London, United Kingdom" />
            <Detail icon={Globe} label="Service area" value="Greater London during validation; United Kingdom only" />
          </div>
        </div>
      </section>
    </SiteShell>
  );
}

function Detail({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="size-9 rounded-xl bg-brand-accent/10 text-brand-accent grid place-items-center shrink-0">
        <Icon className="size-4" />
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="font-semibold mt-0.5">{value}</p>
      </div>
    </div>
  );
}