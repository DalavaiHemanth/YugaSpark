import { useEffect, useState } from "react";

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return {
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

export function Countdown({
  target,
  label,
  size = "sm",
  className = "",
}: {
  target: string | Date | null | undefined;
  label?: string;
  size?: "sm" | "lg";
  className?: string;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!target) return null;
  const end = new Date(target).getTime();
  if (Number.isNaN(end)) return null;

  const diff = end - now;
  const p = parts(diff);
  const done = diff <= 0;

  return (
    <div className={className}>
      {label ? <p className="label-mono text-muted-foreground">{label}</p> : null}
      <p
        className={`font-mono font-semibold tabular-nums ${
          size === "lg" ? "text-3xl sm:text-4xl" : "text-base"
        } ${done ? "text-muted-foreground" : "text-primary"}`}
      >
        {done ? "closed" : `${p.d}d ${pad(p.h)}:${pad(p.m)}:${pad(p.s)}`}
      </p>
    </div>
  );
}
