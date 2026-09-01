import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { createInitialState, defaultSimOptions, pitStop, setPhase, step, type SimOptions } from "./sim";
import { computeStrategy, type StrategyResult } from "./strategy";
import { saveSession, type StoredSession } from "./history";
import type { Compound, RaceControlPhase, TelemetryState } from "./types";

interface Bridge {
  onTelemetry: (cb: (packet: Partial<TelemetryState>) => void) => () => void;
  status: () => Promise<{ listening: boolean; port: number; packets: number }>;
}

declare global {
  interface Window {
    f1bridge?: Bridge;
  }
}

interface TelemetryContextValue {
  state: TelemetryState;
  strategy: StrategyResult;
  running: boolean;
  speed: number;
  desktop: boolean;
  setRunning: (v: boolean) => void;
  setSpeed: (v: number) => void;
  restart: (opts: Partial<SimOptions>) => void;
  options: SimOptions;
  doPit: (c: Compound) => void;
  forcePhase: (p: RaceControlPhase) => void;
  save: () => StoredSession | null;
}

const Ctx = createContext<TelemetryContextValue | null>(null);

export function TelemetryProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<SimOptions>(() => defaultSimOptions());
  const [state, setState] = useState<TelemetryState>(() => createInitialState(defaultSimOptions()));
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(6);
  const [desktop, setDesktop] = useState(false);
  const frame = useRef<number | null>(null);
  const last = useRef<number>(0);
  const speedRef = useRef(speed);
  speedRef.current = speed;

  useEffect(() => {
    setDesktop(typeof window !== "undefined" && Boolean(window.f1bridge));
  }, []);

  // Live desktop bridge (Electron UDP listener) takes over when present.
  useEffect(() => {
    if (typeof window === "undefined" || !window.f1bridge) return;
    const off = window.f1bridge.onTelemetry((packet) => {
      setState((prev) => ({ ...prev, ...packet, connection: "LIVE" }));
    });
    return off;
  }, []);

  useEffect(() => {
    if (!running) return;
    let cancelled = false;
    const loop = (t: number) => {
      if (cancelled) return;
      const dt = last.current ? Math.min(120, t - last.current) : 16;
      last.current = t;
      setState((prev) => (prev.connection === "LIVE" ? prev : step(prev, dt * speedRef.current)));
      frame.current = requestAnimationFrame(loop);
    };
    frame.current = requestAnimationFrame(loop);
    return () => {
      cancelled = true;
      last.current = 0;
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [running]);

  const strategy = useMemo(() => computeStrategy(state), [state]);

  const restart = useCallback((partial: Partial<SimOptions>) => {
    setOptions((prev) => {
      const next = { ...prev, ...partial };
      setState(createInitialState(next));
      return next;
    });
    setRunning(true);
  }, []);

  const doPit = useCallback((c: Compound) => setState((prev) => pitStop(prev, c)), []);
  const forcePhase = useCallback((p: RaceControlPhase) => setState((prev) => setPhase(prev, p)), []);
  const save = useCallback(() => saveSession(state), [state]);

  const value: TelemetryContextValue = {
    state,
    strategy,
    running,
    speed,
    desktop,
    setRunning,
    setSpeed,
    restart,
    options,
    doPit,
    forcePhase,
    save,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTelemetry(): TelemetryContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTelemetry must be used inside <TelemetryProvider>");
  return ctx;
}
