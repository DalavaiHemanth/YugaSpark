import { createFileRoute, Link } from "@tanstack/react-router";
import { Footer } from "@/components/Footer";
import { SparkMark } from "@/components/SparkMark";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Trophy,
  Users,
  BookOpen,
  Award,
  Megaphone,
  QrCode,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Building2,
  CalendarDays,
  Lock,
} from "lucide-react";

const TITLE = "Yuga Spark — Official Hackathon Club Portal | RGMCET";
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
      { property: "og:type", content: "website" },
    ],
  }),
  component: Index,
});

const FEATURES = [
  {
    icon: Trophy,
    title: "Leaderboard & Points",
    copy: "Track real-time student rankings and points earned across Saturday sessions & campus hackathons.",
  },
  {
    icon: Users,
    title: "Squad Finder",
    copy: "Form balanced teams, match skill sets, and join hackathon squads instantly.",
  },
  {
    icon: BookOpen,
    title: "Resource Playbook",
    copy: "Access 24-hour master roadmaps, code snippets, starter kits, and student submission queues.",
  },
  {
    icon: Award,
    title: "Official Certificates",
    copy: "Download official RGMCET verified certificates with digital signatures and QR stamps.",
  },
  {
    icon: Megaphone,
    title: "Notice Board & Polls",
    copy: "Stay updated with college announcements, external hackathons, links, and student Q&A threads.",
  },
  {
    icon: QrCode,
    title: "Member QR Badge",
    copy: "Instant digital member badge for fast 1-tap Saturday session & hackathon attendance scan.",
  },
];

function Index() {
  return (
    <div className="flex min-h-screen flex-col bg-background selection:bg-primary/20">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <img src="/rgmcet_logo.png" alt="RGMCET Logo" className="h-9 w-9 rounded-full object-cover border border-border" />
            <SparkMark />
          </div>
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="outline" className="text-xs font-semibold gap-1.5">
              <Link to="/auth">
                <Lock className="h-3.5 w-3.5 text-primary" /> Admin Portal
              </Link>
            </Button>
            <Button asChild size="sm" className="text-xs font-semibold gap-1.5">
              <Link to="/auth">
                Student Sign In <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Clean Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background py-16 sm:py-24">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
              <Building2 className="h-3.5 w-3.5" /> RGMCET Autonomous · Department of CSE
            </div>

            <h1 className="mt-6 font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl leading-tight">
              Yuga Spark Hackathon Club
            </h1>

            <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              The official campus innovation portal for RGMCET builders. Discover hackathons, build squads, track Saturday attendance, and collect verified certificates.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="font-semibold gap-2 shadow-lg shadow-primary/20">
                <Link to="/auth">
                  Get Started / Student Login <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="font-semibold gap-2">
                <Link to="/auth">
                  Admin Console
                </Link>
              </Button>
            </div>

            {/* Quick Badges */}
            <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-border pt-8 text-left">
              <div className="space-y-1">
                <p className="font-display text-xl sm:text-2xl font-bold text-primary">RGMCET</p>
                <p className="text-xs text-muted-foreground font-medium">NAAC A+ Autonomous</p>
              </div>
              <div className="space-y-1">
                <p className="font-display text-xl sm:text-2xl font-bold text-foreground">1-Tap Scan</p>
                <p className="text-xs text-muted-foreground font-medium">QR Attendance</p>
              </div>
              <div className="space-y-1">
                <p className="font-display text-xl sm:text-2xl font-bold text-foreground">Verified</p>
                <p className="text-xs text-muted-foreground font-medium">Digital Certificates</p>
              </div>
              <div className="space-y-1">
                <p className="font-display text-xl sm:text-2xl font-bold text-foreground">Live</p>
                <p className="text-xs text-muted-foreground font-medium">Club Leaderboard</p>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="border-t border-border bg-card/40 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="text-center max-w-xl mx-auto space-y-2">
              <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                Everything Campus Builders Need
              </h2>
              <p className="text-sm text-muted-foreground">
                All club activities, resources, and attendance tracking managed in one clean portal.
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="surface lift rounded-2xl p-6 border border-border space-y-3 transition-all hover:border-primary/40"
                >
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-display text-base font-bold text-foreground">{f.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{f.copy}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="surface flex flex-wrap items-center justify-between gap-6 p-8 rounded-3xl border border-primary/30 bg-primary/5">
            <div className="space-y-1 min-w-0">
              <h2 className="font-display text-xl font-bold text-foreground sm:text-2xl">
                Ready for the Next Campus Hackathon?
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Sign in with your RGMCET student account to access your digital badge, squad finder, and certificates.
              </p>
            </div>
            <Button asChild size="lg" className="font-semibold gap-2">
              <Link to="/auth">
                Enter Portal <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
