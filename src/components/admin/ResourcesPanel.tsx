import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ResourcesPanel() {
  const { user } = useAuth();
  const [form, setForm] = useState({ title: "", url: "", category: "general", description: "" });

  const resources = useQuery({
    queryKey: ["resources"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resources")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    },
  });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("resources").insert({
      title: form.title.trim(),
      url: form.url.trim(),
      category: form.category.trim() || "general",
      description: form.description.trim() || null,
      created_by: user?.id ?? null,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setForm({ title: "", url: "", category: "general", description: "" });
    toast.success("Resource added to the playbook");
    void resources.refetch();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("resources").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    void resources.refetch();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <form onSubmit={add} className="surface h-fit space-y-3 p-4 sm:p-6">
        <h3 className="font-display text-lg font-bold">Add resource</h3>
        <div>
          <Label>Title</Label>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        </div>
        <div>
          <Label>Link</Label>
          <Input
            type="url"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            required
          />
        </div>
        <div>
          <Label>Category</Label>
          <Input
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            placeholder="templates, apis, guides…"
          />
        </div>
        <div>
          <Label>Description</Label>
          <Textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
          />
        </div>
        <Button type="submit" className="w-full">
          Publish to playbook
        </Button>
      </form>

      <div className="space-y-3">
        {(resources.data ?? []).map((r) => (
          <div key={r.id} className="surface flex items-start justify-between gap-3 p-4">
            <div>
              <p className="font-medium">{r.title}</p>
              <p className="text-xs text-muted-foreground">{r.category} · {r.url}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => remove(r.id)} aria-label="Delete">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
