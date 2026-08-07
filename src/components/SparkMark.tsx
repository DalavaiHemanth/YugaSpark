export function SparkMark({ className = "", compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-2.5 ${className}`}>
      <img
        src="/yugaspark_logo.png"
        alt="Yuga Spark Logo"
        className="h-8 w-8 shrink-0 rounded-full object-cover border border-primary/20 shadow-sm"
      />
      {!compact ? (
        <span className="min-w-0 leading-none">
          <span className="block truncate font-display text-base font-bold tracking-tight">Yuga Spark</span>
          <span className="label-mono mt-0.5 block text-[9px] text-muted-foreground">Hackathon Club</span>
        </span>
      ) : null}
    </span>
  );
}
