import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Lock, Sparkles, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { canSignUp, ensureAdminAccounts } from "@/lib/club.functions";
import { useAuth } from "@/lib/auth";

const TITLE = "Sign in — Yuga Spark";
const DESCRIPTION = "Sign in or join the Yuga Spark hackathon club portal at RGMCET.";

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): { next?: string | undefined } => ({
    next: typeof s['next'] === "string" && s['next'].startsWith("/") && !s['next'].startsWith("//")
      ? s['next']
      : undefined,
  }),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const { session, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function goNext() {
    if (next) {
      window.location.href = next;
      return;
    }
    navigate({ to: "/dashboard", replace: true });
  }

  useEffect(() => {
    void ensureAdminAccounts().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!loading && session) {
      if (next) window.location.href = next;
      else navigate({ to: "/dashboard", replace: true });
    }
  }, [loading, session, navigate, next]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else goNext();
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const normalized = email.trim().toLowerCase();
    try {
      const { allowed } = await canSignUp({ data: { email: normalized } });
      if (!allowed) {
        toast.error("This email doesn't have access yet. Ask a club admin to add you.");
        return;
      }
      const { error } = await supabase.auth.signUp({
        email: normalized,
        password,
        options: { emailRedirectTo: next ? `${window.location.origin}${next}` : window.location.origin },
      });
      if (error) throw new Error(error.message);
      toast.success("Account created. Welcome to Yuga Spark.");
      goNext();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create the account");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="cofounder-landing min-h-screen w-full selection:bg-[#1890f0]/20 flex flex-col justify-between overflow-x-hidden">
      {/* ━━━ TOP HEADER ━━━ */}
      <header className="sticky top-0 z-40 border-b border-[#202020]/10 bg-[#f5f5f2]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2 text-[#171717] no-underline">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1890f0] inline-block" />
            <span className="font-sans text-xl font-bold tracking-tight text-[#171717]">
              Yuga Spark
            </span>
          </Link>

          <Link
            to="/"
            className="cofounder-btn-secondary text-xs px-4 py-2 flex items-center gap-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Home</span>
          </Link>
        </div>
      </header>

      {/* ━━━ MAIN AUTH CARD (Exact Cofounder.co Styling) ━━━ */}
      <main className="flex-1 flex items-center justify-center p-6 py-16">
        <div className="w-full max-w-[460px] bg-[#fbfbf8] rounded-[24px] border border-[#202020]/15 p-8 sm:p-10 shadow-2xl space-y-6">
          {/* Card Header */}
          <div className="space-y-2 text-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1890f0]/10 border border-[#1890f0]/20 text-[#1890f0] text-xs font-mono font-semibold uppercase tracking-wider">
              <Lock className="w-3 h-3" />
              <span>Campus Portal Access</span>
            </div>
            <h1 className="cofounder-h2 text-3xl font-normal text-[#171717] tracking-tight">
              Enter Yuga Spark
            </h1>
            <p className="text-xs text-[#666660] leading-relaxed">
              Sign in with your RGMCET campus email to access hackathon squads, Saturday XP, and verified credentials.
            </p>
          </div>

          {/* Tab Switcher Pills */}
          <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-[#f5f5f2] rounded-[10px] border border-[#202020]/10">
            <button
              onClick={() => setActiveTab("signin")}
              className={`py-2 text-xs font-medium rounded-[8px] transition-all ${
                activeTab === "signin"
                  ? "bg-[#1890f0] text-white shadow-sm font-semibold"
                  : "text-[#666660] hover:text-[#171717]"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setActiveTab("signup")}
              className={`py-2 text-xs font-medium rounded-[8px] transition-all ${
                activeTab === "signup"
                  ? "bg-[#1890f0] text-white shadow-sm font-semibold"
                  : "text-[#666660] hover:text-[#171717]"
              }`}
            >
              Join Portal
            </button>
          </div>

          {/* Form Content */}
          {activeTab === "signin" ? (
            <form onSubmit={signIn} className="space-y-4">
              <Fields
                email={email}
                password={password}
                setEmail={setEmail}
                setPassword={setPassword}
              />

              <button
                type="submit"
                disabled={busy}
                className="cofounder-btn-primary w-full py-3 font-medium text-sm flex items-center justify-center gap-2 shadow-md"
              >
                <span>{busy ? "Checking credentials…" : "Sign In to Portal"}</span>
                <ArrowRight className="w-4 h-4 text-white" />
              </button>

              <div className="p-3 rounded-[8px] bg-[#f5f5f2] border border-[#202020]/10 text-[11px] text-[#666660] leading-relaxed">
                <span className="font-semibold text-[#171717]">Club Admins & Mentors:</span> Sign in with your registered club email to unlock admin features automatically.
              </div>
            </form>
          ) : (
            <form onSubmit={signUp} className="space-y-4">
              <Fields
                email={email}
                password={password}
                setEmail={setEmail}
                setPassword={setPassword}
              />

              <button
                type="submit"
                disabled={busy}
                className="cofounder-btn-primary w-full py-3 font-medium text-sm flex items-center justify-center gap-2 shadow-md"
              >
                <span>{busy ? "Creating account…" : "Create Student Account"}</span>
                <Sparkles className="w-4 h-4 text-white" />
              </button>

              <div className="p-3 rounded-[8px] bg-[#f5f5f2] border border-[#202020]/10 text-[11px] text-[#666660] leading-relaxed">
                <span className="font-semibold text-[#171717]">RGMCET Student Access:</span> Open to RGMCET student builders. Enter your campus email to get instant access.
              </div>
            </form>
          )}
        </div>
      </main>

      {/* ━━━ FOOTER ━━━ */}
      <footer className="bg-[#eaeae6] py-8 px-6 border-t border-[#202020]/10">
        <div className="max-w-[1200px] mx-auto flex flex-wrap items-center justify-between text-xs text-[#666660] gap-4">
          <p>© {new Date().getFullYear()} Yuga Spark · RGMCET Hackathon Club · All rights reserved.</p>
          <p>Developed by <strong className="text-[#171717]">Jaya Krushna</strong> and <strong className="text-[#171717]">Hemanth</strong></p>
        </div>
      </footer>
    </div>
  );
}

function Fields({
  email,
  password,
  setEmail,
  setPassword,
}: {
  email: string;
  password: string;
  setEmail: (v: string) => void;
  setPassword: (v: string) => void;
}) {
  return (
    <div className="space-y-3.5">
      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-xs font-mono font-medium uppercase text-[#171717]">
          Campus Email Address
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="student@rgmcet.edu.in"
          className="w-full bg-[#fbfbf8] border border-[#202020]/20 rounded-[8px] px-3.5 py-2.5 text-sm text-[#171717] placeholder:text-[#666660]/60 focus:outline-none focus:border-[#1890f0] focus:ring-1 focus:ring-[#1890f0] transition-colors"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-xs font-mono font-medium uppercase text-[#171717]">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full bg-[#fbfbf8] border border-[#202020]/20 rounded-[8px] px-3.5 py-2.5 text-sm text-[#171717] placeholder:text-[#666660]/60 focus:outline-none focus:border-[#1890f0] focus:ring-1 focus:ring-[#1890f0] transition-colors"
        />
      </div>
    </div>
  );
}