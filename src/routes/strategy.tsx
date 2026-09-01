import { createFileRoute } from "@tanstack/react-router";

import { Panel, Stat, toneText } from "@/components/f1/Panel";
import { SimControls } from "@/components/f1/SimControls";
import { TimingTower } from "@/components/f1/TimingTower";
import { useTelemetry } from "@/lib/f1/store";
import { COMPOUND_LABEL, compoundVar, fmtDelta } from "@/lib/f1/format";
import { getTrack } from "@/lib/f1/tracks";
import { cn } from "@/lib/utils";
import type { Plan } from "@/lib/f1/strategy";

export const Route = createFileRoute("/strategy")({
  head: () => ({
    meta: [
      { title: "Live Strategy — F1 Telemetry Hub" },
      {
        name: "description",
        content:
          "Compare pit strategies in real time: undercut windows, stint plans, rejoin position and time deltas.",
      },
      { property: "og:title", content: "Live Strategy — F1 Telemetry Hub" },
      {
        property: "og:description",
        content: "Real-time pit windows, stint planning and rejoin projections for your race.",
      },
    ],
  }),
  component: StrategyPage,
});

function StintBar({ plan, totalLaps }: { plan: Plan; totalLaps: number }) {
  return (
    <div className="flex h-6 w-full overflow-hidden rounded-sm border border-border">
      {plan.stints.map((s, i) => (
        <div
          key={i}
          className="relative grid place-items-center text-[10px] font-bold text-background"
          style={{
            width: `${(s.laps / Math.max(1, totalLaps)) * 100}%`,
            background: compoundVar(s.compound),
            opacity: 0.85,
          }}
          title={`${COMPOUND_LABEL[s.compound]} · L${s.start}-${s.end}`}
        >
          {s.laps >= 6 ? `${COMPOUND_LABEL[s.compound][0]}${s.laps}` : ""}
        </div>
      ))}
    </div>
  );
}

function StrategyPage() {
  const { state, strategy } = useTelemetry();
  const track = getTrack(state.trackId);
  const callTone =
    strategy.call === "PIT NOW" ? "danger" : strategy.call === "PIT WINDOW" ? "warn" : strategy.call === "STAY OUT" ? "go" : "info";

  return (
    <div className="space-y-3">
      <Panel accent={callTone} className="carbon">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
          <div>
            <span className="label-xs">Strategy call</span>
            <h1 className={cn("font-display text-4xl font-bold tracking-wide uppercase", toneText[callTone])}>
              {strategy.call}
            </h1>
          </div>
          <Stat label="Target lap" value={strategy.targetLap} size="lg" />
          <Stat label="Window" value={`L${strategy.windowFrom}–${strategy.windowTo}`} size="lg" />
          <Stat
            label="Next compound"
            value={COMPOUND_LABEL[strategy.nextCompound]}
            size="lg"
            tone="info"
          />
          <Stat
            label="Advantage"
            value={fmtDelta(-strategy.advantageMs)}
            size="lg"
            tone={strategy.advantageMs > 0 ? "go" : "danger"}
          />
          <Stat label="Rejoin" value={`P${strategy.rejoinPosition}`} size="lg" />
          <Stat label="Confidence" value={`${strategy.confidence.toFixed(0)}%`} size="lg" tone="info" />
          <div className="ml-auto">
            <SimControls />
          </div>
        </div>
      </Panel>

      <div className="grid gap-3 xl:grid-cols-[1.4fr_1fr]">
        <Panel title="Plan comparison" accent="info">
          <div className="space-y-3">
            {strategy.plans.map((p, i) => (
              <div
                key={p.id}
                className={cn(
                  "rounded-md border p-3",
                  i === 0 ? "border-primary/50 bg-primary/8" : "border-border bg-surface-2/50",
                )}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-display text-lg tracking-wide uppercase">
                    {i === 0 ? "★ " : ""}
                    {p.label}
                  </h3>
                  <span className={cn("num text-sm", p.deltaToBestMs <= 0 ? "text-go" : "text-warn")}>
                    {p.deltaToBestMs <= 0 ? "OPTIMAL" : `+${(p.deltaToBestMs / 1000).toFixed(1)}s`}
                  </span>
                </div>
                <div className="mt-2">
                  <StintBar plan={p} totalLaps={state.totalLaps} />
                </div>
                <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Stat
                    label="Stops"
                    size="sm"
                    value={p.stops.length}
                    sub={p.stops.map((s) => `L${s.lap} ${COMPOUND_LABEL[s.compound][0]}`).join(" · ") || "—"}
                  />
                  <Stat label="Rejoin" size="sm" value={`P${p.rejoinPosition}`} />
                  <Stat
                    label="Finish wear"
                    size="sm"
                    value={`${p.finishWear.toFixed(0)}%`}
                    tone={p.finishWear > 85 ? "danger" : p.finishWear > 70 ? "warn" : "go"}
                  />
                  <Stat
                    label="Uncertainty"
                    size="sm"
                    value={`±${(p.uncertaintyMs / 1000).toFixed(1)}s`}
                    sub={`${p.confidence.toFixed(0)}% confident`}
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{p.why}</p>
              </div>
            ))}
          </div>
        </Panel>

        <div className="space-y-3">
          <Panel title="Evidence" accent="warn">
            <ul className="space-y-1.5">
              {strategy.evidence.map((e) => (
                <li key={e} className="flex gap-2 text-sm text-foreground/80">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-warn" />
                  {e}
                </li>
              ))}
            </ul>
            <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3">
              <Stat label="Pit loss" size="sm" value={`${(track.pitLossMs / 1000).toFixed(1)}s`} />
              <Stat label="Laps remaining" size="sm" value={Math.max(0, state.totalLaps - state.lap)} />
            </div>
          </Panel>

          <Panel title="Race order">
            <div className="h-[26rem]">
              <TimingTower field={state.field} position={state.position} />
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
