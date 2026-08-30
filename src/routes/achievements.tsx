import { createFileRoute, Link } from "@tanstack/react-router";
import { Landmark, ArrowLeft, Lock, ArrowRight } from "lucide-react";
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
    <div className="cofounder-landing min-h-screen w-full selection:bg-[#1890f0]/20 flex flex-col justify-between overflow-x-hidden">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-40 border-b border-[#202020]/15 bg-[#f5f5f2]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 text-[#171717] no-underline">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1890f0] inline-block" />
              <span className="font-sans text-xl font-medium tracking-tight text-[#171717]">
                Yuga Spark
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/" className="cofounder-btn-secondary text-xs px-3.5 py-1.5 flex items-center gap-1.5">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Home</span>
            </Link>
            <Link to="/auth" className="cofounder-btn-primary text-xs px-4 py-2 flex items-center gap-1.5">
              <span>Student Sign In</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-[1200px] mx-auto w-full px-6 py-10 space-y-8">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1890f0]/10 border border-[#1890f0]/20 text-[#1890f0] text-xs font-semibold">
            <Landmark className="h-3.5 w-3.5" />
            <span>Club Achievements & Heritage</span>
          </div>
          <h1 className="cofounder-h1 text-3xl sm:text-4xl">
            RGMCET Yuga Spark Legacy
          </h1>
          <p className="text-base text-[#666660]">
            Explore club achievements, hackathon podium finishes, event photo gallery, and lead teams.
          </p>
        </div>

        {/* Cofounder Style Legacy Showcase Component */}
        <ClubLegacyShowcase />
      </main>

      {/* Footer */}
      <footer className="border-t border-[#202020]/10 bg-[#eaeae6] py-8 px-6 text-center shrink-0">
        <div className="max-w-[1200px] mx-auto flex flex-wrap items-center justify-between text-xs text-[#666660] gap-4">
          <p>© {new Date().getFullYear()} Yuga Spark · RGMCET Hackathon Club · All rights reserved.</p>
          <p>Developed by <strong className="text-[#171717]">Jaya Krushna</strong> and <strong className="text-[#171717]">Hemanth</strong></p>
        </div>
      </footer>
    </div>
  );
}
