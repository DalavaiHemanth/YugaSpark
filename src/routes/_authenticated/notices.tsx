import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Megaphone,
  Link2,
  BarChart3,
  Search,
  Pin,
  AlertTriangle,
  AlertCircle,
  MessageSquare,
  Sparkles,
  Flame,
  Send,
  Trash2,
  Share2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AppShell, PageHeader, EmptyState } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const TITLE = "Notice board — Yuga Spark";
const DESCRIPTION = "Announcements, outside hackathons, useful links, club polls and Q&A.";

const EMOJIS = ["👍", "🔥", "🚀", "❤️"];

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
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [openCommentNoticeId, setOpenCommentNoticeId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState<string>("");
  const [postingComment, setPostingComment] = useState<boolean>(false);

  // 1. Fetch Notices
  const notices = useQuery({
    queryKey: ["notices-list"],
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase.from("notices" as any) as any)
        .select("id,title,body,kind,link,is_pinned,priority,options,expires_at,created_at")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as any[];
    },
  });

  // 2. Fetch Poll Votes
  const votes = useQuery({
    queryKey: ["poll-votes"],
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("poll_votes")
        .select("id,notice_id,user_id,option_index");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  // 3. Fetch Emoji Reactions
  const reactions = useQuery({
    queryKey: ["notice-reactions"],
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("notice_reactions" as any)
          .select("id,notice_id,user_id,emoji");
        if (error) return [];
        return (data ?? []) as Array<{ id: string; notice_id: string; user_id: string; emoji: string }>;
      } catch {
        return [];
      }
    },
  });

  // 4. Fetch Comments
  const comments = useQuery({
    queryKey: ["notice-comments"],
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("notice_comments" as any)
          .select("id, notice_id, user_id, body, created_at, profiles:profiles!inner(full_name, email)")
          .order("created_at", { ascending: true });
        if (error) return [];
        return (data ?? []) as any[];
      } catch {
        return [];
      }
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

  async function toggleReaction(noticeId: string, emoji: string) {
    if (!user) return;
    const existing = (reactions.data ?? []).find(
      (r) => r.notice_id === noticeId && r.user_id === user.id && r.emoji === emoji,
    );

    if (existing) {
      await supabase.from("notice_reactions" as any).delete().eq("id", existing.id);
    } else {
      await supabase.from("notice_reactions" as any).insert({
        notice_id: noticeId,
        user_id: user.id,
        emoji,
      });
    }
    void reactions.refetch();
  }

  async function postComment(noticeId: string) {
    if (!user || !commentText.trim()) return;
    setPostingComment(true);
    try {
      const { error } = await supabase.from("notice_comments" as any).insert({
        notice_id: noticeId,
        user_id: user.id,
        body: commentText.trim(),
      });
      if (error) throw new Error(error.message);

      toast.success("Comment posted");
      setCommentText("");
      void comments.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to post comment");
    } finally {
      setPostingComment(false);
    }
  }

  async function deleteComment(commentId: string) {
    const { error } = await supabase.from("notice_comments" as any).delete().eq("id", commentId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Comment deleted");
    void comments.refetch();
  }

  // Filter Notices by Category and Search Query
  const rawList = notices.data ?? [];
  const filteredList = rawList.filter((n) => {
    if (activeCategory !== "all" && n.kind !== activeCategory) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (n.title ?? "").toLowerCase().includes(q) ||
      (n.body ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <AppShell>
      <PageHeader
        eyebrow="Notice board"
        title="What's happening"
        description="Outside-college hackathons, club announcements, links, polls and live student Q&A."
      />

      {/* Category Tabs & Search Bar */}
      <div className="mt-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {[
              { id: "all", label: "All Notices" },
              { id: "announcement", label: "📢 Announcements" },
              { id: "external", label: "🏆 Outside Hackathons" },
              { id: "link", label: "🔗 Useful Links" },
              { id: "poll", label: "📊 Polls" },
            ].map((cat) => (
              <Button
                key={cat.id}
                size="sm"
                variant={activeCategory === cat.id ? "default" : "outline"}
                onClick={() => setActiveCategory(cat.id)}
                className="text-xs font-semibold"
              >
                {cat.label}
              </Button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notices..."
              className="pl-9 text-xs"
            />
          </div>
        </div>

        {filteredList.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              icon={Megaphone}
              title="No notices match your filter"
              description="Try clearing your search or selecting 'All Notices'."
              action={
                <Button size="sm" onClick={() => { setActiveCategory("all"); setSearchQuery(""); }}>
                  Clear Filters
                </Button>
              }
            />
          </div>
        ) : (
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {filteredList.map((n) => {
              const options = Array.isArray(n.options) ? (n.options as string[]) : [];
              const noticeVotes = (votes.data ?? []).filter((v) => v.notice_id === n.id);
              const mine = noticeVotes.find((v) => v.user_id === user?.id);
              const closed = Boolean(n.expires_at && new Date(n.expires_at).getTime() < Date.now());

              // Check if notice was created within last 48 hours ("NEW" badge)
              const isNew = Date.now() - new Date(n.created_at).getTime() < 48 * 3600 * 1000;

              // Notice Reactions & Comments
              const noticeReactions = (reactions.data ?? []).filter((r) => r.notice_id === n.id);
              const noticeComments = (comments.data ?? []).filter((c) => c.notice_id === n.id);

              return (
                <article
                  key={n.id}
                  className={`surface p-6 rounded-2xl border transition-all space-y-4 relative ${
                    n.is_pinned ? "border-primary/50 bg-primary/5 shadow-lg" : "border-border"
                  }`}
                >
                  {/* Top Badge Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {n.is_pinned ? (
                        <Badge variant="default" className="gap-1 text-[10px] font-bold">
                          <Pin className="h-3 w-3 fill-current" /> Pinned
                        </Badge>
                      ) : null}

                      {isNew ? (
                        <Badge className="text-[10px] font-bold bg-emerald-500 text-white animate-pulse">
                          ✨ NEW
                        </Badge>
                      ) : null}

                      {n.priority === "urgent" ? (
                        <Badge variant="destructive" className="gap-1 text-[10px] font-bold">
                          <AlertTriangle className="h-3 w-3" /> URGENT
                        </Badge>
                      ) : n.priority === "important" ? (
                        <Badge variant="outline" className="gap-1 text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30 font-bold">
                          <AlertCircle className="h-3 w-3" /> IMPORTANT
                        </Badge>
                      ) : null}
                    </div>

                    <Badge variant="secondary" className="capitalize text-[10px]">
                      {n.kind}
                    </Badge>
                  </div>

                  {/* Header Title & Date */}
                  <div>
                    <h3 className="font-display text-lg font-bold text-foreground leading-snug">
                      {n.title}
                    </h3>
                    <p className="label-mono mt-1 text-[11px] text-muted-foreground">
                      {new Date(n.created_at).toLocaleDateString(undefined, {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>

                  {/* Details Body */}
                  {n.body ? (
                    <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                      {n.body}
                    </p>
                  ) : null}

                  {/* Optional Link */}
                  {n.link ? (
                    <a
                      href={String(n.link)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                    >
                      <Link2 className="h-3.5 w-3.5" /> Open External Link
                    </a>
                  ) : null}

                  {/* Poll Section */}
                  {n.kind === "poll" && options.length > 0 ? (
                    <div className="space-y-2 rounded-xl bg-secondary/30 p-3 border border-border">
                      <p className="label-mono flex items-center gap-1.5 text-muted-foreground text-xs font-semibold">
                        <BarChart3 className="h-3.5 w-3.5 text-primary" /> {noticeVotes.length} Total Votes
                      </p>
                      {options.map((opt, i) => {
                        const count = noticeVotes.filter((v) => v.option_index === i).length;
                        const pct = noticeVotes.length ? (count / noticeVotes.length) * 100 : 0;
                        return (
                          <button
                            key={i}
                            disabled={closed}
                            onClick={() => void vote(n.id, i)}
                            className={`relative w-full overflow-hidden rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                              mine?.option_index === i
                                ? "border-primary bg-primary/10 font-bold"
                                : "border-border hover:bg-secondary"
                            } ${closed ? "cursor-not-allowed opacity-70" : ""}`}
                          >
                            <span
                              className="absolute inset-y-0 left-0 bg-primary/20"
                              style={{ width: `${pct}%` }}
                            />
                            <span className="relative flex justify-between">
                              <span>{opt}</span>
                              <span className="font-mono text-xs text-muted-foreground">
                                {count} ({Math.round(pct)}%)
                              </span>
                            </span>
                          </button>
                        );
                      })}
                      {closed ? (
                        <p className="label-mono text-[11px] text-muted-foreground">Poll closed</p>
                      ) : null}
                    </div>
                  ) : null}

                  {/* Bottom Interaction Bar: Emoji Reactions & Q&A Drawer Toggle */}
                  <div className="pt-3 border-t border-border flex flex-wrap items-center justify-between gap-3">
                    {/* Emoji Reactions Bar */}
                    <div className="flex items-center gap-1.5">
                      {EMOJIS.map((emoji) => {
                        const count = noticeReactions.filter((r) => r.emoji === emoji).length;
                        const hasReacted = noticeReactions.some(
                          (r) => r.emoji === emoji && r.user_id === user?.id,
                        );
                        return (
                          <button
                            key={emoji}
                            onClick={() => void toggleReaction(n.id, emoji)}
                            className={`flex items-center gap-1 px-2 py-1 rounded-full border text-xs transition-all ${
                              hasReacted
                                ? "bg-primary/10 border-primary text-primary font-bold scale-105"
                                : "border-border bg-secondary/40 hover:bg-secondary text-muted-foreground"
                            }`}
                          >
                            <span>{emoji}</span>
                            {count > 0 ? <span className="font-mono text-[11px]">{count}</span> : null}
                          </button>
                        );
                      })}
                    </div>

                    {/* Q&A Comments Toggle Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setOpenCommentNoticeId(openCommentNoticeId === n.id ? null : n.id)
                      }
                      className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <MessageSquare className="h-3.5 w-3.5 text-primary" />
                      Q&A Comments ({noticeComments.length})
                    </Button>
                  </div>

                  {/* Q&A Discussion Thread Drawer */}
                  {openCommentNoticeId === n.id ? (
                    <div className="mt-3 space-y-3 pt-3 border-t border-border bg-secondary/20 p-3.5 rounded-xl">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5 text-primary" /> Student Q&A Thread
                      </h4>

                      {/* Comment Input */}
                      <div className="flex gap-2">
                        <Input
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          placeholder="Ask a question or leave a reply..."
                          className="text-xs bg-background"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              void postComment(n.id);
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          disabled={postingComment || !commentText.trim()}
                          onClick={() => void postComment(n.id)}
                          className="shrink-0 h-9 gap-1 text-xs"
                        >
                          <Send className="h-3.5 w-3.5" /> Post
                        </Button>
                      </div>

                      {/* Comments List */}
                      {noticeComments.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground italic py-1">
                          No questions yet. Be the first to ask a question!
                        </p>
                      ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                          {noticeComments.map((c) => (
                            <div
                              key={c.id}
                              className="rounded-lg bg-background p-2.5 border border-border text-xs space-y-1"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-primary text-[11px]">
                                  {c.profiles?.full_name || c.profiles?.email}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-muted-foreground font-mono">
                                    {new Date(c.created_at).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                  {c.user_id === user?.id ? (
                                    <button
                                      onClick={() => void deleteComment(c.id)}
                                      className="text-muted-foreground hover:text-destructive transition-colors"
                                      title="Delete comment"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                              <p className="text-xs leading-relaxed text-foreground">{c.body}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
