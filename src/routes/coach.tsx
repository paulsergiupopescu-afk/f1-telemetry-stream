import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Gauge, Pause, Play, RotateCcw, Target, Timer, TrendingDown, TrendingUp } from "lucide-react";

import { Bar, Panel, Stat, toneText } from "@/components/f1/Panel";
import { Button } from "@/components/ui/button";
import { PaceChart } from "@/components/f1/PaceChart";
import { analyseCoach, segmentLabel, type DrivingHabits } from "@/lib/f1/coach";
import { DrillRunner } from "@/components/f1/DrillRunner";
import { fmtDelta, fmtLap, fmtSector } from "@/lib/f1/format";
import { useTelemetry } from "@/lib/f1/store";
import { getTrack, TRACKS } from "@/lib/f1/tracks";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/coach")({
  head: () => ({
    meta: [
      { title: "Coach Mode — Time Trial Lap Analysis" },
      {
        name: "description",
        content:
          "Time-trial coach mode: sector-by-sector loss, micro-sector heat map, pedal habits and drills that turn practice laps into real lap time.",
      },
      { property: "og:title", content: "Coach Mode — Time Trial Lap Analysis" },
      {
        property: "og:description",
        content: "Turn practice laps into lap time with sector losses, pedal analysis and targeted drills.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Coach,
});

function useHabits(): DrivingHabits {
  const { state } = useTelemetry();
  const acc = useRef({ n: 0, coast: 0, full: 0, brakeSamples: 0, brakeSum: 0, overlap: 0 });
  const [habits, setHabits] = useState<DrivingHabits>({
    coastPct: 0,
    fullThrottlePct: 0,
    overlapPct: 0,
    brakePeak: 0,
    samples: 0,
  });

  useEffect(() => {
    const a = acc.current;
    const thr = state.throttle / 100;
    const brk = state.brake / 100;
    a.n += 1;
    if (thr < 0.05 && brk < 0.05) a.coast += 1;
    if (thr > 0.97) a.full += 1;
    if (brk > 0.05) {
      a.brakeSamples += 1;
      a.brakeSum += brk;
      if (thr > 0.1) a.overlap += 1;
    }
    if (a.n % 15 === 0) {
      setHabits({
        coastPct: (a.coast / a.n) * 100,
        fullThrottlePct: (a.full / a.n) * 100,
        overlapPct: a.brakeSamples ? (a.overlap / a.brakeSamples) * 100 : 0,
        brakePeak: a.brakeSamples ? a.brakeSum / a.brakeSamples : 0,
        samples: a.n,
      });
    }
  }, [state.throttle, state.brake]);

  return habits;
}

function Coach() {
  const { state, restart, options, running, setRunning, speed, setSpeed } = useTelemetry();
  const habits = useHabits();
  const coach = useMemo(() => analyseCoach(state, habits), [state, habits]);
  const track = getTrack(state.trackId);

  const startTimeTrial = (trackId: string) =>
    restart({ ...options, trackId, sessionType: "time-trial", totalLaps: 0 });

  const inTimeTrial = state.sessionType === "time-trial";
  const segment = Math.min(19, Math.floor(state.lapDistancePct * 20));
  const worstDelta = Math.max(0.001, ...state.microSectors.map((m) => Math.abs(m)));
  const laps = state.laps.slice(-12).reverse();

  return (
    <div className="space-y-3">
      {/* Header */}
      <Panel className="carbon">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="label-xs">Coach mode · time trial</span>
            <h1 className="font-display text-3xl font-semibold tracking-[-0.02em]">
              {track.name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Every lap is measured against your own best. Focus:{" "}
              <span className="text-foreground">{coach.focus}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!inTimeTrial ? (
              <Button size="sm" onClick={() => startTimeTrial(state.trackId)}>
                <Timer className="h-3.5 w-3.5" /> Start time trial
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => startTimeTrial(state.trackId)}>
                <RotateCcw className="h-3.5 w-3.5" /> Reset session
              </Button>
            )}
            <Button size="sm" variant="secondary" onClick={() => setRunning(!running)}>
              {running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {running ? "Pause" : "Resume"}
            </Button>
            <div className="flex overflow-hidden rounded-xl border border-border">
              {[1, 6, 20].map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={cn(
                    "num px-2.5 py-1.5 text-xs",
                    speed === s
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-surface-2",
                  )}
                >
                  {s}x
                </button>
              ))}
            </div>
            <select
              value={state.trackId}
              onChange={(e) => startTimeTrial(e.target.value)}
              className="rounded-xl border border-border bg-surface px-3 py-1.5 text-sm"
            >
              {TRACKS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Panel>

      <div className="grid gap-3 xl:grid-cols-[1.35fr_1fr]">
        <div className="space-y-3">
          {/* Live lap */}
          <Panel title="Live lap" accent="info">
            <div className="flex flex-wrap items-end gap-8">
              <div>
                <span className="label-xs">Delta to best</span>
                <div
                  className={cn(
                    "num text-5xl leading-none font-semibold",
                    state.deltaMs < -20
                      ? "text-go"
                      : state.deltaMs > 20
                        ? "text-danger"
                        : "text-foreground",
                  )}
                >
                  {fmtDelta(state.deltaMs)}
                </div>
              </div>
              <Stat label="Current" value={fmtLap(state.currentLapMs)} size="lg" />
              <Stat label="Last" value={fmtLap(coach.lastMs)} size="lg" />
              <Stat label="Personal best" value={fmtLap(coach.bestMs)} size="lg" tone="info" />
              <Stat label="Theoretical" value={fmtLap(coach.theoreticalMs)} size="lg" tone="go" />
              <Stat
                label="Left on table"
                value={coach.onTableMs ? `${(coach.onTableMs / 1000).toFixed(3)}s` : "—"}
                size="lg"
                tone={coach.onTableMs > 300 ? "warn" : "neutral"}
              />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {[0, 1, 2].map((i) => {
                const cur = state.sectors[i] ?? 0;
                const best = state.bestSectors[i] ?? 0;
                const loss = coach.sectorLoss[i] ?? 0;
                return (
                  <div key={i} className="rounded-xl border border-border bg-surface-2/60 p-3">
                    <div className="flex items-center justify-between">
                      <span className="label-xs">Sector {i + 1}</span>
                      {coach.weakestSector === i + 1 && loss > 0 ? (
                        <span className="rounded-full bg-warn/15 px-2 py-0.5 text-[10px] font-medium text-warn">
                          Focus
                        </span>
                      ) : null}
                    </div>
                    <div className="num mt-1.5 text-xl font-semibold">{fmtSector(cur)}</div>
                    <div className="num text-[11px] text-muted-foreground">
                      best {fmtSector(best)} · lose {(loss / 1000).toFixed(3)}s
                    </div>
                    <Bar
                      className="mt-2"
                      value={Math.min(100, (loss / 600) * 100)}
                      tone={loss > 300 ? "danger" : loss > 100 ? "warn" : "go"}
                    />
                  </div>
                );
              })}
            </div>
          </Panel>

          {/* Micro-sector loss map */}
          <Panel
            title="Where the time goes"
            accent="warn"
            right={<span className="label-xs">20 micro-sectors</span>}
          >
            <div className="grid grid-cols-20 gap-[3px]">
              {state.microSectors.map((m, i) => {
                const gain = m < 0;
                const h = Math.min(100, (Math.abs(m) / worstDelta) * 100);
                return (
                  <div key={i} className="flex h-24 flex-col justify-end gap-1" title={segmentLabel(i, track.corners)}>
                    <div
                      className={cn(
                        "rounded-md transition-all duration-200",
                        gain ? "bg-go/80" : "bg-danger/80",
                        i === segment && "ring-2 ring-foreground/50",
                      )}
                      style={{ height: `${Math.max(4, h)}%` }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {coach.worstSegments.length ? (
                coach.worstSegments.map((s) => (
                  <div
                    key={s.index}
                    className="flex items-center justify-between rounded-xl border border-border bg-surface-2/60 px-3 py-2"
                  >
                    <div>
                      <div className="text-sm font-medium">{s.label}</div>
                      <div className="text-[11px] text-muted-foreground">Sector {s.sector}</div>
                    </div>
                    <span className="num text-sm text-danger">
                      +{(s.deltaMs / 1000).toFixed(3)}s
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No significant losses recorded yet — keep lapping to build the map.
                </p>
              )}
            </div>
          </Panel>

          <Panel title="Lap trace" accent="info">
            <div className="h-56">
              <PaceChart laps={state.laps} />
            </div>
          </Panel>
        </div>

        <div className="space-y-3">
          {/* Coach feedback */}
          <Panel title="Engineer feedback" accent="go">
            <div className="space-y-2">
              {coach.notes.map((n) => (
                <div
                  key={n.id}
                  className="rounded-xl border border-border bg-surface-2/50 p-3 animate-rise"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className={cn("text-sm font-semibold", toneText[n.tone])}>{n.title}</h3>
                    {n.gainMs ? (
                      <span className="num shrink-0 rounded-full bg-surface px-2 py-0.5 text-[11px] text-muted-foreground">
                        ~{(n.gainMs / 1000).toFixed(2)}s
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{n.detail}</p>
                </div>
              ))}
            </div>
          </Panel>

          {/* Form */}
          <Panel title="Session form" accent="info">
            <div className="grid grid-cols-2 gap-4">
              <Stat label="Valid laps" value={coach.validLaps} />
              <Stat
                label="Deleted"
                value={coach.invalidLaps}
                tone={coach.invalidLaps > 2 ? "danger" : "neutral"}
              />
              <Stat label="Median" value={fmtLap(coach.medianMs)} />
              <Stat
                label="Rolling 5"
                value={fmtLap(coach.rollingMs)}
                sub={
                  coach.trendMs
                    ? `${coach.trendMs < 0 ? "improving" : "slipping"} ${Math.abs(coach.trendMs / 1000).toFixed(2)}s`
                    : undefined
                }
                tone={coach.trendMs < 0 ? "go" : coach.trendMs > 0 ? "warn" : "neutral"}
              />
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="label-xs">Consistency</span>
                  <span className="num text-xs">{coach.consistency.toFixed(0)}%</span>
                </div>
                <Bar value={coach.consistency} tone={coach.consistency > 70 ? "go" : "warn"} />
                <div className="num mt-1 text-[11px] text-muted-foreground">
                  spread {(coach.spreadMs / 1000).toFixed(2)}s across clean laps
                </div>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="label-xs">
                    <Target className="mr-1 inline h-3 w-3" /> Target {fmtLap(coach.targetMs)}
                  </span>
                  <span className="num text-xs">{coach.targetProgress.toFixed(0)}%</span>
                </div>
                <Bar value={coach.targetProgress} tone="info" />
              </div>
            </div>
          </Panel>

          {/* Pedal habits */}
          <Panel title="Pedal analysis" accent="warn" right={<Gauge className="h-4 w-4 text-muted-foreground" />}>
            <div className="space-y-3">
              {[
                { label: "Coasting", value: habits.coastPct, ideal: "< 8%", tone: habits.coastPct > 12 ? "warn" : "go" },
                { label: "Full throttle", value: habits.fullThrottlePct, ideal: "> 40%", tone: habits.fullThrottlePct < 38 ? "warn" : "go" },
                { label: "Brake pressure", value: habits.brakePeak * 100, ideal: "> 75%", tone: habits.brakePeak < 0.72 ? "warn" : "go" },
                { label: "Pedal overlap", value: habits.overlapPct, ideal: "< 15%", tone: habits.overlapPct > 18 ? "danger" : "go" },
              ].map((m) => (
                <div key={m.label}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[13px]">{m.label}</span>
                    <span className="num text-xs text-muted-foreground">
                      {m.value.toFixed(0)}% · ideal {m.ideal}
                    </span>
                  </div>
                  <Bar value={m.value} tone={m.tone as "go" | "warn" | "danger"} />
                </div>
              ))}
            </div>
          </Panel>

          {/* Drills */}
          <DrillRunner
            laps={state.laps}
            habits={habits}
            bestMs={coach.bestMs}
            weakestSector={coach.weakestSector}
          />
        </div>
      </div>

      {/* Lap log */}
      <Panel title="Lap log" accent="neutral">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="label-xs text-left">
                <th className="py-1.5 font-medium">Lap</th>
                <th className="py-1.5 font-medium">Time</th>
                <th className="py-1.5 font-medium">Δ PB</th>
                <th className="py-1.5 font-medium">S1</th>
                <th className="py-1.5 font-medium">S2</th>
                <th className="py-1.5 font-medium">S3</th>
                <th className="py-1.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {laps.length ? (
                laps.map((l) => {
                  const delta = coach.bestMs ? l.timeMs - coach.bestMs : 0;
                  const cells: Array<[number, number]> = [
                    [l.s1, state.bestSectors[0] ?? 0],
                    [l.s2, state.bestSectors[1] ?? 0],
                    [l.s3, state.bestSectors[2] ?? 0],
                  ];
                  return (
                    <tr key={l.lap} className="border-t border-border/60">
                      <td className="num py-1.5">{l.lap}</td>
                      <td className="num py-1.5 font-medium">{fmtLap(l.timeMs)}</td>
                      <td
                        className={cn(
                          "num py-1.5",
                          delta <= 0 ? "text-purple" : delta < 300 ? "text-go" : "text-muted-foreground",
                        )}
                      >
                        {delta === 0 ? "PB" : fmtDelta(delta)}
                      </td>
                      {cells.map(([v, best], i) => (
                        <td
                          key={i}
                          className={cn("num py-1.5", best && v <= best ? "text-purple" : "text-foreground/80")}
                        >
                          {fmtSector(v)}
                        </td>
                      ))}
                      <td className="py-1.5">
                        {l.valid ? (
                          <span className="inline-flex items-center gap-1 text-xs text-go">
                            <TrendingDown className="h-3 w-3" /> Valid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-danger">
                            <TrendingUp className="h-3 w-3" /> Deleted
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-4 text-center text-sm text-muted-foreground">
                    No laps yet — start a time trial and complete a lap.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
