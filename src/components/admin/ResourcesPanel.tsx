import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2, CheckCircle2, XCircle, Clock, BookOpen, ExternalLink, Code2, Copy, Check } from "lucide-react";
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
  const [panelMode, setPanelMode] = useState<"resources" | "snippets">("resources");

  // Web Links State
  const [activeTab, setActiveTab] = useState<"approved" | "pending">("approved");
  const [form, setForm] = useState({ title: "", url: "", category: "templates", description: "" });

  // Code Snippets State
  const [snippetForm, setSnippetForm] = useState({
    title: "",
    category: "Backend & Database",
    language: "typescript",
    description: "",
    code: "",
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch Resources (Web Links)
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

  // Fetch Code Snippets
  const codeSnippets = useQuery({
    queryKey: ["admin-code-snippets"],
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("code_snippets")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const allResources = resources.data ?? [];
  const approvedList = allResources.filter((r) => r.status !== "pending");
  const pendingList = allResources.filter((r) => r.status === "pending");
  const snippetsList = codeSnippets.data ?? [];

  async function addResource(e: React.FormEvent) {
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

  async function addSnippet(e: React.FormEvent) {
    e.preventDefault();
    if (!snippetForm.title.trim() || !snippetForm.code.trim()) {
      toast.error("Title and code content are required");
      return;
    }
    const { error } = await supabase.from("code_snippets").insert({
      title: snippetForm.title.trim(),
      category: snippetForm.category.trim() || "Backend & Database",
      language: snippetForm.language.trim() || "typescript",
      description: snippetForm.description.trim() || null,
      code: snippetForm.code.trim(),
      created_by: user?.id ?? null,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setSnippetForm({
      title: "",
      category: "Backend & Database",
      language: "typescript",
      description: "",
      code: "",
    });
    toast.success("Code snippet published to Playbook");
    void codeSnippets.refetch();
  }

  async function approveResource(id: string) {
    const { error } = await supabase.from("resources").update({ status: "approved" }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Resource approved & published!");
    void resources.refetch();
  }

  async function removeResource(id: string) {
    const { error } = await supabase.from("resources").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Resource deleted");
    void resources.refetch();
  }

  async function removeSnippet(id: string) {
    const { error } = await supabase.from("code_snippets").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Code snippet deleted");
    void codeSnippets.refetch();
  }

  function handleCopySnippet(id: string, code: string) {
    void navigator.clipboard.writeText(code);
    setCopiedId(id);
    toast.success("Copied snippet to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="space-y-6">
      {/* Top Section Switcher */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex gap-2">
          <Button
            variant={panelMode === "resources" ? "default" : "outline"}
            size="sm"
            onClick={() => setPanelMode("resources")}
            className="gap-2 text-xs"
          >
            <BookOpen className="h-4 w-4" /> Web Links & Resources
          </Button>
          <Button
            variant={panelMode === "snippets" ? "default" : "outline"}
            size="sm"
            onClick={() => setPanelMode("snippets")}
            className="gap-2 text-xs"
          >
            <Code2 className="h-4 w-4" /> Copyable Code Snippets ({snippetsList.length})
          </Button>
        </div>
      </div>

      {panelMode === "resources" ? (
        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          {/* Create Resource Form */}
          <form onSubmit={addResource} className="surface h-fit space-y-3.5 p-4 sm:p-6">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <h3 className="font-display text-lg font-bold">Add Playbook Resource</h3>
            </div>
            <div>
              <Label className="text-xs">Resource Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Session 3: React & Tailwind Slides"
                required
              />
            </div>
            <div>
              <Label className="text-xs">Resource Link (Google Drive / GitHub / URL)</Label>
              <Input
                type="url"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://drive.google.com/drive/folders/..."
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
                  <SelectItem value="session_materials">📁 Session Slides, Notes & Drive Links</SelectItem>
                  <SelectItem value="session_recordings">🎥 Session Video Recordings & Demos</SelectItem>
                  <SelectItem value="templates">⚡ Starter Kits & Templates</SelectItem>
                  <SelectItem value="apis">🛠️ APIs & Databases</SelectItem>
                  <SelectItem value="design">🎨 Figma & Slide Decks</SelectItem>
                  <SelectItem value="guides">📘 Hackathon Guides & Playbooks</SelectItem>
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
                          <Badge variant="secondary" className="text-[10px] capitalize">
                            {r.category}
                          </Badge>
                        </div>
                        {r.description ? <p className="text-xs text-muted-foreground">{r.description}</p> : null}
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" /> {r.url}
                        </a>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeResource(r.id)} aria-label="Delete">
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
                    <div
                      key={r.id}
                      className="surface flex flex-wrap items-center justify-between gap-3 p-4 border-amber-500/30 bg-amber-500/5"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30"
                          >
                            Pending Review
                          </Badge>
                          <p className="font-semibold text-sm truncate">{r.title}</p>
                          <Badge variant="secondary" className="text-[10px] capitalize">
                            {r.category}
                          </Badge>
                        </div>
                        {r.description ? <p className="text-xs text-muted-foreground">{r.description}</p> : null}
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" /> {r.url}
                        </a>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => void approveResource(r.id)}
                          className="h-8 gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Approve & Publish
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void removeResource(r.id)}
                          className="h-8 text-xs text-destructive hover:bg-destructive/10"
                        >
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
      ) : (
        /* Code Snippets Mode */
        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          {/* Create Code Snippet Form */}
          <form onSubmit={addSnippet} className="surface h-fit space-y-3.5 p-4 sm:p-6">
            <div className="flex items-center gap-2">
              <Code2 className="h-5 w-5 text-primary" />
              <h3 className="font-display text-lg font-bold">Add Code Snippet</h3>
            </div>
            <div>
              <Label className="text-xs">Title</Label>
              <Input
                value={snippetForm.title}
                onChange={(e) => setSnippetForm({ ...snippetForm, title: e.target.value })}
                placeholder="e.g. Express Async Handler Scaffold"
                required
              />
            </div>
            <div>
              <Label className="text-xs">Category</Label>
              <Select
                value={snippetForm.category}
                onValueChange={(v) => setSnippetForm({ ...snippetForm, category: v })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Backend & Database">Backend & Database</SelectItem>
                  <SelectItem value="UI & Frontend">UI & Frontend</SelectItem>
                  <SelectItem value="Pitch & Presentation">Pitch & Presentation</SelectItem>
                  <SelectItem value="DevOps & Deployment">DevOps & Deployment</SelectItem>
                  <SelectItem value="Mobile & APIs">Mobile & APIs</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Language / Format</Label>
              <Select
                value={snippetForm.language}
                onValueChange={(v) => setSnippetForm({ ...snippetForm, language: v })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="typescript">TypeScript</SelectItem>
                  <SelectItem value="javascript">JavaScript</SelectItem>
                  <SelectItem value="python">Python</SelectItem>
                  <SelectItem value="html">HTML / JSX</SelectItem>
                  <SelectItem value="css">CSS / Tailwind</SelectItem>
                  <SelectItem value="markdown">Markdown</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="bash">Bash / Shell</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Input
                value={snippetForm.description}
                onChange={(e) => setSnippetForm({ ...snippetForm, description: e.target.value })}
                placeholder="Brief description of what this code does..."
              />
            </div>
            <div>
              <Label className="text-xs">Code Content</Label>
              <Textarea
                value={snippetForm.code}
                onChange={(e) => setSnippetForm({ ...snippetForm, code: e.target.value })}
                rows={6}
                className="font-mono text-xs"
                placeholder={`// Enter code snippet here...\nimport { useState } from "react";`}
                required
              />
            </div>
            <Button type="submit" className="w-full">
              Publish Code Snippet
            </Button>
          </form>

          {/* Published Snippets List */}
          <div className="space-y-4">
            <h4 className="font-display font-semibold text-sm text-foreground flex items-center gap-2">
              <Code2 className="h-4 w-4 text-primary" /> Published Snippets ({snippetsList.length})
            </h4>

            {snippetsList.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground surface">
                No code snippets added yet. Use the form on the left to add one!
              </div>
            ) : (
              <div className="space-y-4">
                {snippetsList.map((snippet) => (
                  <div key={snippet.id} className="surface space-y-3 p-4 border border-border/60">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h5 className="font-semibold text-sm">{snippet.title}</h5>
                          <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                            {snippet.category}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px] uppercase font-mono">
                            {snippet.language}
                          </Badge>
                        </div>
                        {snippet.description ? (
                          <p className="text-xs text-muted-foreground">{snippet.description}</p>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopySnippet(snippet.id, snippet.code)}
                          className="h-8 gap-1.5 text-xs"
                        >
                          {copiedId === snippet.id ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-emerald-500" /> Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" /> Copy Code
                            </>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeSnippet(snippet.id)}
                          aria-label="Delete snippet"
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                    </div>

                    <div className="relative rounded-lg bg-slate-950 p-3 font-mono text-xs text-slate-100 overflow-x-auto max-h-48 border border-white/10">
                      <pre><code>{snippet.code}</code></pre>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
