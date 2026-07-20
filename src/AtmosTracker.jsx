import React, { useState, useEffect, useMemo, useRef } from "react";
import { Plus, Trash2, X, Award, Loader2, Sparkles, Upload, Check, Pencil, ChevronDown, Menu, LogOut, User, Camera, KeyRound, Plane, Search, Download, Star, MapPin } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// ---------- Atmos Rewards program constants (2026) ----------
// Status points reset each calendar year; earned benefits run through Jan 31 of the following year.
const TIERS = [
  { name: "Silver", threshold: 20000, color: "#d9e1e2" },
  { name: "Gold", threshold: 40000, color: "#f2c14e" },
  { name: "Platinum", threshold: 80000, color: "#46a7de" },
  { name: "Titanium", threshold: 135000, color: "#b07fd1" },
];
const MILLION_MILER = 1000000;

// Real Atmos Rewards tier benefits, current for 2026.
// oneworld alliance tier each Atmos level carries.
const ONEWORLD_TIER = { Silver: "Ruby", Gold: "Sapphire", Platinum: "Emerald", Titanium: "Emerald" };

// Airport codes covering Alaska & Hawaiian's route network plus major oneworld hubs —
// enough to cover almost anything that shows up in a real Atmos activity description.
const AIRPORTS = [
  ["ANC", "Anchorage, AK"], ["FAI", "Fairbanks, AK"], ["JNU", "Juneau, AK"], ["KTN", "Ketchikan, AK"],
  ["SIT", "Sitka, AK"], ["ADQ", "Kodiak, AK"], ["BET", "Bethel, AK"], ["OTZ", "Kotzebue, AK"],
  ["OME", "Nome, AK"], ["BRW", "Utqiagvik (Barrow), AK"], ["CDV", "Cordova, AK"], ["YAK", "Yakutat, AK"],
  ["PSG", "Petersburg, AK"], ["WRG", "Wrangell, AK"], ["SEA", "Seattle, WA"], ["PDX", "Portland, OR"],
  ["GEG", "Spokane, WA"], ["BLI", "Bellingham, WA"], ["EUG", "Eugene, OR"], ["RDM", "Redmond/Bend, OR"],
  ["MFR", "Medford, OR"], ["BOI", "Boise, ID"], ["SFO", "San Francisco, CA"], ["OAK", "Oakland, CA"],
  ["SJC", "San Jose, CA"], ["SAC", "Sacramento, CA"], ["LAX", "Los Angeles, CA"], ["SAN", "San Diego, CA"],
  ["SNA", "Orange County (Santa Ana), CA"], ["BUR", "Burbank, CA"], ["ONT", "Ontario, CA"],
  ["FAT", "Fresno, CA"], ["SBA", "Santa Barbara, CA"], ["LGB", "Long Beach, CA"], ["PSP", "Palm Springs, CA"],
  ["LAS", "Las Vegas, NV"], ["RNO", "Reno, NV"], ["PHX", "Phoenix, AZ"], ["TUS", "Tucson, AZ"],
  ["SLC", "Salt Lake City, UT"], ["DEN", "Denver, CO"], ["ABQ", "Albuquerque, NM"], ["MSP", "Minneapolis, MN"],
  ["ORD", "Chicago, IL"], ["MDW", "Chicago (Midway), IL"], ["DFW", "Dallas/Fort Worth, TX"],
  ["DAL", "Dallas (Love Field), TX"], ["IAH", "Houston, TX"], ["AUS", "Austin, TX"], ["SAT", "San Antonio, TX"],
  ["MSY", "New Orleans, LA"], ["STL", "St. Louis, MO"], ["MCI", "Kansas City, MO"], ["MKE", "Milwaukee, WI"],
  ["DTW", "Detroit, MI"], ["CLE", "Cleveland, OH"], ["CMH", "Columbus, OH"], ["CVG", "Cincinnati, OH"],
  ["PIT", "Pittsburgh, PA"], ["ATL", "Atlanta, GA"], ["MIA", "Miami, FL"], ["FLL", "Fort Lauderdale, FL"],
  ["MCO", "Orlando, FL"], ["TPA", "Tampa, FL"], ["JAX", "Jacksonville, FL"], ["RSW", "Fort Myers, FL"],
  ["CLT", "Charlotte, NC"], ["RDU", "Raleigh-Durham, NC"], ["BNA", "Nashville, TN"], ["MEM", "Memphis, TN"],
  ["IND", "Indianapolis, IN"], ["BWI", "Baltimore, MD"], ["DCA", "Washington, DC (Reagan)"],
  ["IAD", "Washington, DC (Dulles)"], ["PHL", "Philadelphia, PA"], ["JFK", "New York (JFK), NY"],
  ["LGA", "New York (LaGuardia), NY"], ["EWR", "Newark, NJ"], ["BOS", "Boston, MA"], ["PVD", "Providence, RI"],
  ["BDL", "Hartford, CT"], ["ANC", "Anchorage, AK"], ["HNL", "Honolulu, Oahu, HI"], ["OGG", "Kahului, Maui, HI"],
  ["KOA", "Kailua-Kona, Big Island, HI"], ["ITO", "Hilo, Big Island, HI"], ["LIH", "Lihue, Kauai, HI"],
  ["MKK", "Molokai, HI"], ["LNY", "Lanai, HI"], ["JHM", "Kapalua, Maui, HI"], ["YVR", "Vancouver, Canada"],
  ["YYC", "Calgary, Canada"], ["YEG", "Edmonton, Canada"], ["YYZ", "Toronto, Canada"], ["YUL", "Montreal, Canada"],
  ["CUN", "Cancun, Mexico"], ["PVR", "Puerto Vallarta, Mexico"], ["SJD", "Los Cabos, Mexico"],
  ["MEX", "Mexico City, Mexico"], ["GDL", "Guadalajara, Mexico"], ["LIR", "Liberia, Costa Rica"],
  ["SJO", "San Jose, Costa Rica"], ["BZE", "Belize City, Belize"], ["NRT", "Tokyo (Narita), Japan"],
  ["HND", "Tokyo (Haneda), Japan"], ["CTS", "Sapporo, Japan"], ["KIX", "Osaka, Japan"], ["ICN", "Seoul, South Korea"],
  ["TPE", "Taipei, Taiwan"], ["HKG", "Hong Kong"], ["PPT", "Papeete, Tahiti"], ["LHR", "London (Heathrow), UK"],
  ["CDG", "Paris (Charles de Gaulle), France"], ["DXB", "Dubai, UAE"], ["DOH", "Doha, Qatar"],
  ["SYD", "Sydney, Australia"], ["AKL", "Auckland, New Zealand"], ["GUM", "Guam"],
];

function searchAirports(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return AIRPORTS.filter(([code, city]) => code.toLowerCase().includes(q) || city.toLowerCase().includes(q)).slice(
    0,
    30
  );
}

const TIER_BENEFITS = {
  Silver: {
    highlight: "1 free bag \u00b7 25% bonus",
    perks: [
      "1 free checked bag",
      "25% bonus on redeemable points",
      "Preferred seating & priority check-in/boarding",
      "Priority check-in & boarding across oneworld airlines",
      "Complimentary upgrade eligibility on Alaska, Hawaiian & eligible American flights",
    ],
  },
  Gold: {
    highlight: "2 free bags \u00b7 50% bonus",
    perks: [
      "2 free checked bags",
      "50% bonus on redeemable points",
      "Same-day flight changes on eligible flights",
      "Business-class lounge access on eligible international oneworld flights",
      "Stronger upgrade priority than Silver",
    ],
  },
  Platinum: {
    highlight: "3 free bags \u00b7 100% bonus",
    perks: [
      "3 free checked bags",
      "100% bonus on redeemable points",
      "First & business-class lounge access on qualifying international oneworld travel",
      "Highest upgrade & standby priority",
      "Same-day change/standby fees waived",
      "First alcoholic beverage free in Main Cabin",
    ],
  },
  Titanium: {
    highlight: "150% bonus \u00b7 free meal",
    perks: [
      "Most Platinum perks, with higher priority",
      "150% bonus on redeemable points",
      "Complimentary meal in Main Cabin on every flight",
      "Highest oneworld lounge & priority tier",
      "Global upgrade eligibility on select long-haul international routes (extends to one companion)",
      "Choice of a milestone reward each year (e.g. bonus points, upgrade certificate)",
    ],
  },
};

const uid = () => Math.random().toString(36).slice(2, 10);
const todayISO = () => new Date().toISOString().slice(0, 10);
const isValidISODate = (iso) => typeof iso === "string" && /^\d{4}-\d{2}-\d{2}$/.test(iso) && !isNaN(new Date(iso + "T00:00:00").getTime());
const yearOf = (iso) => new Date(iso + "T00:00:00").getFullYear();
const fmtDate = (iso) =>
  isValidISODate(iso)
    ? new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "Unknown date";
const monthKey = (iso) => iso.slice(0, 7); // "2026-07"
const monthLabel = (iso) =>
  isValidISODate(iso) ? new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "?";
const monthLabelLong = (iso) => new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "long" });
const fmtSigned = (n) => `${n >= 0 ? "+" : ""}${n.toLocaleString()}`;
const fmtAxisK = (v) => (v === 0 ? "0" : Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}K` : `${v}`);

function topRouteFromEntries(entries) {
  const counts = new Map();
  for (const t of entries) {
    const match = (t.description || "").match(/[A-Z]{3}-[A-Z]{3}/);
    if (!match) continue;
    counts.set(match[0], (counts.get(match[0]) || 0) + 1);
  }
  let best = null;
  let bestCount = 0;
  for (const [route, count] of counts) {
    if (count > bestCount) {
      best = route;
      bestCount = count;
    }
  }
  return best ? { route: best, count: bestCount } : null;
}

function downloadTextFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function transactionsToCSV(transactions) {
  const header = "date,description,flightPoints,bonusPoints,statusPoints,redeemPoints,notes";
  const quoteField = (v) => {
    const s = (v || "").replace(/"/g, '""');
    return s.includes(",") ? `"${s}"` : s;
  };
  const rows = transactions.map((t) => {
    return [
      t.date || "",
      quoteField(t.description),
      t.sign === "redeem" ? 0 : t.flightPoints || 0,
      t.sign === "redeem" ? 0 : (t.bonusPoints || 0) + (t.nonStatusPoints || 0),
      t.sign === "redeem" ? 0 : t.statusPoints || 0,
      t.sign === "redeem" ? t.redeemPoints || 0 : 0,
      quoteField(t.notes),
    ].join(",");
  });
  return [header, ...rows].join("\n");
}

// Collapses a sorted (ascending) list of transactions into one point per calendar month,
// carrying the running total forward — used so multi-year charts show a trend instead of a
// dense point-per-transaction line.
// Short, all-caps month label for chart axes — "JAN", or "JAN 2026" when a chart spans
// multiple years (the "All time" view) and needs to disambiguate.
const chartMonthLabel = (iso, withYear) => {
  const d = new Date(iso + "T00:00:00");
  const mon = d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  return withYear ? `${mon} ${d.getFullYear()}` : mon;
};

function toMonthlySeries(items, deltaFn, startValue = 0, withYear = false) {
  let running = startValue;
  const map = new Map();
  for (const t of items) {
    running += deltaFn(t);
    map.set(monthKey(t.date), { year: yearOf(t.date), date: chartMonthLabel(t.date, withYear), value: running });
  }
  return Array.from(map.values());
}

// Redeemable point delta for a transaction. Earn entries are the sum of flight + bonus + non-status
// points (mirrors the "Total points" column on the Atmos activity page); redeem entries subtract.
const pointsDelta = (t) =>
  t.sign === "redeem"
    ? -(t.redeemPoints || 0)
    : (t.flightPoints || 0) + (t.bonusPoints || 0) + (t.nonStatusPoints || 0);
const statusDelta = (t) => (t.sign === "redeem" || t.statusUnconfirmed ? 0 : t.statusPoints || 0);

// Simple CSV parser: header row + comma-separated values. Handles quoted fields (for
// descriptions that might contain a comma) but assumes no embedded newlines in a field.
function parseCSV(text) {
  // Excel/Numbers often prefix CSV exports with a UTF-8 BOM, which otherwise corrupts the
  // first header cell (e.g. "date" silently becomes "\uFEFFdate" and never matches).
  const clean = text.replace(/^\uFEFF/, "");
  const lines = clean.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const splitLine = (line) => {
    const cells = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        cells.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    cells.push(cur.trim());
    return cells;
  };
  const headers = splitLine(lines[0]).map((h) => h.toLowerCase());
  return lines.slice(1).map((line) => {
    const cells = splitLine(line);
    const row = {};
    headers.forEach((h, i) => (row[h] = cells[i] ?? ""));
    return row;
  });
}

// Accepts either ISO (2026-07-16) or US-style (7/16/2026 or 07/16/2026) dates — Excel and
// Numbers both default to the latter when exporting CSV.
function normalizeDateToISO(raw) {
  const s = (raw || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const [, mo, day, yr] = m;
    return `${yr}-${mo.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  return s;
}

function csvRowToTx(row) {
  // Strips thousands-separator commas (e.g. "1,000") before parsing — common when a CSV
  // has been opened and re-saved in Excel, which reformats plain numbers that way.
  const num = (v) => {
    const cleaned = String(v ?? "").replace(/,/g, "").trim();
    const n = Number(cleaned);
    return isNaN(n) ? 0 : n;
  };

  // Alaska's own website export uses different column names than our custom format
  // (Date, Activity, Points, Bonus Points, Total Points, Status Points) — detect and
  // support it directly so files can be uploaded straight from alaskaair.com with no
  // manual conversion.
  const isNativeFormat =
    row.activity !== undefined && row.points !== undefined && row["status points"] !== undefined;

  if (isNativeFormat) {
    const description = row.activity || "Imported activity";
    const isFlight = /[A-Z]{3}-[A-Z]{3}/.test(description);
    const rawPoints = num(row.points);
    const rawBonus = num(row["bonus points"]);
    const rawStatus = num(row["status points"]);
    const rawTotal = num(row["total points"]);

    // Alaska's export doesn't include a confirmed example of a redemption row — this
    // treats a clearly negative Points/Total as a redemption; everything else is earned.
    if (rawPoints < 0 || rawTotal < 0) {
      return {
        date: normalizeDateToISO(row.date),
        description,
        sign: "redeem",
        flightPoints: 0,
        bonusPoints: 0,
        statusPoints: 0,
        redeemPoints: Math.abs(rawTotal || rawPoints),
      };
    }

    const flightPoints = isFlight ? rawPoints : 0;
    const bonusPoints = isFlight ? rawBonus : rawPoints + rawBonus;
    // Alaska's report has a known gap where flights often show Status Points = 0 — flag
    // these with a suggested value (equal to flight points) instead of trusting the 0.
    const needsReview = isFlight && rawStatus === 0;
    return {
      date: normalizeDateToISO(row.date),
      description,
      sign: "earn",
      flightPoints,
      bonusPoints,
      statusPoints: needsReview ? flightPoints : rawStatus,
      statusUnconfirmed: needsReview,
    };
  }

  // Our own custom import/export format (also what "Export data" produces).
  const redeemPoints = num(row.redeempoints);
  const sign = redeemPoints > 0 ? "redeem" : "earn";
  return {
    date: normalizeDateToISO(row.date),
    description: row.description || "Imported activity",
    sign,
    flightPoints: sign === "earn" ? num(row.flightpoints) : 0,
    bonusPoints: sign === "earn" ? num(row.bonuspoints) : 0,
    statusPoints: sign === "earn" ? num(row.statuspoints) : 0,
    redeemPoints: sign === "redeem" ? redeemPoints : 0,
    notes: row.notes || "",
  };
}

function txDedupeKey(t) {
  return [t.date, t.description, t.flightPoints, t.bonusPoints, t.statusPoints, t.redeemPoints].join("|");
}

// Seed data: the user's 2026 Atmos activity export, imported once on first load so the
// tracker opens already populated. A one-time flag (below) keeps this from reappearing
// if the person later clears their activity on purpose.
const SEED_TRANSACTIONS = [
  { date: "2026-07-16", description: "Alaska Airlines ATMOS FOR BUSINESS BONUS", sign: "earn", flightPoints: 0, bonusPoints: 0, statusPoints: 100, redeemPoints: 0 },
  { date: "2026-07-16", description: "Alaska Airlines HNL-ITO AS1092 J", sign: "earn", flightPoints: 500, bonusPoints: 750, statusPoints: 1000, redeemPoints: 0 },
  { date: "2026-07-15", description: "Alaska Airlines ATMOS FOR BUSINESS BONUS", sign: "earn", flightPoints: 0, bonusPoints: 0, statusPoints: 100, redeemPoints: 0 },
  { date: "2026-07-15", description: "Alaska Airlines ITO-HNL AS1101 J", sign: "earn", flightPoints: 500, bonusPoints: 750, statusPoints: 1000, redeemPoints: 0 },
  { date: "2026-07-02", description: "Alaska Airlines HNL-ITO AS1052 O", sign: "earn", flightPoints: 500, bonusPoints: 250, statusPoints: 500, redeemPoints: 0 },
  { date: "2026-07-02", description: "Alaska Airlines CTS-HND AS7412 O", sign: "earn", flightPoints: 510, bonusPoints: 255, statusPoints: 510, redeemPoints: 0 },
  { date: "2026-07-02", description: "Alaska Airlines HND-HNL AS832 O", sign: "earn", flightPoints: 3854, bonusPoints: 1927, statusPoints: 3854, redeemPoints: 0 },
  { date: "2026-06-30", description: "BANK OF HAWAII BANKOH VISA DEBIT CARD ACTIVITY", sign: "earn", flightPoints: 0, bonusPoints: 1000, statusPoints: 0, redeemPoints: 0 },
  { date: "2026-06-25", description: "Alaska Airlines HND-CTS AS7423 Q", sign: "earn", flightPoints: 510, bonusPoints: 255, statusPoints: 510, redeemPoints: 0 },
  { date: "2026-06-24", description: "Alaska Airlines ITO-HNL AS1021 Q", sign: "earn", flightPoints: 500, bonusPoints: 250, statusPoints: 500, redeemPoints: 0 },
  { date: "2026-06-24", description: "Alaska Airlines HNL-HND AS863 Q", sign: "earn", flightPoints: 3854, bonusPoints: 1927, statusPoints: 3854, redeemPoints: 0 },
  { date: "2026-05-31", description: "BANK OF HAWAII BANKOH VISA DEBIT CARD ACTIVITY", sign: "earn", flightPoints: 0, bonusPoints: 1000, statusPoints: 0, redeemPoints: 0 },
  { date: "2026-05-25", description: "SPECIAL SERVICES PERKS BONUS POINTS 30K 2500 POINTS", sign: "earn", flightPoints: 0, bonusPoints: 2500, statusPoints: 0, redeemPoints: 0 },
  { date: "2026-05-23", description: "Alaska Airlines ATMOS FOR BUSINESS BONUS", sign: "earn", flightPoints: 0, bonusPoints: 0, statusPoints: 75, redeemPoints: 0 },
  { date: "2026-05-23", description: "Alaska Airlines HNL-ITO AS1042 Y", sign: "earn", flightPoints: 500, bonusPoints: 500, statusPoints: 750, redeemPoints: 0 },
  { date: "2026-05-21", description: "Alaska Airlines ATMOS FOR BUSINESS BONUS", sign: "earn", flightPoints: 0, bonusPoints: 0, statusPoints: 75, redeemPoints: 0 },
  { date: "2026-05-21", description: "Alaska Airlines ITO-HNL AS1021 Y", sign: "earn", flightPoints: 500, bonusPoints: 500, statusPoints: 750, redeemPoints: 0 },
  { date: "2026-05-21", description: "SPECIAL SERVICES 2026 STATUS POINTS HEAD START", sign: "earn", flightPoints: 0, bonusPoints: 0, statusPoints: 20000, redeemPoints: 0 },
  { date: "2026-05-07", description: "Alaska Airlines SAN-HNL AS94 N", sign: "earn", flightPoints: 2614, bonusPoints: 1307, statusPoints: 2614, redeemPoints: 0 },
  { date: "2026-05-07", description: "Alaska Airlines HNL-ITO AS1112 N", sign: "earn", flightPoints: 500, bonusPoints: 250, statusPoints: 500, redeemPoints: 0 },
  { date: "2026-05-07", description: "Alaska Airlines TPA-SAN AS433 N", sign: "earn", flightPoints: 2087, bonusPoints: 1044, statusPoints: 2087, redeemPoints: 0 },
  { date: "2026-04-30", description: "BANK OF HAWAII BANKOH VISA DEBIT CARD ACTIVITY", sign: "earn", flightPoints: 0, bonusPoints: 1000, statusPoints: 0, redeemPoints: 0 },
  { date: "2026-04-30", description: "Alaska Airlines SEA-TPA AS326 N", sign: "earn", flightPoints: 2520, bonusPoints: 1260, statusPoints: 2520, redeemPoints: 0 },
  { date: "2026-04-29", description: "Alaska Airlines HNL-SEA AS842 N", sign: "earn", flightPoints: 2677, bonusPoints: 1339, statusPoints: 2677, redeemPoints: 0 },
  { date: "2026-04-29", description: "Alaska Airlines ITO-HNL AS1101 N", sign: "earn", flightPoints: 500, bonusPoints: 250, statusPoints: 500, redeemPoints: 0 },
  { date: "2026-03-31", description: "BANK OF HAWAII BANKOH VISA DEBIT CARD ACTIVITY", sign: "earn", flightPoints: 0, bonusPoints: 975, statusPoints: 0, redeemPoints: 0 },
  { date: "2026-03-07", description: "SPECIAL SERVICES PERKS BONUS POINTS 10K 750 POINTS", sign: "earn", flightPoints: 0, bonusPoints: 750, statusPoints: 0, redeemPoints: 0 },
  { date: "2026-03-06", description: "Alaska Airlines HNL-ITO AS8211 L", sign: "earn", flightPoints: 500, bonusPoints: 250, statusPoints: 500, redeemPoints: 0 },
  { date: "2026-03-06", description: "Alaska Airlines SEA-HNL AS626 N", sign: "earn", flightPoints: 2677, bonusPoints: 1339, statusPoints: 2677, redeemPoints: 0 },
  { date: "2026-03-06", description: "Alaska Airlines IAD-SEA AS351 N", sign: "earn", flightPoints: 2306, bonusPoints: 1153, statusPoints: 2306, redeemPoints: 0 },
  { date: "2026-03-02", description: "Alaska Airlines SAN-IAD AS506 Q", sign: "earn", flightPoints: 2253, bonusPoints: 1127, statusPoints: 2253, redeemPoints: 0 },
  { date: "2026-03-01", description: "Alaska Airlines HNL-SAN AS598 Q", sign: "earn", flightPoints: 2614, bonusPoints: 1307, statusPoints: 2614, redeemPoints: 0 },
  { date: "2026-03-01", description: "Alaska Airlines ITO-HNL AS8228 L", sign: "earn", flightPoints: 500, bonusPoints: 250, statusPoints: 500, redeemPoints: 0 },
  { date: "2026-02-28", description: "BANK OF HAWAII BANKOH VISA DEBIT CARD ACTIVITY", sign: "earn", flightPoints: 0, bonusPoints: 920, statusPoints: 0, redeemPoints: 0 },
  { date: "2026-01-31", description: "BANK OF HAWAII BANKOH VISA DEBIT CARD ACTIVITY", sign: "earn", flightPoints: 0, bonusPoints: 872, statusPoints: 0, redeemPoints: 0 },
  { date: "2026-01-21", description: "HAWAIIAN AIRLINES HNL-ITO HA1082 Q", sign: "earn", flightPoints: 500, bonusPoints: 375, statusPoints: 625, redeemPoints: 0 },
  { date: "2026-01-20", description: "HAWAIIAN AIRLINES ITO-HNL HA1001 N", sign: "earn", flightPoints: 500, bonusPoints: 250, statusPoints: 500, redeemPoints: 0 },
];

function getTierInfo(statusPoints) {
  let current = null;
  for (const t of TIERS) {
    if (statusPoints >= t.threshold) {
      current = t;
    }
  }
  const idx = current ? TIERS.indexOf(current) : -1;
  const next = TIERS[idx + 1] || null;
  // Percent toward the next tier's threshold, measured from zero — not from the current
  // tier's own floor — so e.g. 56,451 of Platinum's 80,000 reads as 71%, not as 41% of the
  // remaining Gold-to-Platinum span.
  const pct = next ? Math.min(100, Math.round((statusPoints / next.threshold) * 100)) : 100;
  return { current, next, pct };
}

function FlapNumber({ value }) {
  const str = Number(value || 0).toLocaleString("en-US");
  return (
    <span className="flap-number">
      {str.split("").map((ch, i) => (
        <span className="flap-digit" key={i}>
          {ch}
        </span>
      ))}
    </span>
  );
}

// Small donut showing progress toward one tier's status-point threshold, with points
// remaining (or "Reached") underneath.
function TierDonut({ tier, statusPoints }) {
  const achieved = Math.min(statusPoints, tier.threshold);
  const remaining = Math.max(0, tier.threshold - statusPoints);
  const reached = statusPoints >= tier.threshold;
  const data = [
    { name: "achieved", value: achieved },
    { name: "remaining", value: remaining || 0.0001 },
  ];
  return (
    <div className="tier-donut">
      <div className="tier-donut-chart">
        <ResponsiveContainer width="100%" height={92}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              startAngle={90}
              endAngle={-270}
              innerRadius={28}
              outerRadius={40}
              paddingAngle={reached ? 0 : 2}
              stroke="none"
              isAnimationActive={false}
            >
              <Cell fill={tier.color} />
              <Cell fill="rgba(255,255,255,0.14)" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="tier-donut-center" style={{ color: tier.color }}>
          {reached ? <Check size={18} /> : `${Math.round((achieved / tier.threshold) * 100)}%`}
        </div>
      </div>
      <div className="tier-donut-name" style={{ color: tier.color }}>
        {tier.name}
      </div>
      <div className="tier-donut-sub">{reached ? "Reached" : `${remaining.toLocaleString()} pts left`}</div>
      {TIER_BENEFITS[tier.name] && <div className="tier-donut-benefit">{TIER_BENEFITS[tier.name].highlight}</div>}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function AirportLookup() {
  const [query, setQuery] = useState("");
  const [fromCode, setFromCode] = useState("");
  const [toCode, setToCode] = useState("");
  const results = searchAirports(query);
  const gcmUrl =
    fromCode.trim().length === 3 && toCode.trim().length === 3
      ? `https://www.greatcirclemap.com/?routes=${fromCode.trim().toUpperCase()}-${toCode.trim().toUpperCase()}`
      : null;

  return (
    <div className="add-card compact">
      <div className="field-row">
        <label className="field">
          <span>From</span>
          <input
            value={fromCode}
            onChange={(e) => setFromCode(e.target.value.toUpperCase().slice(0, 3))}
            placeholder="SEA"
            maxLength={3}
          />
        </label>
        <label className="field">
          <span>To</span>
          <input
            value={toCode}
            onChange={(e) => setToCode(e.target.value.toUpperCase().slice(0, 3))}
            placeholder="HNL"
            maxLength={3}
          />
        </label>
      </div>
      {gcmUrl ? (
        <a className="btn btn-primary btn-sm" href={gcmUrl} target="_blank" rel="noopener noreferrer">
          <Plane size={14} /> View distance on Great Circle Map
        </a>
      ) : (
        <p className="hint" style={{ margin: 0 }}>
          Enter both 3-letter codes to check the distance on Great Circle Map.
        </p>
      )}

      <div className="search-row">
        <Search size={14} className="search-icon" />
        <input
          type="text"
          className="search-input"
          placeholder="Search airport code or city..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button className="icon-btn tiny" onClick={() => setQuery("")} aria-label="Clear search">
            <X size={14} />
          </button>
        )}
      </div>

      {query.trim() && (
        <div className="airport-results">
          {results.length === 0 ? (
            <p className="empty">No matches for "{query.trim()}".</p>
          ) : (
            results.map(([code, city]) => (
              <div className="airport-result" key={code}>
                <span className="airport-code">{code}</span>
                <span className="airport-city">{city}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function AvatarCircle({ user, size = 40 }) {
  const initial = (user?.fullName || user?.email || "?").trim().charAt(0).toUpperCase();
  return user?.avatarUrl ? (
    <img src={user.avatarUrl} alt="" className="avatar-img" style={{ width: size, height: size }} />
  ) : (
    <div className="avatar-fallback" style={{ width: size, height: size, fontSize: size * 0.42 }}>
      {initial}
    </div>
  );
}

// ---------- storage ----------
async function loadTx() {
  try {
    const res = await window.storage.get("atmos-transactions", false);
    return res ? JSON.parse(res.value) : [];
  } catch {
    return [];
  }
}
async function saveTx(tx) {
  try {
    await window.storage.set("atmos-transactions", JSON.stringify(tx), false);
  } catch {
    /* best effort */
  }
}
async function loadGoal() {
  try {
    const res = await window.storage.get("atmos-goal", false);
    return res ? JSON.parse(res.value) : null;
  } catch {
    return null;
  }
}
async function saveGoal(goal) {
  try {
    await window.storage.set("atmos-goal", JSON.stringify(goal), false);
  } catch {
    /* best effort */
  }
}
async function loadSeededFlag() {
  try {
    const res = await window.storage.get("atmos-seeded", false);
    return !!res;
  } catch {
    return false;
  }
}
async function markSeeded() {
  try {
    await window.storage.set("atmos-seeded", "true", false);
  } catch {
    /* best effort */
  }
}
async function loadOpeningBalance() {
  try {
    const res = await window.storage.get("atmos-opening-balance", false);
    return res ? JSON.parse(res.value) : null;
  } catch {
    return null;
  }
}
async function saveOpeningBalance(ob) {
  try {
    await window.storage.set("atmos-opening-balance", JSON.stringify(ob), false);
  } catch {
    /* best effort */
  }
}
async function loadLifetimeStart() {
  try {
    const res = await window.storage.get("atmos-lifetime-start", false);
    return res ? JSON.parse(res.value) : null;
  } catch {
    return null;
  }
}
async function saveLifetimeStart(ls) {
  try {
    await window.storage.set("atmos-lifetime-start", JSON.stringify(ls), false);
  } catch {
    /* best effort */
  }
}

const noop = async () => {
  // eslint-disable-next-line no-console
  console.warn("This action isn't available in this preview — it only works once deployed with Supabase auth.");
};

export default function AtmosTracker({
  user = { email: "you@example.com", fullName: "You", avatarUrl: null },
  onSignOut = noop,
  onUpdateProfile = noop,
  onChangePassword = noop,
  onUploadAvatar = noop,
}) {
  const [loaded, setLoaded] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [goal, setGoal] = useState(null);
  const [openingBalance, setOpeningBalance] = useState(null);
  const [lifetimeStart, setLifetimeStart] = useState(null);
  const [adding, setAdding] = useState(false);
  const [editingTxId, setEditingTxId] = useState(null);
  const [expandedTxId, setExpandedTxId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [dismissedReminders, setDismissedReminders] = useState(() => new Set());
  const [collapsedYears, setCollapsedYears] = useState(() => new Set());
  const [collapsedMonths, setCollapsedMonths] = useState(() => new Set());
  const [importResult, setImportResult] = useState(null);
  const [logoFailed, setLogoFailed] = useState(false);
  const [tab, setTab] = useState("overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null); // 'profile' | 'password' | 'import' | 'opening' | 'goal' | null
  const fileInputRef = useRef(null);
  const hasSeededCollapse = useRef(false);

  useEffect(() => {
    (async () => {
      const [tx, g, seeded, ob, ls] = await Promise.all([
        loadTx(),
        loadGoal(),
        loadSeededFlag(),
        loadOpeningBalance(),
        loadLifetimeStart(),
      ]);
      if (!seeded && tx.length === 0) {
        const seeded_tx = SEED_TRANSACTIONS.map((s) => ({ id: uid(), ...s }));
        setTransactions(seeded_tx);
        saveTx(seeded_tx);
        markSeeded();
      } else {
        setTransactions(tx);
      }
      setGoal(g);
      setOpeningBalance(ob);
      setLifetimeStart(ls);
      setLoaded(true);
    })();
  }, []);

  // Default to only the current year expanded — once, the first time data is available.
  useEffect(() => {
    if (loaded && !hasSeededCollapse.current) {
      hasSeededCollapse.current = true;
      const thisYear = new Date().getFullYear();
      setCollapsedYears((prev) => {
        const years = new Set(prev);
        transactions.forEach((t) => {
          if (isValidISODate(t.date)) {
            const y = yearOf(t.date);
            if (y !== thisYear) years.add(y);
          }
        });
        return years;
      });
    }
  }, [loaded, transactions]);

  const persistTx = (next) => {
    setTransactions(next);
    saveTx(next);
  };
  const persistGoal = (next) => {
    setGoal(next);
    saveGoal(next);
  };
  const persistOpening = (next) => {
    setOpeningBalance(next);
    saveOpeningBalance(next);
  };
  const persistLifetimeStart = (next) => {
    setLifetimeStart(next);
    saveLifetimeStart(next);
  };

  const toggleYear = (year) => {
    setCollapsedYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  };
  const toggleMonth = (key) => {
    setCollapsedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleImportFile = (file) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const rows = parseCSV(String(reader.result));
        if (rows.length === 0) {
          setImportResult({
            added: 0,
            skipped: 0,
            error: "No rows found — check the file has a header row plus at least one data row.",
          });
          return;
        }
        const existingKeys = new Set(transactions.map(txDedupeKey));
        let added = 0;
        let skipped = 0;
        let noDate = 0;
        let badDate = 0;
        let flagged = 0;
        const newTx = [];
        for (const row of rows) {
          if (row.date === undefined) {
            // The "date" column itself wasn't found — almost always a header-naming
            // mismatch (or a BOM that slipped through), not a per-row problem.
            noDate++;
            continue;
          }
          const tx = csvRowToTx(row);
          if (!tx.date) {
            noDate++;
            continue;
          }
          if (!isValidISODate(tx.date)) {
            badDate++;
            // Still imported — it'll show up under "Unknown date" so it can be fixed
            // in place rather than silently vanishing.
          }
          const key = txDedupeKey(tx);
          if (existingKeys.has(key)) {
            skipped++;
            continue;
          }
          existingKeys.add(key);
          if (tx.statusUnconfirmed) flagged++;
          newTx.push({ id: uid(), ...tx });
          added++;
        }
        if (newTx.length) {
          persistTx([...transactions, ...newTx]);
        }
        setImportResult({ added, skipped, noDate, badDate, flagged, error: null });
      } catch (e) {
        setImportResult({ added: 0, skipped: 0, error: "Couldn't read that file as CSV." });
      }
    };
    reader.onerror = () => setImportResult({ added: 0, skipped: 0, error: "Couldn't read that file." });
    reader.readAsText(file);
  };

  // "Planned" entries are upcoming trips logged ahead of time — they never count toward
  // balance, lifetime miles, totals, status, or charts until confirmed as flown.
  const confirmedTransactions = useMemo(() => transactions.filter((t) => !t.planned), [transactions]);
  const plannedTransactions = useMemo(() => transactions.filter((t) => t.planned), [transactions]);
  const reviewTransactions = useMemo(() => transactions.filter((t) => t.statusUnconfirmed && !t.planned), [transactions]);

  const balance = useMemo(
    () => (openingBalance?.amount || 0) + confirmedTransactions.reduce((s, t) => s + pointsDelta(t), 0),
    [confirmedTransactions, openingBalance]
  );
  // Lifetime miles: flight miles only (never bonus or status points), and never reduced by
  // redemptions — mirrors how Atmos Rewards' own lifetime-mile counter works.
  const lifetimeMiles = useMemo(
    () =>
      (lifetimeStart?.amount || 0) +
      confirmedTransactions.reduce((s, t) => s + (t.sign === "redeem" ? 0 : t.flightPoints || 0), 0),
    [confirmedTransactions, lifetimeStart]
  );
  const millionMilerPct = Math.min(100, Math.round((lifetimeMiles / MILLION_MILER) * 100));
  const millionMilerRemaining = Math.max(0, MILLION_MILER - lifetimeMiles);
  const millionMilerReached = lifetimeMiles >= MILLION_MILER;
  const yearNow = new Date().getFullYear();

  const availableYears = useMemo(() => {
    const years = new Set([yearNow]);
    confirmedTransactions.forEach((t) => {
      if (isValidISODate(t.date)) years.add(yearOf(t.date));
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [confirmedTransactions, yearNow]);

  const [viewYear, setViewYear] = useState(yearNow);

  const statusForViewYear = useMemo(
    () =>
      viewYear === "all"
        ? confirmedTransactions.reduce((s, t) => s + statusDelta(t), 0)
        : confirmedTransactions
            .filter((t) => isValidISODate(t.date) && yearOf(t.date) === viewYear)
            .reduce((s, t) => s + statusDelta(t), 0),
    [confirmedTransactions, viewYear]
  );
  const tierInfo = getTierInfo(statusForViewYear);

  // Projections: based on your average points/status per flight, how many more flights
  // like that until you hit your goal or the next tier.
  const flightEntries = useMemo(
    () => confirmedTransactions.filter((t) => t.sign !== "redeem" && (t.flightPoints || 0) > 0),
    [confirmedTransactions]
  );
  const avgPointsPerFlight = flightEntries.length
    ? Math.round(
        flightEntries.reduce((s, t) => s + (t.flightPoints || 0) + (t.bonusPoints || 0) + (t.nonStatusPoints || 0), 0) /
          flightEntries.length
      )
    : 0;
  const yearFlightEntries = useMemo(
    () => flightEntries.filter((t) => isValidISODate(t.date) && yearOf(t.date) === yearNow),
    [flightEntries, yearNow]
  );
  const avgStatusPerFlightThisYear = yearFlightEntries.length
    ? Math.round(yearFlightEntries.reduce((s, t) => s + (t.statusPoints || 0), 0) / yearFlightEntries.length)
    : 0;

  const pointsNeededForGoal = goal ? Math.max(0, goal.amount - balance) : 0;
  const flightsToGoal =
    goal && pointsNeededForGoal > 0 && avgPointsPerFlight > 0 ? Math.ceil(pointsNeededForGoal / avgPointsPerFlight) : null;

  const statusNeededForNextTier = tierInfo.next ? Math.max(0, tierInfo.next.threshold - statusForViewYear) : 0;
  const flightsToNextTier =
    viewYear === yearNow && tierInfo.next && statusNeededForNextTier > 0 && avgStatusPerFlightThisYear > 0
      ? Math.ceil(statusNeededForNextTier / avgStatusPerFlightThisYear)
      : null;

  // Reminders (shown regardless of which year is selected, and regardless of tab) — these
  // always look at the actual current calendar year, not whatever year the person happens
  // to be browsing.
  const statusThisYearAlways = useMemo(
    () =>
      confirmedTransactions
        .filter((t) => isValidISODate(t.date) && yearOf(t.date) === yearNow)
        .reduce((s, t) => s + statusDelta(t), 0),
    [confirmedTransactions, yearNow]
  );
  const tierInfoThisYear = getTierInfo(statusThisYearAlways);
  const remainingToNextTierThisYear = tierInfoThisYear.next ? tierInfoThisYear.next.threshold - statusThisYearAlways : 0;
  const closeToNextTier =
    tierInfoThisYear.next && remainingToNextTierThisYear > 0 && remainingToNextTierThisYear <= Math.round(tierInfoThisYear.next.threshold * 0.1);

  const isJanuary = new Date().getMonth() === 0;
  const daysUntilJan31 = Math.ceil((new Date(yearNow, 0, 31) - new Date()) / 86400000);
  const prevYearStatus = useMemo(
    () =>
      confirmedTransactions
        .filter((t) => isValidISODate(t.date) && yearOf(t.date) === yearNow - 1)
        .reduce((s, t) => s + statusDelta(t), 0),
    [confirmedTransactions, yearNow]
  );
  const prevTierInfo = getTierInfo(prevYearStatus);
  const benefitsExpiringSoon =
    isJanuary &&
    daysUntilJan31 >= 0 &&
    prevTierInfo.current &&
    (!tierInfoThisYear.current || TIERS.indexOf(tierInfoThisYear.current) < TIERS.indexOf(prevTierInfo.current));

  const invalidCount = useMemo(
    () => confirmedTransactions.filter((t) => !isValidISODate(t.date)).length,
    [confirmedTransactions]
  );

  const sorted = [...confirmedTransactions].sort((a, b) => (a.date < b.date ? -1 : 1));
  const pointsChart = useMemo(() => {
    const valid = sorted.filter((t) => isValidISODate(t.date));
    const monthly = toMonthlySeries(valid, pointsDelta, openingBalance?.amount || 0, viewYear === "all");
    const filtered = viewYear === "all" ? monthly : monthly.filter((m) => m.year === viewYear);
    const showOpeningPoint =
      openingBalance?.amount &&
      (viewYear === "all" || (isValidISODate(openingBalance.asOf) && yearOf(openingBalance.asOf) === viewYear));
    if (showOpeningPoint) {
      const label = isValidISODate(openingBalance.asOf) ? chartMonthLabel(openingBalance.asOf, viewYear === "all") : "START";
      return [{ date: label, value: openingBalance.amount }, ...filtered];
    }
    return filtered;
  }, [sorted, openingBalance, viewYear]);

  const statusChart = useMemo(() => {
    const filtered = sorted.filter((t) => isValidISODate(t.date) && (viewYear === "all" || yearOf(t.date) === viewYear));
    return toMonthlySeries(filtered, statusDelta, 0, viewYear === "all");
  }, [sorted, viewYear]);

  const totals = useMemo(() => {
    const earned = confirmedTransactions.filter(
      (t) => t.sign !== "redeem" && (viewYear === "all" || (isValidISODate(t.date) && yearOf(t.date) === viewYear))
    );
    return {
      flight: earned.reduce((s, t) => s + (t.flightPoints || 0), 0),
      bonus: earned.reduce((s, t) => s + (t.bonusPoints || 0) + (t.nonStatusPoints || 0), 0),
      status: earned.reduce((s, t) => s + (t.statusPoints || 0), 0),
    };
  }, [confirmedTransactions, viewYear]);

  const yearSummary = useMemo(() => {
    if (viewYear === "all") return null;
    const entries = flightEntries.filter((t) => isValidISODate(t.date) && yearOf(t.date) === viewYear);
    return {
      flights: entries.length,
      points: totals.flight + totals.bonus,
      status: totals.status,
      tier: tierInfo.current,
      topRoute: topRouteFromEntries(entries),
    };
  }, [viewYear, flightEntries, totals, tierInfo]);

  // Activity grouped by year, then by month, most recent first — each level carries a
  // points/status-points subtotal for its own entries.
  const groupedActivity = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const source = q
      ? sorted.filter(
          (t) =>
            (t.description || "").toLowerCase().includes(q) || (t.notes || "").toLowerCase().includes(q)
        )
      : sorted;
    const byYear = new Map();
    for (const t of source) {
      if (!isValidISODate(t.date)) continue;
      const year = yearOf(t.date);
      const mKey = monthKey(t.date);
      if (!byYear.has(year)) byYear.set(year, new Map());
      const months = byYear.get(year);
      if (!months.has(mKey)) months.set(mKey, { label: monthLabelLong(t.date), items: [], pts: 0, sp: 0 });
      const bucket = months.get(mKey);
      bucket.items.push(t);
      bucket.pts += pointsDelta(t);
      bucket.sp += statusDelta(t);
    }
    const years = Array.from(byYear.keys()).sort((a, b) => b - a);
    const yearGroups = years.map((year) => {
      const months = byYear.get(year);
      const monthKeys = Array.from(months.keys()).sort((a, b) => (a < b ? 1 : -1));
      const monthGroups = monthKeys.map((mk) => {
        const g = months.get(mk);
        return { key: mk, label: g.label, items: g.items.slice().reverse(), pts: g.pts, sp: g.sp };
      });
      const pts = monthGroups.reduce((s, g) => s + g.pts, 0);
      const sp = monthGroups.reduce((s, g) => s + g.sp, 0);
      return { year, months: monthGroups, pts, sp };
    });
    const invalidItems = q
      ? []
      : confirmedTransactions.filter((t) => !isValidISODate(t.date));
    return { years: yearGroups, invalidItems };
  }, [sorted, confirmedTransactions, searchQuery]);

  const renderReviewRow = (t) => {
    if (editingTxId === t.id) {
      return (
        <ActivityEditor
          key={t.id}
          initial={t}
          onSave={(tx) => {
            persistTx(transactions.map((x) => (x.id === t.id ? { id: t.id, ...tx } : x)));
            setEditingTxId(null);
          }}
          onCancel={() => setEditingTxId(null)}
        />
      );
    }
    return (
      <div key={t.id} className="planned-card review-card">
        <div className="tx-date">{fmtDate(t.date)}</div>
        <div className="planned-desc">{t.description}</div>
        <div className="planned-est">
          Alaska's export showed 0 status points for this flight &mdash; suggested{" "}
          <strong className="pos">{t.statusPoints.toLocaleString()} sp</strong> (equal to flight points)
        </div>
        <div className="expanded-actions">
          <button
            className="btn btn-ghost btn-sm expanded-btn"
            onClick={() => {
              setAdding(false);
              setEditingTxId(t.id);
            }}
          >
            <Pencil size={14} /> Edit
          </button>
          <button
            className="btn btn-primary btn-sm expanded-btn"
            onClick={() =>
              persistTx(transactions.map((x) => (x.id === t.id ? { ...x, statusUnconfirmed: false } : x)))
            }
          >
            <Check size={14} /> Confirm {t.statusPoints.toLocaleString()} sp
          </button>
        </div>
      </div>
    );
  };

  const renderPlannedRow = (t) => {
    if (editingTxId === t.id) {
      return (
        <ActivityEditor
          key={t.id}
          initial={t}
          onSave={(tx) => {
            persistTx(transactions.map((x) => (x.id === t.id ? { id: t.id, ...tx } : x)));
            setEditingTxId(null);
          }}
          onCancel={() => setEditingTxId(null)}
        />
      );
    }
    const total = pointsDelta(t);
    const sp = statusDelta(t);
    return (
      <div key={t.id} className="planned-card">
        <div className="tx-date">{fmtDate(t.date)}</div>
        <div className="planned-desc">{t.description}</div>
        <div className="planned-est">
          Est.{" "}
          <strong className={total >= 0 ? "pos" : "neg"}>
            {total >= 0 ? "+" : ""}
            {total.toLocaleString()} pts
          </strong>
          {sp ? <span className="preview-sp"> &middot; +{sp.toLocaleString()} sp</span> : null}
        </div>
        <div className="expanded-actions">
          <button
            className="btn btn-ghost btn-sm expanded-btn"
            onClick={() => {
              setAdding(false);
              setEditingTxId(t.id);
            }}
          >
            <Pencil size={14} /> Edit
          </button>
          <button
            className="btn btn-primary btn-sm expanded-btn"
            onClick={() => persistTx(transactions.map((x) => (x.id === t.id ? { ...x, planned: false } : x)))}
          >
            <Check size={14} /> Confirm flown
          </button>
          <button
            className="btn btn-ghost btn-sm expanded-btn danger-text"
            onClick={() => persistTx(transactions.filter((x) => x.id !== t.id))}
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>
    );
  };

  const renderActivityRow = (t) => {
    if (editingTxId === t.id) {
      return (
        <ActivityEditor
          key={t.id}
          initial={t}
          onSave={(tx) => {
            persistTx(transactions.map((x) => (x.id === t.id ? { id: t.id, ...tx } : x)));
            setEditingTxId(null);
          }}
          onCancel={() => setEditingTxId(null)}
        />
      );
    }
    return (
      <ActivityRow
        key={t.id}
        t={t}
        expanded={expandedTxId === t.id}
        onToggleExpand={() => setExpandedTxId(expandedTxId === t.id ? null : t.id)}
        onEdit={() => {
          setAdding(false);
          setExpandedTxId(null);
          setEditingTxId(t.id);
        }}
        onDelete={() => {
          persistTx(transactions.filter((x) => x.id !== t.id));
          setExpandedTxId(null);
        }}
      />
    );
  };

  return (
    <div className="app-root">
      <style>{CSS}</style>

      <header className="board-header">
        <button className="hamburger-btn" onClick={() => setMenuOpen(true)} aria-label="Open menu">
          <Menu size={22} />
        </button>
        <div className="board-brand">
          {logoFailed ? (
            <Sparkles size={64} strokeWidth={1.6} />
          ) : (
            <img src="/b31sb3lrs6tg1.png" alt="" className="brand-logo" onError={() => setLogoFailed(true)} />
          )}
          <span className="brand-title">Atmos Tracker</span>
        </div>
        <p className="board-sub">Unofficial Companion - ATMOS REWARDS Points &amp; Status</p>
      </header>

      <div className="tab-switch">
        <button className={`tab-btn ${tab === "overview" ? "active" : ""}`} onClick={() => setTab("overview")}>
          Overview
        </button>
        <button className={`tab-btn ${tab === "activity" ? "active" : ""}`} onClick={() => setTab("activity")}>
          Activity
        </button>
      </div>

      {loaded && benefitsExpiringSoon && !dismissedReminders.has("expiring") && (
        <div className="reminder-banner reminder-urgent">
          <span>
            Your {yearNow - 1} {prevTierInfo.current.name} benefits expire Jan 31 &mdash; {daysUntilJan31}{" "}
            {daysUntilJan31 === 1 ? "day" : "days"} left. You're currently tracking{" "}
            {tierInfoThisYear.current ? tierInfoThisYear.current.name : "no tier yet"} for {yearNow}.
          </span>
          <button
            className="icon-btn tiny"
            onClick={() => setDismissedReminders((prev) => new Set(prev).add("expiring"))}
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {loaded && closeToNextTier && !dismissedReminders.has("close-tier") && (
        <div className="reminder-banner">
          <span>
            Just {remainingToNextTierThisYear.toLocaleString()} status points from{" "}
            <strong>{tierInfoThisYear.next.name}</strong> this year!
          </span>
          <button
            className="icon-btn tiny"
            onClick={() => setDismissedReminders((prev) => new Set(prev).add("close-tier"))}
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <main className="board-main">
        {!loaded ? (
          <div className="loading-row">
            <Loader2 size={16} className="spin" /> Loading your data&hellip;
          </div>
        ) : tab === "overview" ? (
          <div className="panel">
            <div className="points-card">
              <span className="card-label">Atmos points</span>
              <FlapNumber value={balance} />
              <span className="card-unit">redeemable &middot; never expire</span>
            </div>

            <div className="lifetime-card">
              <div className="lifetime-head">
                <span className="card-label">Lifetime miles</span>
                <span className={`tier-badge ${millionMilerReached ? "milestone-reached" : "milestone-pending"}`}>
                  {millionMilerReached ? "Million Miler" : "Million Miler goal"}
                </span>
              </div>
              <span className="lifetime-value">{lifetimeMiles.toLocaleString()}</span>
              <span className="card-unit">flight miles only &middot; never resets</span>
              <div className="goal-bar lifetime-bar">
                <div className="goal-bar-fill lifetime-bar-fill" style={{ width: `${millionMilerPct}%` }} />
              </div>
              <div className="goal-foot">
                {millionMilerReached
                  ? "Million Miler reached \u2014 1,000,000 lifetime miles"
                  : `${millionMilerRemaining.toLocaleString()} miles to Million Miler (1,000,000)`}
              </div>
            </div>

            {goal && (
              <div className="goal-card">
                <div className="goal-head">
                  <span>
                    Saving for: <strong>{goal.label || "a trip"}</strong>
                  </span>
                </div>
                <div className="goal-bar">
                  <div
                    className="goal-bar-fill points-fill"
                    style={{ width: `${Math.min(100, Math.round((balance / goal.amount) * 100))}%` }}
                  />
                </div>
                <div className="goal-foot">
                  {balance.toLocaleString()} / {goal.amount.toLocaleString()} pts (
                  {Math.min(100, Math.round((balance / goal.amount) * 100))}%)
                </div>
                {flightsToGoal && (
                  <p className="hint" style={{ margin: 0 }}>
                    At your average of {avgPointsPerFlight.toLocaleString()} pts/flight, that's about {flightsToGoal}{" "}
                    more flight{flightsToGoal === 1 ? "" : "s"} to go.
                  </p>
                )}
              </div>
            )}

            <div className="panel-head">
              <h2>Totals</h2>
              <select
                className="year-select"
                value={viewYear}
                onChange={(e) => setViewYear(e.target.value === "all" ? "all" : Number(e.target.value))}
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
                <option value="all">All time</option>
              </select>
            </div>

            <div className="totals-grid">
              <div className="total-tile" style={{ "--tile-color": "#00B140" }}>
                <span className="total-label">Flight points</span>
                <span className="total-value">{totals.flight.toLocaleString()}</span>
              </div>
              <div className="total-tile" style={{ "--tile-color": "#D3117B" }}>
                <span className="total-label">Bonus points</span>
                <span className="total-value">{totals.bonus.toLocaleString()}</span>
              </div>
              <div className="total-tile" style={{ "--tile-color": "#E95D34" }}>
                <span className="total-label">Status points</span>
                <span className="total-value">{totals.status.toLocaleString()}</span>
              </div>
              {openingBalance?.amount ? (
                <div className="total-tile" style={{ "--tile-color": "#0062B2" }}>
                  <span className="total-label">Beginning balance</span>
                  <span className="total-value">{openingBalance.amount.toLocaleString()}</span>
                </div>
              ) : null}
            </div>
            <p className="hint totals-hint">
              {viewYear === "all"
                ? "Lifetime totals across every year you've logged."
                : `Totals for ${viewYear} only. Status points reset each Jan 1, so this is what counted toward tier that year.`}
              {viewYear !== "all" && (
                <>
                  {" "}
                  <button className="link-btn" onClick={() => setActiveModal("yearReview")}>
                    View {viewYear} in review
                  </button>
                </>
              )}
            </p>

            {pointsChart.length > 1 && (
              <div className="chart-wrap">
                <p className="chart-caption">Balance trend &middot; {viewYear === "all" ? "all time" : viewYear}</p>
                <ResponsiveContainer width="100%" height={120}>
                  <LineChart data={pointsChart} margin={{ top: 4, right: 36, left: 4, bottom: 0 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.16)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: "#aebdc9", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#aebdc9", fontSize: 10 }} axisLine={false} tickLine={false} width={40} tickFormatter={fmtAxisK} />
                    <Tooltip
                      contentStyle={{ background: "#1b365d", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: "#e8f1f5" }}
                    />
                    <Line type="monotone" dataKey="value" stroke="#00B140" strokeWidth={2} dot={{ r: 3, fill: "#00B140" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="status-card">
              <div className="status-head">
                <span className="card-label">{viewYear === "all" ? "All-time" : viewYear} status</span>
                {viewYear !== "all" && (
                  <span className="tier-badge-group">
                    <span
                      className="tier-badge"
                      style={{ color: tierInfo.current?.color || "#aebdc9", borderColor: tierInfo.current?.color || "rgba(255,255,255,0.16)" }}
                    >
                      {tierInfo.current ? tierInfo.current.name : "No tier yet"}
                    </span>
                    {tierInfo.current && ONEWORLD_TIER[tierInfo.current.name] && (
                      <span className="oneworld-badge">oneworld {ONEWORLD_TIER[tierInfo.current.name]}</span>
                    )}
                  </span>
                )}
              </div>
              <div className="status-number">{statusForViewYear.toLocaleString()} status pts</div>
              {viewYear === "all" ? (
                <p className="hint">
                  Status points reset every Jan 1, so this lifetime sum doesn't map to a single tier &mdash; pick a
                  specific year above to see that year's tier progress.
                </p>
              ) : (
                <>
                  <div className="goal-bar">
                    <div
                      className="goal-bar-fill status-fill"
                      style={{
                        width: `${tierInfo.pct}%`,
                        background: `linear-gradient(90deg, ${tierInfo.current?.color || "#8592a1"}, ${
                          tierInfo.next?.color || tierInfo.current?.color || TIERS[0].color
                        })`,
                      }}
                    />
                  </div>
                  <div className="goal-foot">
                    {tierInfo.next
                      ? `${(tierInfo.next.threshold - statusForViewYear).toLocaleString()} pts to ${tierInfo.next.name}`
                      : "Top tier reached that year"}
                  </div>
                  {flightsToNextTier && (
                    <p className="hint" style={{ margin: 0 }}>
                      At your {yearNow} average of {avgStatusPerFlightThisYear.toLocaleString()} sp/flight, that's
                      about {flightsToNextTier} more flight{flightsToNextTier === 1 ? "" : "s"} to {tierInfo.next.name}.
                    </p>
                  )}
                  <p className="hint">
                    {viewYear === yearNow
                      ? `Status points reset Jan 1, ${yearNow + 1}. Status earned this year carries benefits through Jan 31, ${yearNow + 1}.`
                      : `Benefits from ${viewYear} status carried through Jan 31, ${viewYear + 1}.`}
                  </p>
                </>
              )}
            </div>

            {viewYear !== "all" && (
              <div className="tier-donut-grid">
                {TIERS.map((tier) => (
                  <TierDonut key={tier.name} tier={tier} statusPoints={statusForViewYear} />
                ))}
              </div>
            )}

            {statusChart.length > 1 && (
              <div className="chart-wrap">
                <p className="chart-caption">Status points &middot; {viewYear === "all" ? "all time" : viewYear}</p>
                <ResponsiveContainer width="100%" height={130}>
                  <LineChart data={statusChart} margin={{ top: 4, right: 36, left: 4, bottom: 0 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.16)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: "#aebdc9", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#aebdc9", fontSize: 10 }} axisLine={false} tickLine={false} width={40} tickFormatter={fmtAxisK} />
                    <Tooltip
                      contentStyle={{ background: "#1b365d", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: "#e8f1f5" }}
                    />
                    {viewYear !== "all" &&
                      TIERS.map((t) => (
                        <ReferenceLine
                          key={t.name}
                          y={t.threshold}
                          stroke={t.color}
                          strokeDasharray="4 4"
                          label={{ value: t.name, position: "right", fill: t.color, fontSize: 10 }}
                        />
                      ))}
                    <Line type="monotone" dataKey="value" stroke="#D3117B" strokeWidth={2} dot={{ r: 3, fill: "#D3117B" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        ) : (
          <div className="panel">
            <div className="panel-head">
              <h2>Activity</h2>
            </div>

            {reviewTransactions.length > 0 && (
              <div className="upcoming-section">
                <div className="upcoming-heading">
                  Needs review <span className="group-subtotal">status points not yet counted toward tier</span>
                </div>
                {reviewTransactions
                  .slice()
                  .sort((a, b) => (a.date < b.date ? -1 : 1))
                  .map((t) => renderReviewRow(t))}
              </div>
            )}

            {plannedTransactions.length > 0 && (
              <div className="upcoming-section">
                <div className="upcoming-heading">
                  Upcoming trips <span className="group-subtotal">not yet counted toward your totals</span>
                </div>
                {plannedTransactions
                  .slice()
                  .sort((a, b) => (a.date < b.date ? -1 : 1))
                  .map((t) => renderPlannedRow(t))}
              </div>
            )}

            <div className="search-row">
              <Search size={14} className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="Search activity or notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="icon-btn tiny" onClick={() => setSearchQuery("")} aria-label="Clear search">
                  <X size={14} />
                </button>
              )}
            </div>

            {invalidCount > 0 && (
              <div className="warn-banner">
                <span>
                  {invalidCount} {invalidCount === 1 ? "entry has" : "entries have"} an unreadable date and won't
                  show up in the charts above.
                </span>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => persistTx(transactions.filter((t) => isValidISODate(t.date)))}
                >
                  Remove {invalidCount === 1 ? "it" : "them"}
                </button>
              </div>
            )}

            {adding && (
              <ActivityEditor
                onSave={(tx) => {
                  persistTx([...transactions, { id: uid(), ...tx }]);
                  setAdding(false);
                }}
                onCancel={() => setAdding(false)}
              />
            )}

            {sorted.length === 0 && !adding ? (
              <p className="empty">
                No activity yet &mdash; tap the + button to log a flight, card bonus, or redemption.
              </p>
            ) : searchQuery.trim() && groupedActivity.years.length === 0 ? (
              <p className="empty">No activity matches "{searchQuery.trim()}".</p>
            ) : (
              <div className="activity-groups">
                {groupedActivity.invalidItems.length > 0 && (
                  <div className="year-group">
                    <button
                      className="group-heading year-heading"
                      onClick={() => toggleYear("invalid")}
                      aria-expanded={!collapsedYears.has("invalid")}
                    >
                      <span className="group-heading-left">
                        <ChevronDown size={14} className={`chevron ${collapsedYears.has("invalid") ? "collapsed" : ""}`} />
                        Unknown date
                      </span>
                    </button>
                    {!collapsedYears.has("invalid") && (
                      <div className="log-list">{groupedActivity.invalidItems.map((t) => renderActivityRow(t))}</div>
                    )}
                  </div>
                )}
                {groupedActivity.years.map((yg) => {
                  const isSearching = !!searchQuery.trim();
                  const yearExpanded = isSearching || !collapsedYears.has(yg.year);
                  return (
                    <div className="year-group" key={yg.year}>
                      <button
                        className="group-heading year-heading"
                        onClick={() => toggleYear(yg.year)}
                        aria-expanded={yearExpanded}
                      >
                        <span className="group-heading-left">
                          <ChevronDown size={14} className={`chevron ${yearExpanded ? "" : "collapsed"}`} />
                          {yg.year}
                        </span>
                        <span className="group-subtotal">
                          {fmtSigned(yg.pts)} pts &middot; {fmtSigned(yg.sp)} sp
                        </span>
                      </button>
                      {yearExpanded &&
                        yg.months.map((mg) => {
                          const monthExpanded = isSearching || !collapsedMonths.has(mg.key);
                          return (
                            <div className="month-group" key={mg.key}>
                              <button
                                className="group-heading month-heading"
                                onClick={() => toggleMonth(mg.key)}
                                aria-expanded={monthExpanded}
                              >
                                <span className="group-heading-left">
                                  <ChevronDown size={12} className={`chevron ${monthExpanded ? "" : "collapsed"}`} />
                                  {mg.label}
                                </span>
                                <span className="group-subtotal">
                                  {fmtSigned(mg.pts)} pts &middot; {fmtSigned(mg.sp)} sp
                                </span>
                              </button>
                              {monthExpanded && (
                                <div className="log-list">{mg.items.map((t) => renderActivityRow(t))}</div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      <button
        className="fab"
        onClick={() => {
          setTab("activity");
          setEditingTxId(null);
          setAdding(true);
        }}
        aria-label="Log activity"
      >
        <Plus size={24} />
      </button>

      {menuOpen && (
        <div className="menu-backdrop" onClick={() => setMenuOpen(false)}>
          <div className="menu-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="menu-user">
              <AvatarCircle user={user} size={44} />
              <div className="menu-user-info">
                <div className="menu-user-name">{user.fullName || "You"}</div>
                <div className="menu-user-email">{user.email}</div>
              </div>
            </div>
            <button
              className="menu-item"
              onClick={() => {
                setActiveModal("profile");
                setMenuOpen(false);
              }}
            >
              <User size={16} /> Profile
            </button>
            <button
              className="menu-item"
              onClick={() => {
                setActiveModal("password");
                setMenuOpen(false);
              }}
            >
              <KeyRound size={16} /> Reset password
            </button>
            <button
              className="menu-item"
              onClick={() => {
                setActiveModal("import");
                setMenuOpen(false);
              }}
            >
              <Upload size={16} /> Import CSV
            </button>
            <button
              className="menu-item"
              onClick={() => {
                setActiveModal("opening");
                setMenuOpen(false);
              }}
            >
              <Sparkles size={16} /> Beginning balance
            </button>
            <button
              className="menu-item"
              onClick={() => {
                setActiveModal("lifetime");
                setMenuOpen(false);
              }}
            >
              <Plane size={16} /> Lifetime miles
            </button>
            <button
              className="menu-item"
              onClick={() => {
                setActiveModal("tierBenefits");
                setMenuOpen(false);
              }}
            >
              <Star size={16} /> Tier benefits
            </button>
            <button
              className="menu-item"
              onClick={() => {
                setActiveModal("airportLookup");
                setMenuOpen(false);
              }}
            >
              <MapPin size={16} /> Airport lookup
            </button>
            <button
              className="menu-item"
              onClick={() => {
                setActiveModal("goal");
                setMenuOpen(false);
              }}
            >
              <Award size={16} /> Redemption goal
            </button>
            <button
              className="menu-item"
              onClick={() => {
                setActiveModal("export");
                setMenuOpen(false);
              }}
            >
              <Download size={16} /> Export data
            </button>
            <div className="menu-divider" />
            <button
              className="menu-item menu-item-danger"
              onClick={() => {
                setMenuOpen(false);
                onSignOut();
              }}
            >
              <LogOut size={16} /> Sign out
            </button>
          </div>
        </div>
      )}

      {activeModal === "profile" && (
        <Modal title="Profile" onClose={() => setActiveModal(null)}>
          <ProfileEditor
            user={user}
            onUploadAvatar={onUploadAvatar}
            onSave={async (p) => {
              await onUpdateProfile(p);
              setActiveModal(null);
            }}
            onCancel={() => setActiveModal(null)}
          />
        </Modal>
      )}

      {activeModal === "password" && (
        <Modal title="Reset password" onClose={() => setActiveModal(null)}>
          <PasswordEditor onSave={onChangePassword} onCancel={() => setActiveModal(null)} />
        </Modal>
      )}

      {activeModal === "import" && (
        <Modal
          title="Import CSV"
          onClose={() => {
            setActiveModal(null);
            setImportResult(null);
          }}
        >
          <div className="add-card compact">
            <p className="hint" style={{ margin: 0 }}>
              Upload a CSV exported straight from alaskaair.com (Date, Activity, Points, Bonus
              Points, Status Points), or one in this app's own format (
              <code>date, description, flightPoints, bonusPoints, statusPoints, redeemPoints, notes</code>
              ). Rows matching an entry you've already logged are skipped automatically, and any
              flight showing 0 status points gets flagged for you to confirm instead of trusted
              as-is.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImportFile(file);
                e.target.value = "";
              }}
            />
            {importResult && (
              <div className={`import-result ${importResult.error ? "err" : ""}`}>
                {importResult.error ? (
                  importResult.error
                ) : (
                  <>
                    <Check size={13} /> Added {importResult.added.toLocaleString()} new
                    {importResult.skipped ? `, skipped ${importResult.skipped.toLocaleString()} already logged` : ""}
                    {importResult.flagged
                      ? `, ${importResult.flagged.toLocaleString()} flagged for status-points review`
                      : ""}
                    {importResult.badDate
                      ? `, ${importResult.badDate.toLocaleString()} added with an unrecognized date (check "Unknown date" in Activity)`
                      : ""}
                    {importResult.noDate
                      ? `, ${importResult.noDate.toLocaleString()} skipped with no date at all`
                      : ""}
                    .
                  </>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}

      {activeModal === "opening" && (
        <Modal title="Beginning balance" onClose={() => setActiveModal(null)}>
          <OpeningBalanceEditor
            openingBalance={openingBalance}
            onSave={(ob) => {
              persistOpening(ob);
              setActiveModal(null);
            }}
            onCancel={() => setActiveModal(null)}
          />
        </Modal>
      )}

      {activeModal === "lifetime" && (
        <Modal title="Lifetime miles" onClose={() => setActiveModal(null)}>
          <LifetimeMilesEditor
            lifetimeStart={lifetimeStart}
            onSave={(ls) => {
              persistLifetimeStart(ls);
              setActiveModal(null);
            }}
            onCancel={() => setActiveModal(null)}
          />
        </Modal>
      )}

      {activeModal === "tierBenefits" && (
        <Modal title="Tier benefits" onClose={() => setActiveModal(null)}>
          <div className="tier-benefits">
            {TIERS.map((tier) => (
              <div className="tier-benefit-card" key={tier.name}>
                <div className="tier-benefit-head" style={{ color: tier.color, borderColor: tier.color }}>
                  <span>
                    {tier.name} <span className="oneworld-badge">oneworld {ONEWORLD_TIER[tier.name]}</span>
                  </span>
                  <span className="tier-benefit-threshold">{tier.threshold.toLocaleString()} pts</span>
                </div>
                <ul className="tier-benefit-list">
                  {TIER_BENEFITS[tier.name].perks.map((perk, i) => (
                    <li key={i}>{perk}</li>
                  ))}
                </ul>
              </div>
            ))}
            <p className="hint" style={{ margin: 0 }}>
              Million Miler: reaching 1,000,000 lifetime miles grants lifetime Atmos Gold status;
              2,000,000 lifetime miles grants lifetime Atmos Platinum.
            </p>
          </div>
        </Modal>
      )}

      {activeModal === "airportLookup" && (
        <Modal title="Airport lookup" onClose={() => setActiveModal(null)}>
          <AirportLookup />
        </Modal>
      )}

      {activeModal === "goal" && (
        <Modal title="Redemption goal" onClose={() => setActiveModal(null)}>
          <GoalEditor
            goal={goal}
            onSave={(g) => {
              persistGoal(g);
              setActiveModal(null);
            }}
            onCancel={() => setActiveModal(null)}
          />
        </Modal>
      )}

      {activeModal === "export" && (
        <Modal title="Export data" onClose={() => setActiveModal(null)}>
          <div className="add-card compact">
            <p className="hint" style={{ margin: 0 }}>
              Download everything you've logged &mdash; useful as a backup, or to move your
              data somewhere else.
            </p>
            <button
              className="btn btn-primary btn-sm"
              onClick={() =>
                downloadTextFile(
                  `atmos-tracker-backup-${todayISO()}.json`,
                  JSON.stringify({ transactions, goal, openingBalance, lifetimeStart }, null, 2),
                  "application/json"
                )
              }
            >
              <Download size={14} /> Download full backup (JSON)
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => downloadTextFile(`atmos-tracker-activity-${todayISO()}.csv`, transactionsToCSV(transactions), "text/csv")}
            >
              <Download size={14} /> Download activity only (CSV)
            </button>
            <p className="hint" style={{ margin: 0 }}>
              The CSV matches the Import CSV format, so it can be re-imported here or opened in
              a spreadsheet.
            </p>
          </div>
        </Modal>
      )}

      {activeModal === "yearReview" && yearSummary && (
        <Modal title={`${viewYear} in review`} onClose={() => setActiveModal(null)}>
          <div className="year-review">
            <div className="review-stat">
              <span className="review-stat-value">{yearSummary.flights.toLocaleString()}</span>
              <span className="review-stat-label">{yearSummary.flights === 1 ? "flight" : "flights"} logged</span>
            </div>
            <div className="review-stat">
              <span className="review-stat-value">{yearSummary.points.toLocaleString()}</span>
              <span className="review-stat-label">points earned</span>
            </div>
            <div className="review-stat">
              <span className="review-stat-value">{yearSummary.status.toLocaleString()}</span>
              <span className="review-stat-label">status points</span>
            </div>
            <div className="review-stat">
              <span className="review-stat-value" style={{ color: yearSummary.tier?.color || "var(--muted)" }}>
                {yearSummary.tier ? yearSummary.tier.name : "None"}
              </span>
              <span className="review-stat-label">tier reached</span>
            </div>
            {yearSummary.topRoute && (
              <div className="review-stat review-stat-wide">
                <span className="review-stat-value">{yearSummary.topRoute.route}</span>
                <span className="review-stat-label">
                  most-flown route &middot; {yearSummary.topRoute.count}{" "}
                  {yearSummary.topRoute.count === 1 ? "time" : "times"}
                </span>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

function ProfileEditor({ user, onSave, onUploadAvatar, onCancel }) {
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const url = await onUploadAvatar(file);
      if (url) setAvatarUrl(url);
    } catch (e) {
      setError("Couldn't upload that image.");
    }
    setUploading(false);
  };

  return (
    <div className="add-card compact">
      <div className="avatar-row">
        <AvatarCircle user={{ fullName, avatarUrl }} size={56} />
        <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
          <Camera size={13} /> {uploading ? "Uploading..." : "Change photo"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>
      {error && <p className="hint" style={{ color: "var(--laser-fg)" }}>{error}</p>}
      <label className="field">
        <span>Display name</span>
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
      </label>
      <div className="cta-row">
        <button className="btn btn-primary btn-sm" onClick={() => onSave({ fullName, avatarUrl })}>
          Save
        </button>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function PasswordEditor({ onSave, onCancel }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState(null); // null | 'saving' | 'done' | 'error'
  const [error, setError] = useState("");

  const submit = async () => {
    if (password.length < 6) {
      setStatus("error");
      setError("Password needs to be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setStatus("error");
      setError("Passwords don't match.");
      return;
    }
    setStatus("saving");
    try {
      await onSave(password);
      setStatus("done");
    } catch (e) {
      setStatus("error");
      setError("Couldn't update your password.");
    }
  };

  return (
    <div className="add-card compact">
      {status === "done" ? (
        <p className="hint">
          <Check size={13} /> Password updated.
        </p>
      ) : (
        <>
          <label className="field">
            <span>New password</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
          </label>
          <label className="field">
            <span>Confirm password</span>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </label>
          {status === "error" && <p className="hint" style={{ color: "var(--laser-fg)" }}>{error}</p>}
          <div className="cta-row">
            <button className="btn btn-primary btn-sm" onClick={submit} disabled={status === "saving"}>
              {status === "saving" ? "Saving..." : "Update password"}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function GoalEditor({ goal, onSave, onCancel }) {
  const [label, setLabel] = useState(goal?.label || "");
  const [amount, setAmount] = useState(goal?.amount || "");
  return (
    <div className="add-card compact">
      <label className="field">
        <span>What are you saving for?</span>
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Round trip to Tokyo" />
      </label>
      <label className="field">
        <span>Target points</span>
        <input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="60000" />
      </label>
      <div className="cta-row">
        <button
          className="btn btn-primary btn-sm"
          onClick={() => {
            const n = Number(amount);
            onSave(n ? { label, amount: n } : null);
          }}
        >
          Save goal
        </button>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function OpeningBalanceEditor({ openingBalance, onSave, onCancel }) {
  const [amount, setAmount] = useState(openingBalance?.amount || "");
  const [asOf, setAsOf] = useState(openingBalance?.asOf || "");
  const [note, setNote] = useState(openingBalance?.note || "");
  return (
    <div className="add-card compact">
      <p className="hint" style={{ margin: 0 }}>
        A lump-sum balance for activity from before your itemized history &mdash; added straight to your total, and
        shown as the starting point on the balance chart.
      </p>
      <label className="field">
        <span>Balance</span>
        <input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="45000" />
      </label>
      <label className="field">
        <span>As of</span>
        <input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
      </label>
      <label className="field">
        <span>Note (optional)</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Balance before 2025 activity" />
      </label>
      <div className="cta-row">
        <button
          className="btn btn-primary btn-sm"
          onClick={() => {
            const n = Number(amount);
            onSave(n ? { amount: n, asOf, note } : null);
          }}
        >
          Save
        </button>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function LifetimeMilesEditor({ lifetimeStart, onSave, onCancel }) {
  const [amount, setAmount] = useState(lifetimeStart?.amount || "");
  const [asOf, setAsOf] = useState(lifetimeStart?.asOf || "");
  const [note, setNote] = useState(lifetimeStart?.note || "");
  return (
    <div className="add-card compact">
      <p className="hint" style={{ margin: 0 }}>
        Your existing lifetime miles before this tracker &mdash; flight miles only. Going
        forward, flight points from logged activity are added automatically; bonus and status
        points never count toward this number, and redemptions never reduce it.
      </p>
      <label className="field">
        <span>Starting lifetime miles</span>
        <input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="250000" />
      </label>
      <label className="field">
        <span>As of (optional)</span>
        <input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
      </label>
      <label className="field">
        <span>Note (optional)</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Balance before this tracker" />
      </label>
      <div className="cta-row">
        <button
          className="btn btn-primary btn-sm"
          onClick={() => {
            const n = Number(amount);
            onSave(n ? { amount: n, asOf, note } : null);
          }}
        >
          Save
        </button>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// A single activity entry, collapsed by default. Tapping it reveals full detail plus
// clearly separated Edit/Delete actions — avoids cramped side-by-side icons that are easy
// to mis-tap, and deleting requires a second confirming tap.
function ActivityRow({ t, expanded, onToggleExpand, onEdit, onDelete }) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const total = pointsDelta(t);
  const sp = statusDelta(t);

  if (!expanded) {
    return (
      <button className="log-row-collapsed" onClick={onToggleExpand}>
        <div className="tx-main">
          <span className="tx-date">{fmtDate(t.date)}</span>
          <span className="tx-desc">{t.description}</span>
        </div>
        <span className={total >= 0 ? "tx-amt pos" : "tx-amt neg"}>
          {total >= 0 ? "+" : ""}
          {total.toLocaleString()} pts
        </span>
        <span className="tx-status">{sp ? `+${sp.toLocaleString()} sp` : ""}</span>
        <ChevronDown size={14} className="row-chevron" />
      </button>
    );
  }

  return (
    <div className="log-row-expanded">
      <button className="expanded-head" onClick={onToggleExpand}>
        <span className="tx-date">{fmtDate(t.date)}</span>
        <ChevronDown size={14} className="row-chevron collapsed" />
      </button>
      <div className="expanded-desc">{t.description}</div>
      {t.notes && <div className="expanded-notes">{t.notes}</div>}
      <div className="expanded-breakdown">
        {t.sign === "redeem" ? (
          <span className="expanded-pill">Redeemed {Math.abs(total).toLocaleString()} pts</span>
        ) : (
          <>
            {!!t.flightPoints && <span className="expanded-pill">Flight: {t.flightPoints.toLocaleString()} pts</span>}
            {!!(t.bonusPoints || t.nonStatusPoints) && (
              <span className="expanded-pill">
                Bonus: {((t.bonusPoints || 0) + (t.nonStatusPoints || 0)).toLocaleString()} pts
              </span>
            )}
            {!!t.statusPoints && <span className="expanded-pill">Status: {t.statusPoints.toLocaleString()} sp</span>}
          </>
        )}
      </div>
      <div className="expanded-total">
        Total:{" "}
        <strong className={total >= 0 ? "pos" : "neg"}>
          {total >= 0 ? "+" : ""}
          {total.toLocaleString()} pts
        </strong>
      </div>

      {confirmingDelete ? (
        <div className="expanded-actions confirm-row">
          <span className="confirm-text">Delete this entry?</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setConfirmingDelete(false)}>
            Cancel
          </button>
          <button className="btn btn-danger btn-sm" onClick={onDelete}>
            Confirm delete
          </button>
        </div>
      ) : (
        <div className="expanded-actions">
          <button className="btn btn-ghost btn-sm expanded-btn" onClick={onEdit}>
            <Pencil size={14} /> Edit
          </button>
          <button className="btn btn-ghost btn-sm expanded-btn danger-text" onClick={() => setConfirmingDelete(true)}>
            <Trash2 size={14} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

function ActivityEditor({ onSave, onCancel, initial }) {
  const [date, setDate] = useState(initial?.date || todayISO());
  const [description, setDescription] = useState(initial?.description || "");
  const [sign, setSign] = useState(initial?.sign || "earn");
  const [flightPoints, setFlightPoints] = useState(initial?.flightPoints || "");
  const [bonusPoints, setBonusPoints] = useState((initial?.bonusPoints || 0) + (initial?.nonStatusPoints || 0) || "");
  const [statusPoints, setStatusPoints] = useState(initial?.statusPoints || "");
  const [redeemPoints, setRedeemPoints] = useState(initial?.redeemPoints || "");
  const [planned, setPlanned] = useState(initial?.planned || false);
  const [notes, setNotes] = useState(initial?.notes || "");

  const fp = Number(flightPoints) || 0;
  const bp = Number(bonusPoints) || 0;
  const sp = Number(statusPoints) || 0;
  const rp = Number(redeemPoints) || 0;
  const totalPreview = sign === "earn" ? fp + bp : -rp;

  const submit = () => {
    if (!description) return;
    if (sign === "earn" && !(fp || bp || sp)) return;
    if (sign === "redeem" && !rp) return;
    onSave({
      date,
      description,
      sign,
      flightPoints: sign === "earn" ? fp : 0,
      bonusPoints: sign === "earn" ? bp : 0,
      statusPoints: sign === "earn" ? sp : 0,
      redeemPoints: sign === "redeem" ? rp : 0,
      planned: sign === "earn" ? planned : false,
      notes: notes.trim(),
    });
  };

  return (
    <div className="add-card">
      <div className="field-row">
        <label className="field-inline">
          <input type="radio" checked={sign === "earn"} onChange={() => setSign("earn")} /> Earned
        </label>
        <label className="field-inline">
          <input type="radio" checked={sign === "redeem"} onChange={() => setSign("redeem")} /> Redeemed
        </label>
      </div>
      {sign === "earn" && (
        <label className="field-inline">
          <input type="checkbox" checked={planned} onChange={(e) => setPlanned(e.target.checked)} />
          This is an upcoming trip (not yet flown)
        </label>
      )}
      <label className="field">
        <span>Description</span>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Alaska Airlines HNL-ITO AS1092"
        />
      </label>

      <label className="field">
        <span>Notes (optional)</span>
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. family trip, upgraded to first"
        />
      </label>

      {sign === "earn" ? (
        <>
          <div className="field-row">
            <label className="field">
              <span>Flight pts</span>
              <input
                type="number"
                min="0"
                value={flightPoints}
                onChange={(e) => setFlightPoints(e.target.value)}
                placeholder="500"
              />
            </label>
            <label className="field">
              <span>Bonus pts</span>
              <input
                type="number"
                min="0"
                value={bonusPoints}
                onChange={(e) => setBonusPoints(e.target.value)}
                placeholder="750"
              />
            </label>
          </div>
          <label className="field">
            <span>Status pts</span>
            <input
              type="number"
              min="0"
              value={statusPoints}
              onChange={(e) => setStatusPoints(e.target.value)}
              placeholder="1000"
            />
          </label>
        </>
      ) : (
        <label className="field">
          <span>Points redeemed</span>
          <input
            type="number"
            min="0"
            value={redeemPoints}
            onChange={(e) => setRedeemPoints(e.target.value)}
            placeholder="20000"
          />
        </label>
      )}

      <label className="field">
        <span>Date</span>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </label>

      <div className="preview-row">
        Total: <strong className={totalPreview >= 0 ? "pos" : "neg"}>{totalPreview >= 0 ? "+" : ""}{totalPreview.toLocaleString()} pts</strong>
        {sign === "earn" && sp > 0 && <span className="preview-sp"> &middot; +{sp.toLocaleString()} status pts</span>}
        {planned && <span className="preview-sp"> &middot; not counted until confirmed</span>}
      </div>

      <div className="cta-row">
        <button className="btn btn-primary btn-sm" onClick={submit}>
          {initial ? "Save changes" : "Save"}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap');

.app-root {
  --bg-deep: #001f52;
  --bg-surface: #1b365d;
  --bg-surface-2: #2d486f;
  --line: rgba(255, 255, 255, 0.16);
  --ice: #f5f8fb;
  --muted: #aebdc9;
  --coral: #00b140;
  --laser: #e95d34;
  --fuchsia: #d3117b;
  --purple: #5d2685;
  --coral-fg: #3ddb84;
  --laser-fg: #ff8f66;
  --fuchsia-fg: #f15fa8;
  background: linear-gradient(rgba(0, 12, 36, 0.6), rgba(0, 12, 36, 0.6)),
    linear-gradient(135deg, var(--bg-deep) 0%, var(--purple) 55%, var(--fuchsia) 100%);
  color: var(--ice);
  font-family: 'Inter', system-ui, sans-serif;
  border-radius: 16px;
  min-height: 100%;
  max-width: 560px;
  margin: 0 auto;
}
.app-root * { box-sizing: border-box; }
.app-root button, .app-root input { font-family: inherit; color: inherit; }
.app-root button:focus-visible, .app-root input:focus-visible {
  outline: 2px solid var(--coral);
  outline-offset: 2px;
}

.board-header { padding: calc(24px + env(safe-area-inset-top)) 20px 4px 20px; text-align: center; }
.board-brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.board-brand svg { color: var(--ice); }
.brand-logo { height: 120px; width: auto; display: block; border-radius: 6px; }
.brand-title {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 20px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}
.board-sub { font-size: 11.5px; color: var(--muted); margin: 4px 0 0 0; font-style: italic; }

.board-header { position: relative; }
.hamburger-btn {
  position: absolute;
  top: calc(18px + env(safe-area-inset-top));
  left: 16px;
  background: none;
  border: none;
  color: var(--ice);
  cursor: pointer;
  padding: 6px;
  border-radius: 8px;
  display: flex;
}
.hamburger-btn:hover { background: rgba(255,255,255,0.08); }

.tab-switch {
  display: flex;
  gap: 4px;
  margin: 14px 20px 0;
  background: rgba(255,255,255,0.06);
  border-radius: 10px;
  padding: 3px;
}
.tab-btn {
  flex: 1;
  background: none;
  border: none;
  color: var(--muted);
  font-size: 13px;
  font-weight: 600;
  padding: 8px 0;
  border-radius: 8px;
  cursor: pointer;
}
.tab-btn.active { background: var(--bg-surface); color: var(--ice); }

.reminder-banner {
  margin: 10px 16px 0;
  background: rgba(210, 56, 110, 0.14);
  border: 1px solid var(--fuchsia);
  border-radius: 10px;
  padding: 9px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 12.5px;
  color: var(--ice);
}
.reminder-banner strong { color: var(--fuchsia-fg); }
.reminder-urgent { background: rgba(227, 38, 54, 0.14); border-color: var(--laser); }

.fab {
  position: fixed;
  bottom: calc(24px + env(safe-area-inset-bottom));
  right: max(24px, calc((100vw - 560px) / 2 + 24px));
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--coral);
  color: #2b0e0c;
  border: none;
  box-shadow: 0 6px 18px rgba(0,0,0,0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 30;
}
.fab:hover { background: #ff6b5f; }

.menu-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(8, 5, 20, 0.55);
  z-index: 50;
  display: flex;
  justify-content: flex-end;
}
.menu-drawer {
  width: min(300px, 82vw);
  height: 100%;
  background: var(--bg-surface);
  border-left: 1px solid var(--line);
  padding: 20px 14px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow-y: auto;
}
.menu-user { display: flex; align-items: center; gap: 10px; padding: 6px 6px 16px; }
.menu-user-info { min-width: 0; }
.menu-user-name { font-weight: 700; font-size: 14px; color: var(--ice); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.menu-user-email { font-size: 11.5px; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  background: none;
  border: none;
  color: var(--ice);
  font-size: 14px;
  font-weight: 500;
  padding: 12px 8px;
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
}
.menu-item:hover { background: rgba(255,255,255,0.06); }
.menu-item svg { color: var(--muted); flex-shrink: 0; }
.menu-item-danger { color: var(--laser-fg); }
.menu-item-danger svg { color: var(--laser-fg); }
.menu-divider { height: 1px; background: var(--line); margin: 8px 4px; }

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(8, 5, 20, 0.6);
  z-index: 60;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.modal-card {
  width: 100%;
  max-width: 560px;
  max-height: 85vh;
  overflow-y: auto;
  background: var(--bg-deep);
  border: 1px solid var(--line);
  border-radius: 16px 16px 0 0;
  padding: 16px 18px 24px;
}
.modal-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.modal-head h3 { font-family: 'Space Grotesk', sans-serif; font-size: 16px; margin: 0; color: var(--ice); }

.avatar-row { display: flex; align-items: center; gap: 12px; }
.avatar-img { border-radius: 50%; object-fit: cover; }
.avatar-fallback {
  border-radius: 50%;
  background: var(--purple);
  color: var(--ice);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-family: 'Space Grotesk', sans-serif;
}

.year-review {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.review-stat {
  background: var(--bg-surface);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 14px 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.review-stat-wide { grid-column: 1 / -1; }
.review-stat-value {
  font-family: 'IBM Plex Mono', monospace;
  font-weight: 700;
  font-size: 20px;
  color: var(--ice);
}
.review-stat-label { font-size: 11px; color: var(--muted); }

.tier-benefits { display: flex; flex-direction: column; gap: 12px; }
.tier-benefit-card {
  background: var(--bg-surface);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 12px 14px;
}
.tier-benefit-head {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 14px;
  border-bottom: 1px solid;
  padding-bottom: 6px;
  margin-bottom: 8px;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}
.tier-benefit-threshold { font-size: 11px; font-weight: 500; color: var(--muted); }
.tier-benefit-list { margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 4px; }
.tier-benefit-list li { font-size: 12.5px; color: var(--ice); line-height: 1.4; }

.board-main { padding: 14px 16px calc(100px + env(safe-area-inset-bottom)) 16px; }
.panel { display: flex; flex-direction: column; gap: 12px; }

.card-label { font-size: 12px; color: var(--muted); font-weight: 600; letter-spacing: 0.3px; }

.points-card {
  background: linear-gradient(135deg, var(--bg-surface-2), var(--bg-surface));
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.card-unit { font-size: 11px; color: var(--muted); }

.lifetime-card {
  background: var(--bg-surface);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.lifetime-head { display: flex; align-items: center; justify-content: space-between; }
.lifetime-value {
  font-family: 'IBM Plex Mono', monospace;
  font-weight: 600;
  font-size: 22px;
  color: var(--fuchsia-fg);
}
.lifetime-bar { margin-top: 6px; }
.lifetime-bar-fill { background: linear-gradient(90deg, #006a4e, var(--coral)); }
.milestone-pending { color: var(--muted); border-color: var(--line); }
.milestone-reached { color: #3ddb84; border-color: #006a4e; }

.totals-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.total-tile {
  background: var(--bg-surface);
  border: 1px solid var(--line);
  border-left: 3px solid var(--tile-color, var(--line));
  border-radius: 8px;
  padding: 9px 11px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.total-label { font-size: 10.5px; color: var(--muted); font-weight: 600; letter-spacing: 0.2px; }
.total-value { font-family: 'IBM Plex Mono', monospace; font-size: 17px; font-weight: 600; color: var(--ice); }
.totals-hint { margin-top: -6px; }

.flap-number { display: flex; gap: 3px; }
.flap-digit {
  font-family: 'IBM Plex Mono', monospace;
  font-weight: 600;
  font-size: 32px;
  background: #000d29;
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 2px 6px;
  color: var(--coral);
  text-align: center;
  animation: flapin 0.35s ease;
}
@media (prefers-reduced-motion: reduce) { .flap-digit { animation: none; } }
@keyframes flapin { 0% { transform: rotateX(70deg); opacity: 0.3; } 100% { transform: rotateX(0deg); opacity: 1; } }

.tier-donut-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.tier-donut {
  background: var(--bg-surface);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 8px 6px 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.tier-donut-chart { position: relative; width: 100%; }
.tier-donut-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-family: 'IBM Plex Mono', monospace;
  font-weight: 600;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.tier-donut-name {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 12.5px;
  margin-top: -4px;
}
.tier-donut-sub { font-size: 10.5px; color: var(--muted); }
.tier-donut-benefit { font-size: 10px; color: var(--muted); opacity: 0.85; margin-top: 1px; }

.goal-card, .status-card {
  background: var(--bg-surface);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.goal-head { display: flex; justify-content: space-between; font-size: 13px; }
.status-head { display: flex; justify-content: space-between; align-items: center; }
.tier-badge {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 12px;
  border: 1px solid;
  border-radius: 20px;
  padding: 3px 10px;
}
.tier-badge-group { display: flex; align-items: center; gap: 6px; }
.oneworld-badge {
  font-size: 10px;
  font-weight: 600;
  color: var(--muted);
  background: rgba(255,255,255,0.08);
  border-radius: 20px;
  padding: 3px 9px;
  white-space: nowrap;
}
.status-number { font-family: 'IBM Plex Mono', monospace; font-size: 20px; font-weight: 600; color: var(--ice); }
.goal-bar { height: 8px; background: var(--bg-surface-2); border-radius: 5px; overflow: hidden; }
.goal-bar-fill { height: 100%; }
.points-fill { background: linear-gradient(90deg, var(--coral), #0062b2); }
.status-fill { transition: width 0.3s ease; }
.goal-foot { font-size: 11.5px; color: var(--muted); }
.link-btn { background: none; border: none; color: var(--fuchsia-fg); font-size: 12px; cursor: pointer; font-weight: 600; }
.hint { font-size: 11px; color: var(--muted); line-height: 1.5; margin: 2px 0 0 0; }

.chart-wrap { margin: 2px -4px; }
.chart-caption { font-size: 11px; color: var(--muted); margin: 0 4px 2px; font-weight: 600; }

.panel-head { display: flex; align-items: center; justify-content: space-between; margin-top: 4px; }
.panel-head h2 { font-family: 'Space Grotesk', sans-serif; font-size: 15px; margin: 0; }
.header-actions { display: flex; gap: 8px; }

.year-select {
  background: var(--bg-surface);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--ice);
  cursor: pointer;
}

.import-result {
  font-size: 12px;
  color: var(--coral-fg);
  display: flex;
  align-items: center;
  gap: 6px;
}
.import-result.err { color: var(--laser-fg); }

.warn-banner {
  background: rgba(227, 38, 54, 0.12);
  border: 1px solid var(--laser);
  border-radius: 8px;
  padding: 9px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 12px;
  color: var(--ice);
}

.upcoming-section { display: flex; flex-direction: column; gap: 8px; }
.upcoming-heading {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 13px;
  color: var(--ice);
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.upcoming-heading .group-subtotal { font-weight: 500; font-size: 11px; }
.planned-card {
  background: var(--bg-surface);
  border: 1px dashed var(--fuchsia);
  border-radius: 10px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.planned-desc { color: var(--ice); font-size: 13.5px; font-weight: 600; }
.planned-est { font-size: 12px; color: var(--muted); }
.planned-est strong.pos { color: var(--coral-fg); }
.planned-est strong.neg { color: var(--laser-fg); }
.review-card { border-color: var(--coral); }

.add-card input[type="file"] {
  font-size: 12px;
  color: var(--muted);
}
.add-card code {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 10.5px;
  color: var(--coral-fg);
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 10px 14px;
  border-radius: 9px;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
}
.btn-sm { padding: 7px 11px; font-size: 12.5px; }
.btn-primary { background: var(--coral); color: #042417; }
.btn-primary:hover { background: #3ddb84; }
.btn-ghost { background: transparent; border-color: var(--line); color: var(--ice); }
.btn-ghost:hover { border-color: var(--coral-fg); color: var(--coral-fg); }

.add-card {
  background: var(--bg-surface);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.add-card.compact { margin-top: -4px; }

.field-row { display: flex; gap: 10px; }
.field { display: flex; flex-direction: column; gap: 5px; flex: 1; min-width: 0; font-size: 12px; color: var(--muted); font-weight: 600; }
.field input {
  background: var(--bg-surface-2);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 9px 10px;
  font-size: 14px;
  color: var(--ice);
  width: 100%;
  min-width: 0;
  max-width: 100%;
  display: block;
  box-sizing: border-box;
}
.field input:disabled { opacity: 0.4; }
.field-inline { display: flex; align-items: center; gap: 7px; font-size: 13px; color: var(--muted); font-weight: 500; }
.field-inline input { accent-color: var(--coral); }
.cta-row { display: flex; gap: 10px; flex-wrap: wrap; }

.empty { color: var(--muted); font-size: 13px; }

.search-row {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-surface);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 8px 10px;
}
.search-icon { color: var(--muted); flex-shrink: 0; }
.search-input {
  flex: 1;
  background: none;
  border: none;
  color: var(--ice);
  font-size: 14px;
  min-width: 0;
}
.search-input::placeholder { color: var(--muted); }

.airport-results {
  display: flex;
  flex-direction: column;
  max-height: 240px;
  overflow-y: auto;
  border: 1px solid var(--line);
  border-radius: 8px;
}
.airport-result {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 8px 10px;
  border-top: 1px solid var(--line);
  font-size: 12.5px;
}
.airport-result:first-child { border-top: none; }
.airport-code {
  font-family: 'IBM Plex Mono', monospace;
  font-weight: 700;
  color: var(--coral-fg);
  width: 34px;
  flex-shrink: 0;
}
.airport-city { color: var(--ice); }

.log-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: var(--bg-surface);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 2px 10px;
}

.activity-groups { display: flex; flex-direction: column; gap: 16px; }
.year-group { display: flex; flex-direction: column; gap: 8px; }
.group-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 2px;
  text-align: left;
  color: inherit;
  font-family: inherit;
}
.group-heading-left { display: flex; align-items: center; gap: 6px; }
.chevron { transition: transform 0.15s ease; flex-shrink: 0; color: var(--muted); }
.chevron.collapsed { transform: rotate(-90deg); }
.year-heading {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  font-size: 15px;
  color: var(--ice);
}
.month-group { display: flex; flex-direction: column; gap: 4px; }
.month-heading {
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
}
.group-subtotal { font-size: 11px; font-weight: 500; color: var(--muted); }
.year-heading .group-subtotal { font-size: 12px; }
.log-row-collapsed {
  display: grid;
  grid-template-columns: 1fr 74px 62px 18px;
  gap: 8px;
  align-items: center;
  width: 100%;
  font-size: 12px;
  color: var(--muted);
  padding: 10px 2px;
  border-top: 1px solid var(--line);
  background: none;
  border-left: none;
  border-right: none;
  border-bottom: none;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
}
.log-row-collapsed:first-child { border-top: none; }
.log-row-collapsed:hover { background: rgba(255,255,255,0.04); }
.row-chevron { color: var(--muted); flex-shrink: 0; transition: transform 0.15s ease; }
.row-chevron.collapsed { transform: rotate(180deg); }

.log-row-expanded {
  padding: 10px 2px 12px;
  border-top: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.log-row-expanded:first-child { border-top: none; }
.expanded-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  color: var(--muted);
  font-family: inherit;
  font-size: 10.5px;
}
.expanded-desc { color: var(--ice); font-size: 13.5px; font-weight: 600; line-height: 1.4; }
.expanded-breakdown { display: flex; flex-wrap: wrap; gap: 6px; }
.expanded-notes { font-size: 12px; color: var(--muted); font-style: italic; }
.expanded-pill {
  font-size: 11px;
  color: var(--muted);
  background: rgba(255,255,255,0.06);
  border-radius: 6px;
  padding: 3px 8px;
}
.expanded-total { font-size: 12.5px; color: var(--muted); }
.expanded-total strong.pos { color: var(--coral-fg); }
.expanded-total strong.neg { color: var(--laser-fg); }
.expanded-actions { display: flex; gap: 8px; margin-top: 2px; }
.expanded-btn { flex: 1; justify-content: center; }
.danger-text { color: var(--laser-fg); }
.danger-text:hover { border-color: var(--laser-fg); color: var(--laser-fg); }
.btn-danger { background: var(--laser); color: #2b0e0c; }
.btn-danger:hover { background: #ff8f66; }
.confirm-row { align-items: center; }
.confirm-text { font-size: 12.5px; color: var(--ice); flex: 1; }

.tx-main { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.tx-date { font-size: 10.5px; color: var(--muted); }
.tx-desc { color: var(--ice); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tx-amt { text-align: right; font-family: 'IBM Plex Mono', monospace; font-weight: 600; }
.tx-amt.pos { color: var(--coral-fg); }
.tx-amt.neg { color: var(--laser-fg); }
.tx-status { text-align: right; color: var(--fuchsia-fg); font-family: 'IBM Plex Mono', monospace; font-size: 11px; }

.preview-row { font-size: 12.5px; color: var(--muted); }
.preview-row strong.pos { color: var(--coral-fg); }
.preview-row strong.neg { color: var(--laser-fg); }
.preview-sp { color: var(--fuchsia-fg); }

.icon-btn { background: none; border: none; color: var(--muted); cursor: pointer; padding: 2px; border-radius: 6px; display: flex; }
.icon-btn:hover { color: var(--laser-fg); background: rgba(255,255,255,0.12); }

.loading-row { display: flex; align-items: center; gap: 8px; color: var(--muted); font-size: 13px; padding: 20px 0; }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 420px) {
  .field-row { flex-direction: column; }
  .log-row-collapsed { grid-template-columns: 1fr 56px 44px 16px; font-size: 10.5px; }
  .totals-grid { grid-template-columns: 1fr; }
}
`;
