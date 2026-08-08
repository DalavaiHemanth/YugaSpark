import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2, CheckCircle2, XCircle, Clock, BookOpen, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function ResourcesPanel() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"approved" | "pending">("approved");
  const [form, setForm] = useState({ title: "", url: "", category: "templates", description: "" });

  const resources = useQuery({
    queryKey: ["admin-resources"],
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resources")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const allResources = resources.data ?? [];
  const approvedList = allResources.filter((r) => r.status !== "pending");
  const pendingList = allResources.filter((r) => r.status === "pending");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("resources").insert({
      title: form.title.trim(),
      url: form.url.trim(),
      category: form.category.trim() || "templates",
      description: form.description.trim() || null,
      status: "approved",
      created_by: user?.id ?? null,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setForm({ title: "", url: "", category: "templates", description: "" });
    toast.success("Resource published to playbook");
    void resources.refetch();
  }

  async function approve(id: string) {
    const { error } = await supabase.from("resources").update({ status: "approved" }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Resource approved & published!");
    void resources.refetch();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("resources").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Resource deleted");
    void resources.refetch();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      {/* Create Resource Form */}
      <form onSubmit={add} className="surface h-fit space-y-3.5 p-4 sm:p-6">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h3 className="font-display text-lg font-bold">Add Playbook Resource</h3>
        </div>
        <div>
          <Label className="text-xs">Title</Label>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Supabase Auth Boilerplate" required />
        </div>
        <div>
          <Label className="text-xs">Resource Link (URL)</Label>
          <Input
            type="url"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            placeholder="https://github.com/..."
            required
          />
        </div>
        <div>
          <Label className="text-xs">Category</Label>
          <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="templates">Starter Kits & Templates</SelectItem>
              <SelectItem value="apis">APIs & Databases</SelectItem>
              <SelectItem value="design">Figma & Slide Decks</SelectItem>
              <SelectItem value="guides">Hackathon Guides & Playbooks</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Description</Label>
          <Textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            placeholder="Short overview of what this resource provides..."
          />
        </div>
        <Button type="submit" className="w-full">
          Publish to Playbook
        </Button>
      </form>

      {/* Resource List & Pending Submissions */}
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex border-b border-border">
          <button
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "approved"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("approved")}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Published Playbook ({approvedList.length})
          </button>
          <button
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "pending"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("pending")}
          >
            <Clock className="h-3.5 w-3.5 text-amber-500" />
            Pending Student Submissions ({pendingList.length})
            {pendingList.length > 0 ? (
              <Badge variant="destructive" className="ml-1 h-4 px-1 text-[9px] rounded-full">
                {pendingList.length}
              </Badge>
            ) : null}
          </button>
        </div>

        {/* Content Section */}
        {activeTab === "approved" ? (
          <div className="space-y-3">
            {approvedList.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground surface">
                No published resources yet. Add one using the form on the left.
              </div>
            ) : (
              approvedList.map((r) => (
                <div key={r.id} className="surface flex items-start justify-between gap-3 p-4">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm truncate">{r.title}</p>
                      <Badge variant="secondary" className="text-[10px] capitalize">{r.category}</Badge>
                    </div>
                    {r.description ? <p className="text-xs text-muted-foreground">{r.description}</p> : null}
                    <a href={r.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline">
                      <ExternalLink className="h-3 w-3" /> {r.url}
                    </a>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => remove(r.id)} aria-label="Delete">
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {pendingList.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground surface">
                No pending student submissions right now.
              </div>
            ) : (
              pendingList.map((r) => (
                <div key={r.id} className="surface flex flex-wrap items-center justify-between gap-3 p-4 border-amber-500/30 bg-amber-500/5">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30">
                        Pending Review
                      </Badge>
                      <p className="font-semibold text-sm truncate">{r.title}</p>
                      <Badge variant="secondary" className="text-[10px] capitalize">{r.category}</Badge>
                    </div>
                    {r.description ? <p className="text-xs text-muted-foreground">{r.description}</p> : null}
                    <a href={r.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline">
                      <ExternalLink className="h-3 w-3" /> {r.url}
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={() => void approve(r.id)} className="h-8 gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Approve & Publish
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => void remove(r.id)} className="h-8 text-xs text-destructive hover:bg-destructive/10">
                      <XCircle className="h-3.5 w-3.5" /> Reject
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
