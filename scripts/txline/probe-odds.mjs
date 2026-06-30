// Probe: scan every fixture for odds data and dump the shape of the first hit.
import { readFileSync } from "node:fs";

function loadEnv() {
  const txt = readFileSync(new URL("../../.env.local", import.meta.url), "utf8");
  const env = {};
  for (const line of txt.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return env;
}
const env = loadEnv();
const BASE = env.TXLINE_API_BASE.replace(/\/$/, "");
const TOKEN = env.TXLINE_API_TOKEN;

async function guestJwt() {
  const r = await fetch(`${BASE}/auth/guest/start`, { method: "POST" });
  const d = await r.json();
  return d.token ?? d.jwt;
}
async function getJson(jwt, path) {
  const r = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${jwt}`, "X-Api-Token": TOKEN, Accept: "application/json" },
  });
  const text = await r.text();
  try {
    return { status: r.status, json: text ? JSON.parse(text) : null, text };
  } catch {
    return { status: r.status, json: null, text };
  }
}

const jwt = await guestJwt();
const fx = await getJson(jwt, "/api/fixtures/snapshot");
const fixtures = fx.json ?? [];
console.log(`fixtures: ${fixtures.length}`);

let firstOdds = null;
for (const f of fixtures) {
  const id = f.FixtureId;
  const o = await getJson(jwt, `/api/odds/snapshot/${id}`);
  const n = Array.isArray(o.json) ? o.json.length : o.json ? 1 : 0;
  const s = await getJson(jwt, `/api/scores/snapshot/${id}`);
  const sn = Array.isArray(s.json) ? s.json.length : s.json ? 1 : 0;
  console.log(`${id}  ${f.Participant1} v ${f.Participant2}  odds=${n} scores=${sn}`);
  if (n > 0 && !firstOdds) firstOdds = { id, json: o.json };
}

if (firstOdds) {
  console.log(`\n=== first fixture WITH odds: ${firstOdds.id} ===`);
  console.log(JSON.stringify(firstOdds.json, null, 2).slice(0, 2500));
} else {
  console.log("\nNo fixture currently has odds data (likely none posted pre-match / on this tier).");
}
