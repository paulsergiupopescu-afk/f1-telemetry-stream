import { Flag, Pause, Play, RotateCcw, Save, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useTelemetry } from "@/lib/f1/store";
import { COMPOUND_LABEL, compoundVar } from "@/lib/f1/format";
import type { Compound } from "@/lib/f1/types";

const DRY: Compound[] = ["soft", "medium", "hard"];

export function SimControls() {
  const { running, setRunning, speed, setSpeed, restart, options, doPit, forcePhase, save, state } =
    useTelemetry();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="secondary" onClick={() => setRunning(!running)}>
        {running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        {running ? "Pause" : "Resume"}
      </Button>

      <div className="flex overflow-hidden rounded-md border border-border">
        {[1, 6, 20].map((s) => (
          <button
            key={s}
            onClick={() => setSpeed(s)}
            className={`num px-2 py-1 text-xs ${speed === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-surface-2"}`}
          >
            {s}x
          </button>
        ))}
      </div>

      <div className="flex overflow-hidden rounded-md border border-border">
        {DRY.map((c) => (
          <button
            key={c}
            onClick={() => {
              doPit(c);
              toast.success(`Box this lap — ${COMPOUND_LABEL[c]}`);
            }}
            className="px-2 py-1 font-display text-xs tracking-wider uppercase hover:bg-surface-2"
            style={{ color: compoundVar(c) }}
          >
            Pit {COMPOUND_LABEL[c][0]}
          </button>
        ))}
      </div>

      <Button
        size="sm"
        variant="outline"
        onClick={() => forcePhase(state.phase === "GREEN" ? "SAFETY_CAR" : "GREEN")}
      >
        {state.phase === "GREEN" ? <ShieldAlert className="h-3.5 w-3.5" /> : <Flag className="h-3.5 w-3.5" />}
        {state.phase === "GREEN" ? "Deploy SC" : "Green flag"}
      </Button>

      <Button size="sm" variant="outline" onClick={() => restart(options)}>
        <RotateCcw className="h-3.5 w-3.5" /> Restart
      </Button>

      <Button
        size="sm"
        onClick={() => {
          const s = save();
          toast[s ? "success" : "error"](
            s ? "Session saved to your report archive" : "Not enough laps to save yet",
          );
        }}
      >
        <Save className="h-3.5 w-3.5" /> Save session
      </Button>
    </div>
  );
}
