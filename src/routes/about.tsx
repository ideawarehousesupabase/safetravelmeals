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
      { name: "description", content: "Our mission, vision, and how to reach the SafeMeal team." },
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
      <PageHeader eyebrow="About SafeMeal" title="A safer plate, anywhere in the world." description="We exist so the 1.5 billion travelers with dietary needs never travel hungry — or unsafe — again." />

      <section className="mx-auto max-w-7xl px-6 py-14 grid lg:grid-cols-3 gap-6">
        {[
          { icon: Heart, title: "Our Mission", desc: "Make every airport, hotel and station a safe place to eat — for every body." },
          { icon: ShieldCheck, title: "Food Safety First", desc: "Medical-grade screening, audited kitchens, and tamper-evident QR passports on every kit." },
          { icon: Globe, title: "Global Vision", desc: "Build the world's most trusted food-safety logistics layer for travel — from LHR to NRT." },
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
          <p className="text-muted-foreground mt-3 text-sm">Questions, feedback or accessibility requests — our safety team replies within 4 hours.</p>

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
            <p className="text-white/70 text-sm mt-2 leading-relaxed">Airline, airport, hotel chain or kitchen operator? Join the SafeMeal network.</p>
            <a href="mailto:partners@safemeal.com" className="mt-5 inline-flex items-center gap-2 rounded-full bg-brand-accent text-white px-5 py-2.5 text-sm font-bold">
              <Mail className="size-4" /> partners@safemeal.com
            </a>
          </div>

          <div className="rounded-3xl border border-brand-border bg-card p-8 space-y-4 text-sm">
            <Detail icon={Mail} label="Email" value="hello@safemeal.com" />
            <Detail icon={MapPin} label="HQ" value="125 Spring St, New York, NY 10012" />
            <Detail icon={Globe} label="Operating in" value="32 countries · 450+ airports · 1,800+ hotels" />
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