import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { BookOpen, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, PageHeader, EmptyState } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const TITLE = "Playbook — Yuga Spark";
const DESCRIPTION = "Curated hackathon resources, templates and guides from the Yuga Spark admins.";

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

function PlaybookPage() {
  const resources = useQuery({
    queryKey: ["resources"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resources")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const list = resources.data ?? [];
  const categories = Array.from(new Set(list.map((r) => r.category)));

  return (
    <AppShell>
      <PageHeader
        eyebrow="Playbook"
        title="Resources that win hackathons"
        description="Starter kits, slide templates, API lists and past winning decks — collected by the club."
      />
      {list.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={BookOpen}
            title="The playbook is still being written"
            description="Admins curate starter kits, slide decks and API lists here. Nothing published yet."
            steps={[
              "Check the notice board for the resources admins share in the meantime.",
              "Have a link worth sharing? Message an admin and it can be added here.",
              "Meanwhile, browse upcoming hackathons and pick one to prepare for.",
            ]}
            action={
              <Button asChild size="sm">
                <Link to="/chat">Suggest a resource</Link>
              </Button>
            }
            secondaryAction={
              <Button asChild size="sm" variant="outline">
                <Link to="/notices">Open notice board</Link>
              </Button>
            }
          />
        </div>
      ) : (
        categories.map((cat) => (
          <section key={cat} className="mt-10">
            <h2 className="label-mono text-muted-foreground">{cat}</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {list
                .filter((r) => r.category === cat)
                .map((r) => (
                  <a
                    key={r.id}
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="surface lift group flex flex-col p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-display text-base font-bold">{r.title}</h3>
                      <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                    </div>
                    {r.description ? (
                      <p className="mt-2 text-sm text-muted-foreground">{r.description}</p>
                    ) : null}
                    <Badge variant="secondary" className="mt-4 self-start">
                      {r.category}
                    </Badge>
                  </a>
                ))}
            </div>
          </section>
        ))
      )}
    </AppShell>
  );
}
