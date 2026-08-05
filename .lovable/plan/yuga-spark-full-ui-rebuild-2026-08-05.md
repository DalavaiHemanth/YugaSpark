# Yuga Spark — Full UI Rebuild

A complete visual reset: crisp light "Cloud White" palette, Space Grotesk + DM Sans typography, and a real sidebar app shell replacing the current header-nav layout. Every page gets rebuilt on the new system — landing, auth, onboarding, all student pages, and the admin console.

## Design direction

- **Palette (Cloud White):** page `#fafbfc`, cards pure white, borders/dividers `#e8ecf1`, muted text `#94a3b8`, single accent blue `#3b82f6`. No warm ember/orange, no paper texture, no gradient blobs.
- **Type:** Space Grotesk for headings and numbers, DM Sans for body. Tight heading tracking, generous line-height in body.
- **Surfaces:** flat white cards, 1px hairline borders, 12px radius, one very soft shadow on hover only. Depth comes from spacing and hierarchy, not glass or gradients.
- **Rhythm:** consistent 8pt spacing scale, max content width, page header block (title + one-line description + primary action) on every page.

## Layout

Collapsible left sidebar (shadcn `Sidebar`, icon-collapse) for signed-in users:

```text
┌───────────┬──────────────────────────────┐
│ Yuga Spark│  ▸ trigger   page title   ⌄  │
│           ├──────────────────────────────┤
│ Dashboard │                              │
│ Hackathons│   page content (max-w,       │
│ Leaderboard│  cards, tables)             │
│ Squads    │                              │
│ Playbook  │                              │
│ Certificates                             │
│ Notices   │                              │
│ Chat      │                              │
│ ───────── │                              │
│ Console   │                              │
│ Profile   │                              │
│ [avatar]  │                              │
└───────────┴──────────────────────────────┘
```

- Grouped nav: **Club** (Dashboard, Hackathons, Leaderboard, Squads), **Resources** (Playbook, Certificates, Notices, Chat), **Admin** (Console — admins only), footer with avatar, name, badge link, sign out.
- Mobile: sidebar becomes an off-canvas sheet; trigger always visible in the top bar.
- Landing and auth stay full-width (no sidebar) with a slim marketing header.

## Page-by-page

- **Landing:** clean split hero (headline + CTA left, live club stats card right), three feature rows, footer. No blobs or gradient text.
- **Auth / Onboarding:** centered single card, stepped onboarding with a progress indicator, inline validation, photo/resume dropzones.
- **Dashboard:** four compact stat tiles, "Next hackathon" card with countdown, two-column split of upcoming events and recent notices, quick-action row.
- **Hackathons / Leaderboard / Squads / Playbook / Certificates / Notices:** consistent page header + filter bar + card grid or table. Leaderboard becomes a proper ranked table with a restrained top-three treatment. Every list gets a real empty state and skeleton loading.
- **Chat:** two-pane messaging layout, bubbles with high-contrast pairs, sticky composer.
- **Admin console:** left sub-nav (Members, Hackathons, Results, Resources, Notices, Inbox, Mail, Insights) instead of a long tab strip; dense data tables with search, filters, sticky headers, and row actions.

## Technical notes

- Rewrite tokens in `src/styles.css` (oklch, `@theme inline`): background, card, border, muted, primary blue, ring, plus sidebar tokens. Remove `paper-bg`, `surface-ink`, `surface-ember`, `ember-text`, `gradient-spark` utilities and their usages.
- Load Space Grotesk + DM Sans via `<link>` in `src/routes/__root.tsx`; map `--font-display` / `--font-sans` in `@theme`.
- New `src/components/AppSidebar.tsx` + rewritten `src/components/AppShell.tsx` using `SidebarProvider` / `SidebarInset`; use `w-[var(--sidebar-width)]` syntax.
- Shared primitives: `PageHeader`, `StatCard`, `EmptyState`, `SectionCard` in `src/components/layout/` so all pages stay consistent.
- No business logic, data model, or server function changes — presentation only.
