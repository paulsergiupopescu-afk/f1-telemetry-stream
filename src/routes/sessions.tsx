import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";

import { Panel, Stat } from "@/components/f1/Panel";
import { PaceChart } from "@/components/f1/PaceChart";
import { Button } from "@/components/ui/button";
import { deleteSession, loadSessions, type StoredSession } from "@/lib/f1/history";
import { COMPOUND_LABEL, compoundVar, fmtDelta, fmtLap } from "@/lib/f1/format";
import { getTrack } from "@/lib/f1/tracks";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/sessions")({
  head: () => ({
    meta: [
      { title: "Session Reports — F1 Telemetry Hub" },
      {
        name: "description",
        content:
          "Review saved sessions: best and median lap, consistency, invalid-lap rate and lap-by-lap traces.",
      },
      { property: "og:title", content: "Session Reports — F1 Telemetry Hub" },
      {
        property: "og:description",
        content: "Saved race and practice reports with pace traces and consistency metrics.",
      },
    ],
  }),
  component: Sessions,
});

function Sessions() {
  const [sessions, setSessions] = useState<StoredSession[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const list = loadSessions();
    setSessions(list);
    setSelectedId(list[0]?.id ?? null);
  }, []);

  const selected = sessions.find((s) => s.id === selectedId) ?? null;

  return (
    <div className="grid gap-3 xl:grid-cols-[20rem_1fr]">
      <Panel title="Archive" right={<span className="num text-[11px] text-muted-foreground">{sessions.length}</span>}>
        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No saved sessions yet. Use “Save session” on the Solo Engineer page after some laps.
          </p>
        ) : (
          <ul className="max-h-[32rem] space-y-1 overflow-y-auto pr-1">
            {sessions.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => setSelectedId(s.id)}
                  className={cn(
                    "w-full rounded-sm border px-2.5 py-2 text-left transition-colors",
                    s.id === selectedId
                      ? "border-primary/50 bg-primary/12"
                      : "border-border hover:bg-surface-2",
                  )}
                >
                  <div className="font-display text-sm tracking-wider uppercase">{s.label}</div>
                  <div className="num flex justify-between text-[11px] text-muted-foreground">
                    <span>{getTrack(s.trackId).short}</span>
                    <span style={{ color: compoundVar(s.compound) }}>
                      {COMPOUND_LABEL[s.compound]}
                    </span>
                    <span>{fmtLap(s.bestMs)}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {selected ? (
        <div className="space-y-3">
          <Panel
            title={selected.label}
            accent="info"
            right={
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  deleteSession(selected.id);
                  const list = loadSessions();
                  setSessions(list);
                  setSelectedId(list[0]?.id ?? null);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
            }
          >
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              <Stat label="Circuit" value={getTrack(selected.trackId).short} sub={getTrack(selected.trackId).country} />
              <Stat label="Best lap" value={fmtLap(selected.bestMs)} tone="go" />
              <Stat label="Median" value={fmtLap(selected.medianMs)} />
              <Stat label="Theoretical" value={fmtLap(selected.theoreticalMs)} tone="info" />
              <Stat
                label="Consistency"
                value={fmtDelta(selected.medianMs - selected.bestMs)}
                tone={selected.medianMs - selected.bestMs < 500 ? "go" : "warn"}
              />
              <Stat
                label="Invalid laps"
                value={`${selected.invalidRate.toFixed(0)}%`}
                tone={selected.invalidRate > 20 ? "danger" : "neutral"}
              />
            </div>
          </Panel>

          <Panel title="Pace trace">
            <div className="h-64">
              <PaceChart laps={selected.laps} />
            </div>
          </Panel>

          <Panel title="Lap log">
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-surface">
                  <tr className="label-xs text-left">
                    <th className="py-1">Lap</th>
                    <th>Time</th>
                    <th>S1</th>
                    <th>S2</th>
                    <th>S3</th>
                    <th>Tyre</th>
                    <th>Wear</th>
                    <th>Pos</th>
                  </tr>
                </thead>
                <tbody className="num">
                  {selected.laps.map((l) => (
                    <tr
                      key={l.lap}
                      className={cn("border-t border-border/60", !l.valid && "text-muted-foreground line-through")}
                    >
                      <td className="py-1">{l.lap}</td>
                      <td className={l.timeMs === selected.bestMs ? "text-go" : ""}>{fmtLap(l.timeMs)}</td>
                      <td>{(l.s1 / 1000).toFixed(3)}</td>
                      <td>{(l.s2 / 1000).toFixed(3)}</td>
                      <td>{(l.s3 / 1000).toFixed(3)}</td>
                      <td style={{ color: compoundVar(l.compound) }}>
                        {COMPOUND_LABEL[l.compound][0]}
                        {l.tyreAge}
                      </td>
                      <td>{l.wear.toFixed(0)}%</td>
                      <td>P{l.position}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      ) : (
        <Panel title="Report">
          <p className="text-sm text-muted-foreground">Select a saved session to see the full report.</p>
        </Panel>
      )}
    </div>
  );
}
