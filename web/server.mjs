import http from "node:http";
import { readFile, readdir, stat } from "node:fs/promises";
import { extname, join, normalize, relative } from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = fileURLToPath(new URL("./", import.meta.url));
const projectRoot = normalize(join(webRoot, ".."));
const port = Number.parseInt(process.env.PORT || process.argv[2] || "4182", 10);
const host = process.env.HOST || "127.0.0.1";
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2"
};

/** 开发期短缓存：允许浏览器复用，仍能较快拿到改稿 */
const CACHE = {
  html: "no-cache",
  asset: "public, max-age=120",
  catalog: "public, max-age=30",
  story: "public, max-age=30",
  index: "public, max-age=20"
};

let projectIndexCache = { at: 0, files: null };
const PROJECT_INDEX_TTL_MS = 15_000;

function safeJoin(root, pathname) {
  const relativePath = decodeURIComponent(pathname).replace(/^\/+/, "");
  const resolved = normalize(join(root, relativePath));
  const rootNorm = normalize(root);
  if (resolved === rootNorm) return resolved;
  const sep = rootNorm.endsWith("\\") || rootNorm.endsWith("/") ? "" : (rootNorm.includes("\\") ? "\\" : "/");
  return resolved.startsWith(rootNorm + sep) || resolved.startsWith(rootNorm) ? resolved : null;
}

async function listMarkdown(directory, base = directory, depth = 0) {
  if (depth > 5) return [];
  const output = [];
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return [];
  }
  for (const entry of entries) {
    if (
      entry.name.startsWith(".") ||
      entry.name === "node_modules" ||
      entry.name === "drafts" ||
      entry.name === "archive" ||
      entry.name === "_trash_broken_p001" ||
      entry.name === "api" ||
      entry.name === "web" ||
      entry.name === "scripts" ||
      entry.name === ".git"
    ) {
      continue;
    }
    const full = join(directory, entry.name);
    if (entry.isDirectory()) {
      output.push(...await listMarkdown(full, base, depth + 1));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      try {
        const info = await stat(full);
        // 只取标题 + 短检索窗，避免整仓全文拖垮首启
        const content = await readFile(full, "utf8");
        const heading = content.match(/^#\s+(.+)$/m)?.[1]?.trim() || entry.name.replace(/\.md$/i, "");
        output.push({
          path: relative(base, full).replaceAll("\\", "/"),
          title: heading,
          size: info.size,
          modified: info.mtime.toISOString(),
          searchText: content.slice(0, 6000)
        });
      } catch {
        /* skip unreadable */
      }
    }
  }
  return output;
}

async function getProjectIndex() {
  const now = Date.now();
  if (projectIndexCache.files && now - projectIndexCache.at < PROJECT_INDEX_TTL_MS) {
    return projectIndexCache.files;
  }
  const files = await listMarkdown(projectRoot);
  projectIndexCache = { at: now, files };
  return files;
}

function cacheForPath(pathname, target) {
  const ext = extname(target || pathname).toLowerCase();
  if (pathname === "/stories/catalog.json") return CACHE.catalog;
  if (pathname.startsWith("/stories/") || pathname.startsWith("/project/")) return CACHE.story;
  if (ext === ".html") return CACHE.html;
  if (ext === ".css" || ext === ".js" || ext === ".mjs" || ext === ".woff2" || ext === ".svg") return CACHE.asset;
  return CACHE.story;
}

async function sendFile(response, target, cacheControl) {
  const data = await readFile(target);
  const type = types[extname(target).toLowerCase()] || "application/octet-stream";
  const headers = {
    "Content-Type": type,
    "Cache-Control": cacheControl || "no-store"
  };
  response.writeHead(200, headers);
  response.end(data);
}

function json(response, status, body, cacheControl) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": cacheControl || "no-store"
  });
  response.end(JSON.stringify(body));
}

/** Shared request handler for local Node server and Vercel serverless. */
export async function handler(request, response) {
  try {
    const hostHeader = request.headers?.host || `${host}:${port}`;
    const url = new URL(request.url || "/", `http://${hostHeader}`);

    if (url.pathname === "/__health") {
      json(response, 200, { ok: true, app: "shanhe-yiwen", port }, CACHE.asset);
      return;
    }

    if (url.pathname === "/__project-index") {
      try {
        const files = await getProjectIndex();
        json(response, 200, { ok: true, files }, CACHE.index);
      } catch (error) {
        json(response, 500, { ok: false, error: error.message });
      }
      return;
    }

    if (url.pathname === "/stories/catalog.json" || url.pathname.startsWith("/stories/")) {
      try {
        const target = safeJoin(projectRoot, url.pathname.slice(1));
        if (!target) throw new Error("Forbidden");
        const info = await stat(target);
        if (info.isDirectory()) throw new Error("Directory");
        await sendFile(response, target, cacheForPath(url.pathname, target));
      } catch {
        response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("未找到故事资源");
      }
      return;
    }

    if (url.pathname.startsWith("/project/")) {
      try {
        const target = safeJoin(projectRoot, url.pathname.slice("/project/".length));
        if (!target || extname(target).toLowerCase() !== ".md") throw new Error("Only Markdown");
        await sendFile(response, target, cacheForPath(url.pathname, target));
      } catch {
        response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("未找到项目文档");
      }
      return;
    }

    try {
      let target = safeJoin(webRoot, url.pathname === "/" ? "index.html" : url.pathname);
      if (!target) throw new Error("Forbidden path");
      const info = await stat(target);
      if (info.isDirectory()) target = join(target, "index.html");
      await sendFile(response, target, cacheForPath(url.pathname, target));
    } catch {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("未找到页面");
    }
  } catch (error) {
    response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    response.end(error?.message || "Server error");
  }
}

// Local CLI: `node web/server.mjs`. Skip on Vercel (VERCEL=1) and when imported by api/.
const launchedAsCli =
  !process.env.VERCEL &&
  Array.isArray(process.argv) &&
  process.argv[1] &&
  /server\.mjs$/i.test(process.argv[1].replace(/\\/g, "/"));

if (launchedAsCli) {
  const server = http.createServer((req, res) => {
    handler(req, res);
  });

  server.on("error", error => {
    if (error.code === "EADDRINUSE") console.error(`Port ${port} is already in use.`);
    else console.error(error);
    process.exitCode = 1;
  });

  server.listen(port, host, () => {
    console.log(`山河异闻: http://${host}:${port}/`);
    console.log("Close this window to stop the local server.");
  });
}
