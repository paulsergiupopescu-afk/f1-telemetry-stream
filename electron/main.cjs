const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const dgram = require("dgram");
const fs = require("fs");
const http = require("http");
const { pathToFileURL } = require("url");

/** Full EA F1 packet parser shared with the web bridge (ESM, loaded lazily). */
let parsePacket = null;
void import(pathToFileURL(path.join(__dirname, "..", "bridge", "parse.mjs")).href)
  .then((m) => {
    parsePacket = m.parsePacket;
  })
  .catch(() => {
    /* fall back to the built-in minimal parser below */
  });

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".json": "application/json",
};

/**
 * The UI is a client-side router, so it is served over a loopback HTTP server
 * (file:// breaks history routing) with an index.html fallback for every path.
 */
function serveApp() {
  const root = path.join(__dirname, "..", "dist-desktop");
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent((req.url || "/").split("?")[0]);
    let file = path.join(root, url);
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      file = path.join(root, "index.html");
    }
    res.writeHead(200, { "content-type": MIME[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(`http://127.0.0.1:${server.address().port}`));
  });
}

const UDP_PORT = Number(process.env.F1_UDP_PORT || 20777);
let win = null;
let socket = null;
let packets = 0;

async function createWindow() {
  win = new BrowserWindow({
    width: 1600,
    height: 980,
    backgroundColor: "#0a0d12",
    autoHideMenuBar: true,
    title: "F1 Telemetry Hub",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  const base = await serveApp();
  await win.loadURL(base);
}

/**
 * Minimal EA F1 24/25/26 UDP parser.
 * Only the packets the dashboard needs are decoded; anything else is ignored.
 */
function parse(buf) {
  if (buf.length < 29) return null;
  const packetId = buf.readUInt8(6);
  const playerIndex = buf.readUInt8(27);
  const base = 29;

  if (packetId === 6) {
    // Car telemetry — 60 bytes per car in F1 24+
    const off = base + playerIndex * 60;
    if (buf.length < off + 60) return null;
    return {
      speed: buf.readUInt16LE(off),
      throttle: buf.readFloatLE(off + 2) * 100,
      steering: buf.readFloatLE(off + 6),
      brake: buf.readFloatLE(off + 10) * 100,
      gear: buf.readInt8(off + 15),
      rpm: buf.readUInt16LE(off + 16),
      drs: buf.readUInt8(off + 18) === 1,
    };
  }

  if (packetId === 2) {
    // Lap data — 57 bytes per car
    const off = base + playerIndex * 57;
    if (buf.length < off + 57) return null;
    return {
      lastLapMs: buf.readUInt32LE(off),
      currentLapMs: buf.readUInt32LE(off + 4),
      lapDistancePct: Math.max(0, Math.min(1, buf.readFloatLE(off + 12) / 5000)),
    };
  }

  return null;
}

function startListener() {
  socket = dgram.createSocket({ type: "udp4", reuseAddr: true });
  socket.on("message", (msg) => {
    packets += 1;
    const data = parsePacket ? parsePacket(msg) : parse(msg);
    if (data && win && !win.isDestroyed()) win.webContents.send("f1:telemetry", data);
  });
  socket.on("error", (err) => console.error("UDP error", err));
  socket.bind(UDP_PORT);
}

ipcMain.handle("f1:status", () => ({ listening: Boolean(socket), port: UDP_PORT, packets }));

app.whenReady().then(async () => {
  await createWindow();
  startListener();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow();
  });
});

app.on("window-all-closed", () => {
  if (socket) socket.close();
  if (process.platform !== "darwin") app.quit();
});
