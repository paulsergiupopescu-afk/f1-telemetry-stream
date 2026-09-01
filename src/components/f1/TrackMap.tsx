import { trackPath, trackPoint, type TrackInfo } from "@/lib/f1/tracks";

export function TrackMap({
  track,
  pct,
  className,
}: {
  track: TrackInfo;
  pct: number;
  className?: string;
}) {
  const d = trackPath(track);
  const [x, y] = trackPoint(track, pct);
  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label={`${track.name} layout`}>
      <path d={d} fill="none" stroke="var(--surface-2)" strokeWidth={5.5} strokeLinejoin="round" />
      <path d={d} fill="none" stroke="var(--border)" strokeWidth={3.2} strokeLinejoin="round" />
      <path
        d={d}
        fill="none"
        stroke="var(--primary)"
        strokeWidth={1.1}
        strokeDasharray="3 6"
        opacity={0.6}
      />
      <circle cx={x} cy={y} r={3.4} fill="var(--primary)" opacity={0.25} />
      <circle cx={x} cy={y} r={1.9} fill="var(--primary)" />
    </svg>
  );
}
