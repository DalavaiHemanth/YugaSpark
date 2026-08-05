export function SparkMark({ className = "", compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-2.5 ${className}`}>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary font-display text-sm font-bold text-primary-foreground">
        Y
      </span>
      {!compact ? (
        <span className="min-w-0 leading-none">
          <span className="block truncate font-display text-base font-bold tracking-tight">Yuga Spark</span>
          <span className="label-mono mt-1 block text-[9px] text-muted-foreground">Hackathon Club</span>
        </span>
      ) : null}
    </span>
  );
}
