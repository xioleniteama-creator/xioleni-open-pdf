"use strict";

const { contextBridge, ipcRenderer } = require("electron");

function subscribe(channel, callback) {
  if (typeof callback !== "function") {
    throw new TypeError("El controlador de eventos debe ser una función.");
  }
  const listener = () => callback();
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld("xioleniDesktop", Object.freeze({
  isDesktop: true,
  openPdf: () => ipcRenderer.invoke("document:open"),
  savePdf: (request) => ipcRenderer.invoke("document:save", request),
  notifyDirty: (dirty) => ipcRenderer.send("document:dirty", dirty === true),
  allowClose: () => ipcRenderer.send("app:allow-close"),
  onOpenPdf: (callback) => subscribe("app:open-pdf", callback),
  onSavePdf: (callback) => subscribe("app:save-pdf", callback),
  onExportPdf: (callback) => subscribe("app:export-pdf", callback),
  onUndo: (callback) => subscribe("app:undo", callback),
  onRedo: (callback) => subscribe("app:redo", callback),
  onSaveAndClose: (callback) => subscribe("app:save-and-close", callback)
}));
