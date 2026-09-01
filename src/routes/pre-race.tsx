import { createFileRoute } from "@tanstack/react-router";

import { Panel, Stat } from "@/components/f1/Panel";
import { TrackMap } from "@/components/f1/TrackMap";
import { useTelemetry } from "@/lib/f1/store";
import { TRACKS, getTrack } from "@/lib/f1/tracks";
import { COMPOUND_LABEL, compoundVar, fmtLap } from "@/lib/f1/format";
import { Button } from "@/components/ui/button";
import { LiveSource } from "@/components/f1/LiveSource";
import { recommendSetup } from "@/lib/f1/setup";
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
  const pct = Math.min(1, state.totalLaps / track.laps);
  const setup = recommendSetup({
    trackId: state.trackId,
    rainChance: state.rainChance,
    trackTemp: state.trackTemp,
    compound: options.compound,
    raceLaps: state.totalLaps,
  });

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
                    onClick={() => restart({ trackId: t.id, totalLaps: Math.max(5, Math.round(t.laps * pct)) })}
                    className={cn(
                      "rounded-sm border px-2 py-1.5 text-left font-display text-xs tracking-[0.02em] uppercase transition-colors",
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
                    variant={Math.round(pct * 100) === p ? "default" : "outline"}
                    onClick={() => restart({ totalLaps: Math.max(5, Math.round(track.laps * (p / 100))) })}
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
                    onClick={() => restart({ compound: c })}
                    className={cn(
                      "rounded-sm border px-3 py-1.5 font-display text-xs tracking-[0.04em] uppercase",
                      options.compound === c ? "border-current" : "border-border opacity-60",
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

        <LiveSource />
      </div>

      <div className="space-y-3">
      <Panel title={track.name} right={<span className="label-xs">{track.country}</span>}>
        <TrackMap track={track} pct={state.lapDistancePct} className="mx-auto h-72 w-full" />
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Race laps" value={state.totalLaps} />
          <Stat label="Base lap" value={fmtLap(track.lapTimeMs)} />
          <Stat label="Pit loss" value={`${(track.pitLossMs / 1000).toFixed(1)}s`} tone="warn" />
          <Stat label="Tyre stress" value={track.degradation.toFixed(2)} tone="info" />
          <Stat label="Track temp" value={`${state.trackTemp.toFixed(0)}°C`} />
          <Stat label="Air temp" value={`${state.airTemp.toFixed(0)}°C`} />
          <Stat label="Rain chance" value={`${state.rainChance.toFixed(0)}%`} tone={state.rainChance > 40 ? "info" : "neutral"} />
          <Stat label="Weather" value={state.weather} />
        </div>
      </Panel>

      <Panel
        title="Recommended car setup"
        accent="warn"
        right={<span className="label-xs">{setup.profile}</span>}
      >
        <p className="text-[13px] text-muted-foreground">{setup.summary}</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {setup.groups.map((g) => (
            <div key={g.title}>
              <span className="label-xs">{g.title}</span>
              <div className="mt-1.5 space-y-2">
                {g.items.map((it) => (
                  <div key={it.label} className="rounded-lg border border-border bg-surface-2/40 px-2.5 py-2">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[13px]">{it.label}</span>
                      <span className="num text-sm font-semibold">{it.value}</span>
                    </div>
                    {typeof it.scale === "number" && (
                      <div className="mt-1.5 h-1 rounded-full bg-surface-2">
                        <div
                          className="h-1 rounded-full bg-primary"
                          style={{ width: `${Math.max(3, Math.min(100, it.scale * 100))}%` }}
                        />
                      </div>
                    )}
                    <div className="mt-1 text-[11px] text-muted-foreground">{it.hint}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <ul className="mt-3 space-y-1.5 border-t border-border pt-3">
          {setup.notes.map((n) => (
            <li key={n} className="flex gap-2 text-[13px] text-muted-foreground">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
              {n}
            </li>
          ))}
        </ul>
      </Panel>
      </div>
    </div>
  );
}
