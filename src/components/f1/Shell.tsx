import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  BarChart3,
  Flag,
  Gauge,
  History,
  Route as RouteIcon,
  SplitSquareHorizontal,
  Timer,
  Tv,
  Trophy,
  User,
} from "lucide-react";
import type { ReactNode } from "react";

import { LiveSource } from "@/components/f1/LiveSource";
import { useTelemetry } from "@/lib/f1/store";
import { getTrack } from "@/lib/f1/tracks";
import { fmtClock } from "@/lib/f1/format";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Solo Engineer", icon: Gauge },
  { to: "/coach", label: "Coach Mode", icon: Timer },
  { to: "/strategy", label: "Live Strategy", icon: RouteIcon },
  { to: "/pre-race", label: "Pre-Race", icon: Flag },
  { to: "/bigscreen", label: "Big Screen", icon: Tv },
  { to: "/split", label: "Split Screen", icon: SplitSquareHorizontal },
  { to: "/sessions", label: "Sessions", icon: History },
  { to: "/profile", label: "Driver Profile", icon: User },
  { to: "/championship", label: "Championship", icon: Trophy },
] as const;

function RevLights() {
  return (
    <div className="flex items-center gap-[3px]">
      {Array.from({ length: 10 }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            i < 5 ? "bg-go/70" : i < 8 ? "bg-warn/70" : "bg-danger/70",
          )}
          style={{ animation: `pulse-live ${1.2 + i * 0.08}s ease-in-out infinite` }}
        />
      ))}
    </div>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const { state, desktop } = useTelemetry();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const track = getTrack(state.trackId);
  const live = state.connection === "LIVE";

  return (
    <div className="flex min-h-screen">
      <aside className="glass sticky top-0 hidden h-screen w-[14.5rem] shrink-0 flex-col border-r border-sidebar-border lg:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Activity className="h-4 w-4" />
          </span>
          <div className="leading-tight">
            <div className="font-display text-[0.95rem] font-semibold tracking-[-0.01em]">
              Telemetry Hub
            </div>
            <div className="text-[11px] text-muted-foreground">F1 · 26</div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-3 py-2 text-[0.86rem] font-medium transition-colors",
                  active
                    ? "bg-surface-2 text-foreground"
                    : "text-muted-foreground hover:bg-surface hover:text-foreground",
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", active && "text-primary")} />
                {label}
              </Link>
            );
          })}
        </nav>


        <div className="border-t border-sidebar-border p-3">
          <div className="label-xs mb-1">Source</div>
          <div className="num text-xs text-foreground/80">
            {desktop
              ? "Desktop UDP :20777"
              : state.connection === "LIVE"
                ? "Live UDP bridge"
                : "Built-in race simulator"}
          </div>
          <div className="mt-1.5">
            <LiveSource compact />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  live ? "animate-live bg-go" : state.connection === "SIM" ? "bg-info" : "bg-warn",
                )}
              />
              <span className="font-display text-sm tracking-[0.2em] uppercase">
                {state.connection}
              </span>
              <span className="num text-[11px] text-muted-foreground">{state.packetRate}Hz</span>
            </div>

            <div className="hidden items-center gap-2 sm:flex">
              <span className="label-xs">{track.short}</span>
              <span className="truncate text-sm text-foreground/85">{track.name}</span>
            </div>

            <div className="ml-auto flex items-center gap-4">
              <div className="hidden md:block">
                <span className="label-xs">Phase</span>
                <div
                  className={cn(
                    "num text-sm font-semibold",
                    state.phase === "GREEN"
                      ? "text-go"
                      : state.phase === "RED_FLAG"
                        ? "text-danger"
                        : "text-warn",
                  )}
                >
                  {state.phase.replace("_", " ")}
                </div>
              </div>
              <div>
                <span className="label-xs">Lap</span>
                <div className="num text-sm font-semibold">
                  {state.lap}
                  {state.totalLaps ? `/${state.totalLaps}` : ""}
                </div>
              </div>
              <div>
                <span className="label-xs">Pos</span>
                <div className="num text-sm font-semibold text-primary">P{state.position}</div>
              </div>
              <div className="hidden lg:block">
                <span className="label-xs">Session</span>
                <div className="num text-sm">{fmtClock(state.sessionTimeMs)}</div>
              </div>
              <RevLights />
            </div>
          </div>

          <nav className="flex gap-1 overflow-x-auto border-t border-border px-2 py-1 lg:hidden">
            {NAV.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-sm px-2 py-1.5 font-display text-xs tracking-[0.02em] uppercase",
                  pathname === to ? "bg-primary/15 text-foreground" : "text-muted-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Link>
            ))}
          </nav>
        </header>

        <main className="min-w-0 flex-1 p-3 md:p-4">{children}</main>
      </div>
    </div>
  );
}
