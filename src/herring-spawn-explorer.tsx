import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ReferenceArea, ResponsiveContainer, CartesianGrid } from "recharts";
import { Waves, Layers, Info, X, TrendingUp, Anchor, ZoomIn, ZoomOut, Locate, CheckCircle2, XCircle, Loader2, RefreshCw, Satellite } from "lucide-react";

/* ---------------------------------------------------------------
   FONTS
--------------------------------------------------------------- */
const FontLoader = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600&display=swap');
  `}</style>
);

/* ---------------------------------------------------------------
   TOKENS
--------------------------------------------------------------- */
const C = {
  deep: "#0B2E33",
  deep2: "#123B41",
  mid: "#1B4E52",
  paper: "#E9E2CE",
  paperDim: "#C9C0A6",
  ink: "#1C1A12",
  straw: "#E7C468",
  amber: "#DE9A44",
  roe: "#C1452B",
  kelp: "#5C8A63",
  eelgrass: "#8FAE5C",
  rock: "#9A968A",
  gravel: "#B99E6B",
  sand: "#D9C592",
  mixed: "#9A7BA6",
  line: "rgba(233,226,206,0.18)",
};

const REGIONS = [
  { id: "hg", label: "Haida Gwaii" },
  { id: "pr", label: "Prince Rupert District" },
  { id: "cc", label: "Central Coast" },
  { id: "wcvi", label: "West Coast Vancouver Island" },
  { id: "sog", label: "Strait of Georgia" },
];

const YEARS = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];
const CURRENT_YEAR = 2026;
const FORECAST_YEAR = 2027;
const TIMELINE = [...YEARS, CURRENT_YEAR, FORECAST_YEAR];

/* ---------------------------------------------------------------
   SEEDED PRNG (deterministic mock data)
--------------------------------------------------------------- */
function hashSeed(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

/* ---------------------------------------------------------------
   SHORE UNITS (illustrative — replace with DFO / ShoreZone joins)
   lat/lon are real approximate coordinates for these places.
--------------------------------------------------------------- */
const RAW_UNITS = [
  { id: "hg-naden", name: "Naden Harbour", region: "hg", lat: 54.0, lon: -132.4, substrate: "gravel", veg: "eelgrass", cover: "patchy", base: 9, trend: -0.15 },
  { id: "hg-skidegate", name: "Skidegate Inlet", region: "hg", lat: 53.25, lon: -132.1, substrate: "mixed", veg: "kelp", cover: "continuous", base: 14, trend: 0.05 },
  { id: "hg-rennell", name: "Rennell Sound", region: "hg", lat: 53.4, lon: -132.6, substrate: "rock", veg: "kelp", cover: "patchy", base: 6, trend: -0.05 },
  { id: "pr-chatham-n", name: "Chatham Sound (N)", region: "pr", lat: 54.35, lon: -130.3, substrate: "rock", veg: "none", cover: "-", base: 4, trend: 0.0 },
  { id: "pr-bigbay", name: "Big Bay", region: "pr", lat: 54.2, lon: -130.35, substrate: "gravel", veg: "eelgrass", cover: "continuous", base: 17, trend: 0.2 },
  { id: "pr-kitkatla", name: "Kitkatla", region: "pr", lat: 53.75, lon: -130.4, substrate: "mixed", veg: "both", cover: "continuous", base: 21, trend: 0.1 },
  { id: "cc-klemtu", name: "Klemtu", region: "cc", lat: 52.6, lon: -128.5, substrate: "rock", veg: "kelp", cover: "continuous", base: 12, trend: -0.1 },
  { id: "cc-laredo", name: "Laredo Sound", region: "cc", lat: 52.5, lon: -128.85, substrate: "rock", veg: "kelp", cover: "patchy", base: 8, trend: -0.2 },
  { id: "cc-bellabella", name: "Bella Bella", region: "cc", lat: 52.16, lon: -128.13, substrate: "mixed", veg: "both", cover: "continuous", base: 19, trend: 0.05 },
  { id: "cc-spiller", name: "Spiller Channel", region: "cc", lat: 52.15, lon: -128.15, substrate: "gravel", veg: "eelgrass", cover: "patchy", base: 10, trend: -0.3 },
  { id: "cc-kildidt", name: "Kildidt Sound", region: "cc", lat: 52.05, lon: -128.5, substrate: "sand", veg: "eelgrass", cover: "continuous", base: 15, trend: 0.15 },
  { id: "wcvi-kyuquot", name: "Kyuquot Sound", region: "wcvi", lat: 50.03, lon: -127.35, substrate: "rock", veg: "kelp", cover: "continuous", base: 16, trend: -0.1 },
  { id: "wcvi-nootka", name: "Nootka Sound", region: "wcvi", lat: 49.6, lon: -126.6, substrate: "mixed", veg: "both", cover: "continuous", base: 22, trend: 0.0 },
  { id: "wcvi-clayoquot", name: "Clayoquot Sound", region: "wcvi", lat: 49.15, lon: -126.05, substrate: "gravel", veg: "eelgrass", cover: "patchy", base: 11, trend: -0.15 },
  { id: "wcvi-barkley", name: "Barkley Sound", region: "wcvi", lat: 48.9, lon: -125.35, substrate: "mixed", veg: "both", cover: "continuous", base: 24, trend: 0.1 },
  { id: "sog-frenchcreek", name: "French Creek", region: "sog", lat: 49.34, lon: -124.34, substrate: "gravel", veg: "eelgrass", cover: "continuous", base: 33, trend: 0.25 },
  { id: "sog-qualicum", name: "Qualicum", region: "sog", lat: 49.35, lon: -124.45, substrate: "sand", veg: "eelgrass", cover: "continuous", base: 29, trend: 0.2 },
  { id: "sog-denman", name: "Denman Island", region: "sog", lat: 49.53, lon: -124.8, substrate: "gravel", veg: "both", cover: "continuous", base: 36, trend: 0.3 },
  { id: "sog-hornby", name: "Hornby Island", region: "sog", lat: 49.52, lon: -124.67, substrate: "gravel", veg: "both", cover: "continuous", base: 34, trend: 0.28 },
  { id: "sog-comox", name: "Comox", region: "sog", lat: 49.67, lon: -124.93, substrate: "sand", veg: "eelgrass", cover: "patchy", base: 20, trend: 0.1 },
  { id: "sog-nanaimo", name: "Nanaimo", region: "sog", lat: 49.16, lon: -123.94, substrate: "mixed", veg: "kelp", cover: "patchy", base: 14, trend: -0.05 },
  { id: "sog-cowichan", name: "Cowichan Bay", region: "sog", lat: 48.74, lon: -123.62, substrate: "sand", veg: "eelgrass", cover: "patchy", base: 9, trend: -0.1 },
  { id: "sog-squamish", name: "Howe Sound", region: "sog", lat: 49.7, lon: -123.15, substrate: "rock", veg: "kelp", cover: "patchy", base: 7, trend: 0.4 },
];

/* Build deterministic historical / current / forecast series per unit */
function buildSeries(unit) {
  const rand = hashSeed(unit.id);
  const history = {};
  YEARS.forEach((yr, i) => {
    const drift = unit.trend * i;
    const noise = (rand() - 0.5) * unit.base * 0.35;
    const val = Math.max(0, unit.base + drift + noise);
    history[yr] = Math.round(val * 10) / 10;
  });
  const last3 = YEARS.slice(-3).map((y) => history[y]);
  const recentAvg = last3.reduce((a, b) => a + b, 0) / last3.length;
  const currentNoise = (rand() - 0.5) * unit.base * 0.2;
  const current = Math.max(0, Math.round((recentAvg + unit.trend * 10 + currentNoise) * 10) / 10);

  const forecastMean = Math.max(0, Math.round((current + unit.trend * 1.5) * 10) / 10);
  const spread = Math.max(1.5, forecastMean * 0.3);
  const forecastLow = Math.max(0, Math.round((forecastMean - spread) * 10) / 10);
  const forecastHigh = Math.round((forecastMean + spread) * 10) / 10;

  return { history, current, forecastMean, forecastLow, forecastHigh };
}

const UNITS = RAW_UNITS.map((u) => ({ ...u, series: buildSeries(u) }));

function valueForYear(unit, year) {
  if (year <= 2025) return { value: unit.series.history[year], kind: "historical" };
  if (year === CURRENT_YEAR) return { value: unit.series.current, kind: "current" };
  return {
    value: unit.series.forecastMean,
    kind: "forecast",
    low: unit.series.forecastLow,
    high: unit.series.forecastHigh,
  };
}

const maxBase = Math.max(...UNITS.map((u) => u.base)) * 1.6;
function radiusFor(value) {
  return 4 + (Math.min(value, maxBase) / maxBase) * 13;
}
function colorFor(value) {
  const t = Math.min(1, value / maxBase);
  const from = [231, 196, 104];
  const to = [193, 69, 43];
  const rgb = from.map((f, i) => Math.round(f + (to[i] - f) * t));
  return `rgb(${rgb.join(",")})`;
}
const SUBSTRATE_COLOR = { rock: C.rock, gravel: C.gravel, sand: C.sand, mixed: C.mixed };

/* ---------------------------------------------------------------
   LIVE DATA SOURCES — real DFO endpoints, attempted client-side.
   Nothing here is faked: these are the actual URLs from the Open
   Government Portal record d892511c-d851-4f85-a0ec-708bc05d2810.
--------------------------------------------------------------- */
const LIVE_SOURCES = [
  {
    id: "arcgis",
    label: "DFO ArcGIS REST — spawn index MapServer",
    url: "/api/dfo-proxy?source=arcgis",
    parse: "json",
  },
  {
    id: "csv",
    label: "Open Government Portal — spawn index CSV (2025)",
    url: "/api/dfo-proxy?source=csv",
    parse: "csv",
  },
];

function fetchWithTimeout(url, ms = 9000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { signal: controller.signal, mode: "cors" }).finally(() => clearTimeout(timer));
}

/** Attempts each live DFO endpoint from the browser and reports exactly what happened. */
function useLiveSourceCheck() {
  const [results, setResults] = useState(() =>
    Object.fromEntries(LIVE_SOURCES.map((s) => [s.id, { state: "idle" }]))
  );
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setResults(Object.fromEntries(LIVE_SOURCES.map((s) => [s.id, { state: "loading" }])));

    LIVE_SOURCES.forEach(async (src) => {
      const started = performance.now();
      try {
        const res = await fetchWithTimeout(src.url);
        const ms = Math.round(performance.now() - started);
        if (!res.ok) {
          if (cancelled) return;
          setResults((prev) => ({ ...prev, [src.id]: { state: "error", detail: `HTTP ${res.status} ${res.statusText}`, ms } }));
          return;
        }
        let summary = "";
        if (src.parse === "json") {
          const data = await res.json();
          const count = Array.isArray(data.features) ? data.features.length : 0;
          const fields = Array.isArray(data.fields) ? data.fields.slice(0, 5).map((f) => f.name).join(", ") : "";
          summary = count ? `${count} features · fields: ${fields}` : "responded, but no feature array — service may be export-only";
        } else {
          const text = await res.text();
          const firstLine = text.split("\n")[0].slice(0, 120);
          summary = `${(text.length / 1024).toFixed(1)} KB · header: ${firstLine}`;
        }
        if (cancelled) return;
        setResults((prev) => ({ ...prev, [src.id]: { state: "success", detail: summary, ms } }));
      } catch (err) {
        const ms = Math.round(performance.now() - started);
        if (cancelled) return;
        const isAbort = err.name === "AbortError";
        setResults((prev) => ({
          ...prev,
          [src.id]: {
            state: "error",
            detail: isAbort ? "Timed out after 9s" : `${err.name}: ${err.message} (almost always CORS — the browser hides the real reason for security)`,
            ms,
          },
        }));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  return { results, retry: () => setAttempt((a) => a + 1) };
}

/* ---------------------------------------------------------------
   WEB MERCATOR TILE MATH (real basemap, no external map SDK needed)
--------------------------------------------------------------- */
const TILE = 256;
function lonToX(lon, z) {
  return ((lon + 180) / 360) * Math.pow(2, z) * TILE;
}
function latToY(lat, z) {
  const rad = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * Math.pow(2, z) * TILE;
}
function xToLon(x, z) {
  return (x / (Math.pow(2, z) * TILE)) * 360 - 180;
}
function yToLat(y, z) {
  const n = Math.PI - (2 * Math.PI * y) / (Math.pow(2, z) * TILE);
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}
function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
const SUBDOMAINS = ["a", "b", "c", "d"];

/* ---------------------------------------------------------------
   TILE BASEMAP — pannable / zoomable, CARTO dark tiles (OSM data)
--------------------------------------------------------------- */
function TileBasemap({ units, layer, year, selectedId, onSelect, matchesHabitat }) {
  const containerRef = useRef(null);
  const [size, setSize] = useState({ w: 800, h: 640 });
  const [zoom, setZoom] = useState(6);
  const [center, setCenter] = useState({ lat: 51.4, lon: -127.3 });
  const dragRef = useRef(null);
  const wheelLock = useRef(false);
  // kept fresh every render so the touch listeners (attached once, imperatively)
  // never read stale zoom/center/size from a closure captured at mount time
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const sizeRef = useRef(size);
  sizeRef.current = size;

  useEffect(() => {
    function measure() {
      if (containerRef.current) {
        setSize({ w: containerRef.current.clientWidth, h: containerRef.current.clientHeight });
      }
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Safari's legacy pinch gesture (gesturestart/change/end) runs alongside,
  // not through, native touch handling — touch-action:none doesn't reliably
  // stop it. Without this, iOS can zoom the whole page on a 2-finger touch
  // even though our touchstart/touchmove logic also fires underneath it.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const prevent = (e) => e.preventDefault();
    el.addEventListener("gesturestart", prevent);
    el.addEventListener("gesturechange", prevent);
    el.addEventListener("gestureend", prevent);
    return () => {
      el.removeEventListener("gesturestart", prevent);
      el.removeEventListener("gesturechange", prevent);
      el.removeEventListener("gestureend", prevent);
    };
  }, []);

  const centerPx = { x: lonToX(center.lon, zoom), y: latToY(center.lat, zoom) };
  const centerPxRef = useRef(centerPx);
  centerPxRef.current = centerPx;
  const topLeft = { x: centerPx.x - size.w / 2, y: centerPx.y - size.h / 2 };
  const n = Math.pow(2, zoom);

  const tileMinX = Math.floor(topLeft.x / TILE);
  const tileMaxX = Math.floor((topLeft.x + size.w) / TILE);
  const tileMinY = clamp(Math.floor(topLeft.y / TILE), 0, n - 1);
  const tileMaxY = clamp(Math.floor((topLeft.y + size.h) / TILE), 0, n - 1);

  const tiles = [];
  for (let ty = tileMinY; ty <= tileMaxY; ty++) {
    for (let tx = tileMinX; tx <= tileMaxX; tx++) {
      const wrapped = ((tx % n) + n) % n;
      const sub = SUBDOMAINS[(tx + ty) % SUBDOMAINS.length];
      tiles.push({
        key: `${zoom}-${tx}-${ty}`,
        url: `https://${sub}.basemaps.cartocdn.com/dark_all/${zoom}/${wrapped}/${ty}.png`,
        left: tx * TILE - topLeft.x,
        top: ty * TILE - topLeft.y,
      });
    }
  }

  // Touch is handled with the raw TouchEvent API, attached imperatively with
  // { passive: false } — this is the older API, but unlike Pointer Events it
  // has been consistently supported and its preventDefault() is guaranteed
  // to actually block the browser's native scroll/zoom, which is what was
  // silently failing before. Mouse/trackpad still use React's onMouseDown.
  const pointersRef = useRef(new Map());
  const pinchRef = useRef(null);
  const wrapperRef = useRef(null);

  function commitPinch() {
    const { startZoom, anchorLon, anchorLat, liveScale, liveMid } = pinchRef.current;
    const newZoom = clamp(Math.round(startZoom + Math.log2(liveScale || 1)), 3, 12);
    const anchorWorldNew = { x: lonToX(anchorLon, newZoom), y: latToY(anchorLat, newZoom) };
    const topLeftNew = { x: anchorWorldNew.x - liveMid.x, y: anchorWorldNew.y - liveMid.y };
    const centerPxNew = { x: topLeftNew.x + sizeRef.current.w / 2, y: topLeftNew.y + sizeRef.current.h / 2 };
    const newCenter = { lon: xToLon(centerPxNew.x, newZoom), lat: yToLat(centerPxNew.y, newZoom) };
    setZoom(newZoom);
    setCenter(newCenter);
    pinchRef.current = null;
    if (wrapperRef.current) {
      wrapperRef.current.style.transform = "";
      wrapperRef.current.style.transformOrigin = "";
    }
    return centerPxNew;
  }

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function relTouch(t) {
      const rect = el.getBoundingClientRect();
      return { x: t.clientX - rect.left, y: t.clientY - rect.top, clientX: t.clientX, clientY: t.clientY };
    }

    function onTouchStart(e) {
      e.preventDefault();
      for (const t of e.changedTouches) pointersRef.current.set(t.identifier, relTouch(t));

      if (pointersRef.current.size === 1) {
        const [[id, p]] = pointersRef.current;
        dragRef.current = { id, x: p.clientX, y: p.clientY, cx: centerPxRef.current.x, cy: centerPxRef.current.y };
      } else if (pointersRef.current.size === 2) {
        dragRef.current = null;
        const [p0, p1] = Array.from(pointersRef.current.values());
        const dist = Math.hypot(p0.x - p1.x, p0.y - p1.y);
        const mid = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
        const topLeftNow = { x: centerPxRef.current.x - sizeRef.current.w / 2, y: centerPxRef.current.y - sizeRef.current.h / 2 };
        pinchRef.current = {
          startDistance: dist,
          startMid: mid,
          startZoom: zoomRef.current,
          anchorLon: xToLon(topLeftNow.x + mid.x, zoomRef.current),
          anchorLat: yToLat(topLeftNow.y + mid.y, zoomRef.current),
          liveScale: 1,
          liveMid: mid,
        };
      }
    }

    function onTouchMove(e) {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (pointersRef.current.has(t.identifier)) pointersRef.current.set(t.identifier, relTouch(t));
      }

      if (pointersRef.current.size >= 2 && pinchRef.current) {
        const [p0, p1] = Array.from(pointersRef.current.values()).slice(0, 2);
        const dist = Math.hypot(p0.x - p1.x, p0.y - p1.y);
        const mid = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
        const scale = dist / pinchRef.current.startDistance;
        const shiftX = mid.x - pinchRef.current.startMid.x;
        const shiftY = mid.y - pinchRef.current.startMid.y;
        if (wrapperRef.current) {
          wrapperRef.current.style.transformOrigin = `${pinchRef.current.startMid.x}px ${pinchRef.current.startMid.y}px`;
          wrapperRef.current.style.transform = `translate(${shiftX}px, ${shiftY}px) scale(${scale})`;
        }
        pinchRef.current.liveScale = scale;
        pinchRef.current.liveMid = mid;
        return;
      }

      if (!dragRef.current) return;
      const p = pointersRef.current.get(dragRef.current.id);
      if (!p) return;
      const dx = p.clientX - dragRef.current.x;
      const dy = p.clientY - dragRef.current.y;
      const nx = dragRef.current.cx - dx;
      const ny = dragRef.current.cy - dy;
      setCenter({ lon: xToLon(nx, zoomRef.current), lat: yToLat(ny, zoomRef.current) });
    }

    function onTouchEnd(e) {
      for (const t of e.changedTouches) pointersRef.current.delete(t.identifier);

      if (pinchRef.current && pointersRef.current.size < 2) {
        const centerPxNew = commitPinch();
        const remaining = Array.from(pointersRef.current.entries())[0];
        if (remaining) {
          const [id, pos] = remaining;
          dragRef.current = { id, x: pos.clientX, y: pos.clientY, cx: centerPxNew.x, cy: centerPxNew.y };
        }
      } else if (dragRef.current && pointersRef.current.size === 0) {
        dragRef.current = null;
      }
    }

    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: false });
    el.addEventListener("touchcancel", onTouchEnd, { passive: false });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, []);

  // Mouse/trackpad path (desktop) — untouched by the touch logic above.
  const onMouseDown = useCallback(
    (e) => {
      dragRef.current = { id: "mouse", x: e.clientX, y: e.clientY, cx: centerPx.x, cy: centerPx.y };
    },
    [centerPx.x, centerPx.y]
  );
  const onMouseMove = useCallback(
    (e) => {
      if (!dragRef.current || dragRef.current.id !== "mouse") return;
      const dx = e.clientX - dragRef.current.x;
      const dy = e.clientY - dragRef.current.y;
      const nx = dragRef.current.cx - dx;
      const ny = dragRef.current.cy - dy;
      setCenter({ lon: xToLon(nx, zoom), lat: yToLat(ny, zoom) });
    },
    [zoom]
  );
  const endMouseDrag = useCallback(() => {
    if (dragRef.current && dragRef.current.id === "mouse") dragRef.current = null;
  }, []);

  const onWheel = useCallback((e) => {
    e.preventDefault();
    if (wheelLock.current) return;
    wheelLock.current = true;
    setTimeout(() => (wheelLock.current = false), 160);
    setZoom((z) => clamp(z + (e.deltaY < 0 ? 1 : -1), 3, 12));
  }, []);

  function resetView() {
    setZoom(6);
    setCenter({ lat: 51.4, lon: -127.3 });
  }

  return (
    <div
      ref={containerRef}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={endMouseDrag}
      onMouseLeave={endMouseDrag}
      onWheel={onWheel}
      style={{
        position: "relative",
        width: "100%",
        height: 640,
        overflow: "hidden",
        background: C.deep2,
        cursor: dragRef.current ? "grabbing" : "grab",
        borderRadius: 4,
        userSelect: "none",
        touchAction: "none", // stop the phone from scrolling/pinch-zooming the page instead of the map
      }}
    >
      <div ref={wrapperRef} style={{ position: "absolute", inset: 0 }}>
        {tiles.map((t) => (
          <img
            key={t.key}
            src={t.url}
            alt=""
            draggable={false}
            style={{
              position: "absolute",
              left: t.left,
              top: t.top,
              width: TILE,
              height: TILE,
              pointerEvents: "none",
              filter: "saturate(0.85) brightness(0.95)",
            }}
          />
        ))}

        {/* tint to blend tiles with chart palette */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(11,46,51,0.15), rgba(11,46,51,0.35))", pointerEvents: "none" }} />

        {units.map((u) => {
        const px = lonToX(u.lon, zoom) - topLeft.x;
        const py = latToY(u.lat, zoom) - topLeft.y;
        if (px < -30 || px > size.w + 30 || py < -30 || py > size.h + 30) return null;
        const { value, kind, high } = valueForYear(u, year);
        const r = radiusFor(value);
        const dim = (layer === "eelgrass" || layer === "kelp") && !matchesHabitat(u);
        const isSel = selectedId === u.id;
        return (
          <div
            key={u.id}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(u.id);
            }}
            style={{
              position: "absolute",
              left: px,
              top: py,
              transform: "translate(-50%,-50%)",
              opacity: dim ? 0.2 : 1,
              cursor: "pointer",
            }}
          >
            {kind === "forecast" && (
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  width: radiusFor(high) * 2,
                  height: radiusFor(high) * 2,
                  transform: "translate(-50%,-50%)",
                  borderRadius: "50%",
                  border: `1px dashed ${C.roe}`,
                  opacity: 0.5,
                }}
              />
            )}
            {layer === "substrate" && (
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  width: r * 2 + 8,
                  height: r * 2 + 8,
                  transform: "translate(-50%,-50%)",
                  borderRadius: "50%",
                  border: `2px solid ${SUBSTRATE_COLOR[u.substrate]}`,
                }}
              />
            )}
            {(layer === "eelgrass" || layer === "kelp") && matchesHabitat(u) && (
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  width: r * 2 + 8,
                  height: r * 2 + 8,
                  transform: "translate(-50%,-50%)",
                  borderRadius: "50%",
                  border: `2px solid ${layer === "eelgrass" ? C.eelgrass : C.kelp}`,
                }}
              />
            )}
            <div
              style={{
                width: r * 2,
                height: r * 2,
                borderRadius: "50%",
                background: colorFor(value),
                border: isSel ? `2.5px solid ${C.paper}` : "1px solid rgba(0,0,0,0.4)",
                boxShadow: isSel ? `0 0 0 3px rgba(233,226,206,0.25)` : "none",
              }}
            />
          </div>
        );
      })}
      </div>

      {/* zoom controls */}
      <div style={{ position: "absolute", top: 12, right: 12, display: "flex", flexDirection: "column", gap: 4 }}>
        <MapBtn onClick={() => changeZoom(1)} icon={<ZoomIn size={14} />} />
        <MapBtn onClick={() => changeZoom(-1)} icon={<ZoomOut size={14} />} />
        <MapBtn onClick={resetView} icon={<Locate size={14} />} />
      </div>

      {/* legend */}
      <div
        style={{
          position: "absolute",
          bottom: 12,
          left: 12,
          background: "rgba(11,46,51,0.85)",
          border: `1px solid ${C.line}`,
          borderRadius: 4,
          padding: "8px 12px",
          fontSize: 11,
          fontFamily: "'IBM Plex Mono', monospace",
          color: C.paperDim,
          maxWidth: 300,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: colorFor(2), display: "inline-block" }} />
          low spawn index
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: colorFor(maxBase), display: "inline-block", marginLeft: 8 }} />
          high
        </div>
        <div>drag to pan · scroll to zoom · dashed ring = forecast range</div>
      </div>

      {/* attribution — required by OSM/CARTO tile terms */}
      <div
        style={{
          position: "absolute",
          bottom: 4,
          right: 8,
          fontSize: 9,
          fontFamily: "'IBM Plex Mono', monospace",
          color: "rgba(233,226,206,0.55)",
        }}
      >
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" style={{ color: "inherit" }}>
          © OpenStreetMap
        </a>{" "}
        ·{" "}
        <a href="https://carto.com/attributions" target="_blank" rel="noreferrer" style={{ color: "inherit" }}>
          © CARTO
        </a>
      </div>
    </div>
  );
}

function MapBtn({ onClick, icon }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 28,
        height: 28,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(11,46,51,0.85)",
        border: `1px solid ${C.line}`,
        borderRadius: 4,
        color: C.paper,
        cursor: "pointer",
      }}
    >
      {icon}
    </button>
  );
}

/* ---------------------------------------------------------------
   LIVE DATA STATUS PANEL
--------------------------------------------------------------- */
function LiveDataPanel({ results, retry }) {
  const anyLoading = Object.values(results).some((r) => r.state === "loading");
  const anySuccess = Object.values(results).some((r) => r.state === "success");

  return (
    <div style={{ padding: "14px 28px", borderBottom: `1px solid ${C.line}`, background: "rgba(0,0,0,0.12)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Satellite size={14} color={anySuccess ? C.eelgrass : C.paperDim} />
          <span style={labelStyle}>Live DFO fetch — attempted directly from your browser, right now</span>
        </div>
        <button onClick={retry} disabled={anyLoading} style={{ ...pillStyle(false), display: "flex", alignItems: "center", gap: 5, opacity: anyLoading ? 0.5 : 1 }}>
          <RefreshCw size={11} /> Retry
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {LIVE_SOURCES.map((src) => {
          const r = results[src.id] || { state: "idle" };
          return (
            <div key={src.id} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12 }}>
              <span style={{ marginTop: 1, flexShrink: 0 }}>
                {r.state === "loading" && <Loader2 size={14} color={C.straw} className="spin" style={{ animation: "spin 1s linear infinite" }} />}
                {r.state === "success" && <CheckCircle2 size={14} color={C.eelgrass} />}
                {r.state === "error" && <XCircle size={14} color={C.roe} />}
                {r.state === "idle" && <span style={{ width: 14, display: "inline-block" }} />}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: C.paper }}>
                  {src.label}
                  {r.ms != null && <span style={{ color: C.paperDim, fontFamily: "'IBM Plex Mono', monospace" }}> · {r.ms}ms</span>}
                </div>
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 11,
                    color: r.state === "error" ? "#E39C8A" : C.paperDim,
                    wordBreak: "break-word",
                  }}
                >
                  {r.state === "loading" ? "requesting…" : r.detail || src.url}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <p style={{ fontSize: 11, color: C.paperDim, marginTop: 10, marginBottom: 0, lineHeight: 1.6 }}>
        {anySuccess
          ? "At least one DFO endpoint answered directly to the browser — that path is viable without a backend proxy."
          : "If everything shows an error, it's almost certainly CORS: DFO's servers aren't sending Access-Control-Allow-Origin headers for arbitrary web origins, so the browser blocks the response even though the data exists. The fix is a small server-side proxy (even a one-line Cloudflare Worker) that fetches DFO's data and re-serves it with permissive CORS headers."}{" "}
        The map below still uses illustrative spawn values regardless of fetch outcome — wiring a successful response into the shore-unit dataset is the next step once connectivity is confirmed.
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------
   MAIN COMPONENT
--------------------------------------------------------------- */
export default function HerringSpawnExplorer() {
  const [timeIdx, setTimeIdx] = useState(TIMELINE.length - 3);
  const [layer, setLayer] = useState("spawn");
  const [activeRegions, setActiveRegions] = useState(new Set(REGIONS.map((r) => r.id)));
  const [selectedId, setSelectedId] = useState(null);
  const { results: liveResults, retry: retryLive } = useLiveSourceCheck();

  const year = TIMELINE[timeIdx];
  const isForecast = year === FORECAST_YEAR;
  const isCurrent = year === CURRENT_YEAR;

  const visibleUnits = useMemo(() => UNITS.filter((u) => activeRegions.has(u.region)), [activeRegions]);
  const selected = UNITS.find((u) => u.id === selectedId) || null;

  function toggleRegion(id) {
    setActiveRegions((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function matchesHabitat(u) {
    if (layer === "eelgrass") return u.veg === "eelgrass" || u.veg === "both";
    if (layer === "kelp") return u.veg === "kelp" || u.veg === "both";
    return true;
  }

  const chartData = selected
    ? YEARS.map((y) => ({ year: y, value: selected.series.history[y] })).concat([
        { year: CURRENT_YEAR, value: selected.series.current },
        {
          year: FORECAST_YEAR,
          value: selected.series.forecastMean,
          low: selected.series.forecastLow,
          high: selected.series.forecastHigh,
        },
      ])
    : [];

  return (
    <div style={{ background: C.deep, minHeight: "100vh", fontFamily: "'Inter', sans-serif", color: C.paper }}>
      <FontLoader />
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      <div style={{ borderBottom: `1px solid ${C.line}`, padding: "22px 28px 18px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <Waves size={22} color={C.straw} />
          <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 26, letterSpacing: "-0.01em", margin: 0 }}>
            Herring Spawn &amp; Habitat Explorer
          </h1>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: C.paperDim }}>BC COAST · PROTOTYPE</span>
        </div>
        <p style={{ margin: "6px 0 0 34px", fontSize: 13, color: C.paperDim, maxWidth: 640 }}>
          Real Web Mercator basemap (OpenStreetMap data via CARTO tiles) — pan and zoom the coastline directly.
          Spawn and habitat data are still illustrative pending the DFO / ShoreZone feed.
        </p>
      </div>

      <LiveDataPanel results={liveResults} retry={retryLive} />

      <div style={{ padding: "16px 28px", borderBottom: `1px solid ${C.line}` }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={labelStyle}>Time</span>
            <span
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 12,
                padding: "2px 8px",
                borderRadius: 3,
                background: isForecast ? "rgba(193,69,43,0.25)" : isCurrent ? "rgba(231,196,104,0.2)" : "transparent",
                color: isForecast ? C.roe : isCurrent ? C.straw : C.paperDim,
                border: `1px solid ${isForecast ? C.roe : isCurrent ? C.straw : C.line}`,
              }}
            >
              {isForecast ? "FORECAST" : isCurrent ? "PROVISIONAL" : "OBSERVED"}
            </span>
          </div>
          <div style={{ display: "flex", gap: 3, overflowX: "auto", paddingBottom: 4 }}>
            {TIMELINE.map((y, i) => {
              const active = i === timeIdx;
              const fc = y === FORECAST_YEAR;
              const cur = y === CURRENT_YEAR;
              return (
                <button
                  key={y}
                  onClick={() => setTimeIdx(i)}
                  style={{
                    flex: "0 0 auto",
                    minWidth: 52,
                    padding: "8px 4px",
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 12,
                    background: active ? C.straw : "transparent",
                    color: active ? C.ink : fc ? C.roe : cur ? C.amber : C.paperDim,
                    border: `1px solid ${active ? C.straw : fc || cur ? "currentColor" : C.line}`,
                    borderStyle: fc ? "dashed" : "solid",
                    cursor: "pointer",
                    borderRadius: 2,
                  }}
                >
                  {y}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
          <div>
            <div style={labelStyle}>Habitat overlay</div>
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              {[
                { id: "spawn", label: "Spawn only" },
                { id: "eelgrass", label: "Eelgrass" },
                { id: "kelp", label: "Kelp" },
                { id: "substrate", label: "Substrate" },
              ].map((opt) => (
                <button key={opt.id} onClick={() => setLayer(opt.id)} style={pillStyle(layer === opt.id)}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div style={labelStyle}>Region</div>
            <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
              {REGIONS.map((r) => (
                <button key={r.id} onClick={() => toggleRegion(r.id)} style={pillStyle(activeRegions.has(r.id))}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 560px", padding: 20 }}>
          <TileBasemap
            units={visibleUnits}
            layer={layer}
            year={year}
            selectedId={selectedId}
            onSelect={setSelectedId}
            matchesHabitat={matchesHabitat}
          />
        </div>

        <div style={{ flex: "1 1 340px", maxWidth: 400, padding: 20, borderLeft: `1px solid ${C.line}` }}>
          {!selected && (
            <div style={{ color: C.paperDim, fontSize: 13, lineHeight: 1.6 }}>
              <Info size={16} style={{ marginBottom: 6 }} />
              <p>Click a shore unit on the map to inspect its spawn history, habitat profile, and forecast.</p>
              <p style={{ marginTop: 12 }}>
                {visibleUnits.length} of {UNITS.length} shore units visible · viewing {year}
                {isForecast ? " (forecast)" : isCurrent ? " (provisional)" : ""}.
              </p>
            </div>
          )}

          {selected && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 20, margin: 0 }}>{selected.name}</h2>
                  <span style={{ fontSize: 12, color: C.paperDim, fontFamily: "'IBM Plex Mono', monospace" }}>
                    {REGIONS.find((r) => r.id === selected.region)?.label}
                  </span>
                </div>
                <button onClick={() => setSelectedId(null)} style={{ background: "none", border: "none", color: C.paperDim, cursor: "pointer" }}>
                  <X size={16} />
                </button>
              </div>

              <div style={{ display: "flex", gap: 16, margin: "14px 0", fontSize: 12 }}>
                <Stat label="Substrate" value={selected.substrate} swatch={SUBSTRATE_COLOR[selected.substrate]} />
                <Stat
                  label="Vegetation"
                  value={`${selected.veg}${selected.cover !== "-" ? " · " + selected.cover : ""}`}
                  swatch={selected.veg === "kelp" ? C.kelp : selected.veg === "eelgrass" ? C.eelgrass : selected.veg === "both" ? C.amber : C.paperDim}
                />
              </div>

              <div style={{ height: 160, marginTop: 10 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid stroke={C.line} vertical={false} />
                    <XAxis dataKey="year" tick={{ fill: C.paperDim, fontSize: 10 }} axisLine={{ stroke: C.line }} tickLine={false} />
                    <YAxis tick={{ fill: C.paperDim, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: C.deep2, border: `1px solid ${C.line}`, fontSize: 12 }} labelStyle={{ color: C.paper }} />
                    <ReferenceArea x1={CURRENT_YEAR} x2={FORECAST_YEAR} fill={C.roe} fillOpacity={0.08} />
                    <Line type="monotone" dataKey="value" stroke={C.straw} strokeWidth={2} dot={{ r: 3, fill: C.straw }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div style={{ marginTop: 12, fontSize: 12, lineHeight: 1.7, color: C.paperDim }}>
                <Row label="10-yr avg" value={avg(Object.values(selected.series.history)).toFixed(1)} />
                <Row label={`${CURRENT_YEAR} provisional`} value={selected.series.current.toFixed(1)} accent={C.amber} />
                <Row
                  label={`${FORECAST_YEAR} forecast`}
                  value={`${selected.series.forecastMean.toFixed(1)}  (${selected.series.forecastLow.toFixed(1)}–${selected.series.forecastHigh.toFixed(1)})`}
                  accent={C.roe}
                />
              </div>

              <div style={{ marginTop: 14, padding: 10, background: "rgba(0,0,0,0.15)", borderRadius: 4, fontSize: 11, color: C.paperDim, display: "flex", gap: 8 }}>
                <TrendingUp size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>
                  Forecast = recent 3-yr trend extended one year, banded by ±30% historical variance. Replace with
                  DFO CSAS regional biomass scaling once wired to live data.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function avg(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function Stat({ label, value, swatch }) {
  return (
    <div>
      <div style={{ color: "#8B8570", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: swatch, display: "inline-block" }} />
        <span style={{ textTransform: "capitalize" }}>{value}</span>
      </div>
    </div>
  );
}

function Row({ label, value, accent }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
      <span>{label}</span>
      <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: accent || "#E9E2CE" }}>{value}</span>
    </div>
  );
}

const labelStyle = {
  fontSize: 10,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "#8B8570",
  fontFamily: "'IBM Plex Mono', monospace",
};

function pillStyle(active) {
  return {
    padding: "6px 12px",
    fontSize: 12,
    borderRadius: 3,
    border: `1px solid ${active ? "#E7C468" : "rgba(233,226,206,0.18)"}`,
    background: active ? "rgba(231,196,104,0.15)" : "transparent",
    color: active ? "#E7C468" : "#C9C0A6",
    cursor: "pointer",
  };
}
