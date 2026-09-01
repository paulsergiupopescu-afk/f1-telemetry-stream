import { cn } from "@/lib/utils";
import { toneText, toneBg } from "./Panel";
import type { Call } from "@/lib/f1/engineer";

export function CommandBanner({ call }: { call: Call }) {
  return (
    <div
      key={call.call}
      className={cn(
        "animate-slam relative overflow-hidden rounded-lg border px-4 py-3 carbon",
        toneBg[call.tone],
      )}
    >
      <div className="sweep-line">
        <span
          className="absolute inset-y-0 -left-1/3 w-1/4 bg-linear-to-r from-transparent via-foreground/8 to-transparent"
          style={{ animation: "sweep 3.4s linear infinite" }}
        />
      </div>
      <div className="relative flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h1
          className={cn(
            "font-display text-3xl font-bold tracking-wide uppercase md:text-5xl",
            toneText[call.tone],
          )}
        >
          {call.call}
        </h1>
        <p className="text-sm text-foreground/80">{call.detail}</p>
      </div>
    </div>
  );
}
