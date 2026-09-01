import { createFileRoute } from "@tanstack/react-router";

import { Panel, Stat } from "@/components/f1/Panel";
import { TrackMap } from "@/components/f1/TrackMap";
import { useTelemetry } from "@/lib/f1/store";
import { TRACKS, getTrack } from "@/lib/f1/tracks";
import { COMPOUND_LABEL, compoundVar, fmtLap } from "@/lib/f1/format";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pre-race")({
  head: () => ({
    meta: [
      { title: "Pre-Race Briefing — F1 Telemetry Hub" },
      {
        name: "description",
        content:
          "Set up your session: pick the circuit, race length, weather and starting compound, then get the opening strategy briefing.",
      },
      { property: "og:title", content: "Pre-Race Briefing — F1 Telemetry Hub" },
      {
        property: "og:description",
        content: "Circuit, race length, weather and tyre selection with an opening strategy plan.",
      },
    ],
  }),
  component: PreRace,
});

function PreRace() {
  const { state, strategy, options, restart } = useTelemetry();
  const track = getTrack(state.trackId);

  return (
    <div className="grid gap-3 xl:grid-cols-[1fr_1.1fr]">
      <div className="space-y-3">
        <Panel title="Session setup" accent="info">
          <div className="space-y-4">
            <div>
              <span className="label-xs">Circuit</span>
              <div className="mt-1 grid max-h-64 grid-cols-2 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-3">
                {TRACKS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => restart({ trackId: t.id })}
                    className={cn(
                      "rounded-sm border px-2 py-1.5 text-left font-display text-xs tracking-wider uppercase transition-colors",
                      t.id === state.trackId
                        ? "border-primary bg-primary/15 text-foreground"
                        : "border-border text-muted-foreground hover:bg-surface-2",
                    )}
                  >
                    {t.short}
                    <span className="block text-[10px] text-muted-foreground normal-case">
                      {t.country}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="label-xs">Race length</span>
              <div className="mt-1 flex gap-1.5">
                {[25, 50, 100].map((p) => (
                  <Button
                    key={p}
                    size="sm"
                    variant={Math.round((options.raceDistance ?? 1) * 100) === p ? "default" : "outline"}
                    onClick={() => restart({ raceDistance: p / 100 })}
                  >
                    {p}%
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <span className="label-xs">Starting compound</span>
              <div className="mt-1 flex gap-1.5">
                {(["soft", "medium", "hard"] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => restart({ startCompound: c })}
                    className={cn(
                      "rounded-sm border px-3 py-1.5 font-display text-xs tracking-widest uppercase",
                      options.startCompound === c ? "border-current" : "border-border opacity-60",
                    )}
                    style={{ color: compoundVar(c) }}
                  >
                    {COMPOUND_LABEL[c]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="label-xs">Rain chance</span>
              <div className="mt-1 flex gap-1.5">
                {[0, 20, 55, 90].map((r) => (
                  <Button
                    key={r}
                    size="sm"
                    variant={options.rainChance === r ? "default" : "outline"}
                    onClick={() => restart({ rainChance: r })}
                  >
                    {r}%
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="Opening strategy briefing" accent="warn">
          <p className="text-sm text-foreground/85">
            Plan A is <strong className="font-display tracking-wide uppercase">{strategy.plans[0]?.label ?? "—"}</strong>{" "}
            with a first stop targeted at lap {strategy.targetLap} onto{" "}
            {COMPOUND_LABEL[strategy.nextCompound]}.
          </p>
          <ul className="mt-2 space-y-1.5">
            {strategy.evidence.map((e) => (
              <li key={e} className="flex gap-2 text-sm text-muted-foreground">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                {e}
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel title={track.name} right={<span className="label-xs">{track.country}</span>}>
        <TrackMap track={track} pct={state.lapDistancePct} className="mx-auto h-72 w-full" />
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Race laps" value={state.totalLaps} />
          <Stat label="Base lap" value={fmtLap(track.baseLapMs)} />
          <Stat label="Pit loss" value={`${(track.pitLossMs / 1000).toFixed(1)}s`} tone="warn" />
          <Stat label="Tyre stress" value={track.tyreStress.toFixed(2)} tone="info" />
          <Stat label="Track temp" value={`${state.trackTemp.toFixed(0)}°C`} />
          <Stat label="Air temp" value={`${state.airTemp.toFixed(0)}°C`} />
          <Stat label="Rain chance" value={`${state.rainChance.toFixed(0)}%`} tone={state.rainChance > 40 ? "info" : "neutral"} />
          <Stat label="Weather" value={state.weather} />
        </div>
      </Panel>
    </div>
  );
}
