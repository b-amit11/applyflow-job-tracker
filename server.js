const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { createStore, validateApplication } = require("./data-store");

const PORT = Number(process.env.PORT || 3000);
const store = createStore(process.env.DATABASE_FILE || path.join(__dirname, "applyflow.db"));
const files = new Map([["/", ["index.html", "text/html"]], ["/index.html", ["index.html", "text/html"]], ["/styles.css", ["styles.css", "text/css"]], ["/app.js", ["app.js", "text/javascript"]]]);
const cors = { "Access-Control-Allow-Origin": "chrome-extension://*", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS" };

function json(response, status, data, extra = {}) { response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...extra }); response.end(status === 204 ? "" : JSON.stringify(data)); }
async function body(request) { const chunks = []; let size = 0; for await (const chunk of request) { size += chunk.length; if (size > 1_000_000) throw new Error("Request body is too large."); chunks.push(chunk); } try { return JSON.parse(Buffer.concat(chunks).toString() || "{}"); } catch { throw new Error("Request body must be valid JSON."); } }

async function api(request, response, url) {
  const headers = request.headers.origin?.startsWith("chrome-extension://") ? { "Access-Control-Allow-Origin": request.headers.origin } : {};
  if (request.method === "OPTIONS") return json(response, 204, null, { ...headers, "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS" });
  if (url.pathname === "/api/applications" && request.method === "GET") return json(response, 200, store.all({ search: url.searchParams.get("search") || "", stage: url.searchParams.get("stage") || "All" }), headers);
  if (url.pathname === "/api/applications" && request.method === "POST") { const { value, errors } = validateApplication(await body(request)); return errors.length ? json(response, 400, { errors }, headers) : json(response, 201, store.create(value), headers); }
  if (url.pathname === "/api/applications/import" && request.method === "POST") { const rows = await body(request); if (!Array.isArray(rows) || rows.length > 500) return json(response, 400, { error: "Import must contain up to 500 rows." }, headers); const imported = [], errors = []; rows.forEach((row, index) => { const result = validateApplication(row); result.errors.length ? errors.push({ row: index + 1, errors: result.errors }) : imported.push(store.create(result.value)); }); return json(response, errors.length ? 207 : 201, { imported: imported.length, errors }, headers); }
  if (url.pathname === "/api/applications/reset" && request.method === "POST") return json(response, 200, store.reset(), headers);
  const match = url.pathname.match(/^\/api\/applications\/([a-f0-9-]+)$/i);
  if (match && request.method === "PUT") { const { value, errors } = validateApplication(await body(request)); if (errors.length) return json(response, 400, { errors }, headers); const updated = store.update(match[1], value); return updated ? json(response, 200, updated, headers) : json(response, 404, { error: "Application not found." }, headers); }
  if (match && request.method === "DELETE") return store.remove(match[1]) ? json(response, 204, null, headers) : json(response, 404, { error: "Application not found." }, headers);
  json(response, 404, { error: "API route not found." }, headers);
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  try {
    if (url.pathname.startsWith("/api/")) return await api(request, response, url);
    const entry = files.get(url.pathname); if (!entry) { response.writeHead(404); return response.end("Not found"); }
    fs.readFile(path.join(__dirname, entry[0]), (error, content) => { if (error) { response.writeHead(500); return response.end("Unable to load application"); } response.writeHead(200, { "Content-Type": `${entry[1]}; charset=utf-8` }); response.end(content); });
  } catch (error) { json(response, 400, { error: error.message }); }
});
server.listen(PORT, "127.0.0.1", () => console.log(`ApplyFlow is running at http://localhost:${PORT}`));
function shutdown() { server.close(() => { store.close(); process.exit(0); }); }
process.on("SIGINT", shutdown); process.on("SIGTERM", shutdown);
