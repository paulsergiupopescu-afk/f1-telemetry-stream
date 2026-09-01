#!/usr/bin/env node
/**
 * F1 Telemetry Hub — local UDP bridge.
 *
 * Listens to the EA F1 game UDP telemetry stream (default port 20777) and
 * re-publishes it to the browser as Server-Sent Events on
 * http://127.0.0.1:20778/stream. No dependencies — plain Node.
 *
 *   node bridge/f1-bridge.mjs            (defaults)
 *   F1_UDP_PORT=20777 F1_HTTP_PORT=20778 node bridge/f1-bridge.mjs
 */
import dgram from "node:dgram";
import http from "node:http";

import { parsePacket } from "./parse.mjs";

const UDP_PORT = Number(process.env.F1_UDP_PORT || 20777);
const HTTP_PORT = Number(process.env.F1_HTTP_PORT || 20778);

/** @type {Set<import("node:http").ServerResponse>} */
const clients = new Set();
let packets = 0;
let lastPacketAt = 0;

const socket = dgram.createSocket({ type: "udp4", reuseAddr: true });

socket.on("message", (msg) => {
  packets += 1;
  lastPacketAt = Date.now();
  const data = parsePacket(msg);
  if (!data) return;
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) res.write(payload);
});

socket.on("error", (err) => {
  console.error(`[bridge] UDP error: ${err.message}`);
  process.exit(1);
});

socket.bind(UDP_PORT, () => {
  console.log(`[bridge] listening for F1 telemetry on UDP ${UDP_PORT}`);
});

const server = http.createServer((req, res) => {
  const origin = req.headers.origin ?? "*";
  const cors = {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "*",
    Vary: "Origin",
  };

  if (req.method === "OPTIONS") {
    res.writeHead(204, cors);
    res.end();
    return;
  }

  if (req.url?.startsWith("/status")) {
    res.writeHead(200, { ...cors, "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        listening: true,
        udpPort: UDP_PORT,
        packets,
        receiving: Date.now() - lastPacketAt < 3000,
        clients: clients.size,
      }),
    );
    return;
  }

  if (req.url?.startsWith("/stream")) {
    res.writeHead(200, {
      ...cors,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    });
    res.write(`retry: 2000\n\n`);
    clients.add(res);
    console.log(`[bridge] client connected (${clients.size} total)`);
    const ping = setInterval(() => res.write(": ping\n\n"), 15000);
    req.on("close", () => {
      clearInterval(ping);
      clients.delete(res);
    });
    return;
  }

  res.writeHead(404, cors);
  res.end("F1 bridge: use /stream or /status");
});

server.listen(HTTP_PORT, "127.0.0.1", () => {
  console.log(`[bridge] SSE endpoint at http://127.0.0.1:${HTTP_PORT}/stream`);
  console.log(`[bridge] point the game's UDP telemetry at 127.0.0.1:${UDP_PORT}, format 2024/2025`);
});

process.on("SIGINT", () => {
  socket.close();
  server.close();
  process.exit(0);
});
