// Vercel serverless function (Node runtime).
// Runs server-side, so DFO's lack of CORS headers doesn't matter here —
// only matters for browser-to-DFO calls, not server-to-DFO calls.
// Deployed automatically by Vercel because it lives in /api.

const SOURCES = {
  arcgis:
    "https://gisp.dfo-mpo.gc.ca/arcgis/rest/services/FGP/Pacific_Herring_Spawn_Index_Data/MapServer/0/query?where=1%3D1&outFields=*&f=json&resultRecordCount=25",
  csv:
    "https://api-proxy.edh-cde.dfo-mpo.gc.ca/catalogue/records/d892511c-d851-4f85-a0ec-708bc05d2810/attachments/Pacific_herring_spawn_index_data_2025_EN.csv",
};

export default async function handler(req, res) {
  const source = req.query.source;
  const upstream = SOURCES[source];

  if (!upstream) {
    res.status(400).json({ error: `Unknown source '${source}'. Use ?source=arcgis or ?source=csv.` });
    return;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const upstreamRes = await fetch(upstream, { signal: controller.signal });
    clearTimeout(timeout);

    if (!upstreamRes.ok) {
      res.status(upstreamRes.status).json({ error: `DFO responded ${upstreamRes.status} ${upstreamRes.statusText}`, upstream });
      return;
    }

    const body = await upstreamRes.text();
    const contentType = upstreamRes.headers.get("content-type") || (source === "csv" ? "text/csv" : "application/json");

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate"); // DFO updates this ~annually
    res.setHeader("Content-Type", contentType);
    res.status(200).send(body);
  } catch (err) {
    res.status(502).json({ error: `Proxy fetch failed: ${err.name}: ${err.message}`, upstream });
  }
}
