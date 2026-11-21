export const STORAGE_KEY = "roamNorthEast.v3";
export const DEFAULT_BUDGET = 2600;
export const DEFAULT_DAYS_PER_STOP = 1;
export const MAX_DAYS_PER_STOP = 14;
export const SORT_OPTIONS = new Set(["recommended", "price-asc", "price-desc"]);
export const TRAVEL_MODES = new Set(["flexible", "shared", "local"]);

export function normalizeDaysPerStop(value) {
  const days = Number(value);
  return Number.isInteger(days)
    ? Math.max(DEFAULT_DAYS_PER_STOP, Math.min(MAX_DAYS_PER_STOP, days))
    : DEFAULT_DAYS_PER_STOP;
}

export function isValidMonth(value) {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function filterDestinations(items, options = {}) {
  const {
    state = "all",
    vibe = "all",
    maxBudget = Infinity,
    favorites = [],
    savedOnly = false,
    sort = "recommended",
    searchText = ""
  } = options;
  const cap = Number.isFinite(Number(maxBudget)) ? Number(maxBudget) : Infinity;
  const favoriteIds = new Set(favorites);
  const query = String(searchText).trim().toLocaleLowerCase();
  const matches = items.filter((item) =>
    (state === "all" || item.state === state) &&
    (vibe === "all" || item.vibes.includes(vibe)) &&
    (!query || [item.name, item.state, item.area, item.description, ...item.vibes]
      .some((value) => value.toLocaleLowerCase().includes(query))) &&
    item.budget <= cap &&
    (!savedOnly || favoriteIds.has(item.id))
  );

  if (sort === "price-asc") return matches.sort((a, b) => a.budget - b.budget);
  if (sort === "price-desc") return matches.sort((a, b) => b.budget - a.budget);
  return matches;
}

export function estimateTrip(stopIds, items, dailyBudget = DEFAULT_BUDGET, daysPerStop = DEFAULT_DAYS_PER_STOP) {
  const byId = new Map(items.map((item) => [item.id, item]));
  const uniqueIds = [...new Set(stopIds)].filter((id) => byId.has(id));
  const stops = uniqueIds.map((id) => byId.get(id));
  const cap = Number.isFinite(Number(dailyBudget)) ? Number(dailyBudget) : Infinity;
  const duration = normalizeDaysPerStop(daysPerStop);
  const overBudgetStopIds = stops.filter((stop) => stop.budget > cap).map((stop) => stop.id);

  return {
    stops,
    stopCount: stops.length,
    daysPerStop: duration,
    totalDays: stops.length * duration,
    exampleTotal: stops.reduce((total, stop) => total + stop.budget * duration, 0),
    overBudgetStopIds
  };
}

export function parseSharedTrip(search, items) {
  const params = new URLSearchParams(search);
  if (!params.has("stops")) return null;

  const allowedIds = new Set(items.map((item) => item.id));
  const stopIds = [...new Set((params.get("stops") || "").split(",").map((id) => id.trim()))]
    .filter((id) => allowedIds.has(id))
    .slice(0, items.length);
  const monthValue = params.get("month") || "";
  const travelMode = params.get("mode") || "flexible";

  return {
    stopIds,
    month: isValidMonth(monthValue) ? monthValue : "",
    travelMode: TRAVEL_MODES.has(travelMode) ? travelMode : "flexible",
    daysPerStop: normalizeDaysPerStop(params.get("days"))
  };
}

export function createShareUrl(currentUrl, stopIds, month, items, travelMode = "flexible", daysPerStop = DEFAULT_DAYS_PER_STOP) {
  const allowedIds = new Set(items.map((item) => item.id));
  const validIds = [...new Set(stopIds)].filter((id) => allowedIds.has(id));
  if (validIds.length === 0) throw new RangeError("Add a destination before sharing a trip.");

  const url = new URL(currentUrl);
  url.search = "";
  url.searchParams.set("stops", validIds.join(","));
  if (isValidMonth(month)) url.searchParams.set("month", month);
  if (TRAVEL_MODES.has(travelMode)) url.searchParams.set("mode", travelMode);
  const duration = normalizeDaysPerStop(daysPerStop);
  if (duration > DEFAULT_DAYS_PER_STOP) url.searchParams.set("days", String(duration));
  url.hash = "trip";
  return url.toString();
}

export function normalizeStoredState(raw, items) {
  const allowedIds = new Set(items.map((item) => item.id));
  const validIds = (value) => Array.isArray(value)
    ? [...new Set(value.filter((id) => allowedIds.has(id)))]
    : [];
  const budget = Number(raw?.budget);
  const sort = SORT_OPTIONS.has(raw?.sort) ? raw.sort : "recommended";

  return {
    favorites: validIds(raw?.favorites),
    tripStops: validIds(raw?.tripStops),
    month: isValidMonth(raw?.month) ? raw.month : "",
    budget: Number.isFinite(budget) ? Math.max(800, Math.min(5000, budget)) : DEFAULT_BUDGET,
    sort,
    travelMode: TRAVEL_MODES.has(raw?.travelMode) ? raw.travelMode : "flexible",
    daysPerStop: normalizeDaysPerStop(raw?.daysPerStop)
  };
}


