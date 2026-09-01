import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { fmtLap, mean, cleanLaps } from "@/lib/f1/format";
import type { LapRecord } from "@/lib/f1/types";

export function PaceChart({ laps }: { laps: LapRecord[] }) {
  const data = laps.filter((l) => l.valid).map((l) => ({ lap: l.lap, time: l.timeMs / 1000 }));
  const avg = mean(cleanLaps(data.map((d) => d.time)));

  if (data.length < 2)
    return (
      <div className="grid h-full min-h-24 place-items-center text-center text-sm text-muted-foreground">
        Collecting clean laps…
      </div>
    );

  return (
    <ResponsiveContainer width="100%" height="100%" minHeight={120}>
      <AreaChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: -18 }}>
        <defs>
          <linearGradient id="paceFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.45} />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--grid)" vertical={false} />
        <XAxis dataKey="lap" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} tickLine={false} axisLine={false} />
        <YAxis
          domain={["dataMin - 0.4", "dataMax + 0.4"]}
          tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
          tickFormatter={(v: number) => v.toFixed(1)}
          tickLine={false}
          axisLine={false}
          width={42}
        />
        <Tooltip
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            fontSize: 12,
          }}
          labelFormatter={(l) => `Lap ${l}`}
          formatter={(v: number) => [fmtLap(v * 1000), "Lap time"]}
        />
        {avg > 0 ? <ReferenceLine y={avg} stroke="var(--go)" strokeDasharray="4 4" /> : null}
        <Area type="monotone" dataKey="time" stroke="var(--primary)" strokeWidth={2} fill="url(#paceFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
