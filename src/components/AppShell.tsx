import type { ReactNode } from "react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { SparkMark } from "@/components/SparkMark";
import { Footer } from "@/components/Footer";

export { SparkMark };

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-end gap-4 border-b border-border pb-6 sm:flex sm:flex-wrap sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? <span className="chip">{eyebrow}</span> : null}
        <h1 className="mt-3 font-display text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="surface p-4 sm:p-5">
      <p className="label-mono text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-2xl font-bold tabular-nums sm:text-3xl">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function SectionCard({
  title,
  action,
  children,
  className = "",
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`surface overflow-hidden ${className}`}>
      {title ? (
        <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
          <h2 className="font-display text-sm font-bold">{title}</h2>
          {action}
        </header>
      ) : null}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  steps,
  action,
  secondaryAction,
  tone = "default",
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  steps?: string[];
  action?: ReactNode;
  secondaryAction?: ReactNode;
  tone?: "default" | "quiet";
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-dashed border-border px-6 py-12 text-center sm:py-14 ${
        tone === "quiet" ? "bg-secondary/30" : "bg-card"
      }`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.55] [background-image:radial-gradient(var(--color-border)_1px,transparent_1px)] [background-size:18px_18px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_72%)]"
      />
      <div className="relative mx-auto grid max-w-md place-items-center">
        <EmptyIllustration icon={Icon} />
        <p className="mt-6 font-display text-lg font-bold tracking-tight">{title}</p>
        {description ? (
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
        {steps && steps.length > 0 ? (
          <ol className="mt-6 w-full space-y-2.5 text-left">
            {steps.map((step, i) => (
              <li
                key={step}
                className="flex items-start gap-3 rounded-lg border border-border bg-background/70 px-3.5 py-2.5"
              >
                <span className="mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/10 font-mono text-[11px] font-semibold text-primary">
                  {i + 1}
                </span>
                <span className="min-w-0 text-sm text-muted-foreground">{step}</span>
              </li>
            ))}
          </ol>
        ) : null}
        {action || secondaryAction ? (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {action}
            {secondaryAction}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function EmptyIllustration({
  icon: Icon,
}: {
  icon?: React.ComponentType<{ className?: string }> | undefined;
}) {
  return (
    <div className="relative grid h-24 w-32 place-items-center">
      <span className="absolute left-1 top-3 h-14 w-20 -rotate-6 rounded-xl border border-border bg-background shadow-sm" />
      <span className="absolute right-1 top-1 h-14 w-20 rotate-6 rounded-xl border border-border bg-background shadow-sm" />
      <span className="absolute h-16 w-24 rounded-xl border border-border bg-card shadow-md" />
      <span className="relative grid h-11 w-11 place-items-center rounded-full bg-primary/10 text-primary ring-8 ring-card">
        {Icon ? <Icon className="h-5 w-5" /> : <span className="h-2 w-2 rounded-full bg-primary" />}
      </span>
    </div>
  );
}

export function AppShell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <SidebarInset className="flex min-w-0 flex-1 flex-col bg-background">
          <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md">
            <SidebarTrigger className="-ml-1" />
            <div className="md:hidden">
              <SparkMark />
            </div>
          </header>
          <main
            className={`mx-auto w-full flex-1 px-4 py-8 sm:px-6 sm:py-10 ${wide ? "max-w-[1400px]" : "max-w-6xl"}`}
          >
            <div className="rise">{children}</div>
          </main>
          <Footer />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
