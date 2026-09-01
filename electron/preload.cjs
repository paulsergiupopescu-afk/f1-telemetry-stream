const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("f1bridge", {
  onTelemetry: (cb) => {
    const handler = (_e, packet) => cb(packet);
    ipcRenderer.on("f1:telemetry", handler);
    return () => ipcRenderer.removeListener("f1:telemetry", handler);
  },
  status: () => ipcRenderer.invoke("f1:status"),
});
