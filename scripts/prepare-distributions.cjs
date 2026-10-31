"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const targets = {
  desktop: path.join(root, "Xioleni Open PDF - Escritorio"),
  online: path.join(root, "Xioleni Open PDF - Online")
};

function assertInsideProject(target) {
  const relative = path.relative(root, target);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("La carpeta de publicación debe estar dentro de la carpeta del proyecto.");
  }
}

async function copyFile(source, target) {
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.copyFile(source, target);
}

async function copyDirectory(source, target) {
  await fs.mkdir(target, { recursive: true });
  await fs.cp(source, target, { recursive: true, force: true });
}

async function prepareDesktop() {
  const target = targets.desktop;
  assertInsideProject(target);
  await fs.mkdir(target, { recursive: true });

  const files = [
    ["OPEN PDF.html", "index.html"],
    ["desktop/main.cjs", "main.cjs"],
    ["desktop/preload.cjs", "preload.cjs"],
    ["desktop/package.json", "package.json"],
    ["README.md", "LEEME.txt"]
  ];
  for (const [source, destination] of files) {
    await copyFile(path.join(root, source), path.join(target, destination));
  }
  await copyDirectory(path.join(root, "assets"), path.join(target, "assets"));
  await copyDirectory(path.join(root, "vendor"), path.join(target, "vendor"));
}

async function prepareOnline() {
  const target = targets.online;
  assertInsideProject(target);
  await fs.mkdir(target, { recursive: true });

  const files = [
    ["OPEN PDF.html", "index.html"],
    ["online/manifest.webmanifest", "manifest.webmanifest"],
    ["online/service-worker.js", "service-worker.js"],
    ["online/robots.txt", "robots.txt"],
    ["online/_headers", "_headers"]
  ];
  for (const [source, destination] of files) {
    await copyFile(path.join(root, source), path.join(target, destination));
  }
  await copyDirectory(path.join(root, "assets"), path.join(target, "assets"));
  await copyDirectory(path.join(root, "vendor"), path.join(target, "vendor"));
}

async function main() {
  await prepareDesktop();
  await prepareOnline();
  console.log("Escritorio: " + targets.desktop);
  console.log("Web lista para subir: " + targets.online);
}

main().catch((error) => {
  console.error("No se pudieron preparar las carpetas de publicación:", error);
  process.exitCode = 1;
});
