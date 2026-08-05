import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import {
  CalendarDays,
  MapPin,
  Users,
  Trophy,
  BookOpen,
  Award,
  Megaphone,
  MessageSquare,
  QrCode,
  Clock,
  CalendarCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AppShell, PageHeader, StatCard, EmptyState } from "@/components/AppShell";
import { Countdown } from "@/components/Countdown";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const TITLE = "Dashboard — Yuga Spark";
const DESCRIPTION = "Upcoming Yuga Spark hackathons, your registrations and club shortcuts.";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: Dashboard,
});

const SHORTCUTS = [
  { to: "/leaderboard", label: "Leaderboard", copy: "See where you rank", icon: Trophy },
  { to: "/squads", label: "Squad finder", copy: "Build or join a team", icon: Users },
  { to: "/playbook", label: "Playbook", copy: "Resources that win", icon: BookOpen },
  { to: "/certificates", label: "Certificates", copy: "Download your proof", icon: Award },
  { to: "/notices", label: "Notice board", copy: "News, links, polls", icon: Megaphone },
  { to: "/chat", label: "Ask an admin", copy: "Clear your doubts", icon: MessageSquare },
  { to: "/badge", label: "Member badge", copy: "Your QR identity", icon: QrCode },
] as const;

function Dashboard() {
  const { profile, user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && isAdmin) {
      navigate({ to: "/admin", search: { section: "members" }, replace: true });
      return;
    }
    if (!loading && profile && !profile.profile_completed && !isAdmin) {
      navigate({ to: "/onboarding", replace: true });
    }
  }, [loading, profile, isAdmin, navigate]);

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

  const registrations = useQuery({
    queryKey: ["registrations", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("registrations")
        .select("hackathon_id")
        .eq("user_id", user!.id);
      if (error) throw new Error(error.message);
      return data.map((r) => r.hackathon_id);
    },
  });

  const myResults = useQuery({
    queryKey: ["my-results", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hackathon_results")
        .select("points,placement,attended")
        .eq("user_id", user!.id);
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const mySaturdayAttendance = useQuery({
    queryKey: ["my-saturday-attendance", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("session_attendance" as any)
        .select("id")
        .eq("user_id", user!.id);
      if (error) return [];
      return data ?? [];
    },
  });

  async function toggle(hackathonId: string, registered: boolean) {
    if (!user) return;
    const q = registered
      ? supabase.from("registrations").delete().eq("user_id", user.id).eq("hackathon_id", hackathonId)
      : supabase.from("registrations").insert({ user_id: user.id, hackathon_id: hackathonId });
    const { error } = await q;
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(registered ? "Registration withdrawn" : "You're in. See you there.");
    await registrations.refetch();
  }

  const now = Date.now();
  const list = hackathons.data ?? [];
  const upcoming = list.filter((h) => new Date(h.event_date).getTime() >= now - 864e5);
  const past = list.filter((h) => new Date(h.event_date).getTime() < now - 864e5);
  const results = myResults.data ?? [];
  const points = results.reduce((a, r) => a + (r.points ?? 0), 0);
  const next = upcoming[0];
  const nextStart = next
    ? `${next.event_date}T${next.start_time ? next.start_time.slice(0, 8) : "09:00:00"}`
    : null;

  const stats = [
    { k: "Upcoming events", v: upcoming.length },
    { k: "Your registrations", v: registrations.data?.length ?? 0 },
    { k: "Saturday Sessions Attended", v: mySaturdayAttendance.data?.length ?? 0 },
    { k: "Club points", v: points },
  ];

  return (
    <AppShell>
      <PageHeader
        eyebrow="Mission control"
        title={profile?.full_name ? `Hey, ${profile.full_name.split(" ")[0]}` : "Welcome to Yuga Spark"}
        description="Everything the club is running right now. Register early — team sizes are capped."
        actions={
          isAdmin ? (
            <Button asChild>
              <Link to="/admin" search={{ section: "members" }}>Open admin console</Link>
            </Button>
          ) : (
            <Button asChild variant="outline">
              <Link to="/badge">View your badge</Link>
            </Button>
          )
        }
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <StatCard key={s.k} label={s.k} value={s.v} />
        ))}
      </div>

      {next && nextStart ? (
        <div className="surface lift mt-8 overflow-hidden p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <span className="label-mono text-primary">Next event</span>
              <h2 className="mt-1 font-display text-2xl font-bold sm:text-3xl">{next.title}</h2>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4" />
                  {new Date(next.event_date).toLocaleDateString()}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {next.venue ?? "Venue TBA"}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  {next.team_min}–{next.team_max} members per squad
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Countdown targetDate={nextStart} />
              {registrations.data?.includes(next.id) ? (
                <Button variant="outline" onClick={() => toggle(next.id, true)}>
                  Registered (Cancel)
                </Button>
              ) : (
                <Button onClick={() => toggle(next.id, false)}>Register now</Button>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-12">
        <h2 className="font-display text-xl font-bold">Upcoming hackathons</h2>
        {upcoming.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon={CalendarDays}
              title="No upcoming events right now"
              description="Admins publish new hackathons regularly. Check out past hackathons or hone your skills."
              steps={[
                "Keep an eye on the notice board for external hackathons shared by admins.",
                "Find teammates early using the Squad Finder.",
                "Browse the Playbook for guides and templates that help you win.",
              ]}
              action={
                <Button asChild size="sm">
                  <Link to="/notices">Check notice board</Link>
                </Button>
              }
              secondaryAction={
                <Button asChild size="sm" variant="outline">
                  <Link to="/squads">Find a squad</Link>
                </Button>
              }
            />
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((h) => {
              const isRegistered = registrations.data?.includes(h.id);
              return (
                <article key={h.id} className="surface lift flex flex-col justify-between p-6">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <Badge variant="outline" className="capitalize">
                        {h.mode}
                      </Badge>
                      {isRegistered ? <Badge>Registered</Badge> : null}
                    </div>
                    <h3 className="mt-3 font-display text-lg font-bold">{h.title}</h3>
                    {h.description ? (
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                        {h.description}
                      </p>
                    ) : null}
                    <div className="mt-4 space-y-1 text-xs text-muted-foreground">
                      <p>📅 {new Date(h.event_date).toLocaleDateString()}</p>
                      <p>📍 {h.venue ?? "Venue TBA"}</p>
                      <p>👥 Squad size: {h.team_min}–{h.team_max}</p>
                    </div>
                  </div>
                  <div className="mt-6 flex gap-2">
                    <Button
                      variant={isRegistered ? "outline" : "default"}
                      className="w-full"
                      onClick={() => toggle(h.id, Boolean(isRegistered))}
                    >
                      {isRegistered ? "Cancel registration" : "Register"}
                    </Button>
                    <Button asChild variant="secondary">
                      <Link to="/squads">Squad</Link>
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {past.length > 0 ? (
        <div className="mt-12">
          <h2 className="font-display text-xl font-bold">Past hackathons</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {past.map((h) => (
              <article key={h.id} className="surface p-6 opacity-80">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="capitalize">
                    {h.mode}
                  </Badge>
                  <span className="text-xs text-muted-foreground">Concluded</span>
                </div>
                <h3 className="mt-3 font-display text-lg font-bold">{h.title}</h3>
                <p className="mt-2 text-xs text-muted-foreground">
                  {new Date(h.event_date).toLocaleDateString()}
                </p>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-12">
        <h2 className="font-display text-xl font-bold">Shortcuts</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SHORTCUTS.map((s) => {
            const Icon = s.icon;
            return (
              <Link key={s.to} to={s.to} className="surface lift group flex items-start gap-4 p-5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-display text-base font-bold">{s.label}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">{s.copy}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
