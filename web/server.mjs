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
  ".txt": "text/plain; charset=utf-8"
};

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
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name === "node_modules" || entry.name === "drafts" || entry.name === "archive" || entry.name === "_trash_broken_p001") continue;
    const full = join(directory, entry.name);
    if (entry.isDirectory()) {
      output.push(...await listMarkdown(full, base, depth + 1));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      const info = await stat(full);
      const content = await readFile(full, "utf8");
      const heading = content.match(/^#\s+(.+)$/m)?.[1]?.trim() || entry.name.replace(/\.md$/i, "");
      output.push({
        path: relative(base, full).replaceAll("\\", "/"),
        title: heading,
        size: info.size,
        modified: info.mtime.toISOString(),
        searchText: content.slice(0, 24000)
      });
    }
  }
  return output;
}

async function sendFile(response, target) {
  const data = await readFile(target);
  const type = types[extname(target).toLowerCase()] || "application/octet-stream";
  response.writeHead(200, { "Content-Type": type, "Cache-Control": "no-store" });
  response.end(data);
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${host}:${port}`);

  if (url.pathname === "/__health") {
    response.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    response.end(JSON.stringify({ ok: true, app: "shanhe-yiwen", port }));
    return;
  }

  if (url.pathname === "/__project-index") {
    try {
      const files = await listMarkdown(projectRoot);
      response.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
      response.end(JSON.stringify({ ok: true, files }));
    } catch (error) {
      response.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ ok: false, error: error.message }));
    }
    return;
  }

  if (url.pathname === "/stories/catalog.json" || url.pathname.startsWith("/stories/")) {
    try {
      const target = safeJoin(projectRoot, url.pathname.slice(1));
      if (!target) throw new Error("Forbidden");
      const info = await stat(target);
      if (info.isDirectory()) throw new Error("Directory");
      await sendFile(response, target);
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
      await sendFile(response, target);
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
    await sendFile(response, target);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("未找到页面");
  }
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
