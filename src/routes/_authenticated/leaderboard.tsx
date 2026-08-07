import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Trophy, Medal, Flame, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, PageHeader, EmptyState } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TITLE = "Leaderboard — Yuga Spark";
const DESCRIPTION = "Club-wide and per-hackathon rankings for Yuga Spark builders.";

export const Route = createFileRoute("/_authenticated/leaderboard")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: LeaderboardPage,
});

function LeaderboardPage() {
  const [scope, setScope] = useState("all");

  const hackathons = useQuery({
    queryKey: ["hackathons"],
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hackathons")
        .select("id,title,event_date")
        .order("event_date", { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const rows = useQuery({
    queryKey: ["leaderboard", scope],
    staleTime: 60 * 1000, // 60 seconds cache to optimize database load
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "get_leaderboard",
        scope === "all" ? {} : { _hackathon_id: scope },
      );
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const list = rows.data ?? [];
  const podium = list.slice(0, 3);

  async function exportLeaderboardToExcel() {
    try {
      const XLSX = await import("xlsx");
      const data = list.map((p, i) => ({
        Rank: i + 1,
        Member: p.full_name,
        "Events Attended": p.events,
        "Podium Finishes": p.wins,
        "Total Points": p.points,
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Leaderboard");
      const titleScope = scope === "all" ? "Clubwide" : hackathons.data?.find((h) => h.id === scope)?.title || "Hackathon";
      XLSX.writeFile(wb, `Yuga_Spark_Leaderboard_${titleScope.replace(/[^a-zA-Z0-9_-]/g, "_")}.xlsx`);
      toast.success("Leaderboard exported to Excel");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    }
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Standings"
        title="Club leaderboard"
        description="Points are awarded by admins after each hackathon — attendance, placement and bonus points all count."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportLeaderboardToExcel} className="gap-1.5 text-xs">
              <Download className="h-3.5 w-3.5 text-primary" />
              Export Excel
            </Button>
            <Select value={scope} onValueChange={setScope}>
              <SelectTrigger className="w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All hackathons</SelectItem>
                {(hackathons.data ?? []).map((h) => (
                  <SelectItem key={h.id} value={h.id}>
                    {h.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      {podium.length > 0 ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {podium.map((p, i) => (
            <div
              key={p.user_id}
              className={`surface lift p-6 ${i === 0 ? "sm:order-2 ring-2 ring-primary/40" : i === 1 ? "sm:order-1" : "sm:order-3"}`}
            >
              <div className="flex items-center justify-between">
                <span className="label-mono text-muted-foreground">#{i + 1}</span>
                {i === 0 ? (
                  <Trophy className="h-5 w-5 text-primary" />
                ) : (
                  <Medal className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <p className="mt-4 font-display text-lg font-bold">{p.full_name}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {p.events} events · {p.wins} podium finishes
              </p>
              <p className="mt-4 font-display text-3xl font-bold text-primary">{p.points}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="surface mt-8 overflow-hidden">
        {rows.isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading standings…</p>
        ) : list.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={Flame}
              title="No standings published yet"
              description="The leaderboard fills up as soon as admins post results for the first hackathon."
              steps={[
                "Register for an upcoming hackathon to get on the board.",
                "Points are awarded for attendance, and bonus points for podium finishes.",
                "Come back after the event — rankings update the moment results are posted.",
              ]}
              action={
                <Button asChild size="sm">
                  <Link to="/dashboard">See upcoming hackathons</Link>
                </Button>
              }
              secondaryAction={
                <Button asChild size="sm" variant="outline">
                  <Link to="/squads">Build your squad</Link>
                </Button>
              }
            />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50 text-left">
                <th className="label-mono px-5 py-3 text-muted-foreground">Rank</th>
                <th className="label-mono px-5 py-3 text-muted-foreground">Member</th>
                <th className="label-mono px-5 py-3 text-muted-foreground">Events</th>
                <th className="label-mono px-5 py-3 text-muted-foreground">Podiums</th>
                <th className="label-mono px-5 py-3 text-right text-muted-foreground">Points</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p, i) => (
                <tr key={p.user_id} className="border-b border-border/60 last:border-0">
                  <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{i + 1}</td>
                  <td className="px-5 py-3 font-medium">{p.full_name}</td>
                  <td className="px-5 py-3 text-muted-foreground">{p.events}</td>
                  <td className="px-5 py-3">
                    {p.wins > 0 ? <Badge variant="secondary">{p.wins}</Badge> : "—"}
                  </td>
                  <td className="px-5 py-3 text-right font-display font-bold">{p.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AppShell>
  );
}
