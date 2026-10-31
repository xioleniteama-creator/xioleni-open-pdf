"use strict";

const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");

const siteRoot = path.resolve(__dirname, "..", "Xioleni Open PDF - Online");
const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 4173);
const allowedTopLevel = new Set([
  "index.html",
  "manifest.webmanifest",
  "service-worker.js",
  "robots.txt",
  "_headers"
]);
const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".ico": "image/vnd.microsoft.icon",
  ".pdf": "application/pdf"
};
const securityHeaders = {
  "Content-Security-Policy": "default-src 'self' blob: data:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'self'; worker-src 'self' blob:; font-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), display-capture=()"
};

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT debe ser un puerto entre 1 y 65535.");
}

function isAllowed(relativePath) {
  return allowedTopLevel.has(relativePath)
    || relativePath.startsWith("assets" + path.sep)
    || relativePath === "assets"
    || relativePath.startsWith("vendor" + path.sep)
    || relativePath === "vendor";
}

const server = http.createServer((request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { ...securityHeaders, Allow: "GET, HEAD", "Content-Type": "text/plain; charset=utf-8" });
    response.end("Método no permitido.");
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  } catch {
    response.writeHead(400, securityHeaders);
    response.end("Solicitud no válida.");
    return;
  }

  if (pathname.includes("\0")) {
    response.writeHead(400, securityHeaders);
    response.end("Solicitud no válida.");
    return;
  }

  if (pathname === "/") pathname = "/index.html";
  const relativePath = pathname.replace(/^[/\\]+/, "");
  const filePath = path.resolve(siteRoot, relativePath);
  const containedPath = path.relative(siteRoot, filePath);

  if (!containedPath || containedPath.startsWith("..") || path.isAbsolute(containedPath) || !isAllowed(containedPath)) {
    response.writeHead(404, { ...securityHeaders, "Content-Type": "text/plain; charset=utf-8" });
    response.end("No se encontró el recurso solicitado.");
    return;
  }

  fs.stat(filePath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      response.writeHead(statError && statError.code !== "ENOENT" ? 500 : 404, {
        ...securityHeaders,
        "Content-Type": "text/plain; charset=utf-8"
      });
      response.end(statError && statError.code !== "ENOENT" ? "No se pudo leer el recurso." : "No se encontró el recurso solicitado.");
      return;
    }

    response.writeHead(200, {
      ...securityHeaders,
      "Content-Type": mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      "Content-Length": stats.size,
      "Cache-Control": "no-cache"
    });
    if (request.method === "HEAD") {
      response.end();
      return;
    }
    const stream = fs.createReadStream(filePath);
    stream.on("error", (error) => {
      console.error("No se pudo servir " + relativePath + ":", error);
      if (response.headersSent) {
        response.destroy();
        return;
      }
      response.writeHead(500, { ...securityHeaders, "Content-Type": "text/plain; charset=utf-8" });
      response.end("No se pudo leer el recurso.");
    });
    stream.pipe(response);
  });
});

server.on("error", (error) => {
  console.error("No se pudo iniciar el servidor web:", error);
  process.exitCode = 1;
});

server.listen(port, host, () => {
  console.log("Xioleni Open PDF listo en http://" + host + ":" + port);
  console.log("Para publicarlo en Internet, sube el contenido de «Xioleni Open PDF - Online» a un servidor web estático.");
});
