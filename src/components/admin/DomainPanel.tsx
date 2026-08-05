import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Clock, Copy, RefreshCw, Trash2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  addSenderDomain,
  listSenderDomains,
  removeSenderDomain,
  verifySenderDomain,
} from "@/lib/resend-domains.functions";
import type { DnsRecord, ResendDomain } from "@/lib/resend-domains.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SenderSettings } from "@/components/admin/SenderSettings";

function StatusPill({ status }: { status: string }) {
  const verified = status === "verified";
  const failed = status === "failed" || status === "temporary_failure";
  const Icon = verified ? CheckCircle2 : failed ? XCircle : Clock;
  const tone = verified
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : failed
      ? "bg-destructive/10 text-destructive border-destructive/30"
      : "bg-amber-50 text-amber-700 border-amber-200";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs capitalize ${tone}`}>
      <Icon className="h-3 w-3" />
      {status.replace(/_/g, " ")}
    </span>
  );
}

function RecordsTable({ records }: { records: DnsRecord[] }) {
  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
    toast.success("Copied");
  }
  return (
    <div className="mt-3 overflow-x-auto rounded-md border border-border">
      <table className="w-full min-w-[640px] text-left text-xs">
        <thead className="bg-muted/50 text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Type</th>
            <th className="px-3 py-2 font-medium">Name</th>
            <th className="px-3 py-2 font-medium">Value</th>
            <th className="px-3 py-2 font-medium">Priority</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {records.map((r, i) => (
            <tr key={`${r.type}-${r.name}-${i}`}>
              <td className="px-3 py-2 font-mono">{r.type}</td>
              <td className="px-3 py-2 font-mono break-all">{r.name}</td>
              <td className="px-3 py-2 font-mono break-all">{r.value}</td>
              <td className="px-3 py-2">{r.priority ?? "—"}</td>
              <td className="px-3 py-2 text-right">
                <Button size="sm" variant="ghost" onClick={() => copy(r.value)}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Owner tool: register a club sender domain, verify its DNS and pick the From address. */
export function DomainPanel() {
  const queryClient = useQueryClient();
  const list = useServerFn(listSenderDomains);
  const add = useServerFn(addSenderDomain);
  const verify = useServerFn(verifySenderDomain);
  const remove = useServerFn(removeSenderDomain);
  const [name, setName] = useState("");
  const [local, setLocal] = useState("noreply");

  const domains = useQuery<ResendDomain[]>({
    queryKey: ["sender-domains"],
    queryFn: () => list(),
    retry: false,
  });

  const settings = useQuery({
    queryKey: ["email-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key,value")
        .in("key", ["email_from_name", "email_from_address", "email_reply_to"]);
      if (error) throw new Error(error.message);
      return Object.fromEntries(data.map((s) => [s.key, s.value])) as Record<string, string>;
    },
  });
  const currentFrom = settings.data?.["email_from_address"] ?? "";

  const addMutation = useMutation({
    mutationFn: (domain: string) => add({ data: { name: domain } }),
    onSuccess: () => {
      setName("");
      toast.success("Domain added — now add the DNS records below at your registrar");
      void queryClient.invalidateQueries({ queryKey: ["sender-domains"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const verifyMutation = useMutation({
    mutationFn: (id: string) => verify({ data: { id } }),
    onSuccess: (d) => {
      if (d.status === "verified") toast.success(`${d.name} is verified`);
      else toast.message(`${d.name}: ${d.status.replace(/_/g, " ")} — DNS can take up to 72 hours`);
      void queryClient.invalidateQueries({ queryKey: ["sender-domains"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Domain removed");
      void queryClient.invalidateQueries({ queryKey: ["sender-domains"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function useAsSender(domain: string) {
    const address = `${local.trim().toLowerCase() || "noreply"}@${domain}`;
    const { error } = await supabase
      .from("app_settings")
      .upsert([{ key: "email_from_address", value: address }], { onConflict: "key" });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Sending from ${address}`);
    void queryClient.invalidateQueries({ queryKey: ["email-settings"] });
  }

  const verified = (domains.data ?? []).filter((d) => d.status === "verified");

  return (
    <div className="space-y-6">
      <div className="surface p-4 sm:p-6">
        <h2 className="label-mono text-muted-foreground">Add a sender domain</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Email providers reject free mailbox senders like <code>gmail.com</code>. Register a domain
          the club owns, add the DNS records it gives you, then verify.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="min-w-[240px] flex-1 space-y-1.5">
            <Label htmlFor="domain-name" className="text-xs">
              Domain
            </Label>
            <Input
              id="domain-name"
              value={name}
              placeholder="yugaspark.in"
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <Button
            onClick={() => addMutation.mutate(name)}
            disabled={addMutation.isPending || !name.trim()}
          >
            {addMutation.isPending ? "Adding…" : "Add domain"}
          </Button>
        </div>
      </div>

      <div className="surface p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="label-mono text-muted-foreground">Domains</h2>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void queryClient.invalidateQueries({ queryKey: ["sender-domains"] })}
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh
          </Button>
        </div>

        {domains.isLoading ? (
          <p className="mt-4 text-sm text-muted-foreground">Loading domains…</p>
        ) : domains.error ? (
          <p className="mt-4 text-sm text-destructive">
            {domains.error instanceof Error ? domains.error.message : "Could not load domains"}
          </p>
        ) : (domains.data ?? []).length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No sender domain yet. Add one above to start sending club email.
          </p>
        ) : (
          <ul className="mt-4 space-y-4">
            {(domains.data ?? []).map((d) => (
              <li key={d.id} className="rounded-lg border border-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-medium">{d.name}</span>
                    <StatusPill status={d.status} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => verifyMutation.mutate(d.id)}
                      disabled={verifyMutation.isPending}
                    >
                      Verify
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeMutation.mutate(d.id)}
                      disabled={removeMutation.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {d.records?.length ? (
                  <>
                    <p className="mt-3 text-xs text-muted-foreground">
                      Add these records at your registrar. Verification can take up to 72 hours.
                    </p>
                    <RecordsTable records={d.records} />
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="surface p-4 sm:p-6">
        <h2 className="label-mono text-muted-foreground">From address</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Current sender: <span className="font-mono">{currentFrom || "not set"}</span>
        </p>
        {verified.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No verified domain yet — once a domain shows “verified” you can pick a From address here.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            <div className="max-w-[240px] space-y-1.5">
              <Label htmlFor="mailbox" className="text-xs">
                Mailbox
              </Label>
              <Input
                id="mailbox"
                value={local}
                placeholder="noreply"
                onChange={(e) => setLocal(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {verified.map((d) => {
                const address = `${local.trim().toLowerCase() || "noreply"}@${d.name}`;
                return (
                  <Button
                    key={d.id}
                    size="sm"
                    variant={address === currentFrom ? "default" : "outline"}
                    onClick={() => useAsSender(d.name)}
                  >
                    Use {address}
                  </Button>
                );
              })}
            </div>
          </div>
        )}
        <div className="mt-5">
          <SenderSettings />
        </div>
      </div>
    </div>
  );
}
