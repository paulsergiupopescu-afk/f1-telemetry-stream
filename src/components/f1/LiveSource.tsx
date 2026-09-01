import { Antenna, Cable, Plug, PlugZap } from "lucide-react";

import { Panel } from "@/components/f1/Panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTelemetry } from "@/lib/f1/store";
import { cn } from "@/lib/utils";

const LABEL: Record<string, string> = {
  off: "Simulator",
  connecting: "Connecting…",
  connected: "Bridge connected",
  error: "Bridge not found",
};

export function LiveSource({ compact = false }: { compact?: boolean }) {
  const { live, livePackets, bridgeUrl, setBridgeUrl, connectLive, disconnectLive, desktop, state } =
    useTelemetry();

  const tone =
    state.connection === "LIVE"
      ? "text-go"
      : live === "connecting"
        ? "text-warn"
        : live === "error"
          ? "text-danger"
          : "text-muted-foreground";

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Antenna className={cn("h-3.5 w-3.5", tone)} />
        <span className={cn("num text-xs", tone)}>
          {state.connection === "LIVE" ? `LIVE · ${livePackets} pkt` : LABEL[live]}
        </span>
      </div>
    );
  }

  return (
    <Panel
      title="Telemetry source"
      accent={state.connection === "LIVE" ? "go" : "info"}
      right={<span className={cn("num text-xs", tone)}>{LABEL[live]}</span>}
    >
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          {state.connection === "LIVE" ? (
            <PlugZap className="h-4 w-4 text-go" />
          ) : (
            <Plug className="h-4 w-4 text-muted-foreground" />
          )}
          <span>
            {desktop
              ? "Desktop app — reading UDP :20777 directly"
              : state.connection === "LIVE"
                ? `Live game data · ${livePackets} packets received`
                : "Running on the built-in race simulator"}
          </span>
        </div>

        {!desktop && (
          <>
            <div className="flex gap-1.5">
              <Input
                value={bridgeUrl}
                onChange={(e) => setBridgeUrl(e.target.value)}
                spellCheck={false}
                className="num h-8 text-xs"
              />
              {live === "off" ? (
                <Button size="sm" onClick={connectLive}>
                  Connect
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={disconnectLive}>
                  Stop
                </Button>
              )}
            </div>

            <div className="rounded-lg border border-border bg-surface-2/50 p-3 text-[12px] leading-relaxed text-muted-foreground">
              <div className="mb-1 flex items-center gap-1.5 text-foreground">
                <Cable className="h-3.5 w-3.5" /> Connect the real game
              </div>
              <ol className="list-decimal space-y-1 pl-4">
                <li>
                  In the game: Settings → Telemetry Settings → UDP Telemetry <strong>On</strong>, IP{" "}
                  <span className="num">127.0.0.1</span>, Port <span className="num">20777</span>,
                  Format <span className="num">2025</span>, Rate <span className="num">60Hz</span>.
                </li>
                <li>
                  On this PC run <span className="num">npm run bridge</span> (or install the desktop
                  app, which does it for you).
                </li>
                <li>Press Connect — the header switches from SIM to LIVE.</li>
              </ol>
            </div>
          </>
        )}
      </div>
    </Panel>
  );
}
