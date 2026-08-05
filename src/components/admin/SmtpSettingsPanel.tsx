import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Mail, CheckCircle2, ShieldCheck, Send, Key, Server, HelpCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { testSmtpConnection } from "@/lib/email.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SmtpSettingsPanel() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [fromName, setFromName] = useState("Yuga Spark");
  const [replyTo, setReplyTo] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const settings = useQuery({
    queryKey: ["smtp-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", ["smtp_user", "smtp_pass", "email_from_name", "email_reply_to"]);
      if (error) throw new Error(error.message);
      return Object.fromEntries(data.map((s) => [s.key, s.value])) as Record<string, string>;
    },
  });

  useEffect(() => {
    if (settings.data) {
      setUser(settings.data["smtp_user"] || "");
      setPass(settings.data["smtp_pass"] || "");
      setFromName(settings.data["email_from_name"] || "Yuga Spark");
      setReplyTo(settings.data["email_reply_to"] || "");
    }
  }, [settings.data]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const updates = [
        { key: "smtp_user", value: user.trim() },
        { key: "smtp_pass", value: pass.trim() },
        { key: "email_from_address", value: user.trim() },
        { key: "email_from_name", value: fromName.trim() },
        { key: "email_reply_to", value: replyTo.trim() },
      ];

      const { error } = await supabase
        .from("app_settings")
        .upsert(updates, { onConflict: "key" });

      if (error) throw new Error(error.message);

      toast.success("Google SMTP settings saved successfully");
      void queryClient.invalidateQueries({ queryKey: ["smtp-settings"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  async function handleTest(e: React.FormEvent) {
    e.preventDefault();
    if (!testEmail.trim()) {
      toast.error("Please enter an email address to send the test email to");
      return;
    }
    setTesting(true);
    try {
      const res = await testSmtpConnection({ data: { targetEmail: testEmail.trim() } });
      toast.success(res.message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "SMTP test failed");
    } finally {
      setTesting(false);
    }
  }

  const isConfigured = Boolean(user && pass);

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <div className="surface p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${isConfigured ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>
              {isConfigured ? <CheckCircle2 className="h-5 w-5" /> : <Server className="h-5 w-5" />}
            </div>
            <div>
              <h2 className="text-base font-semibold">Google SMTP Delivery</h2>
              <p className="text-xs text-muted-foreground">
                {isConfigured
                  ? `Configured to send emails from ${user}`
                  : "Not configured yet. Add your Gmail credentials below."}
              </p>
            </div>
          </div>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${isConfigured ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>
            <span className={`h-2 w-2 rounded-full ${isConfigured ? "bg-emerald-500" : "bg-amber-500"}`} />
            {isConfigured ? "Active (Google SMTP)" : "Action Needed"}
          </span>
        </div>
      </div>

      {/* Main Settings Form */}
      <div className="surface p-4 sm:p-6">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-primary" />
          <h2 className="label-mono text-muted-foreground">Google SMTP Credentials</h2>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Emails for announcements, notices, and notifications will be sent directly through Google's secure SMTP server.
        </p>

        <form onSubmit={handleSave} className="mt-6 space-y-4 max-w-xl">
          <div className="space-y-1.5">
            <Label htmlFor="smtp-user" className="text-xs font-medium">
              Gmail / Google Workspace Email
            </Label>
            <Input
              id="smtp-user"
              type="email"
              required
              value={user}
              onChange={(e) => setUser(e.target.value)}
              placeholder="e.g. yugaspark@gmail.com or club@rgmcet.edu.in"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="smtp-pass" className="text-xs font-medium">
                Google App Password (16 characters)
              </Label>
              <a
                href="https://myaccount.google.com/apppasswords"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
              >
                <HelpCircle className="h-3 w-3" />
                How to get App Password?
              </a>
            </div>
            <div className="relative">
              <Input
                id="smtp-pass"
                type="password"
                required
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                placeholder="xxxx xxxx xxxx xxxx"
                className="pr-9 font-mono"
              />
              <Key className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="from-name" className="text-xs font-medium">
                Sender Display Name
              </Label>
              <Input
                id="from-name"
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                placeholder="Yuga Spark Club"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reply-to" className="text-xs font-medium">
                Reply-To Email (Optional)
              </Label>
              <Input
                id="reply-to"
                type="email"
                value={replyTo}
                onChange={(e) => setReplyTo(e.target.value)}
                placeholder="hemanthleads@gmail.com"
              />
            </div>
          </div>

          <div className="pt-3">
            <Button type="submit" disabled={saving} className="gap-2">
              <ShieldCheck className="h-4 w-4" />
              {saving ? "Saving credentials…" : "Save SMTP Settings"}
            </Button>
          </div>
        </form>
      </div>

      {/* Test Connection Section */}
      <div className="surface p-4 sm:p-6">
        <div className="flex items-center gap-2">
          <Send className="h-4 w-4 text-primary" />
          <h2 className="label-mono text-muted-foreground">Test SMTP Connection</h2>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Send a test email to verify that your Google SMTP credentials can establish a connection and deliver messages.
        </p>

        <form onSubmit={handleTest} className="mt-4 flex flex-wrap items-end gap-3 max-w-xl">
          <div className="min-w-[240px] flex-1 space-y-1.5">
            <Label htmlFor="test-email" className="text-xs font-medium">
              Recipient Email
            </Label>
            <Input
              id="test-email"
              type="email"
              required
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="you@gmail.com"
            />
          </div>
          <Button type="submit" variant="secondary" disabled={testing || !testEmail.trim()} className="gap-1.5">
            <Send className="h-3.5 w-3.5" />
            {testing ? "Sending test…" : "Send Test Email"}
          </Button>
        </form>
      </div>

      {/* Guide Card */}
      <div className="rounded-xl border border-border/80 bg-secondary/20 p-4 text-xs text-muted-foreground">
        <h3 className="font-semibold text-foreground flex items-center gap-1.5">
          <HelpCircle className="h-4 w-4 text-primary" /> 3 Steps to Enable Google SMTP:
        </h3>
        <ol className="mt-2 list-decimal list-inside space-y-1 pl-1">
          <li>Go to your Google Account 👉 <a href="https://myaccount.google.com/security" target="_blank" rel="noreferrer" className="text-primary hover:underline">myaccount.google.com/security</a> and make sure <strong>2-Step Verification</strong> is turned ON.</li>
          <li>Search for <strong>"App Passwords"</strong> or visit <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="text-primary hover:underline">myaccount.google.com/apppasswords</a>.</li>
          <li>Generate a new App Password (name it "Yuga Spark") and paste the 16-character code into the App Password box above.</li>
        </ol>
      </div>
    </div>
  );
}
