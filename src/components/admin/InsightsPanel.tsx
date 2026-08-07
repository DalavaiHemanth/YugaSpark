import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const RANGES = [
  { key: "30", label: "30 days", days: 30 },
  { key: "90", label: "90 days", days: 90 },
  { key: "365", label: "12 months", days: 365 },
  { key: "all", label: "All time", days: 0 },
] as const;

type RangeKey = (typeof RANGES)[number]["key"];

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="surface p-5">
      <p className="label-mono text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-3xl font-bold">{value}</p>
    </div>
  );
}

function monthKey(d: string | Date) {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [y, m] = key.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString(undefined, {
    month: "short",
    year: "2-digit",
  });
}

export function InsightsPanel() {
  const [hid, setHid] = useState("");
  const [range, setRange] = useState<RangeKey>("90");

  const since = useMemo(() => {
    const days = RANGES.find((r) => r.key === range)?.days ?? 0;
    if (!days) return null;
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d;
  }, [range]);

  const hackathons = useQuery({
    queryKey: ["insight-hackathons"],
    staleTime: 2 * 60_000,
    gcTime: 10 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hackathons")
        .select("id,title,event_date,registration_open")
        .order("event_date", { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const counts = useQuery({
    queryKey: ["insight-counts", since?.toISOString() ?? "all"],
    staleTime: 2 * 60_000,
    gcTime: 10 * 60_000,
    queryFn: async () => {
      // ✅ Filter in DB — don't fetch all rows and filter in JS
      const sinceIso = since?.toISOString();
      const [members, regs, results, squads] = await Promise.all([
        sinceIso
          ? supabase.from("profiles").select("id,profile_completed,is_active,created_at").gte("created_at", sinceIso)
          : supabase.from("profiles").select("id,profile_completed,is_active,created_at"),
        sinceIso
          ? supabase.from("registrations").select("id,hackathon_id,created_at").gte("created_at", sinceIso)
          : supabase.from("registrations").select("id,hackathon_id,created_at"),
        sinceIso
          ? supabase.from("hackathon_results").select("id,attended,placement,hackathon_id,created_at").gte("created_at", sinceIso)
          : supabase.from("hackathon_results").select("id,attended,placement,hackathon_id,created_at"),
        sinceIso
          ? supabase.from("squads").select("id,created_at").gte("created_at", sinceIso)
          : supabase.from("squads").select("id,created_at"),
      ]);
      return {
        members: members.data ?? [],
        regs: regs.data ?? [],
        results: results.data ?? [],
        squads: squads.data ?? [],
      };
    },
  });

  const board = useQuery({
    queryKey: ["insight-board", hid],
    staleTime: 2 * 60_000,
    gcTime: 10 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "get_leaderboard",
        hid ? { _hackathon_id: hid } : {},
      );
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const c = counts.data;

  // Data already filtered server-side by date range — no JS filtering needed
  const regs = c?.regs ?? [];
  const results = c?.results ?? [];
  const squads = c?.squads ?? [];
  const members = c?.members ?? [];

  // Participation over time — registrations vs attendance per month
  const trend = useMemo(() => {
    const map = new Map<string, { month: string; registrations: number; attended: number }>();
    const touch = (k: string) =>
      map.get(k) ?? map.set(k, { month: k, registrations: 0, attended: 0 }).get(k)!;
    regs.forEach((r) => {
      if (!r.created_at) return;
      touch(monthKey(r.created_at)).registrations += 1;
    });
    results.forEach((r) => {
      if (!r.created_at || !r.attended) return;
      touch(monthKey(r.created_at)).attended += 1;
    });
    return [...map.values()]
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((r) => ({ ...r, label: monthLabel(r.month) }));
  }, [regs, results]);

  // Registrations per hackathon
  const perHackathon = useMemo(() => {
    return (hackathons.data ?? [])
      .filter((h) => !since || new Date(h.event_date) >= since)
      .map((h) => ({
        id: h.id,
        name: h.title.length > 18 ? `${h.title.slice(0, 18)}…` : h.title,
        title: h.title,
        registered: regs.filter((r) => r.hackathon_id === h.id).length,
        attended: results.filter((r) => r.hackathon_id === h.id && r.attended).length,
        date: h.event_date,
        open: h.registration_open,
      }))
      .sort((a, b) => b.registered - a.registered);
  }, [hackathons.data, regs, results, since]);

  const topPerformers = useMemo(
    () =>
      (board.data ?? []).slice(0, 8).map((r) => ({
        name: r.full_name ?? "Member",
        points: Number(r.points ?? 0),
      })),
    [board.data],
  );

  const trendConfig = {
    registrations: { label: "Registrations", color: "hsl(var(--primary))" },
    attended: { label: "Attended", color: "hsl(var(--muted-foreground))" },
  } satisfies ChartConfig;

  const barConfig = {
    registered: { label: "Registered", color: "hsl(var(--primary))" },
    attended: { label: "Attended", color: "hsl(var(--muted-foreground))" },
  } satisfies ChartConfig;

  const pointsConfig = {
    points: { label: "Points", color: "hsl(var(--primary))" },
  } satisfies ChartConfig;

  return (
    <div className="space-y-6">
      <div className="surface flex flex-wrap items-center gap-2 p-3">
        <span className="label-mono px-2 text-muted-foreground">Time range</span>
        <div className="flex flex-wrap gap-1.5">
          {RANGES.map((r) => (
            <Button
              key={r.key}
              size="sm"
              variant={range === r.key ? "default" : "outline"}
              onClick={() => setRange(r.key)}
            >
              {r.label}
            </Button>
          ))}
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto"
          onClick={() => {
            counts.refetch();
            board.refetch();
            hackathons.refetch();
          }}
        >
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="New members" value={c ? members.length : "—"} />
        <Stat
          label="Profiles complete"
          value={c ? members.filter((m) => m.profile_completed).length : "—"}
        />
        <Stat label="Registrations" value={c ? regs.length : "—"} />
        <Stat label="Squads formed" value={c ? squads.length : "—"} />
      </div>

      <div className="surface">
        <div className="border-b border-border px-5 py-4">
          <h2 className="label-mono text-muted-foreground">Participation over time</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Registrations and confirmed attendance, grouped by month.
          </p>
        </div>
        <div className="p-4 sm:p-5">
          {trend.length > 0 ? (
            <ChartContainer config={trendConfig} className="h-[260px] w-full">
              <AreaChart data={trend} margin={{ left: 4, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  dataKey="registrations"
                  type="monotone"
                  stroke="var(--color-registrations)"
                  fill="var(--color-registrations)"
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
                <Area
                  dataKey="attended"
                  type="monotone"
                  stroke="var(--color-attended)"
                  fill="var(--color-attended)"
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No registrations in this window yet.
            </p>
          )}
        </div>
      </div>

      <div className="surface">
        <div className="border-b border-border px-5 py-4">
          <h2 className="label-mono text-muted-foreground">Registrations per hackathon</h2>
        </div>
        <div className="p-4 sm:p-5">
          {perHackathon.length > 0 ? (
            <ChartContainer config={barConfig} className="h-[280px] w-full">
              <BarChart data={perHackathon} margin={{ left: 4, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  interval={0}
                  angle={-15}
                  height={50}
                  textAnchor="end"
                />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="registered" fill="var(--color-registered)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="attended" fill="var(--color-attended)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No hackathons in this window. Create one in the Hackathons tab.
            </p>
          )}
        </div>
        <ul className="divide-y divide-border border-t border-border">
          {perHackathon.map((h) => (
            <li key={h.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{h.title}</p>
                <p className="label-mono text-muted-foreground">
                  {new Date(h.date).toLocaleDateString()} ·{" "}
                  {h.open ? "registration open" : "registration closed"}
                </p>
              </div>
              <span className="label-mono shrink-0 text-muted-foreground">
                {h.registered} registered · {h.attended} attended
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="surface">
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
          <h2 className="label-mono text-muted-foreground">Top performers</h2>
          <select
            value={hid}
            onChange={(e) => setHid(e.target.value)}
            className="ml-auto h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">All hackathons</option>
            {(hackathons.data ?? []).map((h) => (
              <option key={h.id} value={h.id}>
                {h.title}
              </option>
            ))}
          </select>
        </div>
        {topPerformers.length > 0 ? (
          <div className="p-4 sm:p-5">
            <ChartContainer config={pointsConfig} className="h-[280px] w-full">
              <BarChart data={topPerformers} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={110}
                  tickLine={false}
                  axisLine={false}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="points" fill="var(--color-points)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
          </div>
        ) : null}
        <ul className="divide-y divide-border border-t border-border">
          {(board.data ?? []).slice(0, 20).map((row, i) => (
            <li key={row.user_id} className="flex items-center gap-4 px-5 py-3">
              <span className="w-6 font-mono text-sm text-muted-foreground">{i + 1}</span>
              <span className="flex-1 truncate text-sm font-medium">{row.full_name}</span>
              <span className="label-mono text-muted-foreground">
                {row.events} events · {row.wins} wins
              </span>
              <span className="font-display text-base font-bold text-primary">{row.points} pts</span>
            </li>
          ))}
          {(board.data ?? []).length === 0 ? (
            <li className="px-5 py-7 text-center">
              <p className="font-display text-sm font-bold">No results recorded yet</p>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Open the Results tab, mark attendance and award points — top performers appear here.
              </p>
            </li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
