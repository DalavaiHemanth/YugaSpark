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
    { k: "Hackathons attended", v: results.filter((r) => r.attended).length },
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
              <Link to="/badge">View my badge</Link>
            </Button>
          )
        }
      />

      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <StatCard key={s.k} label={s.k} value={s.v} />
        ))}
      </div>

      <div className="mt-4 grid gap-4">
        {next ? (
          <section className="surface-ink overflow-hidden p-6 sm:p-7">
            <div>
              <p className="label-mono text-white/60">Next hackathon</p>
              <h2 className="mt-2 font-display text-2xl font-bold sm:text-3xl">{next.title}</h2>
              <p className="mt-1.5 text-sm text-white/60">
                {new Date(next.event_date).toLocaleDateString(undefined, {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                })}
                {next.venue ? ` · ${next.venue}` : ""}
              </p>
              <div className="mt-6 flex flex-wrap gap-8">
                <Countdown target={nextStart} label="Starts in" size="lg" />
                {next.registration_deadline ? (
                  <Countdown target={next.registration_deadline} label="Registration closes in" size="lg" />
                ) : null}
              </div>
            </div>
          </section>
        ) : (
          <section className="surface flex flex-col justify-center p-7">
            <p className="label-mono text-muted-foreground">Next hackathon</p>
            <h2 className="mt-2 font-display text-2xl font-bold">Nothing on the calendar yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {isAdmin
                ? "Create the club's next build night so members can register."
                : "The club leads will post the next build night here. Get ready in the meantime."}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {isAdmin ? (
                <Button asChild size="sm">
                  <Link to="/admin" search={{ section: "members" }}>Create a hackathon</Link>
                </Button>
              ) : (
                <>
                  <Button asChild size="sm">
                    <Link to="/playbook">Open the playbook</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/notices">Notice board</Link>
                  </Button>
                </>
              )}
            </div>
          </section>
        )}
      </div>

      {!isAdmin ? (
        <section className="mt-10">
          <h2 className="label-mono text-muted-foreground">Club shortcuts</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {SHORTCUTS.map((s) => (
              <Link
                key={s.to}
                to={s.to}
                className="surface lift flex items-start gap-3 p-4"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <s.icon className="h-4.5 w-4.5" />
                </span>
                <span className="min-w-0">
                  <span className="block font-display text-sm font-bold">{s.label}</span>
                  <span className="block text-xs text-muted-foreground">{s.copy}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-12">
        <h2 className="label-mono text-muted-foreground">Upcoming hackathons</h2>
        {hackathons.isLoading ? (
          <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
        ) : upcoming.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon={CalendarDays}
              title="No hackathons scheduled yet"
              description={
                isAdmin
                  ? "Publish an event and it shows up here for every member instantly."
                  : "As soon as admins publish an event, you can register right from this page."
              }
              steps={
                isAdmin
                  ? [
                      "Open the console and add a hackathon with date, venue and team size.",
                      "Import or add members so they can register.",
                      "Post an announcement on the notice board to drive sign-ups.",
                    ]
                  : [
                      "Complete your profile so registration is one click when an event drops.",
                      "Browse the playbook to sharpen your stack before the next build night.",
                      "Watch the notice board for outside-college hackathons too.",
                    ]
              }
              action={
                isAdmin ? (
                  <Button asChild size="sm">
                    <Link to="/admin" search={{ section: "members" }}>Create a hackathon</Link>
                  </Button>
                ) : (
                  <Button asChild size="sm">
                    <Link to="/playbook">Open the playbook</Link>
                  </Button>
                )
              }
              secondaryAction={
                <Button asChild size="sm" variant="outline">
                  <Link to="/notices">Notice board</Link>
                </Button>
              }
            />
          </div>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {upcoming.map((h) => {
              const registered = registrations.data?.includes(h.id) ?? false;
              return (
                <article key={h.id} className="surface lift relative flex flex-col overflow-hidden p-6">
                  {registered ? (
                    <span className="absolute right-0 top-0 rounded-bl-lg bg-primary px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-primary-foreground">
                      Registered
                    </span>
                  ) : null}
                  {h.banner_url ? (
                    <img
                      src={h.banner_url}
                      alt={`${h.title} banner`}
                      loading="lazy"
                      className="mb-4 h-32 w-full rounded-lg object-cover"
                    />
                  ) : null}
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-display text-xl font-bold">{h.title}</h3>
                    <Badge variant="secondary" className="shrink-0 font-mono text-[11px]">
                      {h.team_min}–{h.team_max}
                    </Badge>
                  </div>
                  <p className="label-mono mt-3 text-primary">
                    {new Date(h.event_date).toLocaleDateString(undefined, {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                  {h.description ? (
                    <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{h.description}</p>
                  ) : null}
                  <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                    {h.venue ? (
                      <p className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" /> {h.venue}
                      </p>
                    ) : null}
                    {h.start_time ? (
                      <p className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" /> {h.start_time.slice(0, 5)}
                        {h.end_time ? ` – ${h.end_time.slice(0, 5)}` : ""}
                      </p>
                    ) : null}
                    <p className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" /> Teams of {h.team_min}–{h.team_max}
                    </p>
                    <p className="flex items-center gap-1.5 capitalize">
                      <MapPin className="h-3.5 w-3.5" /> {h.mode} event
                    </p>
                  </div>
                  <Countdown
                    className="mt-4"
                    target={h.registration_deadline ?? `${h.event_date}T${h.start_time ? h.start_time.slice(0, 8) : "09:00:00"}`}
                    label={h.registration_deadline ? "Registration closes in" : "Starts in"}
                  />
                  {!isAdmin ? (
                    <div className="mt-5 flex gap-2">
                      <Button
                        size="sm"
                        variant={registered ? "outline" : "default"}
                        disabled={!h.registration_open && !registered}
                        onClick={() => toggle(h.id, registered)}
                      >
                        {registered
                          ? "Withdraw"
                          : h.registration_open
                            ? "Register"
                            : "Registration closed"}
                      </Button>
                      <Button asChild size="sm" variant="ghost">
                        <Link to="/squads">Find squad</Link>
                      </Button>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {past.length > 0 ? (
        <section className="mt-12">
          <h2 className="label-mono text-muted-foreground">Past hackathons</h2>
          <div className="surface mt-4 divide-y divide-border overflow-hidden">
            {past.map((h) => (
              <div key={h.id} className="flex items-center justify-between gap-3 px-5 py-4">
                <span className="font-medium">{h.title}</span>
                <span className="label-mono text-muted-foreground">
                  {new Date(h.event_date).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </AppShell>
  );
}
