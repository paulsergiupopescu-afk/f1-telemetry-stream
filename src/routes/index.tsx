import { createFileRoute } from "@tanstack/react-router";

import { Bar, Panel, Stat, toneText } from "@/components/f1/Panel";
import { CommandBanner } from "@/components/f1/CommandBanner";
import { TyreCard } from "@/components/f1/TyreCard";
import { DeltaStrip } from "@/components/f1/DeltaStrip";
import { TimingTower } from "@/components/f1/TimingTower";
import { TrackMap } from "@/components/f1/TrackMap";
import { PaceChart } from "@/components/f1/PaceChart";
import { SimControls } from "@/components/f1/SimControls";
import { useTelemetry } from "@/lib/f1/store";
import { getTrack } from "@/lib/f1/tracks";
import { diagnose, drivingCall, ersCall, paceSummary, primaryCall, tyreCall, wingDamage } from "@/lib/f1/engineer";
import { fmtDelta, fmtGap, fmtLap } from "@/lib/f1/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Solo Engineer — F1 Telemetry Hub" },
      {
        name: "description",
        content:
          "A live race-engineer dashboard: engineer calls, delta, tyre wear, ERS, damage and pace analysis while you drive.",
      },
      { property: "og:title", content: "Solo Engineer — F1 Telemetry Hub" },
      {
        property: "og:description",
        content: "Live engineer calls, tyre wear, ERS and pit strategy from your F1 telemetry feed.",
      },
    ],
  }),
  component: SoloEngineer,
});

function SoloEngineer() {
  const { state, strategy } = useTelemetry();
  const track = getTrack(state.trackId);
  const call = primaryCall(state, strategy.call);
  const drive = drivingCall(state);
  const ers = ersCall(state);
  const tyre = tyreCall(state);
  const diag = diagnose(state);
  const pace = paceSummary(state);
  const wing = wingDamage(state);

  return (
    <div className="space-y-3">
      <CommandBanner call={call} />

      <div className="grid gap-3 xl:grid-cols-[1.15fr_1fr_0.85fr]">
        <div className="space-y-3">
          <Panel title="Delta & micro-sectors" accent="info" className="min-h-52">
            <DeltaStrip
              deltaMs={state.deltaMs}
              microSectors={state.microSectors}
              currentSegment={Math.floor(state.lapDistancePct * 20) % 20}
            />
          </Panel>

          <Panel title="Lap timing">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Current" value={fmtLap(state.currentLapMs)} />
              <Stat label="Last" value={fmtLap(state.lastLapMs)} />
              <Stat label="Best" value={fmtLap(state.bestLapMs)} tone="go" />
              <Stat label="Theoretical" value={fmtLap(state.theoreticalBestMs)} tone="info" />
              {state.sectors.map((s, i) => (
                <Stat
                  key={i}
                  label={`Sector ${i + 1}`}
                  size="sm"
                  value={fmtLap(s).replace("--:--.---", "—")}
                  sub={`Best ${fmtLap(state.bestSectors[i] ?? 0)}`}
                  tone={s > 0 && s <= (state.bestSectors[i] ?? Infinity) ? "go" : "neutral"}
                />
              ))}
            </div>
          </Panel>

          <Panel title="Pace trace" right={<span className="num text-[11px] text-muted-foreground">{pace.cleanCount} clean laps</span>}>
            <div className="h-44">
              <PaceChart laps={state.laps} />
            </div>
          </Panel>
        </div>

        <div className="space-y-3">
          <Panel title="Car state" accent={state.drs ? "go" : "neutral"}>
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Speed" value={`${state.speed.toFixed(0)}`} sub="km/h" size="lg" />
              <Stat label="Gear" value={state.gear === 0 ? "N" : state.gear} size="lg" />
              <Stat label="DRS" value={state.drs ? "OPEN" : "—"} tone={state.drs ? "go" : "neutral"} size="lg" />
            </div>
            <div className="mt-3 space-y-2">
              <div>
                <div className="label-xs mb-1 flex justify-between">
                  <span>Throttle</span>
                  <span className="num">{state.throttle.toFixed(0)}%</span>
                </div>
                <Bar value={state.throttle} tone="go" />
              </div>
              <div>
                <div className="label-xs mb-1 flex justify-between">
                  <span>Brake</span>
                  <span className="num">{state.brake.toFixed(0)}%</span>
                </div>
                <Bar value={state.brake} tone="danger" />
              </div>
              <div>
                <div className="label-xs mb-1 flex justify-between">
                  <span>RPM</span>
                  <span className="num">{state.rpm.toFixed(0)}</span>
                </div>
                <Bar value={(state.rpm / 13000) * 100} tone="warn" />
              </div>
            </div>
          </Panel>

          <Panel title="Tyres" accent={tyre.tone} right={<span className={cn("num text-[11px]", toneText[tyre.tone])}>{tyre.call}</span>}>
            <TyreCard tyres={state.tyres} />
          </Panel>

          <Panel title="Energy & fuel" accent={ers.tone}>
            <div className="grid grid-cols-2 gap-3">
              <Stat label="ERS store" value={`${state.ers.toFixed(0)}%`} tone={ers.tone} />
              <Stat label="Mode" value={state.ersMode} tone="info" />
              <Stat label="Fuel" value={`${state.fuelKg.toFixed(1)} kg`} />
              <Stat
                label="Fuel delta"
                value={`${state.fuelDeltaLaps > 0 ? "+" : ""}${state.fuelDeltaLaps.toFixed(2)} laps`}
                tone={state.fuelDeltaLaps < -0.2 ? "danger" : state.fuelDeltaLaps > 0.4 ? "go" : "warn"}
              />
            </div>
            <div className="mt-3">
              <Bar value={state.ers} tone={ers.tone} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{ers.detail}</p>
          </Panel>
        </div>

        <div className="space-y-3">
          <Panel title={track.name} right={<span className="label-xs">{track.country}</span>}>
            <TrackMap track={track} pct={state.lapDistancePct} className="mx-auto h-40 w-full" />
            <div className="mt-2 grid grid-cols-3 gap-2">
              <Stat label="Air" value={`${state.airTemp.toFixed(0)}°`} size="sm" />
              <Stat label="Track" value={`${state.trackTemp.toFixed(0)}°`} size="sm" />
              <Stat label="Rain" value={`${state.rainChance.toFixed(0)}%`} size="sm" tone={state.rainChance > 40 ? "info" : "neutral"} />
            </div>
          </Panel>

          <Panel title="Battle" accent={state.gapAheadMs < 1000 ? "warn" : "neutral"}>
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Gap ahead" value={fmtGap(state.gapAheadMs)} tone={state.gapAheadMs < 1000 ? "go" : "neutral"} />
              <Stat label="Gap behind" value={fmtGap(state.gapBehindMs)} tone={state.gapBehindMs < 1000 ? "danger" : "neutral"} />
            </div>
            <div className="mt-3 h-36">
              <TimingTower field={state.field} position={state.position} compact />
            </div>
          </Panel>

          <Panel title="Damage" accent={wing > 12 ? "danger" : "neutral"}>
            <div className="space-y-2">
              {[
                ["Front wing L", state.damage.frontWingLeft],
                ["Front wing R", state.damage.frontWingRight],
                ["Rear wing", state.damage.rearWing],
                ["Floor", state.damage.floor],
                ["Diffuser", state.damage.diffuser],
              ].map(([label, v]) => (
                <div key={label as string}>
                  <div className="label-xs mb-1 flex justify-between">
                    <span>{label}</span>
                    <span className="num">{(v as number).toFixed(0)}%</span>
                  </div>
                  <Bar value={v as number} tone={(v as number) > 20 ? "danger" : (v as number) > 5 ? "warn" : "go"} />
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr]">
        <Panel title="Loss diagnosis" accent={diag.confident ? "warn" : "neutral"}>
          <h3 className="font-display text-xl tracking-wide uppercase">{diag.headline}</h3>
          <p className="mt-1 text-sm text-foreground/80">{diag.cause}</p>
          <ul className="mt-3 space-y-1.5">
            {diag.actions.map((a) => (
              <li key={a} className="flex gap-2 text-sm text-muted-foreground">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                {a}
              </li>
            ))}
          </ul>
          <div className="mt-3 grid grid-cols-3 gap-3 border-t border-border pt-3">
            <Stat label="Avg clean lap" value={fmtLap(pace.averageMs)} size="sm" />
            <Stat label="Last vs avg" value={fmtDelta(pace.vsAverageMs)} size="sm" tone={pace.vsAverageMs < 0 ? "go" : "danger"} />
            <Stat label="Trend" value={pace.trend} size="sm" tone={pace.trend === "IMPROVING" ? "go" : pace.trend === "FADING" ? "danger" : "info"} />
          </div>
        </Panel>

        <Panel title="Race control feed" right={<SimControls />}>
          <div className="mb-3 rounded-md border border-border bg-surface-2/60 p-2">
            <span className="label-xs">Driving cue</span>
            <p className={cn("font-display text-lg tracking-wide uppercase", toneText[drive.tone])}>
              {drive.call}
            </p>
            <p className="text-xs text-muted-foreground">{drive.detail}</p>
          </div>
          <ul className="max-h-52 space-y-1 overflow-y-auto pr-1">
            {[...state.events].reverse().map((e, i) => (
              <li key={`${e.atMs}-${i}`} className="flex gap-2 border-b border-border/50 py-1 text-sm last:border-0">
                <span className="num w-10 shrink-0 text-xs text-muted-foreground">L{e.lap}</span>
                <span
                  className={cn(
                    e.kind === "danger"
                      ? "text-danger"
                      : e.kind === "warn"
                        ? "text-warn"
                        : e.kind === "strategy"
                          ? "text-info"
                          : "text-foreground/80",
                  )}
                >
                  {e.text}
                </span>
              </li>
            ))}
            {state.events.length === 0 ? (
              <li className="text-sm text-muted-foreground">No incidents. Clean running.</li>
            ) : null}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
