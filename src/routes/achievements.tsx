import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Landmark,
  Trophy,
  Calendar,
  Sparkles,
  Users,
  Award,
  ArrowLeft,
  ArrowRight,
  Building2,
  Lock,
  Flame,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Image as ImageIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SparkMark } from "@/components/SparkMark";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ClubYear, ClubAchievement } from "@/components/admin/AchievementsPanel";

const TITLE = "Club Legacy & Achievements — Yuga Spark";
const DESCRIPTION =
  "Official showcase of student moments, hackathon podium finishes, photo gallery, and lead teams through the years at RGMCET Yuga Spark.";

export const Route = createFileRoute("/achievements")({
  ssr: false,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: AchievementsPublicPage,
});

function AchievementsPublicPage() {
  const [selectedYearId, setSelectedYearId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // 1. Fetch Years (10 min cache for zero DB load)
  const yearsQuery = useQuery({
    queryKey: ["public-club-years"],
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase.from("club_years" as any) as any)
        .select("*")
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) return [];
      return (data ?? []) as ClubYear[];
    },
  });

  const years = yearsQuery.data ?? [];
  const activeYearId = selectedYearId ?? years[0]?.id ?? null;
  const activeYear = years.find((y) => y.id === activeYearId);

  // 2. Fetch Achievements for Selected Year (10 min cache)
  const itemsQuery = useQuery({
    queryKey: ["public-club-achievements", activeYearId],
    enabled: Boolean(activeYearId),
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase.from("club_achievements" as any) as any)
        .select("*")
        .eq("year_id", activeYearId!)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) return [];
      return (data ?? []) as ClubAchievement[];
    },
  });

  const items = itemsQuery.data ?? [];

  // Group items by kind
  const momentsAndWins = items.filter((i) => i.kind === "moment" || i.kind === "win");
  const leads = items.filter((i) => i.kind === "lead");
  const gallery = items.filter((i) => i.kind === "gallery");

  return (
    <div className="min-h-screen w-full bg-background text-foreground selection:bg-primary/20 flex flex-col">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 py-3.5">
          <div className="flex items-center gap-3">
            <Link to="/">
              <SparkMark />
            </Link>
          </div>
          <div className="flex items-center gap-2.5">
            <Button asChild size="sm" variant="ghost" className="text-xs font-semibold gap-1.5 text-muted-foreground hover:text-foreground">
              <Link to="/">
                <ArrowLeft className="h-3.5 w-3.5" /> Back Home
              </Link>
            </Button>
            <Button asChild size="sm" className="text-xs font-semibold gap-1.5 shadow-sm">
              <Link to="/auth">
                Student Portal <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Banner Section */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-primary/5 via-background to-background py-12 sm:py-16 px-4 text-center">
        <div className="mx-auto max-w-4xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
            <Landmark className="h-3.5 w-3.5" /> RGMCET Yuga Spark Hall of Fame
          </div>

          <h1 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
            Club Legacy & <span className="text-primary">Achievements</span>
          </h1>

          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Honoring student innovation, hackathon podium finishes, key milestones, and the team leads who shaped Yuga Spark over the years.
          </p>

          {/* Academic Year Selection Tabs */}
          {yearsQuery.isLoading ? (
            <div className="pt-6">
              <p className="text-xs text-muted-foreground">Loading academic years...</p>
            </div>
          ) : years.length === 0 ? (
            <div className="pt-6">
              <p className="text-xs text-muted-foreground italic">No academic years published yet.</p>
            </div>
          ) : (
            <div className="pt-6 flex flex-wrap justify-center items-center gap-2">
              {years.map((y) => (
                <Button
                  key={y.id}
                  size="sm"
                  variant={activeYearId === y.id ? "default" : "outline"}
                  onClick={() => setSelectedYearId(y.id)}
                  className={`text-xs font-semibold px-4 transition-all ${
                    activeYearId === y.id ? "shadow-md shadow-primary/20 scale-105" : "hover:border-primary/50"
                  }`}
                >
                  <Calendar className="h-3.5 w-3.5 mr-1.5" />
                  {y.year_label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-10 space-y-12">
        {activeYear ? (
          <>
            {/* Year Stats Ribbon */}
            <div className="surface p-6 rounded-2xl border border-border grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div>
                <p className="label-mono text-muted-foreground text-[11px] uppercase tracking-wider">Academic Year</p>
                <p className="mt-1 font-display text-xl font-bold text-primary">{activeYear.year_label}</p>
                {activeYear.tagline ? (
                  <p className="text-[11px] text-muted-foreground truncate max-w-[150px] mx-auto mt-0.5">{activeYear.tagline}</p>
                ) : null}
              </div>
              <div>
                <p className="label-mono text-muted-foreground text-[11px] uppercase tracking-wider">Club Members</p>
                <p className="mt-1 font-display text-2xl sm:text-3xl font-extrabold text-foreground">{activeYear.member_count}</p>
              </div>
              <div>
                <p className="label-mono text-muted-foreground text-[11px] uppercase tracking-wider">Hackathons Attended</p>
                <p className="mt-1 font-display text-2xl sm:text-3xl font-extrabold text-foreground">{activeYear.hackathons_count}</p>
              </div>
              <div>
                <p className="label-mono text-muted-foreground text-[11px] uppercase tracking-wider">Podium Finishes</p>
                <p className="mt-1 font-display text-2xl sm:text-3xl font-extrabold text-primary">{activeYear.wins_count}</p>
              </div>
            </div>

            {/* Section 1: Magazine-Style Wall of Moments & Wins */}
            <section className="space-y-6">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" /> Key Moments & Podiums
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Major milestones, award wins, and breakthroughs from {activeYear.year_label}.
                  </p>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {momentsAndWins.length} Entries
                </Badge>
              </div>

              {itemsQuery.isLoading ? (
                <p className="text-xs text-muted-foreground">Loading highlights...</p>
              ) : momentsAndWins.length === 0 ? (
                <div className="surface p-8 text-center rounded-2xl border border-dashed border-border text-xs text-muted-foreground">
                  No moments or wins added for this year yet.
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {momentsAndWins.map((item) => (
                    <article
                      key={item.id}
                      className="surface lift rounded-2xl border border-border overflow-hidden flex flex-col justify-between transition-all hover:border-primary/40 bg-card/60"
                    >
                      <div>
                        {/* Image Header */}
                        {item.image_url ? (
                          <div
                            className="aspect-video w-full overflow-hidden bg-muted cursor-pointer group relative"
                            onClick={() => setPreviewImage(item.image_url)}
                          >
                            <img
                              src={item.image_url}
                              alt={item.title}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1">
                              <ImageIcon className="h-4 w-4" /> Expand
                            </div>
                          </div>
                        ) : null}

                        <div className="p-5 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <Badge
                              variant={item.kind === "win" ? "default" : "secondary"}
                              className="capitalize text-[10px] font-bold"
                            >
                              {item.kind === "win" ? "🏆 Hackathon Win" : "✨ Key Moment"}
                            </Badge>
                          </div>

                          <h3 className="font-display font-bold text-base text-foreground leading-snug">
                            {item.title}
                          </h3>

                          {item.description ? (
                            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                              {item.description}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            {/* Section 2: Team Leads Spotlight */}
            {leads.length > 0 ? (
              <section className="space-y-6 pt-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div>
                    <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" /> Year Leads & Team
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      The student leaders who spearheaded Yuga Spark initiatives in {activeYear.year_label}.
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {leads.length} Leaders
                  </Badge>
                </div>

                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  {leads.map((lead) => (
                    <div
                      key={lead.id}
                      className="surface p-5 rounded-2xl border border-border text-center space-y-3 transition-all hover:border-primary/40 bg-card/60"
                    >
                      {lead.image_url ? (
                        <img
                          src={lead.image_url}
                          alt={lead.person_name ?? lead.title}
                          className="h-20 w-20 rounded-full object-cover mx-auto ring-2 ring-primary/30"
                        />
                      ) : (
                        <div className="h-20 w-20 rounded-full bg-primary/10 text-primary font-display font-extrabold text-xl flex items-center justify-center mx-auto border border-primary/20">
                          {(lead.person_name ?? lead.title)[0]}
                        </div>
                      )}

                      <div>
                        <h4 className="font-display font-bold text-sm text-foreground">
                          {lead.person_name || lead.title}
                        </h4>
                        <p className="text-xs text-primary font-medium mt-0.5">{lead.role || lead.title}</p>
                        {lead.description ? (
                          <p className="text-[11px] text-muted-foreground mt-1.5 line-clamp-3 leading-snug">
                            {lead.description}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {/* Section 3: Photo Gallery Grid */}
            {gallery.length > 0 ? (
              <section className="space-y-6 pt-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div>
                    <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
                      <ImageIcon className="h-5 w-5 text-primary" /> Event Gallery
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Memorable moments captured during workshops, Saturdays and hackathons.
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {gallery.length} Photos
                  </Badge>
                </div>

                <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                  {gallery.map((g) => (
                    <div
                      key={g.id}
                      className="group relative aspect-square rounded-xl overflow-hidden bg-muted border border-border cursor-pointer"
                      onClick={() => g.image_url && setPreviewImage(g.image_url)}
                    >
                      {g.image_url ? (
                        <img
                          src={g.image_url}
                          alt={g.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center p-3 text-center text-xs text-muted-foreground">
                          {g.title}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3 text-white">
                        <p className="font-display text-xs font-bold truncate">{g.title}</p>
                        {g.description ? (
                          <p className="text-[10px] text-gray-300 truncate">{g.description}</p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </>
        ) : null}
      </main>

      {/* Lightbox Image Preview Modal */}
      {previewImage ? (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl w-full max-h-[90vh] flex items-center justify-center">
            <img
              src={previewImage}
              alt="Enlarged view"
              className="max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl border border-white/20"
            />
          </div>
        </div>
      ) : null}

      {/* Public Footer */}
      <footer className="border-t border-border bg-card/40 py-6 text-center text-xs text-muted-foreground">
        <div className="max-w-6xl mx-auto px-4 flex flex-wrap items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} Yuga Spark — RGMCET Hackathon Club.</p>
          <div className="flex items-center gap-4">
            <Link to="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
            <Link to="/achievements" className="text-primary font-semibold">
              Legacy & Achievements
            </Link>
            <Link to="/auth" className="hover:text-foreground transition-colors">
              Student Sign In
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
