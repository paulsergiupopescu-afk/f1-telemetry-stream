import { fmtDelta } from "@/lib/f1/format";
import { cn } from "@/lib/utils";

export function DeltaStrip({
  deltaMs,
  microSectors,
  currentSegment,
}: {
  deltaMs: number;
  microSectors: number[];
  currentSegment: number;
}) {
  const tone = deltaMs < -20 ? "text-go" : deltaMs > 20 ? "text-danger" : "text-foreground";
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-end justify-between">
        <div>
          <span className="label-xs">Delta to reference</span>
          <div className={cn("num text-4xl leading-none font-bold", tone)}>{fmtDelta(deltaMs)}</div>
        </div>
        <div className="text-right">
          <span className="label-xs">Segment</span>
          <div className="num text-lg">{currentSegment + 1}/20</div>
        </div>
      </div>

      <div className="relative h-2 overflow-hidden rounded-full bg-surface-2">
        <div
          className={cn("absolute inset-y-0 rounded-full transition-all duration-200", deltaMs < 0 ? "bg-go" : "bg-danger")}
          style={{
            left: deltaMs < 0 ? `${50 - Math.min(50, Math.abs(deltaMs) / 20)}%` : "50%",
            width: `${Math.min(50, Math.abs(deltaMs) / 20)}%`,
          }}
        />
        <div className="absolute inset-y-0 left-1/2 w-px bg-foreground/40" />
      </div>

      <div className="grid flex-1 grid-cols-20 gap-[3px]">
        {microSectors.map((m, i) => {
          const active = i === currentSegment;
          const tint = m < -12 ? "bg-go" : m > 12 ? "bg-danger" : "bg-muted-foreground/45";
          return (
            <div
              key={i}
              className={cn(
                "relative min-h-6 rounded-[2px] transition-all",
                tint,
                active ? "ring-2 ring-foreground/70" : "opacity-80",
              )}
              style={{ opacity: Math.min(1, 0.35 + Math.abs(m) / 60) }}
              title={`Segment ${i + 1}: ${fmtDelta(m)}`}
            />
          );
        })}
      </div>
    </div>
  );
}
