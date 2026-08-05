import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { canSignUp, ensureAdminAccounts } from "@/lib/club.functions";
import { useAuth } from "@/lib/auth";
import { SparkMark } from "@/components/AppShell";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TITLE = "Sign in — Yuga Spark";
const DESCRIPTION = "Sign in or join the Yuga Spark hackathon club portal.";

export const Route = createFileRoute("/auth")({
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
    <div className="flex min-h-screen flex-col paper-bg">
      <header className="border-b border-border/70">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <SparkMark />
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-md surface p-8 ">
          <p className="label-mono text-primary">Club access</p>
          <h1 className="mt-3 text-3xl font-bold">Enter Yuga Spark</h1>
          <Tabs defaultValue="signin" className="mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Join</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <form onSubmit={signIn} className="mt-4 space-y-4">
                <Fields
                  email={email}
                  password={password}
                  setEmail={setEmail}
                  setPassword={setPassword}
                />
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Checking…" : "Sign in"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Club admins sign in here with their club email — the admin console appears
                  automatically in the top navigation.
                </p>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={signUp} className="mt-4 space-y-4">
                <Fields
                  email={email}
                  password={password}
                  setEmail={setEmail}
                  setPassword={setPassword}
                />
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Creating…" : "Create account"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Joining is open to any email right now. Admins can switch the club to
                  invite-only later, and then only added emails can join.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
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
    <>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@rgmcet.edu.in"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
      </div>
    </>
  );
}