import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  BookOpen,
  ExternalLink,
  Code2,
  Copy,
  Check,
  Upload,
  X,
  FileText,
  Images,
  Loader2,
} from "lucide-react";
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
  const [form, setForm] = useState({
    title: "",
    url: "",
    category: "templates",
    description: "",
    slideImages: "",
    ebookPdfUrl: "",
  });

  // Direct File Upload State
  const [uploadedSlides, setUploadedSlides] = useState<string[]>([]);
  const [uploadedEbook, setUploadedEbook] = useState<string>("");
  const [uploadingSlides, setUploadingSlides] = useState(false);
  const [uploadingEbook, setUploadingEbook] = useState(false);

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

  // Direct File Upload Handler for Slide Images
  async function handleSlideFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingSlides(true);
    const newUrls: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file) continue;
        const ext = file.name.split(".").pop() ?? "jpg";
        const filePath = `playbook/slides/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;

        const { error } = await supabase.storage.from("photos").upload(filePath, file, { upsert: true });
        if (error) {
          toast.error(`Failed to upload ${file.name}: ${error.message}`);
          continue;
        }

        const { data } = supabase.storage.from("photos").getPublicUrl(filePath);
        if (data?.publicUrl) {
          newUrls.push(data.publicUrl);
        }
      }

      if (newUrls.length > 0) {
        setUploadedSlides((prev) => [...prev, ...newUrls]);
        toast.success(`Uploaded ${newUrls.length} slide image(s)!`);
      }
    } catch (err) {
      toast.error("Slide upload failed");
    } finally {
      setUploadingSlides(false);
      e.target.value = "";
    }
  }

  // Direct File Upload Handler for eBook PDF
  async function handleEbookFile(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingEbook(true);
    try {
      const file = files[0];
      if (!file) return;
      const ext = file.name.split(".").pop() ?? "pdf";
      const filePath = `playbook/ebooks/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;

      const { error } = await supabase.storage.from("photos").upload(filePath, file, { upsert: true });
      if (error) throw new Error(error.message);

      const { data } = supabase.storage.from("photos").getPublicUrl(filePath);
      if (data?.publicUrl) {
        setUploadedEbook(data.publicUrl);
        setForm((prev) => ({ ...prev, ebookPdfUrl: data.publicUrl }));
        toast.success("eBook PDF uploaded successfully!");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "PDF upload failed");
    } finally {
      setUploadingEbook(false);
      e.target.value = "";
    }
  }

  async function addResource(e: React.FormEvent) {
    e.preventDefault();
    const pastedSlides = form.slideImages
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && s.startsWith("http"));

    const combinedSlides = Array.from(new Set([...uploadedSlides, ...pastedSlides]));
    const finalEbook = uploadedEbook.trim() || form.ebookPdfUrl.trim() || null;

    const { error } = await supabase.from("resources").insert({
      title: form.title.trim(),
      url: form.url.trim(),
      category: form.category.trim() || "templates",
      description: form.description.trim() || null,
      slide_images: combinedSlides.length > 0 ? combinedSlides : [],
      ebook_pdf_url: finalEbook,
      status: "approved",
      created_by: user?.id ?? null,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setForm({ title: "", url: "", category: "templates", description: "", slideImages: "", ebookPdfUrl: "" });
    setUploadedSlides([]);
    setUploadedEbook("");
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
              <Label className="text-xs font-semibold">Resource Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. System Design Cheat Sheet & Deck"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Resource Link (GitHub / Web) *</Label>
              <Input
                type="url"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://github.com/..."
                required
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Category</Label>
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
              <Label className="text-xs font-semibold">Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                placeholder="Short overview of what this resource provides..."
              />
            </div>

            {/* DIRECT FILE UPLOADER FOR SLIDE IMAGES */}
            <div className="space-y-2 pt-1 border-t border-border">
              <Label className="text-xs font-semibold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Images className="h-3.5 w-3.5 text-primary" /> Slide Images Deck
                </span>
                <span className="text-[10px] text-muted-foreground font-normal">Direct Upload or Paste</span>
              </Label>

              <div className="flex items-center gap-2">
                <label className="flex-1 cursor-pointer">
                  <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-2.5 text-xs text-primary hover:bg-primary/10 transition-colors">
                    {uploadingSlides ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-primary" /> Uploading Slides…
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" /> Pick / Drag Slide Photos
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleSlideFiles}
                    disabled={uploadingSlides}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Uploaded Slide Image Thumbnails */}
              {uploadedSlides.length > 0 ? (
                <div className="flex gap-2 overflow-x-auto py-1">
                  {uploadedSlides.map((url, idx) => (
                    <div key={idx} className="relative h-14 w-14 shrink-0 rounded-md overflow-hidden border border-border group">
                      <img src={url} alt={`Slide ${idx + 1}`} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setUploadedSlides((prev) => prev.filter((_, i) => i !== idx))}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white"
                      >
                        <X className="h-4 w-4 text-red-400" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              <Textarea
                value={form.slideImages}
                onChange={(e) => setForm({ ...form, slideImages: e.target.value })}
                rows={1}
                className="font-mono text-[11px]"
                placeholder="Or paste external image URLs (1 per line)"
              />
            </div>

            {/* DIRECT FILE UPLOADER FOR EBOOK PDF */}
            <div className="space-y-2 pt-1 border-t border-border">
              <Label className="text-xs font-semibold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-emerald-500" /> eBook / PDF Attachment
                </span>
                <span className="text-[10px] text-muted-foreground font-normal">Direct Upload or Paste</span>
              </Label>

              <div className="flex items-center gap-2">
                <label className="flex-1 cursor-pointer">
                  <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-emerald-500/40 bg-emerald-500/5 p-2.5 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors">
                    {uploadingEbook ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-emerald-500" /> Uploading PDF…
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" /> Upload eBook PDF File
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleEbookFile}
                    disabled={uploadingEbook}
                    className="hidden"
                  />
                </label>
              </div>

              {uploadedEbook ? (
                <div className="flex items-center justify-between gap-2 p-2 rounded bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-600 dark:text-emerald-400">
                  <span className="truncate font-semibold flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5" /> PDF Uploaded & Attached
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setUploadedEbook("");
                      setForm((prev) => ({ ...prev, ebookPdfUrl: "" }));
                    }}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <Input
                  type="url"
                  value={form.ebookPdfUrl}
                  onChange={(e) => setForm({ ...form, ebookPdfUrl: e.target.value })}
                  placeholder="Or paste external PDF URL"
                />
              )}
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
