import React, { useState, useEffect, useMemo, useRef } from "react";
import { Plus, Trash2, X, Award, Loader2, Sparkles, Upload, Check, Pencil, ChevronDown, Menu, LogOut, User, Camera, KeyRound, Plane } from "lucide-react";
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
  { name: "Silver", threshold: 20000, color: "#c7c2d9" },
  { name: "Gold", threshold: 40000, color: "#f2c14e" },
  { name: "Platinum", threshold: 80000, color: "#f28fb0" },
  { name: "Titanium", threshold: 135000, color: "#b98fe3" },
];
const MILLION_MILER = 1000000;

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
const statusDelta = (t) => (t.sign === "redeem" ? 0 : t.statusPoints || 0);

// Simple CSV parser: header row + comma-separated values. Handles quoted fields (for
// descriptions that might contain a comma) but assumes no embedded newlines in a field.
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
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

function csvRowToTx(row) {
  const num = (v) => Number(v) || 0;
  const redeemPoints = num(row.redeempoints);
  const sign = redeemPoints > 0 ? "redeem" : "earn";
  return {
    date: row.date,
    description: row.description || "Imported activity",
    sign,
    flightPoints: sign === "earn" ? num(row.flightpoints) : 0,
    bonusPoints: sign === "earn" ? num(row.bonuspoints) : 0,
    statusPoints: sign === "earn" ? num(row.statuspoints) : 0,
    redeemPoints: sign === "redeem" ? redeemPoints : 0,
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
  let next = TIERS[0];
  for (const t of TIERS) {
    if (statusPoints >= t.threshold) {
      current = t;
    }
  }
  const idx = current ? TIERS.indexOf(current) : -1;
  next = TIERS[idx + 1] || null;
  const floor = current ? current.threshold : 0;
  const ceiling = next ? next.threshold : current ? current.threshold : TIERS[0].threshold;
  const span = ceiling - floor;
  const into = statusPoints - floor;
  const pct = span > 0 ? Math.min(100, Math.round((into / span) * 100)) : 100;
  return { current, next, pct, ceiling };
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
        const existingKeys = new Set(transactions.map(txDedupeKey));
        let added = 0;
        let skipped = 0;
        const newTx = [];
        for (const row of rows) {
          if (!row.date) continue;
          const tx = csvRowToTx(row);
          const key = txDedupeKey(tx);
          if (existingKeys.has(key)) {
            skipped++;
            continue;
          }
          existingKeys.add(key);
          newTx.push({ id: uid(), ...tx });
          added++;
        }
        if (newTx.length) {
          persistTx([...transactions, ...newTx]);
        }
        setImportResult({ added, skipped, error: null });
      } catch (e) {
        setImportResult({ added: 0, skipped: 0, error: "Couldn't read that file as CSV." });
      }
    };
    reader.onerror = () => setImportResult({ added: 0, skipped: 0, error: "Couldn't read that file." });
    reader.readAsText(file);
  };

  const balance = useMemo(
    () => (openingBalance?.amount || 0) + transactions.reduce((s, t) => s + pointsDelta(t), 0),
    [transactions, openingBalance]
  );
  // Lifetime miles: flight miles only (never bonus or status points), and never reduced by
  // redemptions — mirrors how Atmos Rewards' own lifetime-mile counter works.
  const lifetimeMiles = useMemo(
    () =>
      (lifetimeStart?.amount || 0) +
      transactions.reduce((s, t) => s + (t.sign === "redeem" ? 0 : t.flightPoints || 0), 0),
    [transactions, lifetimeStart]
  );
  const millionMilerPct = Math.min(100, Math.round((lifetimeMiles / MILLION_MILER) * 100));
  const millionMilerRemaining = Math.max(0, MILLION_MILER - lifetimeMiles);
  const millionMilerReached = lifetimeMiles >= MILLION_MILER;
  const yearNow = new Date().getFullYear();

  const availableYears = useMemo(() => {
    const years = new Set([yearNow]);
    transactions.forEach((t) => {
      if (isValidISODate(t.date)) years.add(yearOf(t.date));
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [transactions, yearNow]);

  const [viewYear, setViewYear] = useState(yearNow);

  const statusForViewYear = useMemo(
    () =>
      viewYear === "all"
        ? transactions.reduce((s, t) => s + statusDelta(t), 0)
        : transactions
            .filter((t) => isValidISODate(t.date) && yearOf(t.date) === viewYear)
            .reduce((s, t) => s + statusDelta(t), 0),
    [transactions, viewYear]
  );
  const tierInfo = getTierInfo(statusForViewYear);
  const invalidCount = useMemo(() => transactions.filter((t) => !isValidISODate(t.date)).length, [transactions]);

  const sorted = [...transactions].sort((a, b) => (a.date < b.date ? -1 : 1));
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
    const earned = transactions.filter(
      (t) => t.sign !== "redeem" && (viewYear === "all" || (isValidISODate(t.date) && yearOf(t.date) === viewYear))
    );
    return {
      flight: earned.reduce((s, t) => s + (t.flightPoints || 0), 0),
      bonus: earned.reduce((s, t) => s + (t.bonusPoints || 0) + (t.nonStatusPoints || 0), 0),
      status: earned.reduce((s, t) => s + (t.statusPoints || 0), 0),
    };
  }, [transactions, viewYear]);

  // Activity grouped by year, then by month, most recent first — each level carries a
  // points/status-points subtotal for its own entries.
  const groupedActivity = useMemo(() => {
    const byYear = new Map();
    for (const t of sorted) {
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
    const invalidItems = transactions.filter((t) => !isValidISODate(t.date));
    return { years: yearGroups, invalidItems };
  }, [sorted, transactions]);

  const renderActivityRow = (t) => {
    const total = pointsDelta(t);
    const sp = statusDelta(t);
    const breakdown =
      t.sign === "redeem"
        ? null
        : [
            t.flightPoints ? `${t.flightPoints.toLocaleString()} flight` : null,
            t.bonusPoints || t.nonStatusPoints
              ? `${((t.bonusPoints || 0) + (t.nonStatusPoints || 0)).toLocaleString()} bonus`
              : null,
          ]
            .filter(Boolean)
            .join(" \u00b7 ");
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
      <div key={t.id} className="log-row tx-row">
        <div className="tx-main">
          <span className="tx-date">{fmtDate(t.date)}</span>
          <span className="tx-desc">{t.description}</span>
          {breakdown && <span className="tx-breakdown">{breakdown}</span>}
        </div>
        <span className={total >= 0 ? "tx-amt pos" : "tx-amt neg"}>
          {total >= 0 ? "+" : ""}
          {total.toLocaleString()} pts
        </span>
        <span className="tx-status">{sp ? `+${sp.toLocaleString()} sp` : ""}</span>
        <div className="tx-actions">
          <button
            className="icon-btn tiny"
            onClick={() => {
              setAdding(false);
              setEditingTxId(t.id);
            }}
            aria-label="Edit entry"
          >
            <Pencil size={12} />
          </button>
          <button
            className="icon-btn tiny"
            onClick={() => persistTx(transactions.filter((x) => x.id !== t.id))}
            aria-label="Delete entry"
          >
            <X size={12} />
          </button>
        </div>
      </div>
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
              <div className="total-tile" style={{ "--tile-color": "#F9423A" }}>
                <span className="total-label">Flight points</span>
                <span className="total-value">{totals.flight.toLocaleString()}</span>
              </div>
              <div className="total-tile" style={{ "--tile-color": "#D2386E" }}>
                <span className="total-label">Bonus points</span>
                <span className="total-value">{totals.bonus.toLocaleString()}</span>
              </div>
              <div className="total-tile" style={{ "--tile-color": "#E32636" }}>
                <span className="total-label">Status points</span>
                <span className="total-value">{totals.status.toLocaleString()}</span>
              </div>
              {openingBalance?.amount ? (
                <div className="total-tile" style={{ "--tile-color": "#413691" }}>
                  <span className="total-label">Beginning balance</span>
                  <span className="total-value">{openingBalance.amount.toLocaleString()}</span>
                </div>
              ) : null}
            </div>
            <p className="hint totals-hint">
              {viewYear === "all"
                ? "Lifetime totals across every year you've logged."
                : `Totals for ${viewYear} only. Status points reset each Jan 1, so this is what counted toward tier that year.`}
            </p>

            {pointsChart.length > 1 && (
              <div className="chart-wrap">
                <p className="chart-caption">Balance trend &middot; {viewYear === "all" ? "all time" : viewYear}</p>
                <ResponsiveContainer width="100%" height={120}>
                  <LineChart data={pointsChart} margin={{ top: 4, right: 36, left: 4, bottom: 0 }}>
                    <CartesianGrid stroke="#4f4390" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: "#b7a8d9", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#b7a8d9", fontSize: 10 }} axisLine={false} tickLine={false} width={40} tickFormatter={fmtAxisK} />
                    <Tooltip
                      contentStyle={{ background: "#322a68", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: "#e8f1f5" }}
                    />
                    <Line type="monotone" dataKey="value" stroke="#F9423A" strokeWidth={2} dot={{ r: 3, fill: "#F9423A" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="status-card">
              <div className="status-head">
                <span className="card-label">{viewYear === "all" ? "All-time" : viewYear} status</span>
                {viewYear !== "all" && (
                  <span
                    className="tier-badge"
                    style={{ color: tierInfo.current?.color || "#b7a8d9", borderColor: tierInfo.current?.color || "#4f4390" }}
                  >
                    {tierInfo.current ? tierInfo.current.name : "No tier yet"}
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
                      style={{ width: `${tierInfo.pct}%`, background: tierInfo.next?.color || tierInfo.current?.color || "#F9423A" }}
                    />
                  </div>
                  <div className="goal-foot">
                    {tierInfo.next
                      ? `${(tierInfo.next.threshold - statusForViewYear).toLocaleString()} pts to ${tierInfo.next.name}`
                      : "Top tier reached that year"}
                  </div>
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
                    <CartesianGrid stroke="#4f4390" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: "#b7a8d9", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#b7a8d9", fontSize: 10 }} axisLine={false} tickLine={false} width={40} tickFormatter={fmtAxisK} />
                    <Tooltip
                      contentStyle={{ background: "#322a68", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 8, fontSize: 12 }}
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
                    <Line type="monotone" dataKey="value" stroke="#D2386E" strokeWidth={2} dot={{ r: 3, fill: "#D2386E" }} />
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
                {groupedActivity.years.map((yg) => (
                  <div className="year-group" key={yg.year}>
                    <button
                      className="group-heading year-heading"
                      onClick={() => toggleYear(yg.year)}
                      aria-expanded={!collapsedYears.has(yg.year)}
                    >
                      <span className="group-heading-left">
                        <ChevronDown size={14} className={`chevron ${collapsedYears.has(yg.year) ? "collapsed" : ""}`} />
                        {yg.year}
                      </span>
                      <span className="group-subtotal">
                        {fmtSigned(yg.pts)} pts &middot; {fmtSigned(yg.sp)} sp
                      </span>
                    </button>
                    {!collapsedYears.has(yg.year) &&
                      yg.months.map((mg) => (
                        <div className="month-group" key={mg.key}>
                          <button
                            className="group-heading month-heading"
                            onClick={() => toggleMonth(mg.key)}
                            aria-expanded={!collapsedMonths.has(mg.key)}
                          >
                            <span className="group-heading-left">
                              <ChevronDown size={12} className={`chevron ${collapsedMonths.has(mg.key) ? "collapsed" : ""}`} />
                              {mg.label}
                            </span>
                            <span className="group-subtotal">
                              {fmtSigned(mg.pts)} pts &middot; {fmtSigned(mg.sp)} sp
                            </span>
                          </button>
                          {!collapsedMonths.has(mg.key) && (
                            <div className="log-list">{mg.items.map((t) => renderActivityRow(t))}</div>
                          )}
                        </div>
                      ))}
                  </div>
                ))}
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
                setActiveModal("goal");
                setMenuOpen(false);
              }}
            >
              <Award size={16} /> Redemption goal
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
              Upload a CSV with columns <code>date, description, flightPoints, bonusPoints, statusPoints, redeemPoints</code>.
              Rows matching an entry you've already logged are skipped automatically.
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
                    {importResult.skipped ? `, skipped ${importResult.skipped.toLocaleString()} already logged` : ""}.
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

function ActivityEditor({ onSave, onCancel, initial }) {
  const [date, setDate] = useState(initial?.date || todayISO());
  const [description, setDescription] = useState(initial?.description || "");
  const [sign, setSign] = useState(initial?.sign || "earn");
  const [flightPoints, setFlightPoints] = useState(initial?.flightPoints || "");
  const [bonusPoints, setBonusPoints] = useState((initial?.bonusPoints || 0) + (initial?.nonStatusPoints || 0) || "");
  const [statusPoints, setStatusPoints] = useState(initial?.statusPoints || "");
  const [redeemPoints, setRedeemPoints] = useState(initial?.redeemPoints || "");

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
      <label className="field">
        <span>Description</span>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Alaska Airlines HNL-ITO AS1092"
        />
      </label>

      {sign === "earn" ? (
        <>
          <div className="field-row">
            <label className="field">
              <span>Flight points</span>
              <input
                type="number"
                min="0"
                value={flightPoints}
                onChange={(e) => setFlightPoints(e.target.value)}
                placeholder="500"
              />
            </label>
            <label className="field">
              <span>Bonus points</span>
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
            <span>Status points</span>
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
  --bg-deep: #2b255d;
  --bg-surface: #322a68;
  --bg-surface-2: #3a3175;
  --line: rgba(255, 255, 255, 0.18);
  --ice: #f8f6fd;
  --muted: #d3c6ec;
  --coral: #f9423a;
  --laser: #e32636;
  --fuchsia: #d2386e;
  --purple: #413691;
  --coral-fg: #ff8478;
  --laser-fg: #ff6f79;
  --fuchsia-fg: #f291b9;
  background: linear-gradient(rgba(16, 12, 38, 0.62), rgba(16, 12, 38, 0.62)),
    linear-gradient(135deg, var(--purple) 0%, var(--fuchsia) 100%);
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

.board-header { padding: 24px 20px 4px 20px; text-align: center; }
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
  top: 18px;
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

.fab {
  position: fixed;
  bottom: 24px;
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

.board-main { padding: 14px 16px 100px 16px; }
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
.lifetime-bar-fill { background: linear-gradient(90deg, var(--fuchsia), var(--purple)); }
.milestone-pending { color: var(--muted); border-color: var(--line); }
.milestone-reached { color: var(--fuchsia-fg); border-color: var(--fuchsia-fg); }

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
  background: #1c1642;
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
.status-number { font-family: 'IBM Plex Mono', monospace; font-size: 20px; font-weight: 600; color: var(--ice); }
.goal-bar { height: 8px; background: var(--bg-surface-2); border-radius: 5px; overflow: hidden; }
.goal-bar-fill { height: 100%; }
.points-fill { background: linear-gradient(90deg, var(--coral), var(--laser)); }
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
.btn-primary { background: var(--coral); color: #2b0e0c; }
.btn-primary:hover { background: #ff6b5f; }
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
.field { display: flex; flex-direction: column; gap: 5px; flex: 1; font-size: 12px; color: var(--muted); font-weight: 600; }
.field input {
  background: var(--bg-surface-2);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 9px 10px;
  font-size: 14px;
  color: var(--ice);
}
.field input:disabled { opacity: 0.4; }
.field-inline { display: flex; align-items: center; gap: 7px; font-size: 13px; color: var(--muted); font-weight: 500; }
.field-inline input { accent-color: var(--coral); }
.cta-row { display: flex; gap: 10px; flex-wrap: wrap; }

.empty { color: var(--muted); font-size: 13px; }

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
.log-row {
  display: grid;
  grid-template-columns: 1fr 74px 62px 44px;
  gap: 8px;
  align-items: center;
  font-size: 12px;
  color: var(--muted);
  padding: 8px 2px;
  border-top: 1px solid var(--line);
}
.log-row:first-child { border-top: none; }
.tx-main { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.tx-date { font-size: 10.5px; color: var(--muted); }
.tx-desc { color: var(--ice); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tx-breakdown { font-size: 10.5px; color: var(--muted); }
.tx-amt { text-align: right; font-family: 'IBM Plex Mono', monospace; font-weight: 600; }
.tx-amt.pos { color: var(--coral-fg); }
.tx-amt.neg { color: var(--laser-fg); }
.tx-status { text-align: right; color: var(--fuchsia-fg); font-family: 'IBM Plex Mono', monospace; font-size: 11px; }
.tx-actions { display: flex; gap: 2px; justify-content: flex-end; }

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
  .log-row { grid-template-columns: 1fr 56px 44px 40px; font-size: 10.5px; }
  .totals-grid { grid-template-columns: 1fr; }
}
`;
