import { useState } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Loader2, PlayCircle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Status = "pass" | "fail" | "warn" | "running" | "idle";

type CheckResult = { status: Status; detail: string; ms?: number };

type Check = {
  key: string;
  group: string;
  label: string;
  description: string;
  run: () => Promise<CheckResult>;
};

const TONE: Record<Status, string> = {
  pass: "bg-emerald-500/10 text-emerald-700",
  fail: "bg-destructive/10 text-destructive",
  warn: "bg-amber-500/10 text-amber-700",
  running: "bg-primary/10 text-primary",
  idle: "bg-muted text-muted-foreground",
};

function StatusIcon({ status }: { status: Status }) {
  if (status === "running") return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
  if (status === "pass") return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  if (status === "fail") return <XCircle className="h-4 w-4 text-destructive" />;
  if (status === "warn") return <AlertTriangle className="h-4 w-4 text-amber-600" />;
  return <PlayCircle className="h-4 w-4 text-muted-foreground" />;
}

export function SystemChecksPanel() {
  const { isOwner } = useAuth();
  const [results, setResults] = useState<Record<string, CheckResult>>({});
  const [running, setRunning] = useState(false);

  const checks: Check[] = [
    {
      key: "session",
      group: "Login",
      label: "Active session",
      description: "A signed-in user is returned by the auth server.",
      run: async () => {
        const { data, error } = await supabase.auth.getUser();
        if (error || !data.user) return { status: "fail", detail: error?.message ?? "No user session" };
        return { status: "pass", detail: `Signed in as ${data.user.email}` };
      },
    },
    {
      key: "profile",
      group: "Login",
      label: "Own profile readable",
      description: "The profiles policy lets the signed-in user read their record.",
      run: async () => {
        const { data: u } = await supabase.auth.getUser();
        if (!u.user) return { status: "fail", detail: "No session" };
        const { data, error } = await supabase.from("profiles").select("id, email, profile_completed").eq("id", u.user.id).maybeSingle();
        if (error) return { status: "fail", detail: error.message };
        if (!data) return { status: "fail", detail: "Profile row missing" };
        return { status: "pass", detail: data.profile_completed ? "Profile complete" : "Profile row found (incomplete)" };
      },
    },
    {
      key: "role",
      group: "Login",
      label: "Admin role grant",
      description: "The role table confirms admin privileges.",
      run: async () => {
        const { data: u } = await supabase.auth.getUser();
        if (!u.user) return { status: "fail", detail: "No session" };
        const { data, error } = await supabase.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
        if (error) return { status: "fail", detail: error.message };
        return data ? { status: "pass", detail: "Admin role confirmed" } : { status: "fail", detail: "Admin role missing" };
      },
    },
    {
      key: "members",
      group: "Access",
      label: "Member directory",
      description: "Admins can list student profiles.",
      run: async () => {
        const { count, error } = await supabase.from("profiles").select("id", { count: "exact", head: true });
        if (error) return { status: "fail", detail: error.message };
        return { status: "pass", detail: `${count ?? 0} member${count === 1 ? "" : "s"} visible` };
      },
    },
    {
      key: "access-setting",
      group: "Access",
      label: "Access scope setting",
      description: "The signup access toggle is readable and valid.",
      run: async () => {
        const { data, error } = await supabase.from("app_settings").select("key, value").eq("key", "signup_access").maybeSingle();
        if (error) return { status: "fail", detail: error.message };
        if (!data) return { status: "warn", detail: "No signup_access row — defaults to open sign-up" };
        return { status: "pass", detail: `Scope: ${data.value}` };
      },
    },
    {
      key: "allowed-emails",
      group: "Access",
      label: "Allowed email list",
      description: "Owner-only invite list is reachable.",
      run: async () => {
        if (!isOwner) return { status: "warn", detail: "Owner-only check skipped for co-admins" };
        const { count, error } = await supabase.from("allowed_emails").select("id", { count: "exact", head: true });
        if (error) return { status: "fail", detail: error.message };
        return { status: "pass", detail: `${count ?? 0} allowed email${count === 1 ? "" : "s"}` };
      },
    },
    {
      key: "hackathon-crud",
      group: "Hackathons",
      label: "Create / edit / delete",
      description: "Writes a temporary hackathon, updates it, then removes it.",
      run: async () => {
        const title = `__system check ${Date.now()}`;
        const { data: created, error: cErr } = await supabase
          .from("hackathons")
          .insert({ title, event_date: new Date().toISOString().slice(0, 10), team_min: 1, team_max: 2, registration_open: false })
          .select("id")
          .single();
        if (cErr || !created) return { status: "fail", detail: `Create failed: ${cErr?.message}` };
        const { error: uErr } = await supabase.from("hackathons").update({ team_max: 3 }).eq("id", created.id);
        const { error: dErr } = await supabase.from("hackathons").delete().eq("id", created.id);
        if (uErr) return { status: "fail", detail: `Update failed: ${uErr.message}` };
        if (dErr) return { status: "fail", detail: `Delete failed: ${dErr.message}` };
        return { status: "pass", detail: "Create, update and delete all succeeded" };
      },
    },
    {
      key: "hackathon-read",
      group: "Hackathons",
      label: "Event listing",
      description: "Hackathons are readable for the dashboard.",
      run: async () => {
        const { count, error } = await supabase.from("hackathons").select("id", { count: "exact", head: true });
        if (error) return { status: "fail", detail: error.message };
        if (!count) return { status: "warn", detail: "No hackathons created yet" };
        return { status: "pass", detail: `${count} hackathon${count === 1 ? "" : "s"} listed` };
      },
    },
    {
      key: "leaderboard",
      group: "Hackathons",
      label: "Leaderboard function",
      description: "The leaderboard aggregation runs without error.",
      run: async () => {
        const { data, error } = await supabase.rpc("get_leaderboard", {});
        if (error) return { status: "fail", detail: error.message };
        const rows = (data ?? []) as unknown[];
        return rows.length
          ? { status: "pass", detail: `${rows.length} ranked member${rows.length === 1 ? "" : "s"}` }
          : { status: "warn", detail: "Leaderboard works but has no results yet" };
      },
    },
    {
      key: "results",
      group: "Certificates",
      label: "Attendance records",
      description: "Hackathon results back the certificate generator.",
      run: async () => {
        const { data, error } = await supabase.from("hackathon_results").select("id, attended, certificate_url").limit(50);
        if (error) return { status: "fail", detail: error.message };
        if (!data.length) return { status: "warn", detail: "No results recorded — nothing to certify yet" };
        const attended = data.filter((r) => r.attended).length;
        return { status: "pass", detail: `${attended} attendance record${attended === 1 ? "" : "s"} eligible for certificates` };
      },
    },
    {
      key: "certificate-download",
      group: "Certificates",
      label: "Certificate download link",
      description: "An uploaded certificate can be signed for download.",
      run: async () => {
        const { data, error } = await supabase
          .from("hackathon_results")
          .select("certificate_url")
          .not("certificate_url", "is", null)
          .limit(1);
        if (error) return { status: "fail", detail: error.message };
        if (!data.length || !data[0]?.certificate_url) {
          return { status: "warn", detail: "No uploaded certificates — students fall back to the generated design" };
        }
        const path = data[0].certificate_url as string;
        const { data: signed, error: sErr } = await supabase.storage.from("certificates").createSignedUrl(path, 60);
        if (sErr || !signed?.signedUrl) return { status: "fail", detail: sErr?.message ?? "Could not sign URL" };
        return { status: "pass", detail: "Signed download URL generated" };
      },
    },
    {
      key: "storage",
      group: "Certificates",
      label: "Storage buckets",
      description: "Photo, resume and certificate buckets respond.",
      run: async () => {
        const buckets = ["photos", "resumes", "certificates"] as const;
        const failed: string[] = [];
        for (const b of buckets) {
          const { error } = await supabase.storage.from(b).list("", { limit: 1 });
          if (error) failed.push(`${b} (${error.message})`);
        }
        if (failed.length) return { status: "fail", detail: `Unreachable: ${failed.join(", ")}` };
        return { status: "pass", detail: "All three buckets reachable" };
      },
    },
  ];

  async function runOne(check: Check) {
    setResults((r) => ({ ...r, [check.key]: { status: "running", detail: "Running…" } }));
    const started = performance.now();
    try {
      const res = await check.run();
      setResults((r) => ({ ...r, [check.key]: { ...res, ms: Math.round(performance.now() - started) } }));
      return res.status;
    } catch (e) {
      const detail = e instanceof Error ? e.message : "Unexpected error";
      setResults((r) => ({ ...r, [check.key]: { status: "fail", detail, ms: Math.round(performance.now() - started) } }));
      return "fail" as Status;
    }
  }

  async function runAll() {
    setRunning(true);
    setResults({});
    for (const c of checks) await runOne(c);
    setRunning(false);
  }

  const done = checks.filter((c) => results[c.key] && results[c.key]!.status !== "running");
  const passed = done.filter((c) => results[c.key]!.status === "pass").length;
  const failed = done.filter((c) => results[c.key]!.status === "fail").length;
  const warned = done.filter((c) => results[c.key]!.status === "warn").length;

  const groups = Array.from(new Set(checks.map((c) => c.group)));

  return (
    <div className="space-y-4">
      <div className="surface flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge className={TONE.pass}>{passed} passed</Badge>
          <Badge className={TONE.warn}>{warned} warnings</Badge>
          <Badge className={TONE.fail}>{failed} failed</Badge>
          <span className="text-muted-foreground">
            {done.length}/{checks.length} checks completed
          </span>
        </div>
        <Button onClick={runAll} disabled={running}>
          {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          {running ? "Running checks…" : "Run all checks"}
        </Button>
      </div>

      {groups.map((group) => (
        <div key={group} className="surface p-4">
          <p className="label-mono pb-2 text-muted-foreground">{group}</p>
          <div className="space-y-2">
            {checks
              .filter((c) => c.group === group)
              .map((c) => {
                const res = results[c.key];
                const status: Status = res?.status ?? "idle";
                return (
                  <div
                    key={c.key}
                    className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border/60 p-3"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="mt-0.5"><StatusIcon status={status} /></span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{c.label}</p>
                        <p className="text-xs text-muted-foreground">{res?.detail ?? c.description}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {res?.ms !== undefined && (
                        <span className="text-xs text-muted-foreground">{res.ms} ms</span>
                      )}
                      <Badge className={TONE[status]}>{status === "idle" ? "not run" : status}</Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={running || status === "running"}
                        onClick={() => void runOne(c)}
                      >
                        Run
                      </Button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}
