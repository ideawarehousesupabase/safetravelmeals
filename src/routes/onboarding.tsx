import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldCheck, ArrowRight, Mail, Lock, User, Loader2, Eye, EyeOff } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Sign up — SafeMeal" },
      { name: "description", content: "Create your SafeMeal traveler account." },
    ],
  }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        try {
          await setDoc(doc(db, "users", userCredential.user.uid), {
            uid: userCredential.user.uid,
            name,
            email,
            createdAt: new Date().toISOString()
          });
        } catch (dbError) {
          console.warn("Could not save to Firestore (rules might be strict), but auth succeeded.", dbError);
        }
        toast.success("Account created. Welcome aboard!");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success("Welcome back");
      }
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <aside className="relative hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-brand-primary via-slate-800 to-brand-primary text-white overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_30%_20%,oklch(0.685_0.169_237.323/0.25),transparent)]" />
        <Link to="/" className="relative flex items-center gap-2">
          <div className="size-8 rounded-lg bg-gradient-to-br from-brand-accent to-white/20 grid place-items-center">
            <ShieldCheck className="size-4" />
          </div>
          <span className="font-display text-xl font-extrabold tracking-tight">SAFEMEAL</span>
        </Link>
        <div className="relative">
          <h2 className="font-display text-4xl font-extrabold leading-tight">
            Built around your body. <br />
            <span className="text-brand-accent">Safe by design.</span>
          </h2>
          <p className="mt-4 text-white/70 max-w-md">
            Every profile is reviewed by certified allergists before your first delivery.
          </p>
        </div>
        <p className="relative text-xs text-white/50">ISO 22000 · HIPAA-aligned · GDPR</p>
      </aside>

      <section className="flex items-center justify-center p-6 sm:p-12">
        <form onSubmit={onSubmit} className="w-full max-w-md">
          <div className="mb-8">
            <div className="inline-flex p-1 rounded-full border border-brand-border bg-card mb-6">
              {(["signup", "login"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`px-5 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-colors ${
                    mode === m ? "bg-brand-primary text-white" : "text-muted-foreground"
                  }`}
                >
                  {m === "signup" ? "Sign up" : "Log in"}
                </button>
              ))}
            </div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight">
              {mode === "signup" ? "Create your account" : "Welcome back"}
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              {mode === "signup"
                ? "Three minutes to a safer travel meal."
                : "Pick up your safe-travel cockpit."}
            </p>
          </div>

          <div className="space-y-4">
            {mode === "signup" && (
              <Field icon={User} label="Full name" name="new_user_name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" required />
            )}
            <Field icon={Mail} label="Email" type="email" name="new_user_email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="nope" required />
            <Field icon={Lock} label="Password" type="password" name="new_user_password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" minLength={6} required />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-8 w-full rounded-full bg-brand-primary px-5 py-3 text-sm font-bold text-white flex items-center justify-center gap-2 hover:bg-brand-accent transition-colors disabled:opacity-60"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <>{mode === "signup" ? "Create account" : "Log in"} <ArrowRight className="size-4" /></>}
          </button>

          <p className="text-xs text-muted-foreground mt-6 text-center">
            {mode === "signup" ? "Already have an account?" : "New to SafeMeal?"}{" "}
            <button
              type="button"
              onClick={() => setMode(mode === "signup" ? "login" : "signup")}
              className="text-brand-accent font-semibold"
            >
              {mode === "signup" ? "Log in" : "Sign up"}
            </button>
          </p>
        </form>
      </section>
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  ...rest
}: { icon: typeof User; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = rest.type === "password";
  const inputType = isPassword ? (showPassword ? "text" : "password") : rest.type;

  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <div className="mt-2 flex items-center gap-3 rounded-xl border border-brand-border bg-card px-4 py-3 focus-within:border-brand-accent transition-colors">
        <Icon className="size-4 text-muted-foreground" />
        <input
          {...rest}
          type={inputType}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {isPassword && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setShowPassword(!showPassword);
            }}
            className="text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
            title={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        )}
      </div>
    </label>
  );
}