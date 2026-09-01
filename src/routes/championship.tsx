import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";

import { Panel, Stat } from "@/components/f1/Panel";
import { useTelemetry } from "@/lib/f1/store";
import { GRID, PLAYER } from "@/lib/f1/drivers";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/championship")({
  head: () => ({
    meta: [
      { title: "Championship — F1 Telemetry Hub" },
      {
        name: "description",
        content:
          "Projected drivers' and constructors' standings including the points you are scoring in the current race.",
      },
      { property: "og:title", content: "Championship — F1 Telemetry Hub" },
      {
        property: "og:description",
        content: "Live projected drivers' and constructors' championship standings.",
      },
    ],
  }),
  component: Championship,
});

const POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

function Championship() {
  const { state } = useTelemetry();

  const drivers = useMemo(() => {
    const rows = state.field.map((f) => {
      const pace = GRID.find((g) => g.code === f.code)?.pace ?? 0.6;
      const season = f.isPlayer ? 96 : Math.max(0, Math.round((0.9 - pace) * 320));
      const racePoints = POINTS[f.position - 1] ?? 0;
      return {
        code: f.code,
        name: f.name,
        team: f.team,
        color: f.teamColor,
        isPlayer: f.isPlayer,
        season,
        racePoints,
        total: season + racePoints,
      };
    });
    return rows.sort((a, b) => b.total - a.total);
  }, [state.field]);

  const constructors = useMemo(() => {
    const map = new Map<string, { team: string; color: string; total: number }>();
    for (const d of drivers) {
      const entry = map.get(d.team) ?? { team: d.team, color: d.color, total: 0 };
      entry.total += d.total;
      map.set(d.team, entry);
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [drivers]);

  const me = drivers.find((d) => d.isPlayer);
  const myRank = me ? drivers.indexOf(me) + 1 : 0;

  return (
    <div className="space-y-3">
      <Panel accent="info" className="carbon">
        <div className="flex flex-wrap items-center gap-8">
          <div>
            <span className="label-xs">Projected championship position</span>
            <h1 className="font-display text-4xl font-bold tracking-wide uppercase text-primary">
              P{myRank || "—"}
            </h1>
          </div>
          <Stat label="Driver" value={PLAYER.name} size="lg" />
          <Stat label="Points this race" value={me?.racePoints ?? 0} size="lg" tone="go" />
          <Stat label="Season total" value={me?.total ?? 0} size="lg" />
          <Stat label="Current race pos" value={`P${state.position}`} size="lg" tone="info" />
        </div>
      </Panel>

      <div className="grid gap-3 xl:grid-cols-[1.4fr_1fr]">
        <Panel title="Drivers' standings">
          <table className="w-full text-sm">
            <thead>
              <tr className="label-xs text-left">
                <th className="py-1">#</th>
                <th>Driver</th>
                <th>Team</th>
                <th className="text-right">Race</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((d, i) => (
                <tr
                  key={d.code}
                  className={cn(
                    "border-t border-border/60",
                    d.isPlayer && "bg-primary/12 ring-1 ring-primary/30",
                  )}
                >
                  <td className="num py-1.5 text-muted-foreground">{i + 1}</td>
                  <td className="font-display tracking-wide uppercase">
                    <span className="mr-2 inline-block h-3 w-[3px] translate-y-0.5 rounded-full" style={{ background: d.color }} />
                    {d.name}
                  </td>
                  <td className="text-muted-foreground">{d.team}</td>
                  <td className="num text-right text-go">{d.racePoints || "—"}</td>
                  <td className="num text-right font-semibold">{d.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel title="Constructors' standings">
          <ul className="space-y-1.5">
            {constructors.map((c, i) => {
              const max = constructors[0]?.total || 1;
              return (
                <li key={c.team} className="rounded-sm border border-border bg-surface-2/50 p-2">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-sm tracking-wide uppercase">
                      {i + 1}. {c.team}
                    </span>
                    <span className="num text-sm font-semibold">{c.total}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-1">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(c.total / max) * 100}%`, background: c.color }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
