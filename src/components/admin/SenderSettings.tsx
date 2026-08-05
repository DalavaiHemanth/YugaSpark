import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const KEYS = ["email_from_name", "email_from_address", "email_reply_to"] as const;

/** Owner-editable sender identity used for every email the app delivers. */
export function SenderSettings() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: "", address: "", reply: "" });
  const [busy, setBusy] = useState(false);

  const settings = useQuery({
    queryKey: ["email-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key,value")
        .in("key", [...KEYS]);
      if (error) throw new Error(error.message);
      return Object.fromEntries(data.map((s) => [s.key, s.value])) as Record<string, string>;
    },
  });

  useEffect(() => {
    if (!settings.data) return;
    setForm({
      name: settings.data["email_from_name"] ?? "Yuga Spark",
      address: settings.data["email_from_address"] ?? "",
      reply: settings.data["email_reply_to"] ?? "",
    });
  }, [settings.data]);

  async function save() {
    const address = form.address.trim().toLowerCase();
    if (address && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      toast.error("Enter a valid sender address");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("app_settings").upsert(
      [
        { key: "email_from_name", value: form.name.trim() || "Yuga Spark" },
        { key: "email_from_address", value: address },
        { key: "email_reply_to", value: form.reply.trim().toLowerCase() },
      ],
      { onConflict: "key" },
    );
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Sender saved");
    void queryClient.invalidateQueries({ queryKey: ["email-settings"] });
  }

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4">
      <h3 className="label-mono text-muted-foreground">Sender settings</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        The address must belong to a domain you verified with your email provider, otherwise
        delivery is rejected.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="from-name" className="text-xs">
            From name
          </Label>
          <Input
            id="from-name"
            value={form.name}
            placeholder="Yuga Spark"
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="from-address" className="text-xs">
            From address
          </Label>
          <Input
            id="from-address"
            value={form.address}
            placeholder="club@yourdomain.com"
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reply-to" className="text-xs">
            Reply-to (optional)
          </Label>
          <Input
            id="reply-to"
            value={form.reply}
            placeholder="jayakrushna1622@gmail.com"
            onChange={(e) => setForm((f) => ({ ...f, reply: e.target.value }))}
          />
        </div>
      </div>
      <Button size="sm" className="mt-3" onClick={save} disabled={busy}>
        {busy ? "Saving…" : "Save sender"}
      </Button>
    </div>
  );
}