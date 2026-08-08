import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Landmark,
  Trophy,
  Calendar,
  Sparkles,
  Users,
  Image as ImageIcon,
  X,
  Maximize2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

export type ClubYear = {
  id: string;
  year_label: string;
  tagline: string | null;
  member_count: number;
  hackathons_count: number;
  wins_count: number;
  cover_image_url: string | null;
  display_order: number;
};

export type ClubAchievement = {
  id: string;
  year_id: string;
  kind: "moment" | "gallery" | "win" | "lead";
  title: string;
  description: string | null;
  person_name: string | null;
  role: string | null;
  image_url: string | null;
  display_order: number;
};

export function ClubLegacyShowcase() {
  const [selectedYearId, setSelectedYearId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // 1. Fetch Years — 30 Minute Cache (Very Low DB Load)
  const yearsQuery = useQuery({
    queryKey: ["public-club-years"],
    staleTime: 30 * 60_000,
    gcTime: 60 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("club_years" as any)
        .select("id, year_label, tagline, member_count, hackathons_count, wins_count, cover_image_url, display_order")
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) return [];
      return (data ?? []) as ClubYear[];
    },
  });

  const years = yearsQuery.data ?? [];
  const activeYearId = selectedYearId ?? years[0]?.id ?? null;
  const activeYear = years.find((y) => y.id === activeYearId);

  // 2. Fetch All Achievements in 1 Single Query — 30 Minute Cache (Filter Years in Memory)
  const itemsQuery = useQuery({
    queryKey: ["public-club-achievements"],
    staleTime: 30 * 60_000,
    gcTime: 60 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("club_achievements" as any)
        .select("id, year_id, kind, title, description, person_name, role, image_url, display_order")
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) return [];
      return (data ?? []) as ClubAchievement[];
    },
  });

  const allItems = itemsQuery.data ?? [];
  const yearItems = activeYearId ? allItems.filter((i) => i.year_id === activeYearId) : [];

  // Filter achievements by kind in memory (0 extra DB requests on tab switch)
  const momentsAndWins = yearItems.filter((i) => i.kind === "moment" || i.kind === "win");
  const leads = yearItems.filter((i) => i.kind === "lead");
  const gallery = yearItems.filter((i) => i.kind === "gallery");

  if (yearsQuery.isLoading) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground animate-pulse">
        Loading legacy showcase…
      </div>
    );
  }

  if (years.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground border border-dashed border-border rounded-2xl p-8 max-w-xl mx-auto">
        <Landmark className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
        <p className="font-semibold text-foreground">No legacy records published yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Club achievements for recent academic years will appear here shortly.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-10">
      {/* Year Switcher Bar */}
      <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {years.map((y) => {
          const isActive = y.id === activeYearId;
          return (
            <button
              key={y.id}
              onClick={() => setSelectedYearId(y.id)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-105"
                  : "bg-card hover:bg-accent/50 text-muted-foreground border border-border"
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>Academic Year {y.year_label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Year Stats & Cover */}
      {activeYear && (
        <div className="relative rounded-3xl border border-primary/20 bg-gradient-to-br from-card via-card/90 to-primary/5 p-6 sm:p-8 overflow-hidden shadow-lg">
          {activeYear.cover_image_url && (
            <img
              src={activeYear.cover_image_url}
              alt={activeYear.year_label}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover opacity-10 blur-sm pointer-events-none"
            />
          )}

          <div className="relative z-10 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <Badge variant="outline" className="text-primary border-primary/30 bg-primary/10 mb-2">
                  <Sparkles className="h-3 w-3 mr-1 text-primary" /> {activeYear.year_label} Edition
                </Badge>
                <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                  {activeYear.tagline || `RGMCET Yuga Spark — ${activeYear.year_label}`}
                </h2>
              </div>
            </div>

            {/* 3 Impact Numbers */}
            <div className="grid grid-cols-3 gap-3 sm:gap-6 pt-2 border-t border-border/60">
              <div className="text-center p-3 rounded-2xl bg-card/60 border border-border">
                <p className="font-display text-xl sm:text-3xl font-extrabold text-primary">
                  {activeYear.member_count}+
                </p>
                <p className="text-[11px] sm:text-xs text-muted-foreground font-medium flex items-center justify-center gap-1 mt-0.5">
                  <Users className="h-3 w-3" /> Members
                </p>
              </div>

              <div className="text-center p-3 rounded-2xl bg-card/60 border border-border">
                <p className="font-display text-xl sm:text-3xl font-extrabold text-primary">
                  {activeYear.hackathons_count}
                </p>
                <p className="text-[11px] sm:text-xs text-muted-foreground font-medium flex items-center justify-center gap-1 mt-0.5">
                  <Calendar className="h-3 w-3" /> Events
                </p>
              </div>

              <div className="text-center p-3 rounded-2xl bg-card/60 border border-border">
                <p className="font-display text-xl sm:text-3xl font-extrabold text-primary">
                  {activeYear.wins_count}
                </p>
                <p className="text-[11px] sm:text-xs text-muted-foreground font-medium flex items-center justify-center gap-1 mt-0.5">
                  <Trophy className="h-3 w-3 text-amber-500" /> Podium Wins
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section 1: Key Moments & Hackathon Wins */}
      {momentsAndWins.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            <h3 className="font-display text-lg font-bold text-foreground">
              Key Moments & Hackathon Podium Finishes
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {momentsAndWins.map((item) => (
              <div
                key={item.id}
                className="group relative rounded-2xl border border-border bg-card/70 p-5 transition-all hover:border-primary/40 hover:shadow-md flex flex-col justify-between overflow-hidden"
              >
                {item.image_url && (
                  <div className="relative h-44 w-full rounded-xl overflow-hidden mb-4 bg-muted">
                    <img
                      src={item.image_url}
                      alt={item.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {item.kind === "win" && (
                      <Badge className="absolute top-3 right-3 bg-amber-500 text-black font-bold border-none shadow-md">
                        <Trophy className="h-3 w-3 mr-1" /> Hackathon Win
                      </Badge>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className="text-xs uppercase font-mono tracking-wider">
                      {item.kind === "win" ? "🏆 Win" : "✨ Milestone"}
                    </Badge>
                    {item.person_name && (
                      <span className="text-xs text-muted-foreground font-medium">
                        By {item.person_name}
                      </span>
                    )}
                  </div>

                  <h4 className="font-display text-base font-bold text-foreground leading-snug">
                    {item.title}
                  </h4>

                  {item.description && (
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 2: Photo Gallery Grid */}
      {gallery.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary" />
            <h3 className="font-display text-lg font-bold text-foreground">
              Event Gallery & Campus Moments
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {gallery.map((img) => (
              <div
                key={img.id}
                onClick={() => img.image_url && setPreviewImage(img.image_url)}
                className="group relative aspect-square rounded-2xl overflow-hidden border border-border bg-muted cursor-pointer transition-all hover:ring-2 hover:ring-primary"
              >
                {img.image_url ? (
                  <img
                    src={img.image_url}
                    alt={img.title || "Gallery image"}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                    No image
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end text-white">
                  <p className="font-bold text-xs truncate">{img.title}</p>
                  {img.description && (
                    <p className="text-[10px] text-white/80 line-clamp-1">{img.description}</p>
                  )}
                  <Maximize2 className="h-3.5 w-3.5 absolute top-3 right-3 text-white/80" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 3: Leads Spotlight */}
      {leads.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            <h3 className="font-display text-lg font-bold text-foreground">
              Lead Team & Student Mentors
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {leads.map((lead) => (
              <div
                key={lead.id}
                className="rounded-2xl border border-border bg-card/70 p-4 text-center space-y-3 transition-all hover:border-primary/40"
              >
                <div className="h-20 w-20 mx-auto rounded-full overflow-hidden bg-muted border-2 border-primary/20 shadow-inner">
                  {lead.image_url ? (
                    <img
                      src={lead.image_url}
                      alt={lead.person_name || lead.title}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-lg text-primary bg-primary/10">
                      {(lead.person_name || lead.title)[0]}
                    </div>
                  )}
                </div>

                <div>
                  <p className="font-display text-sm font-bold text-foreground truncate">
                    {lead.person_name || lead.title}
                  </p>
                  <p className="text-xs text-primary font-medium truncate mt-0.5">
                    {lead.role || lead.description || "Club Lead"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Image Lightbox Modal */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn"
        >
          <div className="relative max-w-4xl max-h-[90vh] rounded-2xl overflow-hidden border border-white/20 shadow-2xl">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 z-10 rounded-full bg-black/60 text-white p-2 hover:bg-black"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={previewImage}
              alt="Expanded preview"
              className="max-w-full max-h-[85vh] object-contain mx-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
}
