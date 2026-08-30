import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Landmark,
  Trophy,
  Calendar,
  Users,
  Image as ImageIcon,
  X,
  Maximize2,
  Filter,
  Award,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

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
  const [categoryFilter, setCategoryFilter] = useState<"all" | "wins" | "leads" | "gallery">("all");

  // Fetch Years directly from Supabase
  const yearsQuery = useQuery({
    queryKey: ["public-club-years"],
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
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

  // Fetch Achievements directly from Supabase
  const itemsQuery = useQuery({
    queryKey: ["public-club-achievements"],
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
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

  const years = yearsQuery.data ?? [];
  const activeYearId = selectedYearId ?? years[0]?.id ?? null;
  const activeYear = years.find((y) => y.id === activeYearId) || years[0];

  const allItems = itemsQuery.data ?? [];
  const yearItems = activeYearId ? allItems.filter((i) => i.year_id === activeYearId) : allItems;

  const momentsAndWins = yearItems.filter((i) => i.kind === "moment" || i.kind === "win");
  const leads = yearItems.filter((i) => i.kind === "lead");
  const gallery = yearItems.filter((i) => i.kind === "gallery" || (i.image_url && i.kind !== "win"));

  // Select the user's primary feature photo from Supabase cover_image_url or user uploaded achievement images
  const primaryFeaturePhoto =
    activeYear?.cover_image_url ||
    allItems.find((item) => item.image_url)?.image_url ||
    "/rgmcet_hackathon_win.jpg";

  if (yearsQuery.isLoading) {
    return (
      <div className="py-16 text-center text-sm text-[#666660] animate-pulse">
        Loading RGMCET Yuga Spark Legacy Showcase…
      </div>
    );
  }

  if (years.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-[#666660] border border-dashed border-[#202020]/20 rounded-2xl p-8 max-w-xl mx-auto bg-[#fbfbf8]">
        <Landmark className="h-8 w-8 text-[#1890f0] mx-auto mb-2 opacity-80" />
        <p className="font-semibold text-[#171717]">No legacy records published yet</p>
        <p className="text-xs text-[#666660] mt-1">
          Club achievements for recent academic years will appear here as soon as they are added in Admin.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-12">
      {/* ━━━ COFOUNDER.CO EXACT LEGACY SHOWCASE CONTAINER ━━━ */}
      <div className="relative w-full rounded-[24px] sm:rounded-[32px] overflow-hidden bg-[#f5f5f2] border border-[#202020]/15 p-6 sm:p-12 shadow-xl space-y-10">
        {/* Top Header Bar & Academic Year Selector */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#202020]/10 pb-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1890f0]/10 border border-[#1890f0]/20 text-[#1890f0] text-xs font-semibold">
              <Landmark className="w-3.5 h-3.5" />
              <span>RGMCET Campus Legacy</span>
            </div>
            <h2 className="font-sans text-2xl sm:text-[36px] font-normal text-[#171717] tracking-tight">
              Run an entire campus club with innovation records
            </h2>
          </div>

          {/* Academic Year Selector Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {years.map((y) => {
              const isActive = y.id === activeYearId;
              return (
                <button
                  key={y.id}
                  onClick={() => setSelectedYearId(y.id)}
                  className={`px-4 py-2 rounded-[8px] text-xs font-medium transition-all shrink-0 flex items-center gap-2 ${
                    isActive
                      ? "bg-[#1890f0] text-white shadow-md"
                      : "bg-[#fbfbf8] hover:bg-[#171717]/[0.05] text-[#171717] border border-[#202020]/20"
                  }`}
                >
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Academic Year {y.year_label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main 2-Column Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Left Column: Real Stats & User Uploaded Achievement Records */}
          <div className="lg:col-span-7 space-y-8">
            <p className="text-[15px] sm:text-[16px] leading-[1.4] text-[#171717]/80">
              {activeYear?.tagline || `RGMCET Yuga Spark — Academic Year ${activeYear?.year_label}`}
            </p>

            {/* 3 Impact Numbers Grid */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              <div className="text-center p-3.5 rounded-[8px] bg-[#fbfbf8] border border-[#202020]/15 shadow-sm">
                <p className="font-sans text-2xl sm:text-3xl font-semibold text-[#1890f0]">
                  {activeYear?.member_count ?? 0}+
                </p>
                <p className="text-[11px] sm:text-xs text-[#666660] font-medium flex items-center justify-center gap-1 mt-0.5">
                  <Users className="h-3.5 w-3.5 text-[#1890f0]" /> Members
                </p>
              </div>

              <div className="text-center p-3.5 rounded-[8px] bg-[#fbfbf8] border border-[#202020]/15 shadow-sm">
                <p className="font-sans text-2xl sm:text-3xl font-semibold text-[#171717]">
                  {activeYear?.hackathons_count ?? 0}
                </p>
                <p className="text-[11px] sm:text-xs text-[#666660] font-medium flex items-center justify-center gap-1 mt-0.5">
                  <Calendar className="h-3.5 w-3.5 text-[#171717]" /> Events
                </p>
              </div>

              <div className="text-center p-3.5 rounded-[8px] bg-[#fbfbf8] border border-[#202020]/15 shadow-sm">
                <p className="font-sans text-2xl sm:text-3xl font-semibold text-[#1890f0]">
                  {activeYear?.wins_count ?? 0}
                </p>
                <p className="text-[11px] sm:text-xs text-[#666660] font-medium flex items-center justify-center gap-1 mt-0.5">
                  <Trophy className="h-3.5 w-3.5 text-[#1890f0]" /> Podium Wins
                </p>
              </div>
            </div>

            {/* Sub-Navigation Links */}
            <div className="flex flex-wrap items-center gap-3 text-xs font-mono uppercase text-[#666660] border-b border-[#202020]/10 pb-3">
              <button
                onClick={() => setCategoryFilter("all")}
                className={`hover:text-[#171717] transition-colors ${categoryFilter === "all" ? "text-[#1890f0] font-bold" : ""}`}
              >
                All Items ({yearItems.length})
              </button>
              <span>|</span>
              <button
                onClick={() => setCategoryFilter("wins")}
                className={`hover:text-[#171717] transition-colors ${categoryFilter === "wins" ? "text-[#1890f0] font-bold" : ""}`}
              >
                Wins & Milestones ({momentsAndWins.length})
              </button>
              {leads.length > 0 && (
                <>
                  <span>|</span>
                  <button
                    onClick={() => setCategoryFilter("leads")}
                    className={`hover:text-[#171717] transition-colors ${categoryFilter === "leads" ? "text-[#1890f0] font-bold" : ""}`}
                  >
                    Lead Team ({leads.length})
                  </button>
                </>
              )}
              {gallery.length > 0 && (
                <>
                  <span>|</span>
                  <button
                    onClick={() => setCategoryFilter("gallery")}
                    className={`hover:text-[#171717] transition-colors ${categoryFilter === "gallery" ? "text-[#1890f0] font-bold" : ""}`}
                  >
                    Gallery ({gallery.length})
                  </button>
                </>
              )}
            </div>

            {/* Moments & Wins Cards */}
            {(categoryFilter === "all" || categoryFilter === "wins") && momentsAndWins.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[#171717] font-medium text-sm">
                  <Trophy className="w-4 h-4 text-[#1890f0]" />
                  <span>Key Moments & Hackathon Victories</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {momentsAndWins.map((item) => (
                    <div
                      key={item.id}
                      className="group rounded-[10px] border border-[#202020]/15 bg-[#fbfbf8] p-4 transition-all hover:border-[#1890f0]/40 shadow-sm space-y-3 flex flex-col justify-between"
                    >
                      {item.image_url && (
                        <div
                          onClick={() => setPreviewImage(item.image_url!)}
                          className="relative h-44 w-full rounded-[6px] overflow-hidden bg-[#f5f5f2] cursor-pointer"
                        >
                          <img
                            src={item.image_url}
                            alt={item.title}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <span className="absolute top-2 right-2 bg-[#1890f0] text-white text-[10px] font-semibold px-2 py-0.5 rounded shadow">
                            {item.kind === "win" ? "🏆 Win" : "✨ Milestone"}
                          </span>
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-mono font-semibold text-[#1890f0]">
                            {item.role || "Achievement"}
                          </span>
                          {item.person_name && (
                            <span className="text-[11px] text-[#666660]">By {item.person_name}</span>
                          )}
                        </div>
                        <h4 className="font-sans text-sm font-medium text-[#171717] leading-snug">
                          {item.title}
                        </h4>
                        {item.description && (
                          <p className="text-xs text-[#666660] leading-relaxed line-clamp-3">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Lead Team Spotlight */}
            {(categoryFilter === "all" || categoryFilter === "leads") && leads.length > 0 && (
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2 text-[#171717] font-medium text-sm">
                  <Users className="w-4 h-4 text-[#1890f0]" />
                  <span>Lead Team & Student Mentors</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {leads.map((lead) => (
                    <div
                      key={lead.id}
                      className="rounded-[10px] border border-[#202020]/15 bg-[#fbfbf8] p-3.5 flex items-center gap-3 shadow-sm hover:border-[#1890f0]/40 transition-colors"
                    >
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-[#f5f5f2] border border-[#202020]/15 shrink-0 flex items-center justify-center">
                        {lead.image_url ? (
                          <img
                            src={lead.image_url}
                            alt={lead.person_name || lead.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="font-bold text-lg text-[#1890f0]">
                            {(lead.person_name || lead.title)[0]}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#171717] truncate">
                          {lead.person_name || lead.title}
                        </p>
                        <p className="text-[11px] text-[#1890f0] truncate mt-0.5">
                          {lead.role || "Club Lead"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* User Uploaded Event Photo Gallery Grid */}
            {(categoryFilter === "all" || categoryFilter === "gallery") && gallery.length > 0 && (
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2 text-[#171717] font-medium text-sm">
                  <ImageIcon className="w-4 h-4 text-[#1890f0]" />
                  <span>Event Photo Gallery</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {gallery.map((img) => (
                    <div
                      key={img.id}
                      onClick={() => img.image_url && setPreviewImage(img.image_url)}
                      className="group relative aspect-video rounded-[8px] overflow-hidden border border-[#202020]/15 bg-[#f5f5f2] cursor-pointer"
                    >
                      {img.image_url && (
                        <img
                          src={img.image_url}
                          alt={img.title || "User photo"}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white p-2">
                        <span className="text-[11px] font-medium truncate">{img.title}</span>
                        <Maximize2 className="w-3.5 h-3.5 absolute top-2 right-2" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: User's Real Supabase Uploaded Cover Image Showcase Card */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative w-full max-w-[340px] sm:max-w-[380px] aspect-[3/4] rounded-[20px] overflow-hidden border border-[#202020]/20 shadow-2xl group">
              {/* User's REAL uploaded cover image from Supabase */}
              <img
                src={primaryFeaturePhoto}
                alt="RGMCET Yuga Spark Legacy Feature Photo"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />

              {/* Frosted Glass Text Overlay Box */}
              <div className="absolute bottom-4 left-4 right-4 bg-[#171717]/80 backdrop-blur-md border border-white/20 p-5 rounded-[16px] text-white space-y-3 shadow-xl">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#1890f0]" />
                  <span className="text-xs font-mono uppercase text-[#1890f0] font-semibold">RGMCET Legacy</span>
                </div>
                <p className="text-sm text-white/95 leading-relaxed font-normal">
                  Yuga Spark is the official innovation operating portal at Rajeev Gandhi Memorial College of Engineering & Technology.
                </p>
                <Link
                  to="/auth"
                  className="inline-block bg-white text-[#171717] hover:bg-[#f5f5f2] rounded-lg px-4 py-2 font-medium text-xs shadow-md transition-all"
                >
                  Enter Student Portal
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Edge: Green Accent Footer Trim */}
        <div className="pt-6 border-t border-[#202020]/10 flex flex-wrap items-center justify-between text-xs text-[#666660] gap-2">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#1890f0]" />
            <span>Official Legacy Records · RGMCET Autonomous College</span>
          </span>
          <span>RGMCET Hackathon Club · Nandyal</span>
        </div>
      </div>

      {/* Image Lightbox Modal */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn"
        >
          <div className="relative max-w-4xl max-h-[90vh] rounded-[12px] overflow-hidden border border-white/20 shadow-2xl bg-[#171717]">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 z-10 rounded-full bg-black/70 text-white p-2 hover:bg-black"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={previewImage}
              alt="Expanded user photo preview"
              className="max-w-full max-h-[85vh] object-contain mx-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
}
