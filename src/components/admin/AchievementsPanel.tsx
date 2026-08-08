import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Landmark,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  Sparkles,
  Trophy,
  Image as ImageIcon,
  Users,
  Check,
  X,
  Upload,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export type ClubYear = {
  id: string;
  year_label: string;
  tagline: string | null;
  member_count: number;
  hackathons_count: number;
  wins_count: number;
  cover_image_url: string | null;
  display_order: number;
  created_at: string;
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
  created_at: string;
};

export function AchievementsPanel() {
  const queryClient = useQueryClient();
  const [selectedYearId, setSelectedYearId] = useState<string | null>(null);

  // Modals state
  const [yearModalOpen, setYearModalOpen] = useState(false);
  const [editingYear, setEditingYear] = useState<ClubYear | null>(null);
  const [yearLabel, setYearLabel] = useState("");
  const [yearTagline, setYearTagline] = useState("");
  const [memberCount, setMemberCount] = useState(0);
  const [hackathonsCount, setHackathonsCount] = useState(0);
  const [winsCount, setWinsCount] = useState(0);
  const [coverImageUrl, setCoverImageUrl] = useState("");

  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ClubAchievement | null>(null);
  const [itemKind, setItemKind] = useState<"moment" | "gallery" | "win" | "lead">("moment");
  const [itemTitle, setItemTitle] = useState("");
  const [itemDesc, setItemDesc] = useState("");
  const [personName, setPersonName] = useState("");
  const [personRole, setPersonRole] = useState("");
  const [itemImageUrl, setItemImageUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function handleFileUpload(file: File, setUrl: (url: string) => void) {
    try {
      setUploading(true);
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `achievements/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("photos").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("photos").getPublicUrl(path);
      setUrl(data.publicUrl);
      toast.success("Image uploaded to Storage CDN!");
    } catch (err) {
      toast.error("Failed to upload image: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setUploading(false);
    }
  }

  // 1. Fetch Years
  const yearsQuery = useQuery({
    queryKey: ["club-years"],
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("club_years" as any)
          .select("*")
          .order("display_order", { ascending: true })
          .order("created_at", { ascending: false });
        if (error) {
          console.error("club_years query error:", error.message);
          return [];
        }
        return (data ?? []) as ClubYear[];
      } catch (err) {
        console.error("club_years exception:", err);
        return [];
      }
    },
  });

  const years = yearsQuery.data ?? [];
  const activeYearId = selectedYearId ?? years[0]?.id ?? null;
  const activeYear = years.find((y) => y.id === activeYearId);

  // 2. Fetch Achievements for Active Year
  const itemsQuery = useQuery({
    queryKey: ["club-achievements", activeYearId],
    enabled: Boolean(activeYearId),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("club_achievements" as any)
          .select("*")
          .eq("year_id", activeYearId!)
          .order("display_order", { ascending: true })
          .order("created_at", { ascending: false });
        if (error) {
          console.error("club_achievements query error:", error.message);
          return [];
        }
        return (data ?? []) as ClubAchievement[];
      } catch (err) {
        console.error("club_achievements exception:", err);
        return [];
      }
    },
  });

  const items = itemsQuery.data ?? [];

  // Year Handlers
  function openAddYear() {
    setEditingYear(null);
    setYearLabel("");
    setYearTagline("");
    setMemberCount(0);
    setHackathonsCount(0);
    setWinsCount(0);
    setCoverImageUrl("");
    setYearModalOpen(true);
  }

  function openEditYear(y: ClubYear) {
    setEditingYear(y);
    setYearLabel(y.year_label);
    setYearTagline(y.tagline ?? "");
    setMemberCount(y.member_count);
    setHackathonsCount(y.hackathons_count);
    setWinsCount(y.wins_count);
    setCoverImageUrl(y.cover_image_url ?? "");
    setYearModalOpen(true);
  }

  async function saveYear() {
    if (!yearLabel.trim()) {
      toast.error("Academic Year Label is required (e.g. '2024-25')");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        year_label: yearLabel.trim(),
        tagline: yearTagline.trim() || null,
        member_count: Number(memberCount) || 0,
        hackathons_count: Number(hackathonsCount) || 0,
        wins_count: Number(winsCount) || 0,
        cover_image_url: coverImageUrl.trim() || null,
      };

      if (editingYear) {
        const { error } = await supabase
          .from("club_years" as any)
          .update(payload)
          .eq("id", editingYear.id);
        if (error) throw new Error(error.message);
        toast.success("Academic year updated");
      } else {
        const { data, error } = await supabase
          .from("club_years" as any)
          .insert(payload)
          .select()
          .single();
        if (error) throw new Error(error.message);
        toast.success("Academic year added");
        if (data) setSelectedYearId((data as any).id);
      }

      setYearModalOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["club-years"] });
      void queryClient.invalidateQueries({ queryKey: ["public-club-years"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save year");
    } finally {
      setSaving(false);
    }
  }

  async function deleteYear(id: string) {
    if (!confirm("Are you sure you want to delete this year and all its achievements?")) return;
    try {
      const { error } = await supabase.from("club_years" as any).delete().eq("id", id);
      if (error) throw new Error(error.message);
      toast.success("Year deleted");
      if (selectedYearId === id) setSelectedYearId(null);
      void queryClient.invalidateQueries({ queryKey: ["club-years"] });
      void queryClient.invalidateQueries({ queryKey: ["public-club-years"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete year");
    }
  }

  // Item Handlers
  function openAddItem() {
    if (!activeYearId) {
      toast.error("Select or create an academic year first");
      return;
    }
    setEditingItem(null);
    setItemKind("moment");
    setItemTitle("");
    setItemDesc("");
    setPersonName("");
    setPersonRole("");
    setItemImageUrl("");
    setItemModalOpen(true);
  }

  function openEditItem(item: ClubAchievement) {
    setEditingItem(item);
    setItemKind(item.kind);
    setItemTitle(item.title);
    setItemDesc(item.description ?? "");
    setPersonName(item.person_name ?? "");
    setPersonRole(item.role ?? "");
    setItemImageUrl(item.image_url ?? "");
    setItemModalOpen(true);
  }

  async function saveItem() {
    if (!itemTitle.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!activeYearId) return;

    setSaving(true);
    try {
      const payload = {
        year_id: activeYearId,
        kind: itemKind,
        title: itemTitle.trim(),
        description: itemDesc.trim() || null,
        person_name: personName.trim() || null,
        role: personRole.trim() || null,
        image_url: itemImageUrl.trim() || null,
      };

      if (editingItem) {
        const { error } = await supabase
          .from("club_achievements" as any)
          .update(payload)
          .eq("id", editingItem.id);
        if (error) throw new Error(error.message);
        toast.success("Achievement entry updated");
      } else {
        const { error } = await supabase.from("club_achievements" as any).insert(payload);
        if (error) throw new Error(error.message);
        toast.success("Achievement entry added");
      }

      setItemModalOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["club-achievements"] });
      void queryClient.invalidateQueries({ queryKey: ["public-club-achievements"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save achievement");
    } finally {
      setSaving(false);
    }
  }

  async function deleteItem(id: string) {
    if (!confirm("Are you sure you want to delete this entry?")) return;
    try {
      const { error } = await supabase.from("club_achievements" as any).delete().eq("id", id);
      if (error) throw new Error(error.message);
      toast.success("Entry removed");
      void queryClient.invalidateQueries({ queryKey: ["club-achievements"] });
      void queryClient.invalidateQueries({ queryKey: ["public-club-achievements"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete entry");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold flex items-center gap-2">
            <Landmark className="h-5 w-5 text-primary" /> Club Legacy & Achievements
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage academic year highlights, photo gallery, hackathon wins, and lead team cards.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={openAddYear} className="gap-1.5 text-xs">
            <Plus className="h-4 w-4" /> Add Academic Year
          </Button>
        </div>
      </div>

      {/* Year Selection Tabs */}
      {years.length === 0 ? (
        <div className="surface p-8 text-center rounded-2xl border border-dashed border-border">
          <Landmark className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-60" />
          <h3 className="font-display text-base font-semibold">No Academic Years Added Yet</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Click "Add Academic Year" above to create your first legacy chapter (e.g., 2024-25).
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
            {years.map((y) => (
              <div key={y.id} className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant={activeYearId === y.id ? "default" : "outline"}
                  onClick={() => setSelectedYearId(y.id)}
                  className="text-xs font-semibold"
                >
                  <Calendar className="h-3.5 w-3.5 mr-1.5" />
                  {y.year_label}
                </Button>
                {activeYearId === y.id ? (
                  <div className="flex items-center">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={() => openEditYear(y)}
                      title="Edit year metadata"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteYear(y.id)}
                      title="Delete year"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          {/* Selected Year Meta Summary */}
          {activeYear ? (
            <div className="surface p-4 rounded-xl border border-border flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="font-mono text-xs">
                    {activeYear.year_label}
                  </Badge>
                  {activeYear.tagline ? (
                    <span className="text-sm font-medium text-foreground">
                      "{activeYear.tagline}"
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                  <span>👥 {activeYear.member_count} Members</span>
                  <span>🚀 {activeYear.hackathons_count} Hackathons</span>
                  <span>🏆 {activeYear.wins_count} Wins</span>
                </div>
              </div>

              <Button size="sm" onClick={openAddItem} className="gap-1.5 text-xs shrink-0">
                <Plus className="h-3.5 w-3.5" /> Add Moment / Lead / Photo
              </Button>
            </div>
          ) : null}

          {/* Items Grid for Active Year */}
          {items.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-secondary/20 border border-border text-xs text-muted-foreground">
              No entries added for {activeYear?.year_label} yet. Click "Add Moment / Lead / Photo" to populate this year.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="surface p-4 rounded-xl border border-border space-y-3 relative flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    {/* Header Badge & Actions */}
                    <div className="flex items-center justify-between">
                      <Badge
                        variant={
                          item.kind === "lead"
                            ? "default"
                            : item.kind === "win"
                            ? "secondary"
                            : "outline"
                        }
                        className="capitalize text-[10px] font-bold"
                      >
                        {item.kind === "lead"
                          ? "👤 Lead Profile"
                          : item.kind === "win"
                          ? "🏆 Hackathon Win"
                          : item.kind === "gallery"
                          ? "🖼️ Gallery Photo"
                          : "✨ Key Moment"}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditItem(item)}
                          className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => deleteItem(item.id)}
                          className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Image Preview if available */}
                    {item.image_url ? (
                      <div className="aspect-video w-full rounded-lg overflow-hidden bg-muted border border-border">
                        <img
                          src={item.image_url}
                          alt={item.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                      </div>
                    ) : null}

                    {/* Content */}
                    <div>
                      <h4 className="font-display font-bold text-sm text-foreground leading-snug">
                        {item.title}
                      </h4>
                      {item.person_name ? (
                        <p className="text-xs text-primary font-medium mt-0.5">
                          {item.person_name} {item.role ? `(${item.role})` : ""}
                        </p>
                      ) : null}
                      {item.description ? (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-3 leading-relaxed">
                          {item.description}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Year Modal */}
      <Dialog open={yearModalOpen} onOpenChange={setYearModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingYear ? "Edit Academic Year" : "Add Academic Year"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-semibold block mb-1">Academic Year Label *</label>
              <Input
                value={yearLabel}
                onChange={(e) => setYearLabel(e.target.value)}
                placeholder="e.g. 2024-25"
                className="text-xs"
              />
            </div>

            <div>
              <label className="font-semibold block mb-1">Tagline / Motto</label>
              <Input
                value={yearTagline}
                onChange={(e) => setYearTagline(e.target.value)}
                placeholder="e.g. The Year of Innovation & National Podiums"
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="font-semibold block mb-1">Members</label>
                <Input
                  type="number"
                  value={memberCount}
                  onChange={(e) => setMemberCount(Number(e.target.value))}
                  className="text-xs"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">Hackathons</label>
                <Input
                  type="number"
                  value={hackathonsCount}
                  onChange={(e) => setHackathonsCount(Number(e.target.value))}
                  className="text-xs"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">Wins</label>
                <Input
                  type="number"
                  value={winsCount}
                  onChange={(e) => setWinsCount(Number(e.target.value))}
                  className="text-xs"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold block mb-1">Cover Image URL (Paste URL or Upload File)</label>
              <div className="flex gap-2">
                <Input
                  value={coverImageUrl}
                  onChange={(e) => setCoverImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="text-xs flex-1"
                />
                <label className="cursor-pointer">
                  <span className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground">
                    <Upload className="h-3.5 w-3.5" /> Upload
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void handleFileUpload(f, setCoverImageUrl);
                    }}
                  />
                </label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setYearModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" disabled={saving || uploading} onClick={saveYear}>
              {saving ? "Saving..." : "Save Year"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Achievement Item Modal */}
      <Dialog open={itemModalOpen} onOpenChange={setItemModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Entry" : `Add Entry to ${activeYear?.year_label}`}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-semibold block mb-1">Entry Category *</label>
              <Select value={itemKind} onValueChange={(v: any) => setItemKind(v)}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="moment">✨ Key Moment / Announcement</SelectItem>
                  <SelectItem value="win">🏆 Hackathon Win / Placement</SelectItem>
                  <SelectItem value="lead">👤 Lead / Team Member Profile</SelectItem>
                  <SelectItem value="gallery">🖼️ Photo Gallery Item</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="font-semibold block mb-1">Title *</label>
              <Input
                value={itemTitle}
                onChange={(e) => setItemTitle(e.target.value)}
                placeholder={
                  itemKind === "lead"
                    ? "e.g. Club President"
                    : itemKind === "win"
                    ? "e.g. 1st Rank at Smart India Hackathon"
                    : "e.g. Club Launch Keynote"
                }
                className="text-xs"
              />
            </div>

            {itemKind === "lead" ? (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Person Name *</label>
                  <Input
                    value={personName}
                    onChange={(e) => setPersonName(e.target.value)}
                    placeholder="e.g. Hemanth Dalavai"
                    className="text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Role / Subtitle</label>
                  <Input
                    value={personRole}
                    onChange={(e) => setPersonRole(e.target.value)}
                    placeholder="e.g. Lead Developer & President"
                    className="text-xs"
                  />
                </div>
              </div>
            ) : null}

            <div>
              <label className="font-semibold block mb-1">Description / Notes</label>
              <Textarea
                value={itemDesc}
                onChange={(e) => setItemDesc(e.target.value)}
                placeholder="Brief summary of this moment or achievement..."
                className="text-xs h-20"
              />
            </div>

            <div>
              <label className="font-semibold block mb-1">Image (Paste CDN URL or Upload File)</label>
              <div className="flex gap-2">
                <Input
                  value={itemImageUrl}
                  onChange={(e) => setItemImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="text-xs flex-1"
                />
                <label className="cursor-pointer">
                  <span className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground">
                    <Upload className="h-3.5 w-3.5" /> Upload
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void handleFileUpload(f, setItemImageUrl);
                    }}
                  />
                </label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setItemModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" disabled={saving} onClick={saveItem}>
              {saving ? "Saving..." : "Save Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
