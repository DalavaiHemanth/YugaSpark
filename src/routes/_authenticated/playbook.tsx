import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  BookOpen,
  ExternalLink,
  Plus,
  Copy,
  Check,
  MapPin,
  Clock,
  Code2,
  Sparkles,
  Layers,
  Presentation,
  CheckSquare,
  FileCode,
  Flame,
  Award,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AppShell, PageHeader, EmptyState } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TITLE = "Playbook — Yuga Spark";
const DESCRIPTION = "Curated hackathon resources, templates, code snippets and master roadmaps from Yuga Spark.";

export const Route = createFileRoute("/_authenticated/playbook")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: PlaybookPage,
});

// Copyable Code Snippets Library
const BOILERPLATE_SNIPPETS = [
  {
    id: "supabase-ts",
    title: "Supabase Client & Auth Scaffold (TypeScript)",
    category: "Backend & Database",
    language: "typescript",
    description: "Production-ready Supabase client setup with TypeScript types.",
    code: `import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);`,
  },
  {
    id: "fastapi-cors",
    title: "FastAPI Python Backend Scaffold (CORS Enabled)",
    category: "Backend & Database",
    language: "python",
    description: "Quick Python REST API setup for machine learning & data processing.",
    code: `from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Yuga Spark Hackathon API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "active", "message": "Yuga Spark API is live"}`,
  },
  {
    id: "tailwind-glass",
    title: "Tailwind Glassmorphism Card (CSS / JSX)",
    category: "UI & Frontend",
    language: "html",
    description: "Modern translucent glassmorphism container component.",
    code: `<div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-xl shadow-2xl transition-all hover:border-primary/40">
  <h3 className="font-bold text-lg text-white">Glassmorphism Card</h3>
  <p className="text-sm text-slate-300 mt-1">Sleek dark mode container for modern web apps.</p>
</div>`,
  },
  {
    id: "pitch-deck-outline",
    title: "5-Slide Winning Pitch Deck Outline",
    category: "Pitch & Presentation",
    language: "markdown",
    description: "Structured slide breakdown for winning hackathon presentations.",
    code: `Slide 1: Hook & Problem (30s) — What acute problem exists?
Slide 2: Solution & Live Demo (90s) — Showcase working MVP product flow.
Slide 3: Technical Architecture (30s) — Stack: Frontend, Database, APIs, AI models.
Slide 4: Market Impact & Future Roadmap (30s) — Real-world feasibility & next steps.
Slide 5: Team & Call to Action (0s) — Member roles & contact details.`,
  },
];

// Structured Hackathon Master Roadmap Steps
const ROADMAP_STEPS = [
  {
    phase: "Phase 1",
    timeframe: "Hours 0 – 2",
    title: "Idea Validation & Problem Framing",
    icon: Flame,
    color: "text-amber-500 bg-amber-500/10 border-amber-500/30",
    checklists: [
      "Define 1 specific acute problem statement (Avoid building generic all-in-one platforms).",
      "Draft target user persona and their primary pain point.",
      "Search GitHub & Devpost to verify your solution's unique value proposition.",
    ],
    proTip: "Judges prefer a solution that solves ONE problem 100% well over a platform that solves 10 problems half-way.",
  },
  {
    phase: "Phase 2",
    timeframe: "Hours 2 – 6",
    title: "UI Wireframing & Database Schema Design",
    icon: Layers,
    color: "text-blue-500 bg-blue-500/10 border-blue-500/30",
    checklists: [
      "Create high-fidelity Figma screens focusing on max 3 key clicks to reach value.",
      "Design relational database schema (User, Core Entity, Status, Timestamps).",
      "Scaffold repository & set up environment variables (.env).",
    ],
    proTip: "Lock down your database schema early to prevent massive schema refactoring midway through coding.",
  },
  {
    phase: "Phase 3",
    timeframe: "Hours 6 – 20",
    title: "Rapid MVP Development & Integration",
    icon: Code2,
    color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30",
    checklists: [
      "Build core user flow end-to-end first before polishing edge cases.",
      "Integrate Supabase Auth / PostgreSQL and third-party APIs.",
      "Code Freeze 4 hours before deadline to prevent breaking bugs during presentation.",
    ],
    proTip: "Deploy your app live on Vercel / Netlify early in the hackathon so deployment pipeline issues are caught early.",
  },
  {
    phase: "Phase 4",
    timeframe: "Hours 20 – 24",
    title: "Pitch Deck & 3-Minute Live Demo",
    icon: Presentation,
    color: "text-purple-500 bg-purple-500/10 border-purple-500/30",
    checklists: [
      "Build 5-slide deck (Problem ➡️ Solution ➡️ Live Demo ➡️ Tech Stack ➡️ Team).",
      "Record a 60-second fallback screen recording of live demo in case Wi-Fi fails.",
      "Rehearse pitch timing (2 mins presentation + 1 min demo).",
    ],
    proTip: "Always start your pitch with a live working demo — working code speaks louder than 20 slides!",
  },
];

function PlaybookPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"resources" | "roadmap" | "snippets">("resources");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Student Resource Submission Form State
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState("templates");
  const [description, setDescription] = useState("");

  const resources = useQuery({
    queryKey: ["resources-public"],
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resources")
        .select("*")
        .eq("status", "approved")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const list = resources.data ?? [];
  const categories = Array.from(new Set(list.map((r) => r.category)));

  function handleCopy(id: string, text: string) {
    void navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Snippet copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handleSubmitResource(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !url.trim()) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from("resources").insert({
        title: title.trim(),
        url: url.trim(),
        category,
        description: description.trim() || null,
        status: "pending", // Student submissions require admin approval
        created_by: user?.id ?? null,
      });

      if (error) throw new Error(error.message);

      toast.success("Resource submitted! It will appear on the playbook once approved by admins.");
      setTitle("");
      setUrl("");
      setDescription("");
      setSubmitModalOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Playbook"
        title="Hackathon Playbook & Learning Hub"
        description="Curated starter kits, copyable code snippets, master roadmaps, and presentation decks from Yuga Spark."
      />

      {/* Main Tab Navigation Header */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-3">
        <div className="flex gap-2">
          <Button
            variant={activeTab === "resources" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("resources")}
            className="gap-2 text-xs font-semibold"
          >
            <BookOpen className="h-4 w-4" /> Resource Library ({list.length})
          </Button>
          <Button
            variant={activeTab === "roadmap" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("roadmap")}
            className="gap-2 text-xs font-semibold"
          >
            <MapPin className="h-4 w-4 text-amber-500" /> Master Roadmap
          </Button>
          <Button
            variant={activeTab === "snippets" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("snippets")}
            className="gap-2 text-xs font-semibold"
          >
            <Code2 className="h-4 w-4 text-emerald-500" /> Copyable Snippets
          </Button>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={() => setSubmitModalOpen(true)}
          className="gap-2 text-xs font-semibold border-primary/30 text-primary hover:bg-primary/10"
        >
          <Plus className="h-4 w-4" /> Submit Resource
        </Button>
      </div>

      {/* TAB 1: RESOURCE LIBRARY */}
      {activeTab === "resources" ? (
        list.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              icon={BookOpen}
              title="The playbook is being updated"
              description="Admins and members curate starter kits, slide decks and API lists here."
              steps={[
                "Click 'Submit Resource' above to submit a link or template worth sharing.",
                "Browse the Master Roadmap tab for step-by-step hackathon prep.",
                "Check out Copyable Snippets for ready-to-use backend & UI boilerplates.",
              ]}
              action={
                <Button size="sm" onClick={() => setSubmitModalOpen(true)}>
                  Submit a resource
                </Button>
              }
            />
          </div>
        ) : (
          categories.map((cat) => (
            <section key={cat} className="mt-8">
              <h2 className="label-mono text-muted-foreground uppercase text-xs tracking-wider flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                {cat}
              </h2>
              <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {list
                  .filter((r) => r.category === cat)
                  .map((r) => (
                    <a
                      key={r.id}
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                      className="surface lift group flex flex-col p-5 rounded-xl border border-border transition-all hover:border-primary/40"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-display text-base font-bold group-hover:text-primary transition-colors">
                          {r.title}
                        </h3>
                        <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                      </div>
                      {r.description ? (
                        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{r.description}</p>
                      ) : null}
                      <Badge variant="secondary" className="mt-4 self-start text-[10px] capitalize">
                        {r.category}
                      </Badge>
                    </a>
                  ))}
              </div>
            </section>
          ))
        )
      ) : null}

      {/* TAB 2: HACKATHON MASTER ROADMAP */}
      {activeTab === "roadmap" ? (
        <div className="mt-8 space-y-6">
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 space-y-2">
            <h2 className="font-display text-lg font-bold flex items-center gap-2 text-foreground">
              <Award className="h-5 w-5 text-primary" />
              The 24-Hour Hackathon Winning Framework
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Step-by-step roadmap followed by top hackathon winners to validate ideas, scaffold code, and deliver high-impact presentations.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {ROADMAP_STEPS.map((s, idx) => {
              const Icon = s.icon;
              return (
                <div key={idx} className="surface p-6 rounded-2xl border border-border space-y-4 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className={`p-2 rounded-xl border ${s.color}`}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <div>
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                          {s.phase} · {s.timeframe}
                        </span>
                        <h3 className="font-display text-base font-bold text-foreground">{s.title}</h3>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <CheckSquare className="h-3.5 w-3.5 text-primary" /> Action Checklist
                    </p>
                    <ul className="space-y-1.5 text-xs text-muted-foreground">
                      {s.checklists.map((item, itemIdx) => (
                        <li key={itemIdx} className="flex items-start gap-2">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-lg bg-secondary/40 p-3 text-[11px] leading-relaxed text-foreground border border-border">
                    <strong className="text-primary font-semibold">💡 Pro Tip:</strong> {s.proTip}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* TAB 3: COPYABLE BOILERPLATE SNIPPETS */}
      {activeTab === "snippets" ? (
        <div className="mt-8 space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {BOILERPLATE_SNIPPETS.map((s) => (
              <div key={s.id} className="surface p-5 rounded-2xl border border-border space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display text-sm font-bold flex items-center gap-2">
                      <FileCode className="h-4 w-4 text-emerald-500" />
                      {s.title}
                    </h3>
                    <Badge variant="outline" className="text-[9px] uppercase font-mono">
                      {s.category}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{s.description}</p>
                </div>

                <div className="relative group rounded-xl overflow-hidden border border-border bg-black/90 p-4 font-mono text-xs text-emerald-400">
                  <button
                    onClick={() => handleCopy(s.id, s.code)}
                    className="absolute right-3 top-3 rounded-lg bg-white/10 p-1.5 text-white backdrop-blur transition-all hover:bg-primary hover:text-primary-foreground"
                    title="Copy code"
                  >
                    {copiedId === s.id ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                  </button>
                  <pre className="overflow-x-auto whitespace-pre pr-8 leading-relaxed">
                    <code>{s.code}</code>
                  </pre>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Student Resource Submission Modal */}
      <Dialog open={submitModalOpen} onOpenChange={setSubmitModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-bold">
              <Plus className="h-5 w-5 text-primary" />
              Submit Resource to Playbook
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Share a high-quality starter kit, slide template, API, or tutorial link with Yuga Spark members.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitResource} className="space-y-3.5 mt-2">
            <div>
              <Label className="text-xs font-semibold">Title *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Next.js 14 Supabase Starter Kit"
                required
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">URL / Link *</Label>
              <Input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://github.com/..."
                required
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Category</Label>
              <Select value={category} onValueChange={setCategory}>
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
              <Label className="text-xs font-semibold">Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Briefly explain how this resource helps during hackathons..."
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setSubmitModalOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={submitting || !title.trim() || !url.trim()}>
                {submitting ? "Submitting…" : "Submit for Approval"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
