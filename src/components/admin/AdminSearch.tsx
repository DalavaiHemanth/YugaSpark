import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Users, CalendarDays, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export type SearchHit =
  | { kind: "student"; id: string; title: string; subtitle: string }
  | { kind: "hackathon"; id: string; title: string; subtitle: string };

export function AdminSearch({ onPick }: { onPick: (hit: SearchHit, query: string) => void }) {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim().slice(0, 80)), 220);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const results = useQuery({
    queryKey: ["admin-search", debounced],
    enabled: debounced.length >= 2,
    queryFn: async (): Promise<SearchHit[]> => {
      const term = debounced.replace(/[%,]/g, " ");
      const [people, events] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, email, registration_number, year")
          .or(
            `full_name.ilike.%${term}%,email.ilike.%${term}%,registration_number.ilike.%${term}%`,
          )
          .limit(6),
        supabase
          .from("hackathons")
          .select("id, title, venue, event_date")
          .or(`title.ilike.%${term}%,venue.ilike.%${term}%`)
          .limit(6),
      ]);
      const hits: SearchHit[] = [];
      for (const p of people.data ?? []) {
        hits.push({
          kind: "student",
          id: p.id,
          title: p.full_name || p.email,
          subtitle: [p.registration_number, p.year, p.email].filter(Boolean).join(" · "),
        });
      }
      for (const h of events.data ?? []) {
        hits.push({
          kind: "hackathon",
          id: h.id,
          title: h.title,
          subtitle: [h.event_date, h.venue].filter(Boolean).join(" · "),
        });
      }
      return hits;
    },
  });

  const hits = results.data ?? [];
  const showPanel = open && debounced.length >= 2;

  return (
    <div ref={boxRef} className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search students or hackathons…"
        aria-label="Search students and hackathons"
        className="pl-9 pr-9"
      />
      {q ? (
        <button
          type="button"
          onClick={() => {
            setQ("");
            setOpen(false);
          }}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}

      {showPanel ? (
        <div className="absolute z-40 mt-2 w-full overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          {results.isLoading ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">Searching…</p>
          ) : hits.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">
              Nothing matches “{debounced}”. Try a name, registration number or email.
            </p>
          ) : (
            <ul className="max-h-80 divide-y divide-border overflow-y-auto">
              {hits.map((hit) => {
                const Icon = hit.kind === "student" ? Users : CalendarDays;
                return (
                  <li key={`${hit.kind}-${hit.id}`}>
                    <button
                      type="button"
                      onClick={() => {
                        onPick(hit, debounced);
                        setOpen(false);
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-secondary"
                    >
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{hit.title}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {hit.subtitle || "—"}
                        </span>
                      </span>
                      <Badge variant="secondary" className="shrink-0 text-[10px]">
                        {hit.kind}
                      </Badge>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
