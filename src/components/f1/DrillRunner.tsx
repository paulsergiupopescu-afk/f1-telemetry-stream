import { useMemo, useState } from "react";
import { Check, ChevronRight, Circle, Flag, Play, RotateCcw, Square } from "lucide-react";

import { Bar, Panel } from "@/components/f1/Panel";
import { Button } from "@/components/ui/button";
import { DRILLS, getDrill, scoreDrill, type DrillId, type DrillResult } from "@/lib/f1/drills";
import type { DrivingHabits } from "@/lib/f1/coach";
import type { LapRecord } from "@/lib/f1/types";
import { cn } from "@/lib/utils";

interface Props {
  laps: LapRecord[];
  habits: DrivingHabits;
  bestMs: number;
  weakestSector: 1 | 2 | 3;
}

interface RunState {
  startIndex: number;
  referenceMs: number;
  finishedAt?: number;
}

export function DrillRunner({ laps, habits, bestMs, weakestSector }: Props) {
  const [drillId, setDrillId] = useState<DrillId>("reference");
  const [run, setRun] = useState<RunState | null>(null);
  const [step, setStep] = useState(0);
  const [done, setDone] = useState<Set<number>>(new Set());
  const [result, setResult] = useState<DrillResult | null>(null);

  const drill = getDrill(drillId);
  const runLaps = run ? laps.slice(run.startIndex) : [];
  const progress = run ? Math.min(1, runLaps.length / drill.laps) : 0;

  const liveResult = useMemo(
    () =>
      run
        ? scoreDrill(drill, {
            laps: runLaps,
            habits,
            referenceMs: run.referenceMs,
            weakestSector,
          })
        : null,
    [run, drill, runLaps, habits, weakestSector],
  );

  const start = () => {
    setRun({ startIndex: laps.length, referenceMs: bestMs });
    setStep(0);
    setDone(new Set());
    setResult(null);
  };

  const finish = () => {
    if (!run) return;
    setResult(
      scoreDrill(drill, { laps: runLaps, habits, referenceMs: run.referenceMs, weakestSector }),
    );
    setRun(null);
  };

  const reset = () => {
    setRun(null);
    setResult(null);
    setStep(0);
    setDone(new Set());
  };

  const toggleStep = (i: number) =>
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  const shown = result ?? liveResult;

  return (
    <Panel
      title="Practice drills"
      accent="info"
      right={
        run ? (
          <span className="num text-xs text-go">
            {runLaps.length}/{drill.laps} laps
          </span>
        ) : (
          <span className="label-xs">{DRILLS.length} exercises</span>
        )
      }
    >
      {/* Drill picker */}
      <div className="flex flex-wrap gap-1.5">
        {DRILLS.map((d) => (
          <button
            key={d.id}
            disabled={Boolean(run)}
            onClick={() => {
              setDrillId(d.id);
              reset();
            }}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors disabled:opacity-40",
              drillId === d.id
                ? "border-foreground/40 bg-surface-2 text-foreground"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {d.name}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="font-display text-[0.95rem] font-semibold">{drill.name}</div>
          <div className="num text-[11px] text-muted-foreground">
            {drill.goal} · {drill.skill} · {drill.laps} laps
          </div>
        </div>
        <div className="flex gap-1.5">
          {run ? (
            <>
              <Button size="sm" variant="outline" onClick={finish}>
                <Square className="mr-1 h-3.5 w-3.5" /> Finish & score
              </Button>
              <Button size="sm" variant="ghost" onClick={reset}>
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={start}>
              <Play className="mr-1 h-3.5 w-3.5" /> {result ? "Run again" : "Start drill"}
            </Button>
          )}
        </div>
      </div>

      <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{drill.detail}</p>

      {run && (
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="label-xs">Drill progress</span>
            <span className="num text-xs">{Math.round(progress * 100)}%</span>
          </div>
          <Bar value={progress * 100} tone={progress >= 1 ? "go" : "info"} />
        </div>
      )}

      {/* Steps */}
      <ol className="mt-4 space-y-1.5">
        {drill.steps.map((s, i) => {
          const complete = done.has(i);
          const active = i === step && !complete;
          return (
            <li key={s.title}>
              <button
                onClick={() => {
                  setStep(i);
                  toggleStep(i);
                }}
                className={cn(
                  "flex w-full gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors",
                  complete
                    ? "border-go/35 bg-go/5"
                    : active
                      ? "border-foreground/25 bg-surface-2"
                      : "border-border hover:bg-surface-2/60",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border",
                    complete ? "border-go text-go" : "border-muted-foreground text-muted-foreground",
                  )}
                >
                  {complete ? <Check className="h-3 w-3" /> : <Circle className="h-1.5 w-1.5 fill-current" />}
                </span>
                <span className="min-w-0">
                  <span
                    className={cn(
                      "block text-[13px] font-medium",
                      complete && "text-muted-foreground line-through",
                    )}
                  >
                    {i + 1}. {s.title}
                  </span>
                  <span className="block text-[12px] leading-relaxed text-muted-foreground">
                    {s.detail}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {/* Scorecard */}
      {shown && (
        <div className="mt-4 rounded-xl border border-border bg-surface-2/50 p-3">
          <div className="flex items-center justify-between">
            <span className="label-xs">{result ? "Drill result" : "Live score"}</span>
            <span className="flex items-baseline gap-2">
              <span
                className={cn(
                  "num text-2xl font-semibold",
                  shown.score >= 78 ? "text-go" : shown.score >= 55 ? "text-warn" : "text-danger",
                )}
              >
                {shown.score}
              </span>
              <span className="num text-xs text-muted-foreground">/100 · {shown.grade}</span>
            </span>
          </div>

          <div className="mt-3 space-y-2">
            {shown.criteria.map((c) => (
              <div key={c.id}>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="flex items-center gap-1.5">
                    {c.passed ? (
                      <Check className="h-3 w-3 text-go" />
                    ) : (
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    )}
                    {c.label}
                  </span>
                  <span className="num text-muted-foreground">
                    {c.actual} · target {c.target}
                  </span>
                </div>
                <div className="mt-1">
                  <Bar value={c.score * 100} tone={c.passed ? "go" : c.score > 0.5 ? "warn" : "danger"} />
                </div>
              </div>
            ))}
          </div>

          {result && (
            <p className="mt-3 flex gap-2 text-[13px] text-foreground/85">
              <Flag className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              {result.verdict}
            </p>
          )}
        </div>
      )}
    </Panel>
  );
}
