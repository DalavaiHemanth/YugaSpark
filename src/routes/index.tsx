import { createFileRoute, Link } from "@tanstack/react-router";
import { Footer } from "@/components/Footer";
import { SparkMark } from "@/components/SparkMark";
import { Button } from "@/components/ui/button";
import { Trophy, Users, BookOpen, Award, Megaphone, QrCode, ArrowRight } from "lucide-react";

const TITLE = "Yuga Spark — Hackathon Club at RGMCET";
const DESCRIPTION =
  "The home of Yuga Spark: upcoming hackathons, member badges, squads and the club leaderboard for RGMCET builders.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const FEATURES = [
  { icon: Trophy, title: "Leaderboard", copy: "Club-wide and per-hackathon rankings, updated after every event." },
  { icon: Users, title: "Squad finder", copy: "Form teams inside the size limits admins set for each hackathon." },
  { icon: BookOpen, title: "Playbook", copy: "Starter kits, APIs and winning decks curated by the club leads." },
  { icon: Award, title: "Certificates", copy: "Participation and winner certificates, downloadable any time." },
  { icon: Megaphone, title: "Notice board", copy: "Outside hackathons, announcements, links and quick polls." },
  { icon: QrCode, title: "Member badge", copy: "A QR club badge generated the moment your profile is complete." },
];

function Index() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <SparkMark />
          <Button asChild size="sm">
            <Link to="/auth">Enter the club</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 pt-16 pb-16 sm:px-6 sm:pt-24">
          <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="rise min-w-0">
              <span className="chip">RGMCET · Hackathon Club</span>
              <h1 className="mt-5 font-display text-[2.5rem] font-bold leading-[1.05] tracking-tight sm:text-6xl">
                Build all night.
                <br />
                <span className="text-primary">Ship before dawn.</span>
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
                Yuga Spark is where campus builders find hackathons, form squads, collect
                certificates and climb the leaderboard — all from one club account.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link to="/auth">
                    Sign in / Join <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/auth">I&apos;m an admin</Link>
                </Button>
              </div>
            </div>

            <div className="surface rise p-6 sm:p-7">
              <p className="label-mono text-muted-foreground">Member badge preview</p>
              <div className="mt-4 rounded-xl border border-border bg-secondary/60 p-6">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary font-display font-bold text-primary-foreground">
                    Y
                  </span>
                  <span className="leading-tight">
                    <span className="block font-display text-sm font-bold">Yuga Spark</span>
                    <span className="label-mono block text-[9px] text-muted-foreground">Hackathon club</span>
                  </span>
                </div>
                <p className="mt-7 font-display text-2xl font-bold">Your name here</p>
                <p className="label-mono mt-1 text-muted-foreground">Yuga Spark member</p>
                <div className="mt-6 flex items-end justify-between gap-4">
                  <div className="grid h-24 w-24 place-items-center rounded-lg border border-border bg-card font-mono text-[10px] text-muted-foreground">
                    QR
                  </div>
                  <p className="text-right text-[11px] leading-relaxed text-muted-foreground">
                    Auto-generated
                    <br />
                    on profile completion
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-card/60">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                Everything the club runs on
              </h2>
              <p className="label-mono text-muted-foreground">One account · six tools</p>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <article key={f.title} className="surface lift p-5">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                    <f.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 font-display text-base font-bold">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="surface-ember flex flex-wrap items-center justify-between gap-6 p-8">
            <div className="min-w-0">
              <h2 className="font-display text-xl font-bold sm:text-2xl">Ready for the next build night?</h2>
              <p className="mt-2 max-w-xl text-sm opacity-90">
                Create your profile, get your QR badge and register for the next hackathon in under two minutes.
              </p>
            </div>
            <Button asChild size="lg" variant="secondary">
              <Link to="/auth">Join Yuga Spark</Link>
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
