import { createFileRoute, Link } from "@tanstack/react-router";
import { Landmark, ArrowLeft, Lock, ArrowRight } from "lucide-react";
import { SparkMark } from "@/components/SparkMark";
import { Button } from "@/components/ui/button";
import { ClubLegacyShowcase } from "@/components/ClubLegacyShowcase";

const TITLE = "Club Legacy & Achievements — Yuga Spark";
const DESCRIPTION =
  "Official showcase of student moments, hackathon podium finishes, photo gallery, and lead teams through the years at RGMCET Yuga Spark.";

export const Route = createFileRoute("/achievements")({
  ssr: false,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: AchievementsPublicPage,
});

function AchievementsPublicPage() {
  return (
    <div className="min-h-screen w-full bg-background text-foreground selection:bg-primary/20 flex flex-col justify-between">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 py-3.5">
          <div className="flex items-center gap-3">
            <Link to="/">
              <SparkMark />
            </Link>
          </div>
          <div className="flex items-center gap-2.5">
            <Button asChild size="sm" variant="ghost" className="text-xs font-semibold gap-1.5">
              <Link to="/">
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Home
              </Link>
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

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-10 space-y-8">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
            <Landmark className="h-3.5 w-3.5" /> Club Achievements & Heritage
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
            RGMCET Yuga Spark Legacy
          </h1>
          <p className="text-sm text-muted-foreground">
            Explore club achievements, hackathon podium finishes, event photo gallery, and lead teams.
          </p>
        </div>

        {/* Optimized Legacy Showcase Component */}
        <ClubLegacyShowcase />
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
