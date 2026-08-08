import { createFileRoute, Link } from "@tanstack/react-router";
import { SparkMark } from "@/components/SparkMark";
import { Button } from "@/components/ui/button";
import {
  Trophy,
  Users,
  BookOpen,
  Award,
  ArrowRight,
  Building2,
  Lock,
  Landmark,
} from "lucide-react";
import { ClubLegacyShowcase } from "@/components/ClubLegacyShowcase";

const TITLE = "Yuga Spark — RGMCET Hackathon Club Portal";
const DESCRIPTION =
  "Official Innovation & Hackathon Portal for Rajeev Gandhi Memorial College of Engineering & Technology (RGMCET).";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: Index,
});

const HIGHLIGHTS = [
  { icon: Trophy, title: "Leaderboard", desc: "Live rankings & points" },
  { icon: Users, title: "Squad Finder", desc: "Form hackathon teams" },
  { icon: BookOpen, title: "Playbook", desc: "Roadmaps & code snippets" },
  { icon: Award, title: "Certificates", desc: "Verified digital credentials" },
];

function Index() {
  return (
    <div className="min-h-screen w-full bg-background text-foreground selection:bg-primary/20 flex flex-col justify-between">
      {/* Top Sticky Navigation */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/70 backdrop-blur-md shrink-0">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-3">
            <SparkMark />
          </div>
          <div className="flex items-center gap-2.5">
            <Button asChild size="sm" variant="ghost" className="text-xs font-semibold gap-1.5 text-muted-foreground hover:text-foreground">
              <a href="#legacy">
                <Landmark className="h-3.5 w-3.5 text-primary" /> Club Legacy
              </a>
            </Button>
            <Button asChild size="sm" variant="ghost" className="text-xs font-semibold gap-1.5 text-muted-foreground hover:text-foreground">
              <Link to="/auth">
                <Lock className="h-3.5 w-3.5 text-primary" /> Admin Login
              </Link>
            </Button>
            <Button asChild size="sm" className="text-xs font-semibold gap-1.5 shadow-sm">
              <Link to="/auth">
                Student Sign In <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Landing Sections */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-12 space-y-16">
        {/* Hero Banner Section */}
        <section className="flex flex-col justify-center items-center text-center max-w-4xl mx-auto space-y-6 pt-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
            <Building2 className="h-3.5 w-3.5" /> RGMCET Autonomous · Department of CSE (Data Science)
          </div>

          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-tight">
            Yuga Spark <span className="text-primary">Hackathon Club</span>
          </h1>

          <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Official campus innovation portal for RGMCET builders. Discover hackathons, build squads, track Saturday attendance, and collect verified credentials.
          </p>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button asChild size="lg" className="font-semibold text-sm gap-2 shadow-lg shadow-primary/20 px-6">
              <Link to="/auth">
                Enter Student Portal <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="font-semibold text-sm gap-2 px-6">
              <a href="#legacy">
                <Landmark className="h-4 w-4 text-primary" /> View Club Legacy
              </a>
            </Button>
          </div>

          {/* 4 Feature Highlights */}
          <div className="pt-6 grid grid-cols-2 sm:grid-cols-4 gap-3.5 w-full">
            {HIGHLIGHTS.map((item) => (
              <div
                key={item.title}
                className="surface rounded-2xl p-4 border border-border text-left space-y-1.5 transition-all hover:border-primary/40 bg-card/50"
              >
                <div className="flex items-center gap-2">
                  <item.icon className="h-4 w-4 text-primary shrink-0" />
                  <p className="font-display text-xs font-bold text-foreground">{item.title}</p>
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Club Legacy & Showcase Section */}
        <section id="legacy" className="pt-8 border-t border-border space-y-8 scroll-mt-20">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              <Landmark className="h-3.5 w-3.5" /> Club Achievements & Heritage
            </div>
            <h2 className="font-display text-3xl font-extrabold text-foreground tracking-tight">
              Yuga Spark Legacy Showcase
            </h2>
            <p className="text-sm text-muted-foreground">
              Milestones, hackathon podium finishes, event photo gallery, and student lead teams through academic years at RGMCET.
            </p>
          </div>

          {/* High Efficiency Legacy Component */}
          <ClubLegacyShowcase />
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/40 py-4 px-6 text-center shrink-0">
        <p className="text-[11px] text-muted-foreground">
          © {new Date().getFullYear()} Yuga Spark · RGMCET Hackathon Club · Developed by <strong className="text-foreground">Jaya Krushna</strong> and <strong className="text-foreground">Hemanth</strong>
        </p>
      </footer>
    </div>
  );
}
