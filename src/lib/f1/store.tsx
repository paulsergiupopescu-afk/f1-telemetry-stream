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
import { applyLivePacket, type RawPacket } from "./live";
import type { Compound, RaceControlPhase, TelemetryState } from "./types";

interface Bridge {
  onTelemetry: (cb: (packet: RawPacket) => void) => () => void;
  status: () => Promise<{ listening: boolean; port: number; packets: number }>;
}

declare global {
  interface Window {
    f1bridge?: Bridge;
  }
}

export type LiveStatus = "off" | "connecting" | "connected" | "error";

const DEFAULT_BRIDGE = "http://127.0.0.1:20778";

interface TelemetryContextValue {
  state: TelemetryState;
  strategy: StrategyResult;
  running: boolean;
  speed: number;
  desktop: boolean;
  live: LiveStatus;
  livePackets: number;
  bridgeUrl: string;
  setBridgeUrl: (url: string) => void;
  connectLive: () => void;
  disconnectLive: () => void;
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
  const [live, setLive] = useState<LiveStatus>("off");
  const [livePackets, setLivePackets] = useState(0);
  const [bridgeUrl, setBridgeUrlState] = useState(DEFAULT_BRIDGE);
  const [liveWanted, setLiveWanted] = useState(false);
  const frame = useRef<number | null>(null);
  const last = useRef<number>(0);
  const speedRef = useRef(speed);
  speedRef.current = speed;

  useEffect(() => {
    setDesktop(typeof window !== "undefined" && Boolean(window.f1bridge));
    const stored = window.localStorage?.getItem("f1.bridgeUrl");
    if (stored) setBridgeUrlState(stored);
    // Only attach to the local bridge when the user has enabled it before.
    if (window.localStorage?.getItem("f1.liveAuto") === "on") setLiveWanted(true);
  }, []);

  const setBridgeUrl = useCallback((url: string) => {
    setBridgeUrlState(url);
    window.localStorage?.setItem("f1.bridgeUrl", url);
  }, []);

  const connectLive = useCallback(() => {
    window.localStorage?.setItem("f1.liveAuto", "on");
    setLiveWanted(true);
  }, []);

  const disconnectLive = useCallback(() => {
    window.localStorage?.setItem("f1.liveAuto", "off");
    setLiveWanted(false);
    setLive("off");
    setState((prev) => (prev.connection === "LIVE" ? { ...prev, connection: "SIM" } : prev));
  }, []);

  // Desktop bridge (Electron main process opens the UDP socket directly).
  useEffect(() => {
    if (typeof window === "undefined" || !window.f1bridge) return;
    setLive("connected");
    const off = window.f1bridge.onTelemetry((packet) => {
      setLivePackets((n) => n + 1);
      setState((prev) => applyLivePacket(prev, packet));
    });
    return off;
  }, []);

  // Browser bridge: SSE stream from the local `npm run bridge` process.
  useEffect(() => {
    if (typeof window === "undefined" || window.f1bridge || !liveWanted) return;
    let cancelled = false;
    let es: EventSource | null = null;
    const base = bridgeUrl.replace(/\/$/, "");
    setLive("connecting");

    // Probe first so a missing bridge fails once instead of retrying forever.
    void fetch(`${base}/status`, { cache: "no-store" })
      .then((r) => {
        if (cancelled || !r.ok) throw new Error("bridge unavailable");
        es = new EventSource(`${base}/stream`);
        es.onopen = () => !cancelled && setLive("connected");
        es.onerror = () => {
          if (cancelled) return;
          setLive("error");
          es?.close();
        };
        es.onmessage = (evt) => {
          if (cancelled) return;
          try {
            const packet = JSON.parse(evt.data) as RawPacket;
            setLivePackets((n) => n + 1);
            setState((prev) => applyLivePacket(prev, packet));
          } catch {
            /* ignore malformed frame */
          }
        };
      })
      .catch(() => {
        if (!cancelled) setLive("error");
      });

    return () => {
      cancelled = true;
      es?.close();
    };
  }, [liveWanted, bridgeUrl]);

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
    live,
    livePackets,
    bridgeUrl,
    setBridgeUrl,
    connectLive,
    disconnectLive,
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
