"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const { app, BrowserWindow, dialog, ipcMain, Menu } = require("electron");
const { pathToFileURL } = require("node:url");

const APP_NAME = "Xioleni Open PDF";
const APP_ID = "com.xioleni.openpdf";
const MAX_PDF_SIZE = 512 * 1024 * 1024;
let mainWindow = null;
let activePdfPath = null;
let hasUnsavedChanges = false;
let allowWindowClose = false;
let closeDialogOpen = false;

app.setName(APP_NAME);
app.setAppUserModelId(APP_ID);

function sendToRenderer(channel) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send(channel);
}

function createApplicationMenu() {
  const menu = Menu.buildFromTemplate([
    {
      label: "Archivo",
      submenu: [
        { label: "Abrir PDF…", accelerator: "CmdOrCtrl+O", click: () => sendToRenderer("app:open-pdf") },
        { type: "separator" },
        { label: "Guardar", accelerator: "CmdOrCtrl+S", click: () => sendToRenderer("app:save-pdf") },
        { label: "Exportar PDF…", accelerator: "CmdOrCtrl+Shift+S", click: () => sendToRenderer("app:export-pdf") },
        { type: "separator" },
        { role: "quit", label: "Salir" }
      ]
    },
    {
      label: "Editar",
      submenu: [
        { label: "Deshacer", accelerator: "CmdOrCtrl+Z", click: () => sendToRenderer("app:undo") },
        { label: "Rehacer", accelerator: "CmdOrCtrl+Y", click: () => sendToRenderer("app:redo") },
        { type: "separator" },
        { role: "cut", label: "Cortar" },
        { role: "copy", label: "Copiar" },
        { role: "paste", label: "Pegar" },
        { role: "selectAll", label: "Seleccionar todo" }
      ]
    },
    {
      label: "Vista",
      submenu: [
        { role: "reload", label: "Recargar" },
        ...(app.isPackaged ? [] : [{ role: "toggleDevTools", label: "Herramientas de desarrollo" }]),
        { type: "separator" },
        { role: "resetZoom", label: "Restablecer zoom" },
        { role: "zoomIn", label: "Acercar" },
        { role: "zoomOut", label: "Alejar" },
        { role: "togglefullscreen", label: "Pantalla completa" }
      ]
    },
    {
      label: "Ayuda",
      submenu: [
        {
          label: "Acerca de Xioleni Open PDF",
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              dialog.showMessageBox(mainWindow, {
                type: "info",
                title: "Xioleni Open PDF",
                message: APP_NAME,
                detail: "Editor de PDF para escritorio y navegador.\nTus documentos se procesan en este dispositivo."
              });
            }
          }
        }
      ]
    }
  ]);
  Menu.setApplicationMenu(menu);
}

function registerDocumentHandlers() {
  ipcMain.handle("document:open", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "Abrir un documento PDF",
      properties: ["openFile"],
      filters: [{ name: "Documentos PDF", extensions: ["pdf"] }]
    });
    if (result.canceled || result.filePaths.length === 0) return null;

    const selectedPath = result.filePaths[0];
    const file = await fs.readFile(selectedPath);
    if (file.byteLength > MAX_PDF_SIZE) {
      throw new Error("El PDF supera el límite local de 512 MB.");
    }

    activePdfPath = selectedPath;
    hasUnsavedChanges = false;
    mainWindow.setTitle(APP_NAME + " — " + path.basename(selectedPath));
    return { name: path.basename(selectedPath), bytes: new Uint8Array(file) };
  });

  ipcMain.handle("document:save", async (_event, request) => {
    if (!request || !request.bytes) throw new Error("No se recibieron los datos del documento.");
    const input = request.bytes;
    if (!(input instanceof ArrayBuffer) && !ArrayBuffer.isView(input)) {
      throw new Error("Los datos del documento no tienen un formato válido.");
    }

    const bytes = ArrayBuffer.isView(input)
      ? Buffer.from(input.buffer, input.byteOffset, input.byteLength)
      : Buffer.from(input);
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_PDF_SIZE) {
      throw new Error("El documento está vacío o supera el límite de 512 MB.");
    }

    let destinationPath = activePdfPath;
    if (request.saveAs || !destinationPath) {
      const result = await dialog.showSaveDialog(mainWindow, {
        title: "Exportar documento PDF",
        defaultPath: path.basename(
          String(request.suggestedName || "documento.pdf").replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
        ),
        buttonLabel: "Guardar PDF",
        filters: [{ name: "Documentos PDF", extensions: ["pdf"] }]
      });
      if (result.canceled || !result.filePath) return null;
      destinationPath = result.filePath;
      if (path.extname(destinationPath).toLowerCase() !== ".pdf") destinationPath += ".pdf";
    }

    let exists = false;
    try {
      await fs.access(destinationPath);
      exists = true;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }

    if (exists && destinationPath === activePdfPath) {
      const answer = await dialog.showMessageBox(mainWindow, {
        type: "warning",
        title: "Sobrescribir el PDF original",
        message: "Vas a sobrescribir el documento original.",
        detail: "Puedes conservarlo intacto seleccionando «Exportar» y guardando una copia.",
        buttons: ["Sobrescribir y guardar", "Cancelar"],
        defaultId: 1,
        cancelId: 1,
        noLink: true
      });
      if (answer.response !== 0) return null;
    } else if (exists) {
      const answer = await dialog.showMessageBox(mainWindow, {
        type: "warning",
        title: "Reemplazar archivo existente",
        message: "Ya existe un archivo con ese nombre.",
        detail: "¿Deseas reemplazarlo?",
        buttons: ["Reemplazar", "Cancelar"],
        defaultId: 1,
        cancelId: 1,
        noLink: true
      });
      if (answer.response !== 0) return null;
    }

    await fs.writeFile(destinationPath, bytes, { flag: "w" });
    activePdfPath = destinationPath;
    hasUnsavedChanges = false;
    const name = path.basename(destinationPath);
    mainWindow.setTitle(APP_NAME + " — " + name);
    return { name };
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: false,
    backgroundColor: "#f5f6f7",
    title: APP_NAME,
    icon: path.join(__dirname, "assets", "xioleni-open-pdf.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      devTools: !app.isPackaged
    }
  });

  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));

  const applicationUrl = pathToFileURL(path.join(__dirname, "index.html")).href;
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (url !== applicationUrl) event.preventDefault();
  });

  mainWindow.on("close", (event) => {
    if (!hasUnsavedChanges || allowWindowClose || closeDialogOpen) return;
    event.preventDefault();
    closeDialogOpen = true;
    dialog.showMessageBox(mainWindow, {
      type: "warning",
      title: "Cambios sin guardar",
      message: "¿Quieres guardar los cambios antes de salir?",
      buttons: ["Guardar y salir", "Salir sin guardar", "Seguir editando"],
      defaultId: 0,
      cancelId: 2,
      noLink: true
    }).then(({ response }) => {
      if (response === 0) {
        sendToRenderer("app:save-and-close");
      } else if (response === 1) {
        allowWindowClose = true;
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close();
      }
    }).catch((error) => {
      console.error("No se pudo confirmar el cierre del documento:", error);
      dialog.showErrorBox("No se pudo cerrar el documento", error.message);
    }).finally(() => {
      closeDialogOpen = false;
    });
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
    activePdfPath = null;
    hasUnsavedChanges = false;
    allowWindowClose = false;
  });

  mainWindow.loadFile(path.join(__dirname, "index.html"));
}

ipcMain.on("document:dirty", (event, dirty) => {
  if (mainWindow && event.sender === mainWindow.webContents) {
    hasUnsavedChanges = dirty === true;
  }
});

ipcMain.on("app:allow-close", (event) => {
  if (!mainWindow || event.sender !== mainWindow.webContents) return;
  hasUnsavedChanges = false;
  allowWindowClose = true;
  mainWindow.close();
});

registerDocumentHandlers();
createApplicationMenu();

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}).catch((error) => {
  console.error("No se pudo iniciar Xioleni Open PDF:", error);
  app.quit();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
