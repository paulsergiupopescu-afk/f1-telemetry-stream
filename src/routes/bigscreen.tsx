import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";

import { useTelemetry } from "@/lib/f1/store";
import { drivingCall, primaryCall } from "@/lib/f1/engineer";
import { COMPOUND_LABEL, compoundVar, fmtDelta, fmtGap, fmtLap } from "@/lib/f1/format";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/bigscreen")({
  head: () => ({
    meta: [
      { title: "Big Screen — F1 Telemetry Hub" },
      {
        name: "description",
        content:
          "Essentials-only big screen mode: one engineer call, delta, tyres, fuel and gaps in huge type for a TV or second monitor.",
      },
      { property: "og:title", content: "Big Screen — F1 Telemetry Hub" },
      {
        property: "og:description",
        content: "Huge, glanceable race essentials for a TV or second monitor.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BigScreen,
});

const toneText: Record<string, string> = {
  go: "text-go",
  warn: "text-warn",
  danger: "text-danger",
  info: "text-info",
  neutral: "text-foreground",
};

function Cell({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: keyof typeof toneText;
}) {
  return (
    <div className="flex min-w-0 flex-col justify-center rounded-2xl border border-border bg-surface px-4 py-4">
      <span className="label-xs">{label}</span>
      <span className={cn("num mt-1 truncate text-[clamp(1.5rem,2.7vw,2.4rem)] leading-none font-semibold", toneText[tone])}>
        {value}
      </span>
      {sub && <span className="num mt-1 truncate text-xs text-muted-foreground">{sub}</span>}
    </div>
  );
}

function BigScreen() {
  const { state, strategy } = useTelemetry();
  const call = primaryCall(state, strategy.call);
  const drive = drivingCall(state);
  const ref = useRef<HTMLDivElement>(null);
  const [full, setFull] = useState(false);

  useEffect(() => {
    const on = () => setFull(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, []);

  const toggle = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void ref.current?.requestFullscreen();
  };

  const worstWear = Math.max(...Object.values(state.tyres.wear));
  const delta = state.deltaMs;

  return (
    <div ref={ref} className="flex min-h-[calc(100vh-6.5rem)] flex-col gap-3 bg-background p-1">
      {/* One call, huge */}
      <div className="relative flex flex-1 flex-col justify-center rounded-2xl border border-border bg-surface px-8 py-10">
        <Button
          size="sm"
          variant="ghost"
          onClick={toggle}
          className="absolute top-3 right-3 text-muted-foreground"
        >
          {full ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
        <span className="label-xs">Engineer</span>
        <h1
          className={cn(
            "mt-1 font-display text-[clamp(2.6rem,9vw,7rem)] leading-[0.95] font-semibold tracking-[-0.03em]",
            toneText[call.tone],
          )}
        >
          {call.call}
        </h1>
        <p className="mt-3 max-w-3xl text-[clamp(0.95rem,1.6vw,1.35rem)] text-muted-foreground">
          {call.detail}
        </p>
        {drive.call !== call.call && (
          <p className={cn("mt-4 text-[clamp(0.9rem,1.4vw,1.15rem)] font-medium", toneText[drive.tone])}>
            {drive.call}
          </p>
        )}
      </div>

      {/* Essentials only */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Cell
          label="Delta"
          value={fmtDelta(delta)}
          tone={delta < 0 ? "go" : delta > 0 ? "danger" : "neutral"}
          sub="to reference"
        />
        <Cell label="Position" value={`P${state.position}`} sub={`lap ${state.lap}${state.totalLaps ? `/${state.totalLaps}` : ""}`} />
        <Cell label="Last lap" value={fmtLap(state.lastLapMs)}
           sub={`best ${fmtLap(state.bestLapMs)}`} />
        <Cell
          label="Tyres"
          value={`${worstWear.toFixed(0)}%`}
          tone={worstWear > 70 ? "danger" : worstWear > 45 ? "warn" : "go"}
          sub={`${COMPOUND_LABEL[state.tyres.compound]} · ${state.tyres.age} laps`}
        />
        <Cell
          label="Fuel"
          value={`${state.fuelDeltaLaps >= 0 ? "+" : ""}${state.fuelDeltaLaps.toFixed(1)}`}
          tone={state.fuelDeltaLaps < 0 ? "danger" : "go"}
          sub={`${state.fuelKg.toFixed(1)} kg`}
        />
        <Cell
          label="ERS"
          value={`${state.ers.toFixed(0)}%`}
          tone={state.ers < 20 ? "danger" : "go"}
          sub={state.ersMode}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Cell
          label="Gap ahead"
          value={fmtGap(state.gapAheadMs)}
          tone={state.gapAheadMs < 1000 ? "go" : "neutral"}
        />
        <Cell
          label="Gap behind"
          value={fmtGap(state.gapBehindMs)}
          tone={state.gapBehindMs < 1000 ? "danger" : "neutral"}
        />
      </div>

      <div className="flex items-center justify-between px-2 text-xs text-muted-foreground">
        <span className="num" style={{ color: compoundVar(state.tyres.compound) }}>
          {COMPOUND_LABEL[state.tyres.compound]}
        </span>
        <span className="num">{state.phase.replace("_", " ")} · {state.connection}</span>
      </div>
    </div>
  );
}
