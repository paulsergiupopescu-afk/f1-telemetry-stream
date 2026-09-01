import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { Bar, Panel, Stat } from "@/components/f1/Panel";
import { loadSessions, type StoredSession } from "@/lib/f1/history";
import { cleanLaps, fmtDelta, fmtLap, mean, median } from "@/lib/f1/format";
import { getTrack } from "@/lib/f1/tracks";
import { useTelemetry } from "@/lib/f1/store";
import { PLAYER } from "@/lib/f1/drivers";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Driver Profile — F1 Telemetry Hub" },
      {
        name: "description",
        content:
          "Your driving fingerprint: consistency, tyre management, race craft and per-circuit strengths built from saved sessions.",
      },
      { property: "og:title", content: "Driver Profile — F1 Telemetry Hub" },
      {
        property: "og:description",
        content: "Consistency, tyre management and circuit strengths built from your own telemetry.",
      },
    ],
  }),
  component: Profile,
});

function score(v: number, best: number, worst: number) {
  const t = (worst - v) / (worst - best);
  return Math.max(0, Math.min(100, t * 100));
}

function Profile() {
  const { state } = useTelemetry();
  const [sessions, setSessions] = useState<StoredSession[]>([]);
  useEffect(() => setSessions(loadSessions()), []);

  const stats = useMemo(() => {
    const all = sessions.flatMap((s) => s.laps);
    const live = state.laps;
    const laps = [...all, ...live];
    const valid = laps.filter((l) => l.valid).map((l) => l.timeMs);
    const clean = cleanLaps(valid);
    const spread = clean.length > 2 ? median(clean) - Math.min(...clean) : 0;
    const invalidRate = laps.length ? (laps.filter((l) => !l.valid).length / laps.length) * 100 : 0;
    const wearPerLap = laps.length ? mean(laps.map((l) => l.wear)) / Math.max(1, mean(laps.map((l) => l.tyreAge || 1))) : 0;
    return {
      lapCount: laps.length,
      sessionCount: sessions.length,
      bestMs: valid.length ? Math.min(...valid) : state.bestLapMs,
      medianMs: median(clean),
      spread,
      invalidRate,
      consistency: score(spread, 150, 2000),
      cleanliness: score(invalidRate, 0, 35),
      tyreCare: score(wearPerLap, 0.9, 3.4),
      raceCraft: score(state.position, 1, 20),
    };
  }, [sessions, state]);

  const byTrack = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const s of sessions) {
      const valid = s.laps.filter((l) => l.valid).map((l) => l.timeMs);
      if (!valid.length) continue;
      map.set(s.trackId, [...(map.get(s.trackId) ?? []), Math.min(...valid)]);
    }
    return [...map.entries()].map(([id, times]) => ({
      track: getTrack(id),
      best: Math.min(...times),
      runs: times.length,
    }));
  }, [sessions]);

  const skills = [
    { label: "Consistency", value: stats.consistency, tone: "go" as const },
    { label: "Tyre management", value: stats.tyreCare, tone: "info" as const },
    { label: "Clean driving", value: stats.cleanliness, tone: "warn" as const },
    { label: "Race craft", value: stats.raceCraft, tone: "danger" as const },
  ];

  return (
    <div className="grid gap-3 xl:grid-cols-[1fr_1.2fr]">
      <div className="space-y-3">
        <Panel accent="info" className="carbon">
          <span className="label-xs">Driver</span>
          <h1 className="font-display text-4xl font-bold tracking-wide uppercase">{PLAYER.name}</h1>
          <p className="text-sm text-muted-foreground">
            {PLAYER.team} · #{PLAYER.number}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <Stat label="Sessions logged" value={stats.sessionCount} />
            <Stat label="Laps analysed" value={stats.lapCount} />
            <Stat label="Personal best" value={fmtLap(stats.bestMs)} tone="go" />
            <Stat label="Median pace" value={fmtLap(stats.medianMs)} />
          </div>
        </Panel>

        <Panel title="Driving fingerprint">
          <div className="space-y-3">
            {skills.map((s) => (
              <div key={s.label}>
                <div className="label-xs mb-1 flex justify-between">
                  <span>{s.label}</span>
                  <span className="num">{s.value.toFixed(0)}</span>
                </div>
                <Bar value={s.value} tone={s.tone} />
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-3">
            <Stat label="Median − best" value={fmtDelta(stats.spread)} size="sm" tone={stats.spread < 500 ? "go" : "warn"} />
            <Stat label="Invalid rate" value={`${stats.invalidRate.toFixed(0)}%`} size="sm" tone={stats.invalidRate > 20 ? "danger" : "neutral"} />
          </div>
        </Panel>
      </div>

      <div className="space-y-3">
        <Panel title="Circuit record">
          {byTrack.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Save a few sessions to build your per-circuit record.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="label-xs text-left">
                  <th className="py-1">Circuit</th>
                  <th>Runs</th>
                  <th>Best lap</th>
                  <th>Vs base</th>
                </tr>
              </thead>
              <tbody className="num">
                {byTrack.map((t) => (
                  <tr key={t.track.id} className="border-t border-border/60">
                    <td className="py-1.5 font-display tracking-wide uppercase">{t.track.short}</td>
                    <td>{t.runs}</td>
                    <td>{fmtLap(t.best)}</td>
                    <td className={t.best <= t.track.lapTimeMs ? "text-go" : "text-warn"}>
                      {fmtDelta(t.best - t.track.lapTimeMs)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        <Panel title="Coaching focus" accent="warn">
          <ul className="space-y-2 text-sm">
            {[
              stats.consistency < 60
                ? "Lap-to-lap consistency is your biggest gain — repeat braking references before chasing lap time."
                : "Consistency is strong; start attacking the last two tenths in the medium-speed corners.",
              stats.tyreCare < 60
                ? "Tyre wear is high for your stint lengths — smoother entries will unlock a longer first stint."
                : "Tyre management supports an offset strategy; consider extending the first stint for the undercut.",
              stats.cleanliness < 60
                ? "Too many invalid laps — build a margin at the exit kerbs you keep clipping."
                : "Track limits are under control. Keep it.",
            ].map((tip) => (
              <li key={tip} className="flex gap-2 text-foreground/85">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                {tip}
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
