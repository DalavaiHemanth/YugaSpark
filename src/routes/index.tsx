import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Users,
  Trophy,
  Award,
  ArrowRight,
  Menu,
  X,
  Lock,
  Landmark,
} from "lucide-react";
import { ClubLegacyShowcase } from "@/components/ClubLegacyShowcase";
import { AnimatedHeroBackground } from "@/components/AnimatedHeroBackground";

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

export function Index() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="cofounder-landing min-h-screen w-full selection:bg-[#1890f0]/20 flex flex-col justify-between overflow-x-hidden">
      <main className="flex-1 w-full">
        {/* ━━━ SECTION 1 & 2 — HERO & INTEGRATED HEADER WITH 3D DYNAMIC ANIMATED BACKGROUND ━━━ */}
        <section id="hero" className="p-3 sm:p-6 w-full max-w-[1440px] mx-auto">
          <AnimatedHeroBackground>
            {/* ━━━ INTEGRATED HEADER BAR ━━━ */}
            <header className="relative z-20 flex items-center justify-between w-full">
              {/* Wordmark Logo */}
              <a href="#hero" className="flex items-center gap-2 text-white no-underline drop-shadow-md">
                <span className="font-sans text-2xl font-bold tracking-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
                  Yuga Spark
                </span>
              </a>

              {/* Center Nav Pills Container */}
              <div className="hidden md:flex items-center gap-2">
                <div className="bg-[#171717]/60 hover:bg-[#171717]/80 backdrop-blur-md border border-white/20 rounded-full px-5 py-2 flex items-center gap-6 text-white text-sm font-medium shadow-md">
                  <a href="#hero" className="hover:text-white/80 transition-colors">Start</a>
                  <a href="#features" className="hover:text-white/80 transition-colors">Squads</a>
                  <a href="#capabilities" className="hover:text-white/80 transition-colors">Leaderboard</a>
                  <a href="#legacy" className="hover:text-white/80 transition-colors flex items-center gap-1">
                    <Landmark className="w-3.5 h-3.5 text-white" />
                    <span>Legacy</span>
                  </a>
                </div>

                <Link
                  to="/auth"
                  className="bg-[#171717]/60 hover:bg-[#171717]/80 backdrop-blur-md border border-white/20 text-white rounded-lg px-4 py-2 text-sm font-medium transition-all shadow-md"
                >
                  Resources
                </Link>

                <Link
                  to="/auth"
                  className="bg-[#171717]/60 hover:bg-[#171717]/80 backdrop-blur-md border border-white/20 text-white rounded-lg px-4 py-2 text-sm font-medium transition-all shadow-md flex items-center gap-1"
                >
                  <span>Admin</span>
                  <Lock className="w-3 h-3 text-white/80" />
                </Link>
              </div>

              {/* Top Right Header Action Button */}
              <div className="hidden md:flex items-center">
                <Link
                  to="/auth"
                  className="bg-white text-[#171717] hover:bg-[#f5f5f2] rounded-lg px-5 py-2.5 font-medium text-sm transition-all shadow-md flex items-center gap-1.5"
                >
                  <span>Enter Portal</span>
                </Link>
              </div>

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2.5 text-white rounded-lg bg-[#171717]/60 backdrop-blur-md border border-white/20"
                aria-label="Toggle Navigation Menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </header>

            {/* Mobile Full-Screen Overlay Menu */}
            {mobileMenuOpen && (
              <div className="fixed inset-0 z-50 bg-[#f5f5f2] pt-[100px] px-8 flex flex-col justify-between pb-12 animate-fadeIn md:hidden">
                <nav className="flex flex-col gap-6 text-2xl font-normal text-[#171717]">
                  <a href="#hero" onClick={() => setMobileMenuOpen(false)} className="py-2 border-b border-[#202020]/10">Start</a>
                  <a href="#features" onClick={() => setMobileMenuOpen(false)} className="py-2 border-b border-[#202020]/10">Squad Finder</a>
                  <a href="#capabilities" onClick={() => setMobileMenuOpen(false)} className="py-2 border-b border-[#202020]/10">Leaderboard</a>
                  <a href="#legacy" onClick={() => setMobileMenuOpen(false)} className="py-2 border-b border-[#202020]/10 text-[#1890f0] flex items-center justify-between">
                    <span>Club Legacy Showcase</span>
                    <Landmark className="w-5 h-5" />
                  </a>
                  <Link to="/auth" onClick={() => setMobileMenuOpen(false)} className="py-2 border-b border-[#202020]/10 flex items-center justify-between">
                    <span>Admin Login</span>
                    <Lock className="w-4 h-4 text-[#666660]" />
                  </Link>
                </nav>

                <div className="pt-6">
                  <Link to="/auth" onClick={() => setMobileMenuOpen(false)} className="cofounder-btn-primary w-full py-4 text-center text-base">
                    Enter Student Portal
                  </Link>
                </div>
              </div>
            )}

            {/* Hero Main Content Card — Positioned on RIGHT side */}
            <div className="relative z-10 my-auto pt-6 sm:pt-10 max-w-[560px] ml-auto">
              <div className="bg-[#f5f5f2]/90 backdrop-blur-md border border-[#202020]/15 p-6 sm:p-8 rounded-[20px] space-y-5 shadow-xl text-[#171717]">
                <h1 className="cofounder-h1 text-3xl sm:text-[44px] leading-[1.08] font-normal text-[#171717] tracking-tight">
                  Yuga Spark empowers RGMCET student builders to win hackathons
                </h1>

                <p className="text-[15px] sm:text-[16px] leading-[1.4] text-[#171717]/80">
                  Start with an innovation roadmap, then form engineering squads, track Saturday build sprints, leaderboards, and verified credentials.
                </p>

                {/* CTAs side-by-side */}
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <Link
                    to="/auth"
                    className="cofounder-btn-primary shadow-md flex items-center gap-2"
                  >
                    <span>Get Started</span>
                    <ArrowRight className="w-4 h-4 text-white" />
                  </Link>

                  <a
                    href="#legacy"
                    className="cofounder-btn-secondary flex items-center gap-2"
                  >
                    <Landmark className="w-4 h-4 text-[#171717]" />
                    <span>View Club Legacy</span>
                  </a>
                </div>
              </div>
            </div>
          </AnimatedHeroBackground>
        </section>

        {/* ━━━ SECTION 3 — SOCIAL PROOF STRIP ━━━ */}
        <section className="py-12 md:py-16 bg-[#f5f5f2] border-t border-b border-[#202020]/10 px-6">
          <div className="max-w-[1200px] mx-auto text-center space-y-6">
            <p className="cofounder-eyebrow">POWERING BUILDERS & DEPARTMENTS AT</p>
            <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 opacity-75">
              <span className="font-sans text-base sm:text-lg tracking-tight font-semibold text-[#171717]">
                RGMCET Autonomous
              </span>
              <span className="text-[#666660] font-light">|</span>
              <span className="font-sans text-base sm:text-lg tracking-tight font-semibold text-[#171717]">
                CSE (Data Science)
              </span>
            </div>
          </div>
        </section>

        {/* ━━━ SECTIONS 4–5 — SIGNATURE THREE-CARD GRID ━━━ */}
        <section id="capabilities" className="py-20 md:py-28 px-6 max-w-[1200px] mx-auto space-y-16">
          <div className="space-y-4 text-center">
            <div className="cofounder-eyebrow">SIGNATURE CAPABILITIES</div>
            <h2 className="cofounder-h2 text-3xl sm:text-[40px]">
              Everything you need to build and win
            </h2>
          </div>

          {/* 3 Signature Cards Grid matching cofounder.co layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Card 1 — Portal Overview */}
            <div className="cofounder-card p-6 border border-[#202020]/15 relative overflow-hidden flex flex-col justify-between min-h-[380px]">
              <div className="relative z-10 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase text-[#1890f0] font-semibold">CAMPUS INNOVATION OS</span>
                  <span className="w-2 h-2 rounded-full bg-[#1890f0]" />
                </div>
                <h3 className="font-sans text-xl font-normal text-[#171717] leading-snug">
                  Everything you need to build and win
                </h3>
                <p className="text-xs text-[#666660] leading-relaxed">
                  Discover hackathons, form multi-disciplinary squads, and track Saturday attendance in real time.
                </p>
                <div className="flex items-center gap-2 pt-2">
                  <Link to="/auth" className="bg-[#1890f0] text-white rounded-[6px] px-3.5 py-1.5 text-xs font-medium">
                    Enter Portal
                  </Link>
                  <a href="#legacy" className="bg-[#f5f5f2] border border-[#202020]/20 text-[#171717] rounded-[6px] px-3.5 py-1.5 text-xs font-medium">
                    View Legacy
                  </a>
                </div>
              </div>

              {/* Scaled Mini Background Artwork */}
              <div className="relative mt-6 h-36 rounded-[8px] overflow-hidden border border-[#202020]/10">
                <img
                  src="/cofounder_hero_landscape.jpg"
                  alt="Mini Hero Preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 left-2 bg-[#171717]/80 backdrop-blur-md text-white text-[10px] font-mono px-2.5 py-1 rounded-full">
                  RGMCET Builders
                </div>
              </div>
            </div>

            {/* Card 2 — Squad Finder */}
            <div className="cofounder-card p-6 border border-[#202020]/15 flex flex-col justify-between min-h-[380px] bg-[#fbfbf8]">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase text-[#666660]">SQUAD FINDER</span>
                  <Users className="w-4 h-4 text-[#1890f0]" />
                </div>

                <h3 className="font-sans text-xl font-normal text-[#171717] leading-snug">
                  Form high-performance hackathon teams
                </h3>
                <p className="text-xs text-[#666660] leading-relaxed">
                  Connect frontend developers, AI/ML engineers, and UI designers across CSE and ECE branches.
                </p>

                <div className="pt-1">
                  <Link to="/auth" className="bg-[#f5f5f2] border border-[#202020]/20 text-[#171717] rounded-[6px] px-3.5 py-1.5 text-xs font-medium hover:bg-[#171717]/[0.05] inline-block">
                    Find your squad
                  </Link>
                </div>
              </div>

              {/* 3 Sub-Module Chips */}
              <div className="grid grid-cols-3 gap-2 mt-6 pt-4 border-t border-[#202020]/10 text-center">
                <div className="p-2 rounded-[6px] bg-[#f5f5f2] border border-[#202020]/10">
                  <div className="text-[11px] font-medium text-[#171717]">Squads</div>
                  <div className="text-[9px] text-[#666660]">Matching</div>
                </div>
                <div className="p-2 rounded-[6px] bg-[#f5f5f2] border border-[#202020]/10">
                  <div className="text-[11px] font-medium text-[#171717]">Saturday XP</div>
                  <div className="text-[9px] text-[#666660]">Leaderboard</div>
                </div>
                <div className="p-2 rounded-[6px] bg-[#f5f5f2] border border-[#202020]/10">
                  <div className="text-[11px] font-medium text-[#171717]">Vault</div>
                  <div className="text-[9px] text-[#666660]">Verified Creds</div>
                </div>
              </div>
            </div>

            {/* Card 3 — Verified Credentials */}
            <div className="cofounder-card p-6 border border-[#202020]/15 flex items-center justify-between gap-4 min-h-[380px] bg-[#fbfbf8]">
              <div className="space-y-4 flex-1">
                <span className="text-xs font-mono uppercase text-[#1890f0] font-semibold">VERIFIED CREDENTIALS</span>
                <h3 className="font-sans text-xl font-normal text-[#171717] leading-snug">
                  Track rankings & claim verified badges
                </h3>
                <div className="space-y-1.5 text-xs text-[#666660]">
                  <p>Real-time Saturday XP leaderboard</p>
                  <p>Tamper-proof digital certificates</p>
                  <p>Academic year achievement history</p>
                </div>

                <div className="pt-2">
                  <Link to="/auth" className="bg-[#1890f0] text-white rounded-[6px] px-3.5 py-1.5 text-xs font-medium inline-block">
                    Sign In to Access
                  </Link>
                </div>
              </div>

              {/* Framed Pixel Art Sunflower Card Artwork */}
              <div className="w-32 sm:w-36 aspect-[3/4] rounded-[8px] overflow-hidden border border-[#202020]/20 shadow-md shrink-0">
                <img
                  src="/cofounder_sunflower_badge.jpg"
                  alt="Sunflower Badge Artwork"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ━━━ SECTION 6 — DEDICATED CLUB LEGACY SHOWCASE SECTION ━━━ */}
        <section id="legacy" className="p-3 sm:p-6 w-full max-w-[1440px] mx-auto scroll-mt-24">
          <ClubLegacyShowcase />
        </section>

        {/* ━━━ SECTION 7 — FINAL CTA ━━━ */}
        <section className="bg-[#1a6fd1] py-24 md:py-32 px-6 text-white text-center mt-12">
          <div className="max-w-[800px] mx-auto space-y-6">
            <h2 className="font-sans text-3xl sm:text-[40px] font-normal leading-[1.1] tracking-tight">
              Ready to build the future at RGMCET?
            </h2>
            <p className="text-[16px] text-white/90 max-w-[540px] mx-auto">
              Join hundreds of student builders discovering hackathons, forming squads, and building verified credentials.
            </p>
            <div className="pt-4">
              <Link
                to="/auth"
                className="inline-flex items-center justify-center bg-white text-[#171717] rounded-[6px] px-8 py-3.5 font-medium text-base hover:bg-white/90 transition-all shadow-md"
              >
                <span>Join Yuga Spark Portal</span>
                <ArrowRight className="w-4 h-4 ml-2 text-[#1890f0]" />
              </Link>
            </div>
            <p className="text-xs text-white/70 tracking-wide">
              Free for RGMCET students · Instant access with campus ID
            </p>
          </div>
        </section>
      </main>

      {/* ━━━ SECTION 8 — FOOTER ━━━ */}
      <footer className="bg-[#eaeae6] py-16 px-6 border-t border-[#202020]/10">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1890f0] inline-block" />
              <span className="font-sans text-lg font-medium text-[#171717]">Yuga Spark</span>
            </div>
            <p className="text-xs text-[#666660] leading-relaxed">
              Official Hackathon & Innovation Operating Portal at RGMCET Autonomous College.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs uppercase tracking-wider font-semibold text-[#171717]">Navigation</h4>
            <ul className="space-y-2 text-xs text-[#666660]">
              <li><a href="#hero" className="hover:text-[#171717]">Start</a></li>
              <li><a href="#capabilities" className="hover:text-[#171717]">Capabilities</a></li>
              <li><a href="#legacy" className="hover:text-[#171717]">Legacy Showcase</a></li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs uppercase tracking-wider font-semibold text-[#171717]">Portal Access</h4>
            <ul className="space-y-2 text-xs text-[#666660]">
              <li><Link to="/auth" className="hover:text-[#171717]">Student Sign In</Link></li>
              <li><Link to="/auth" className="hover:text-[#171717]">Admin Portal</Link></li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs uppercase tracking-wider font-semibold text-[#171717]">Department</h4>
            <p className="text-xs text-[#666660] leading-relaxed">
              Dept of Computer Science & Engineering (Data Science), RGMCET Nandyal.
            </p>
          </div>
        </div>

        <div className="max-w-[1200px] mx-auto pt-8 border-t border-[#202020]/10 flex flex-wrap items-center justify-between text-xs text-[#666660] gap-4">
          <p>© {new Date().getFullYear()} Yuga Spark · RGMCET Hackathon Club · All rights reserved.</p>
          <p>Developed by <strong className="text-[#171717]">Jaya Krushna</strong> and <strong className="text-[#171717]">Hemanth</strong></p>
        </div>
      </footer>
    </div>
  );
}
