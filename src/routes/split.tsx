import { createFileRoute } from "@tanstack/react-router";

import { Bar, Panel, Stat, toneText } from "@/components/f1/Panel";
import { DeltaStrip } from "@/components/f1/DeltaStrip";
import { TyreCard } from "@/components/f1/TyreCard";
import { TrackMap } from "@/components/f1/TrackMap";
import { SimControls } from "@/components/f1/SimControls";
import { useTelemetry } from "@/lib/f1/store";
import { getTrack } from "@/lib/f1/tracks";
import { drivingCall, primaryCall } from "@/lib/f1/engineer";
import { fmtGap, fmtLap } from "@/lib/f1/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/split")({
  head: () => ({
    meta: [
      { title: "Split Screen — F1 Telemetry Hub" },
      {
        name: "description",
        content:
          "A big-type, glanceable overlay for a second monitor: call, delta, tyres, gaps and lap timing while you race.",
      },
      { property: "og:title", content: "Split Screen — F1 Telemetry Hub" },
      {
        property: "og:description",
        content: "Second-screen race overlay with huge, readable engineer calls and telemetry.",
      },
    ],
  }),
  component: SplitScreen,
});

function SplitScreen() {
  const { state, strategy } = useTelemetry();
  const call = primaryCall(state, strategy.call);
  const drive = drivingCall(state);
  const track = getTrack(state.trackId);

  return (
    <div className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-[1.3fr_1fr]">
        <Panel accent={call.tone} className="carbon">
          <span className="label-xs">Engineer</span>
          <h1
            className={cn(
              "font-display text-5xl leading-none font-bold tracking-wide uppercase md:text-7xl",
              toneText[call.tone],
            )}
          >
            {call.call}
          </h1>
          <p className="mt-2 text-base text-foreground/80">{call.detail}</p>
          <div className="mt-4 grid grid-cols-3 gap-4 border-t border-border pt-3">
            <Stat label="Position" value={`P${state.position}`} size="lg" tone="info" />
            <Stat label="Lap" value={`${state.lap}/${state.totalLaps}`} size="lg" />
            <Stat label="Best" value={fmtLap(state.bestLapMs)} size="lg" tone="go" />
          </div>
        </Panel>

        <Panel accent="info">
          <DeltaStrip
            deltaMs={state.deltaMs}
            microSectors={state.microSectors}
            currentSegment={Math.floor(state.lapDistancePct * 20) % 20}
          />
        </Panel>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Panel title="Tyres">
          <TyreCard tyres={state.tyres} />
        </Panel>

        <Panel title="Energy">
          <Stat label="ERS" value={`${state.ers.toFixed(0)}%`} size="lg" tone={state.ers < 20 ? "danger" : "go"} />
          <div className="mt-2">
            <Bar value={state.ers} tone={state.ers < 20 ? "danger" : "go"} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Stat label="Mode" value={state.ersMode} size="sm" tone="info" />
            <Stat label="Fuel" value={`${state.fuelKg.toFixed(1)}kg`} size="sm" />
          </div>
          <p className={cn("mt-3 font-display text-sm tracking-wide uppercase", toneText[drive.tone])}>
            {drive.call}
          </p>
        </Panel>

        <Panel title="Gaps">
          <Stat label="Ahead" value={fmtGap(state.gapAheadMs)} size="lg" tone={state.gapAheadMs < 1000 ? "go" : "neutral"} />
          <div className="mt-4">
            <Stat label="Behind" value={fmtGap(state.gapBehindMs)} size="lg" tone={state.gapBehindMs < 1000 ? "danger" : "neutral"} />
          </div>
          <div className="mt-4">
            <Stat label="Last lap" value={fmtLap(state.lastLapMs)} size="sm" />
          </div>
        </Panel>

        <Panel title={track.short}>
          <TrackMap track={track} pct={state.lapDistancePct} className="h-40 w-full" />
        </Panel>
      </div>

      <Panel title="Controls">
        <SimControls />
      </Panel>
    </div>
  );
}
