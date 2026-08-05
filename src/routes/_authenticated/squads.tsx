import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Users, UserPlus, LogOut, Trash2, Check, X, Clock, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AppShell, PageHeader, EmptyState } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TITLE = "Squad finder — Yuga Spark";
const DESCRIPTION = "Find teammates and build your hackathon squad inside the Yuga Spark club.";

export const Route = createFileRoute("/_authenticated/squads")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: SquadsPage,
});

function SquadsPage() {
  const { user } = useAuth();
  const [hid, setHid] = useState<string>("");
  const [name, setName] = useState("");
  const [pitch, setPitch] = useState("");

  const hackathons = useQuery({
    queryKey: ["hackathons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hackathons")
        .select("*")
        .order("event_date", { ascending: true });
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const active = (hackathons.data ?? []).find((h) => h.id === hid) ?? hackathons.data?.[0];
  const activeId = active?.id ?? "";

  const names = useQuery({
    queryKey: ["member-names"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_member_names");
      if (error) throw new Error(error.message);
      return Object.fromEntries((data ?? []).map((m) => [m.id, m.full_name ?? "Member"]));
    },
  });

  const squads = useQuery({
    queryKey: ["squads", activeId],
    enabled: Boolean(activeId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("squads")
        .select("*, squad_members(id,user_id,status)")
        .eq("hackathon_id", activeId)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const list = squads.data ?? [];
  const mySquad = list.find((s) =>
    s.squad_members.some((m) => m.user_id === user?.id && m.status === "joined"),
  );
  const myRequestSquadIds = new Set(
    list
      .filter((s) => s.squad_members.some((m) => m.user_id === user?.id && m.status === "requested"))
      .map((s) => s.id),
  );

  async function createSquad() {
    if (!user || !activeId || !name.trim()) return;
    const { data, error } = await supabase
      .from("squads")
      .insert({ hackathon_id: activeId, name: name.trim(), pitch: pitch.trim() || null, leader_id: user.id })
      .select("id")
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase
      .from("squad_members")
      .insert({ squad_id: data.id, user_id: user.id, status: "joined" });
    setName("");
    setPitch("");
    toast.success("Squad created");
    void squads.refetch();
  }

  async function join(squadId: string) {
    if (!user) return;
    const { error } = await supabase
      .from("squad_members")
      .insert({ squad_id: squadId, user_id: user.id, status: "requested" });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Request sent — the squad leader will approve it");
    void squads.refetch();
  }

  async function decide(memberId: string, approve: boolean) {
    const q = approve
      ? supabase.from("squad_members").update({ status: "joined" }).eq("id", memberId)
      : supabase.from("squad_members").delete().eq("id", memberId);
    const { error } = await q;
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(approve ? "Member approved" : "Request declined");
    void squads.refetch();
  }

  async function leave(squadId: string) {
    if (!user) return;
    const { error } = await supabase
      .from("squad_members")
      .delete()
      .eq("squad_id", squadId)
      .eq("user_id", user.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("You left the squad");
    void squads.refetch();
  }

  async function disband(squadId: string) {
    const { error } = await supabase.from("squads").delete().eq("id", squadId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Squad disbanded");
    void squads.refetch();
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Squad finder"
        title="Build your team"
        description="Team sizes are set by the admins for each hackathon. Create a squad or join one that's still looking."
        actions={
          <Select value={activeId} onValueChange={setHid}>
            <SelectTrigger className="w-[260px]">
              <SelectValue placeholder="Choose hackathon" />
            </SelectTrigger>
            <SelectContent>
              {(hackathons.data ?? []).map((h) => (
                <SelectItem key={h.id} value={h.id}>
                  {h.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {!active ? (
        <div className="mt-8">
          <EmptyState
            icon={Users}
            title="No hackathons to squad up for yet"
            description="Squad building unlocks the moment admins publish an event with a team size."
            steps={[
              "Watch the dashboard — new hackathons appear there first.",
              "Check the notice board for outside-college events admins share.",
              "Once an event is live, come back and create a squad or request to join one.",
            ]}
            action={
              <Button asChild size="sm">
                <Link to="/dashboard">Go to dashboard</Link>
              </Button>
            }
            secondaryAction={
              <Button asChild size="sm" variant="outline">
                <Link to="/notices">Notice board</Link>
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[340px_1fr]">
          <aside className="surface h-fit p-6">
            <h2 className="font-display text-lg font-bold">Start a squad</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {active.title} · teams of {active.team_min}–{active.team_max}
            </p>
            {mySquad ? (
              <p className="mt-4 rounded-lg bg-secondary p-3 text-sm text-secondary-foreground">
                You&apos;re already in <b>{mySquad.name}</b> for this hackathon.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                <Input placeholder="Squad name" value={name} onChange={(e) => setName(e.target.value)} />
                <Textarea
                  placeholder="What are you building? Who do you need?"
                  value={pitch}
                  onChange={(e) => setPitch(e.target.value)}
                  rows={4}
                />
                <Button className="w-full" onClick={createSquad} disabled={!name.trim()}>
                  Create squad
                </Button>
              </div>
            )}
          </aside>

          <section className="space-y-4">
            {list.length === 0 ? (
              <EmptyState
                icon={UserPlus}
                title={`No squads yet for ${active.title}`}
                description={`Be the first to open a team — squads need ${active.team_min}–${active.team_max} members.`}
                steps={[
                  "Name your squad and write a one-line pitch in the panel on the left.",
                  "Share the squad name with friends so they can request to join.",
                  "Approve join requests until you hit the minimum team size.",
                ]}
                action={
                  <Button asChild size="sm" variant="outline">
                    <Link to="/chat">Ask an admin</Link>
                  </Button>
                }
              />
            ) : (
              list.map((s) => {
                const all = s.squad_members ?? [];
                const members = all.filter((m) => m.status === "joined");
                const pending = all.filter((m) => m.status === "requested");
                const isMember = members.some((m) => m.user_id === user?.id);
                const isLeader = s.leader_id === user?.id;
                const full = members.length >= active.team_max;
                const incomplete = members.length < active.team_min;
                return (
                  <article key={s.id} className="surface p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-display text-lg font-bold">{s.name}</h3>
                        <p className="label-mono mt-1 text-muted-foreground">
                          Led by {names.data?.[s.leader_id] ?? "Member"}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap justify-end gap-2">
                        <Badge variant={full ? "secondary" : "default"}>
                          {members.length}/{active.team_max} {full ? "full" : "open"}
                        </Badge>
                        {incomplete ? <Badge variant="outline">Incomplete</Badge> : null}
                      </div>
                    </div>
                    {s.pitch ? <p className="mt-3 text-sm text-muted-foreground">{s.pitch}</p> : null}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {members.map((m) => (
                        <span key={m.id} className="rounded-full bg-secondary px-3 py-1 text-xs">
                          {names.data?.[m.user_id] ?? "Member"}
                        </span>
                      ))}
                    </div>
                    {isLeader && pending.length > 0 ? (
                      <div className="mt-4 rounded-lg border border-border p-3">
                        <p className="label-mono text-muted-foreground">
                          Join requests ({pending.length})
                        </p>
                        <ul className="mt-2 space-y-2">
                          {pending.map((m) => (
                            <li key={m.id} className="flex items-center justify-between gap-2">
                              <span className="text-sm">{names.data?.[m.user_id] ?? "Member"}</span>
                              <span className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  disabled={full}
                                  onClick={() => decide(m.id, true)}
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => decide(m.id, false)}>
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    <div className="mt-5 flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs"
                        onClick={async () => {
                          const text = `Join my hackathon squad "${s.name}" for ${active.title} on Yuga Spark! Register & request to join: ${window.location.origin}/squads`;
                          if (navigator.share) {
                            try {
                              await navigator.share({ title: `Squad: ${s.name}`, text, url: `${window.location.origin}/squads` });
                              return;
                            } catch {
                              // fallback to clipboard
                            }
                          }
                          await navigator.clipboard.writeText(text);
                          toast.success("Squad invite text copied to clipboard!");
                        }}
                      >
                        <Share2 className="h-3.5 w-3.5 text-primary" />
                        Share Invite Link
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
                        onClick={() => {
                          const msg = `Join my hackathon squad "${s.name}" for ${active.title} on Yuga Spark! Join here: ${window.location.origin}/squads`;
                          window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, "_blank");
                        }}
                      >
                        WhatsApp
                      </Button>
                      {isMember ? (
                        <>
                          <Button variant="outline" size="sm" onClick={() => leave(s.id)}>
                            <LogOut className="mr-1.5 h-3.5 w-3.5" /> Leave
                          </Button>
                          {isLeader ? (
                            <Button variant="ghost" size="sm" onClick={() => disband(s.id)}>
                              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Disband
                            </Button>
                          ) : null}
                        </>
                      ) : myRequestSquadIds.has(s.id) ? (
                        <Button size="sm" variant="outline" onClick={() => leave(s.id)}>
                          <Clock className="mr-1.5 h-3.5 w-3.5" /> Request pending — cancel
                        </Button>
                      ) : (
                        <Button size="sm" disabled={full || Boolean(mySquad)} onClick={() => join(s.id)}>
                          <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                          {full ? "Squad full" : mySquad ? "Already squadded" : "Request to join"}
                        </Button>
                      )}
                    </div>
                  </article>
                );
              })
            )}
          </section>
        </div>
      )}
    </AppShell>
  );
}
