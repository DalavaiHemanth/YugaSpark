import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  BookOpen,
  ExternalLink,
  Plus,
  Copy,
  Check,
  MapPin,
  Code2,
  Sparkles,
  Layers,
  Presentation,
  CheckSquare,
  FileCode,
  Flame,
  Award,
  ChevronLeft,
  ChevronRight,
  FileText,
  Images,
  Eye,
  Download,
  X,
  Upload,
  Loader2,
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

const CATEGORY_LABELS: Record<string, string> = {
  session_materials: "📁 Session Slides, Notes & Drive Links",
  session_recordings: "🎥 Session Video Recordings & Demos",
  templates: "⚡ Starter Kits & Templates",
  apis: "🛠️ APIs & Databases",
  design: "🎨 Figma & Slide Decks",
  guides: "📘 Hackathon Guides & Playbooks",
};

interface PlaybookResource {
  id: string;
  title: string;
  description: string | null;
  url: string;
  category: string;
  status?: string;
  slide_images?: string[];
  ebook_pdf_url?: string | null;
  extra_links?: Array<{ title: string; url: string }>;
  created_at: string;
}

function PlaybookPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"resources" | "roadmap" | "snippets">("resources");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastSubmittedTime, setLastSubmittedTime] = useState<number>(0);

  // Carousel Deck Modal State
  const [activeCarousel, setActiveCarousel] = useState<{ title: string; slides: string[]; index: number } | null>(null);

  // eBook PDF Preview Modal State
  const [activeEbook, setActiveEbook] = useState<{ title: string; url: string } | null>(null);

  // Student Resource Submission Form State
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState("templates");
  const [description, setDescription] = useState("");
  const [slideImagesInput, setSlideImagesInput] = useState("");
  const [ebookUrlInput, setEbookUrlInput] = useState("");

  // Direct Upload State for Student Modal
  const [uploadedSlides, setUploadedSlides] = useState<string[]>([]);
  const [uploadedEbook, setUploadedEbook] = useState<string>("");
  const [uploadingSlides, setUploadingSlides] = useState(false);
  const [uploadingEbook, setUploadingEbook] = useState(false);

  // Direct File Upload Handler for Student Slide Images
  async function handleStudentSlideFiles(e: React.ChangeEvent<HTMLInputElement>) {
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
        toast.success(`Uploaded ${newUrls.length} slide photo(s)!`);
      }
    } catch (err) {
      toast.error("Slide upload failed");
    } finally {
      setUploadingSlides(false);
      e.target.value = "";
    }
  }

  // Direct File Upload Handler for Student eBook PDF
  async function handleStudentEbookFile(e: React.ChangeEvent<HTMLInputElement>) {
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
        setEbookUrlInput(data.publicUrl);
        toast.success("eBook PDF uploaded successfully!");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "PDF upload failed");
    } finally {
      setUploadingEbook(false);
      e.target.value = "";
    }
  }

  // High performance query caching (staleTime 15 mins, gcTime 60 mins) to protect DB connections
  const resources = useQuery({
    queryKey: ["resources-public"],
    staleTime: 15 * 60_000,
    gcTime: 60 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resources")
        .select("*")
        .eq("status", "approved")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data as unknown as PlaybookResource[]) ?? [];
    },
  });

  const list = resources.data ?? [];
  const categories = Array.from(new Set(list.map((r) => r.category)));

  // Fetch Dynamic Code Snippets from DB
  const snippetsQuery = useQuery({
    queryKey: ["code-snippets-public"],
    staleTime: 15 * 60_000,
    gcTime: 60 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("code_snippets")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const snippets = (snippetsQuery.data && snippetsQuery.data.length > 0)
    ? snippetsQuery.data
    : BOILERPLATE_SNIPPETS;

  function handleCopy(id: string, text: string) {
    void navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Snippet copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  }

  // Rate limited submission logic (5s cooldown)
  async function handleSubmitResource(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    const now = Date.now();
    if (now - lastSubmittedTime < 5000) {
      toast.warning("Please wait a few seconds before submitting another resource.");
      return;
    }

    setSubmitting(true);
    try {
      const pastedSlides = slideImagesInput
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && s.startsWith("http"));

      const combinedSlides = Array.from(new Set([...uploadedSlides, ...pastedSlides]));
      const finalEbook: string | null = uploadedEbook.trim() || ebookUrlInput.trim() || null;
      const finalUrl: string = url.trim() || finalEbook || (combinedSlides.length > 0 && combinedSlides[0] ? combinedSlides[0] : "#");

      const { error } = await supabase.from("resources").insert({
        title: title.trim(),
        url: finalUrl,
        category,
        description: description.trim() || null,
        status: "pending",
        slide_images: combinedSlides.length > 0 ? combinedSlides : [],
        ebook_pdf_url: finalEbook,
        created_by: user?.id ?? null,
      });

      if (error) throw new Error(error.message);

      setLastSubmittedTime(Date.now());
      toast.success("Resource submitted! It will appear on the playbook once approved by admins.");
      setTitle("");
      setUrl("");
      setDescription("");
      setSlideImagesInput("");
      setEbookUrlInput("");
      setUploadedSlides([]);
      setUploadedEbook("");
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
        description="Curated starter kits, multi-photo visual concepts, eBooks, copyable code snippets, and master roadmaps."
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
            <Code2 className="h-4 w-4 text-emerald-500" /> Copyable Snippets ({snippets.length})
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
              description="Admins and members curate starter kits, slide decks, visual carousels, and eBooks here."
              steps={[
                "Click 'Submit Resource' above to submit a concept, eBook, or link deck.",
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
                {CATEGORY_LABELS[cat] || cat}
              </h2>
              <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {list
                  .filter((r) => r.category === cat)
                  .map((r) => {
                    const hasSlides = r.slide_images && r.slide_images.length > 0;
                    const hasEbook = Boolean(r.ebook_pdf_url);

                    return (
                      <div
                        key={r.id}
                        className="surface lift group flex flex-col justify-between p-5 rounded-xl border border-border transition-all hover:border-primary/40 space-y-4"
                      >
                        <div className="space-y-2">
                          {/* Multi-Photo Carousel Banner Preview */}
                          {hasSlides ? (
                            <div
                              onClick={() =>
                                setActiveCarousel({ title: r.title, slides: r.slide_images!, index: 0 })
                              }
                              className="relative h-44 w-full cursor-pointer overflow-hidden rounded-lg border border-white/10 bg-slate-950 group-hover:border-primary/50 transition-all"
                            >
                              <img
                                src={r.slide_images![0]}
                                alt={r.title}
                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end justify-between p-3">
                                <Badge className="bg-primary/90 text-primary-foreground font-mono text-[10px] gap-1 shadow">
                                  <Images className="h-3 w-3" /> {r.slide_images!.length} Slides Deck
                                </Badge>
                                <span className="text-[11px] text-white font-medium flex items-center gap-1 bg-black/60 px-2 py-1 rounded-md backdrop-blur">
                                  <Eye className="h-3 w-3 text-primary" /> View Carousel
                                </span>
                              </div>
                            </div>
                          ) : null}

                          <div className="flex items-start justify-between gap-3">
                            <h3 className="font-display text-base font-bold text-foreground group-hover:text-primary transition-colors">
                              {r.title}
                            </h3>
                            <a
                              href={r.url}
                              target="_blank"
                              rel="noreferrer"
                              title="Open External Resource"
                              className="text-muted-foreground hover:text-primary transition-colors shrink-0"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </div>

                          {r.description ? (
                            <p className="text-xs leading-relaxed text-muted-foreground line-clamp-3">
                              {r.description}
                            </p>
                          ) : null}
                        </div>

                        {/* Action Badges & Buttons */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/50">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge variant="secondary" className="text-[10px] capitalize">
                              {r.category}
                            </Badge>

                            {hasEbook ? (
                              <button
                                onClick={() => setActiveEbook({ title: r.title, url: r.ebook_pdf_url! })}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                              >
                                <FileText className="h-3 w-3" /> eBook PDF
                              </button>
                            ) : null}
                          </div>

                          {hasSlides ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                setActiveCarousel({ title: r.title, slides: r.slide_images!, index: 0 })
                              }
                              className="h-7 px-2 text-[11px] font-semibold text-primary hover:bg-primary/10 gap-1"
                            >
                              <Images className="h-3.5 w-3.5" /> View Slides
                            </Button>
                          ) : (
                            <a
                              href={r.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                            >
                              Open Link <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
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
            {snippets.map((s) => (
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
                  {s.description ? <p className="text-xs text-muted-foreground">{s.description}</p> : null}
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

      {/* INTERACTIVE MULTI-PHOTO CAROUSEL DIALOG */}
      {activeCarousel ? (
        <Dialog open={Boolean(activeCarousel)} onOpenChange={() => setActiveCarousel(null)}>
          <DialogContent className="max-w-4xl p-0 overflow-hidden bg-slate-950 text-white border-white/10">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-900/80">
              <div>
                <h3 className="font-bold text-base text-white">{activeCarousel.title}</h3>
                <p className="text-xs text-slate-400 font-mono">
                  Slide {activeCarousel.index + 1} of {activeCarousel.slides.length}
                </p>
              </div>
              <button
                onClick={() => setActiveCarousel(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Slide View area */}
            <div className="relative flex items-center justify-center min-h-[400px] max-h-[70vh] bg-black p-4">
              <img
                src={activeCarousel.slides[activeCarousel.index]}
                alt={`Slide ${activeCarousel.index + 1}`}
                className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-2xl transition-all duration-200"
              />

              {/* Prev / Next controls */}
              {activeCarousel.slides.length > 1 ? (
                <>
                  <button
                    onClick={() =>
                      setActiveCarousel({
                        ...activeCarousel,
                        index:
                          (activeCarousel.index - 1 + activeCarousel.slides.length) %
                          activeCarousel.slides.length,
                      })
                    }
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 text-white hover:bg-primary backdrop-blur transition-all"
                    aria-label="Previous Slide"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    onClick={() =>
                      setActiveCarousel({
                        ...activeCarousel,
                        index: (activeCarousel.index + 1) % activeCarousel.slides.length,
                      })
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 text-white hover:bg-primary backdrop-blur transition-all"
                    aria-label="Next Slide"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              ) : null}
            </div>

            {/* Slide Dots Indicator */}
            {activeCarousel.slides.length > 1 ? (
              <div className="flex justify-center gap-2 py-3 bg-slate-900/80 border-t border-white/10">
                {activeCarousel.slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveCarousel({ ...activeCarousel, index: i })}
                    className={`h-2 rounded-full transition-all ${
                      i === activeCarousel.index ? "w-6 bg-primary" : "w-2 bg-white/30 hover:bg-white/60"
                    }`}
                  />
                ))}
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      ) : null}

      {/* EBOOK PDF PREVIEW MODAL */}
      {activeEbook ? (
        <Dialog open={Boolean(activeEbook)} onOpenChange={() => setActiveEbook(null)}>
          <DialogContent className="max-w-4xl p-4 bg-slate-900 border-white/10 space-y-3">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between font-bold text-white text-base">
                <span className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-emerald-400" /> {activeEbook.title} — eBook PDF
                </span>
              </DialogTitle>
            </DialogHeader>

            <div className="h-[65vh] w-full rounded-lg overflow-hidden border border-white/10 bg-black">
              <iframe
                src={activeEbook.url}
                className="w-full h-full border-none"
                title={activeEbook.title}
              />
            </div>

            <DialogFooter className="flex items-center justify-between gap-3 pt-2">
              <a
                href={activeEbook.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400 hover:underline"
              >
                <Download className="h-4 w-4" /> Download / Open PDF in New Tab
              </a>
              <Button size="sm" variant="outline" onClick={() => setActiveEbook(null)}>
                Close Preview
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
              Share a starter kit, multi-photo slide deck, eBook PDF, or tutorial link with Yuga Spark members.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitResource} className="space-y-3.5 mt-2">
            <div>
              <Label className="text-xs font-semibold">Title *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. System Design Cheat Sheet & eBook"
                required
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Primary Resource Link (Optional)</Label>
              <Input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://github.com/... or https://drive.google.com/..."
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Category</Label>
              <Select value={category} onValueChange={setCategory}>
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
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Briefly explain how this resource helps students..."
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
                  <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-2 text-xs text-primary hover:bg-primary/10 transition-colors">
                    {uploadingSlides ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> Uploading Slides…
                      </>
                    ) : (
                      <>
                        <Upload className="h-3.5 w-3.5" /> Pick / Drag Slide Photos
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleStudentSlideFiles}
                    disabled={uploadingSlides}
                    className="hidden"
                  />
                </label>
              </div>

              {uploadedSlides.length > 0 ? (
                <div className="flex gap-2 overflow-x-auto py-1">
                  {uploadedSlides.map((imgUrl, idx) => (
                    <div key={idx} className="relative h-12 w-12 shrink-0 rounded border border-border group overflow-hidden">
                      <img src={imgUrl} alt={`Slide ${idx + 1}`} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setUploadedSlides((prev) => prev.filter((_, i) => i !== idx))}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white"
                      >
                        <X className="h-3.5 w-3.5 text-red-400" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              <Textarea
                value={slideImagesInput}
                onChange={(e) => setSlideImagesInput(e.target.value)}
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
                  <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-emerald-500/40 bg-emerald-500/5 p-2 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors">
                    {uploadingEbook ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-500" /> Uploading PDF…
                      </>
                    ) : (
                      <>
                        <Upload className="h-3.5 w-3.5" /> Upload eBook PDF File
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleStudentEbookFile}
                    disabled={uploadingEbook}
                    className="hidden"
                  />
                </label>
              </div>

              {uploadedEbook ? (
                <div className="flex items-center justify-between gap-2 p-1.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-600 dark:text-emerald-400">
                  <span className="truncate font-semibold flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5" /> PDF Uploaded & Attached
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setUploadedEbook("");
                      setEbookUrlInput("");
                    }}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <Input
                  type="url"
                  value={ebookUrlInput}
                  onChange={(e) => setEbookUrlInput(e.target.value)}
                  placeholder="Or paste external PDF URL"
                />
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setSubmitModalOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={submitting || !title.trim()}>
                {submitting ? "Submitting…" : "Submit for Approval"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

