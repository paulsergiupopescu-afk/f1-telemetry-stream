import { COMPOUND_LABEL, compoundVar } from "@/lib/f1/format";
import type { Corner, TyreState } from "@/lib/f1/types";
import { cn } from "@/lib/utils";

const ORDER: Corner[] = ["FL", "FR", "RL", "RR"];

function wearTone(w: number) {
  if (w > 80) return "text-danger";
  if (w > 60) return "text-warn";
  return "text-go";
}

function tempTone(t: number) {
  if (t > 118) return "text-danger";
  if (t > 108) return "text-warn";
  if (t < 82) return "text-info";
  return "text-go";
}

export function TyreCard({ tyres }: { tyres: TyreState }) {
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="grid h-7 w-7 place-items-center rounded-full border-2 text-[11px] font-bold"
            style={{ borderColor: compoundVar(tyres.compound), color: compoundVar(tyres.compound) }}
          >
            {COMPOUND_LABEL[tyres.compound][0]}
          </span>
          <span className="font-display text-sm tracking-widest uppercase">
            {COMPOUND_LABEL[tyres.compound]}
          </span>
        </div>
        <span className="num text-xs text-muted-foreground">AGE {tyres.age}L</span>
      </div>

      <div className="grid flex-1 grid-cols-2 gap-2">
        {ORDER.map((c) => {
          const wear = tyres.wear[c];
          const temp = tyres.temp[c];
          return (
            <div
              key={c}
              className="relative flex flex-col justify-between overflow-hidden rounded-md border border-border bg-surface-2/70 p-2"
            >
              <div
                className="absolute inset-x-0 bottom-0 transition-[height] duration-300"
                style={{
                  height: `${Math.min(100, wear)}%`,
                  background: `linear-gradient(180deg, transparent, ${wear > 80 ? "var(--danger)" : wear > 60 ? "var(--warn)" : "var(--go)"})`,
                  opacity: 0.16,
                }}
              />
              <div className="relative flex items-center justify-between">
                <span className="label-xs">{c}</span>
                <span className={cn("num text-[11px]", tempTone(temp))}>{temp.toFixed(0)}°</span>
              </div>
              <span className={cn("num relative text-xl font-semibold", wearTone(wear))}>
                {wear.toFixed(0)}
                <span className="text-[11px] text-muted-foreground">%</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
