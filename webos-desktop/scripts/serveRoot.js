import { createServer } from "http";
import { readFile, stat } from "fs/promises";
import { dirname, extname, join, normalize, relative, sep } from "path";
import { fileURLToPath } from "url";

const currentFile = fileURLToPath(import.meta.url);
const currentDir = dirname(currentFile);
const rootDir = join(currentDir, "..", "..");
const distDir = join(currentDir, "..", "dist");
const hostArgIndex = process.argv.findIndex((arg) => arg === "--host");
const hostName =
  process.env.HOST ||
  (hostArgIndex !== -1 ? process.argv[hostArgIndex + 1] : null) ||
  "0.0.0.0";
const rootPort = 4001;
const distPort = 4000;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".wasm": "application/wasm",
  ".map": "application/json; charset=utf-8",
};

function resolveSafePath(baseDir, urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const normalized = normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  const fullPath = join(baseDir, normalized);
  const relPath = relative(baseDir, fullPath);
  const outsideRoot = relPath.startsWith(`..${sep}`) || relPath === "..";
  if (outsideRoot) {
    return null;
  }
  return fullPath;
}

async function serveFile(filePath, response, method) {
  const content = await readFile(filePath);
  const mimeType =
    mimeTypes[extname(filePath).toLowerCase()] || "application/octet-stream";
  response.writeHead(200, {
    "Content-Type": mimeType,
    "Content-Length": content.length,
  });
  if (method === "HEAD") {
    response.end();
    return;
  }
  response.end(content);
}

function startStaticServer(baseDir, port) {
  const server = createServer(async (request, response) => {
    try {
      if (request.method !== "GET" && request.method !== "HEAD") {
        response.writeHead(405, {
          "Content-Type": "text/plain; charset=utf-8",
        });
        response.end("Method Not Allowed");
        return;
      }
      let targetPath = resolveSafePath(baseDir, request.url || "/");
      if (!targetPath) {
        response.writeHead(403, {
          "Content-Type": "text/plain; charset=utf-8",
        });
        response.end("Forbidden");
        return;
      }
      const fileInfo = await stat(targetPath).catch(() => null);
      if (fileInfo && fileInfo.isDirectory()) {
        targetPath = join(targetPath, "index.html");
      }
      await serveFile(targetPath, response, request.method);
    } catch (error) {
      if (error && error.code === "ENOENT") {
        response.writeHead(404, {
          "Content-Type": "text/plain; charset=utf-8",
        });
        response.end("Not Found");
        return;
      }
      response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Internal Server Error");
    }
  });
  server.listen(port, hostName, () => {
    console.log(`Serving ${baseDir} at http://${hostName}:${port}`);
  });
  return server;
}

const serveTarget = process.argv[2] || "all";
if (serveTarget === "dist") {
  startStaticServer(distDir, distPort);
} else if (serveTarget === "root") {
  startStaticServer(rootDir, rootPort);
} else {
  startStaticServer(distDir, distPort);
  startStaticServer(rootDir, rootPort);
}
