import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { Megaphone, Link2, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AppShell, PageHeader, EmptyState } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const TITLE = "Notice board — Yuga Spark";
const DESCRIPTION = "Announcements, outside hackathons, useful links and club polls.";

export const Route = createFileRoute("/_authenticated/notices")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: NoticesPage,
});

function NoticesPage() {
  const { user } = useAuth();

  const notices = useQuery({
    queryKey: ["notices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notices")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const votes = useQuery({
    queryKey: ["poll-votes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("poll_votes").select("*");
      if (error) throw new Error(error.message);
      return data;
    },
  });

  async function vote(noticeId: string, index: number) {
    if (!user) return;
    const existing = (votes.data ?? []).find(
      (v) => v.notice_id === noticeId && v.user_id === user.id,
    );
    const q = existing
      ? supabase.from("poll_votes").update({ option_index: index }).eq("id", existing.id)
      : supabase.from("poll_votes").insert({ notice_id: noticeId, user_id: user.id, option_index: index });
    const { error } = await q;
    if (error) {
      toast.error(error.message);
      return;
    }
    void votes.refetch();
  }

  const list = notices.data ?? [];

  return (
    <AppShell>
      <PageHeader
        eyebrow="Notice board"
        title="What's happening"
        description="Outside-college hackathons, club announcements, links and polls."
      />
      {list.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={Megaphone}
            title="The board is quiet right now"
            description="Announcements, outside-college hackathons, links and polls will show up here."
            steps={[
              "Check the dashboard for hackathons the club has already scheduled.",
              "Spotted an external hackathon? Tell an admin and they can post it here.",
              "Polls appear on this board — keep an eye out so your vote counts.",
            ]}
            action={
              <Button asChild size="sm">
                <Link to="/dashboard">Go to dashboard</Link>
              </Button>
            }
            secondaryAction={
              <Button asChild size="sm" variant="outline">
                <Link to="/chat">Share a hackathon</Link>
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {list.map((n) => {
            const options = Array.isArray(n.options) ? (n.options as string[]) : [];
            const noticeVotes = (votes.data ?? []).filter((v) => v.notice_id === n.id);
            const mine = noticeVotes.find((v) => v.user_id === user?.id);
            const closed = Boolean(n.expires_at && new Date(n.expires_at).getTime() < Date.now());
            return (
              <article key={n.id} className="surface p-6">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-display text-lg font-bold">{n.title}</h3>
                  <Badge variant="secondary" className="capitalize">
                    {n.kind}
                  </Badge>
                </div>
                <p className="label-mono mt-1 text-muted-foreground">
                  {new Date(n.created_at).toLocaleDateString(undefined, {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
                {n.body ? <p className="mt-3 text-sm text-muted-foreground">{n.body}</p> : null}
                {n.link ? (
                  <a
                    href={n.link}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                  >
                    <Link2 className="h-4 w-4" /> Open link
                  </a>
                ) : null}
                {n.kind === "poll" && options.length > 0 ? (
                  <div className="mt-4 space-y-2">
                    <p className="label-mono flex items-center gap-1.5 text-muted-foreground">
                      <BarChart3 className="h-3.5 w-3.5" /> {noticeVotes.length} votes
                    </p>
                    {options.map((opt, i) => {
                      const count = noticeVotes.filter((v) => v.option_index === i).length;
                      const pct = noticeVotes.length ? (count / noticeVotes.length) * 100 : 0;
                      return (
                        <button
                          key={i}
                          disabled={closed}
                          onClick={() => vote(n.id, i)}
                          className={`relative w-full overflow-hidden rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                            mine?.option_index === i
                              ? "border-primary bg-primary/5"
                              : "border-border hover:bg-secondary"
                          } ${closed ? "cursor-not-allowed opacity-70" : ""}`}
                        >
                          <span
                            className="absolute inset-y-0 left-0 bg-primary/10"
                            style={{ width: `${pct}%` }}
                          />
                          <span className="relative flex justify-between">
                            <span>{opt}</span>
                            <span className="font-mono text-xs text-muted-foreground">{count}</span>
                          </span>
                        </button>
                      );
                    })}
                    {closed ? (
                      <p className="label-mono text-muted-foreground">Poll closed</p>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
