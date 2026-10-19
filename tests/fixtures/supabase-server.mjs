// Minimal PostgREST test double; never connects to a real Supabase project.
import { createServer } from "node:http";

const tables = { survey_responses: [], admin_sessions: [] };
let unavailable = false;
createServer(async (req, res) => {
  const url = new URL(req.url, "http://127.0.0.1:3101");
  res.setHeader("content-type", "application/json");
  if (url.pathname === "/health") return res.end("{}");
  if (url.pathname === "/__test/expire") {
    tables.admin_sessions.forEach((row) => { row.expires = Date.now() - 1000; });
    return res.end("{}");
  }
  if (url.pathname === "/__test/unavailable") {
    unavailable = url.searchParams.get("value") === "true";
    return res.end("{}");
  }
  if (req.headers.apikey !== "sb_secret_automated_test_only") {
    res.statusCode = 401;
    return res.end('{"message":"Unauthorized"}');
  }
  if (unavailable) {
    res.statusCode = 503;
    return res.end('{"message":"Database unavailable"}');
  }
  const name = url.pathname.split("/").at(-1);
  const table = tables[name];
  if (!table) { res.statusCode = 404; return res.end("{}"); }
  const matches = (row) => [...url.searchParams].every(([column, filter]) => {
    if (filter.startsWith("eq.")) return String(row[column]) === filter.slice(3);
    if (filter.startsWith("gt.")) return row[column] > filter.slice(3);
    return true;
  });
  if (req.method === "POST") {
    let body = "";
    for await (const chunk of req) body += chunk;
    const row = JSON.parse(body);
    table.push(row);
    res.statusCode = 201;
    return res.end();
  }
  if (req.method === "DELETE") {
    tables[name] = table.filter((row) => !matches(row));
    res.statusCode = 204;
    return res.end();
  }
  let rows = table.filter(matches);
  if (url.searchParams.has("order")) rows.sort((a, b) => a.id.localeCompare(b.id));
  // Deliberately low API cap to verify exports fetch every page.
  rows = rows.slice(0, Math.min(2, Number(url.searchParams.get("limit") || 2)));
  const columns = url.searchParams.get("select");
  if (columns && columns !== "*") rows = rows.map((row) => Object.fromEntries(
    columns.split(",").map((column) => [column, row[column]]),
  ));
  res.end(JSON.stringify(rows));
}).listen(3101, "127.0.0.1");
