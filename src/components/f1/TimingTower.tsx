import { COMPOUND_SHORT, compoundVar, fmtLap } from "@/lib/f1/format";
import type { FieldEntry } from "@/lib/f1/types";
import { cn } from "@/lib/utils";

export function TimingTower({
  field,
  position,
  compact = false,
}: {
  field: FieldEntry[];
  position: number;
  compact?: boolean;
}) {
  const window = compact
    ? field.filter((f) => Math.abs(f.position - position) <= 3)
    : field;

  return (
    <div className="flex h-full min-h-0 flex-col gap-[2px] overflow-y-auto pr-1">
      {window.map((f) => (
        <div
          key={f.position}
          className={cn(
            "grid grid-cols-[1.6rem_0.2rem_1fr_auto_auto] items-center gap-2 rounded-sm px-1.5 py-1 text-sm",
            f.isPlayer ? "bg-primary/15 ring-1 ring-primary/40" : "hover:bg-surface-2/70",
          )}
        >
          <span className="num text-xs text-muted-foreground">P{f.position}</span>
          <span className="h-4 w-[3px] rounded-full" style={{ background: f.teamColor }} />
          <span className="truncate font-display text-sm tracking-wide uppercase">
            {f.code} <span className="text-muted-foreground">{compact ? "" : f.team}</span>
          </span>
          <span
            className="num text-[11px] font-bold"
            style={{ color: compoundVar(f.compound) }}
            title={`${f.compound} · ${f.tyreAge} laps`}
          >
            {COMPOUND_SHORT[f.compound]}
            {f.tyreAge}
          </span>
          <span className="num text-xs text-muted-foreground">
            {f.isPlayer ? "—" : fmtLap(f.lastLapMs).slice(0, 8)}
          </span>
        </div>
      ))}
    </div>
  );
}
