import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/f1/engineer";

export const toneText: Record<Tone, string> = {
  go: "text-go",
  warn: "text-warn",
  danger: "text-danger",
  info: "text-info",
  neutral: "text-foreground",
};

export const toneBg: Record<Tone, string> = {
  go: "bg-go/12 border-go/35",
  warn: "bg-warn/12 border-warn/35",
  danger: "bg-danger/14 border-danger/45",
  info: "bg-info/12 border-info/35",
  neutral: "bg-surface-2 border-border",
};

export function Panel({
  title,
  right,
  children,
  className,
  accent,
}: {
  title?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  accent?: Tone;
}) {
  return (
    <section className={cn("panel animate-rise flex min-h-0 flex-col", className)}>
      {title ? (
        <header className="flex items-center justify-between gap-2 border-b border-border/70 px-3 py-2">
          <div className="flex items-center gap-2">
            {accent ? (
              <span
                className={cn("h-3 w-[3px] rounded-full", {
                  "bg-go": accent === "go",
                  "bg-warn": accent === "warn",
                  "bg-danger": accent === "danger",
                  "bg-info": accent === "info",
                  "bg-muted-foreground": accent === "neutral",
                })}
              />
            ) : null}
            <h2 className="label-xs text-foreground/80">{title}</h2>
          </div>
          {right}
        </header>
      ) : null}
      <div className="min-h-0 flex-1 p-3">{children}</div>
    </section>
  );
}

export function Stat({
  label,
  value,
  sub,
  tone = "neutral",
  size = "md",
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: Tone;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="label-xs">{label}</span>
      <span
        className={cn(
          "num font-semibold leading-none",
          toneText[tone],
          size === "lg" ? "text-2xl" : size === "sm" ? "text-sm" : "text-lg",
        )}
      >
        {value}
      </span>
      {sub ? <span className="num text-[11px] text-muted-foreground">{sub}</span> : null}
    </div>
  );
}

export function Bar({
  value,
  tone = "neutral",
  className,
}: {
  value: number;
  tone?: Tone;
  className?: string;
}) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-surface-2", className)}>
      <div
        className={cn("h-full rounded-full transition-[width] duration-150", {
          "bg-go": tone === "go",
          "bg-warn": tone === "warn",
          "bg-danger": tone === "danger",
          "bg-info": tone === "info",
          "bg-foreground/70": tone === "neutral",
        })}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}
