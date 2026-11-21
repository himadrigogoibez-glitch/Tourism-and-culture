import { destinations, states } from "../src/destinations.js";
import {
  createShareUrl,
  estimateTrip,
  filterDestinations,
  isValidMonth,
  normalizeDaysPerStop,
  normalizeStoredState,
  parseSharedTrip
} from "../src/planning.js";
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("destination starter set covers all eight states", () => {
  assert.equal(new Set(destinations.map((item) => item.state)).size, 8);
  assert.deepEqual(new Set(destinations.map((item) => item.state)), new Set(states));
});

test("state, vibe, and budget filters combine", () => {
  const results = filterDestinations(destinations, {
    state: "Assam",
    vibe: "Culture",
    maxBudget: 2000
  });
  assert.deepEqual(results.map((item) => item.id), ["assam-majuli"]);
});

test("keyword search covers place, state, area, description, and travel style", () => {
  assert.deepEqual(
    filterDestinations(destinations, { searchText: "PHUMDIS" }).map((item) => item.id),
    ["manipur-loktak"]
  );
  assert.deepEqual(
    filterDestinations(destinations, { searchText: "kohima", state: "Nagaland" }).map((item) => item.id),
    ["nagaland-kisama"]
  );
  assert.deepEqual(filterDestinations(destinations, { searchText: "not a place" }), []);
});

test("price sorting works both ways without mutating source order", () => {
  const originalIds = destinations.map((item) => item.id);
  const cheapest = filterDestinations(destinations, { sort: "price-asc" });
  const priciest = filterDestinations(destinations, { sort: "price-desc" });
  assert.equal(cheapest[0].id, "tripura-ujjayanta");
  assert.equal(priciest[0].id, "arunachal-tawang");
  assert.deepEqual(destinations.map((item) => item.id), originalIds);
});

test("saved-only filter returns selected favorites", () => {
  const results = filterDestinations(destinations, {
    savedOnly: true,
    favorites: ["assam-majuli", "unknown-id"]
  });
  assert.deepEqual(results.map((item) => item.id), ["assam-majuli"]);
});

test("no-match filter returns an empty list", () => {
  const results = filterDestinations(destinations, { state: "Manipur", vibe: "Adventure" });
  assert.deepEqual(results, []);
});

test("trip estimate deduplicates stops and flags over-budget destinations", () => {
  const estimate = estimateTrip(
    ["assam-majuli", "assam-majuli", "arunachal-tawang", "unknown-id"],
    destinations,
    2000
  );
  assert.equal(estimate.stopCount, 2);
  assert.equal(estimate.exampleTotal, 4500);
  assert.deepEqual(estimate.overBudgetStopIds, ["arunachal-tawang"]);
});

test("trip estimate scales example costs by selected days per stop", () => {
  const estimate = estimateTrip(["assam-majuli", "tripura-ujjayanta"], destinations, 2600, 3);
  assert.equal(estimate.daysPerStop, 3);
  assert.equal(estimate.totalDays, 6);
  assert.equal(estimate.exampleTotal, 9600);
  assert.equal(normalizeDaysPerStop(99), 14);
  assert.equal(normalizeDaysPerStop(0), 1);
  assert.equal(normalizeDaysPerStop("invalid"), 1);
});

test("month validation rejects malformed and impossible values", () => {
  assert.equal(isValidMonth("2027-03"), true);
  assert.equal(isValidMonth("2027-13"), false);
  assert.equal(isValidMonth("March 2027"), false);
});

test("shared trip parsing filters unknown ids and validates month", () => {
  const shared = parseSharedTrip(
    "?stops=assam-majuli,unknown,tripura-ujjayanta,assam-majuli&month=2027-03&mode=shared&days=3",
    destinations
  );
  assert.deepEqual(shared, {
    stopIds: ["assam-majuli", "tripura-ujjayanta"],
    month: "2027-03",
    travelMode: "shared",
    daysPerStop: 3
  });
  assert.equal(parseSharedTrip("?stops=assam-majuli&mode=unsafe", destinations).travelMode, "flexible");
  assert.equal(parseSharedTrip("?stops=assam-majuli&days=999", destinations).daysPerStop, 14);
  assert.equal(parseSharedTrip("?other=value", destinations), null);
});

test("share URL contains only valid trip data and targets trip section", () => {
  const url = createShareUrl(
    "https://example.test/site/?old=query#explore",
    ["assam-majuli", "invalid", "tripura-ujjayanta"],
    "2027-03",
    destinations,
    "local",
    3
  );
  const parsed = new URL(url);
  assert.equal(parsed.searchParams.get("stops"), "assam-majuli,tripura-ujjayanta");
  assert.equal(parsed.searchParams.get("month"), "2027-03");
  assert.equal(parsed.searchParams.get("mode"), "local");
  assert.equal(parsed.searchParams.get("days"), "3");
  assert.equal(parsed.hash, "#trip");
});

test("share URL rejects an empty route", () => {
  assert.throws(() => createShareUrl("https://example.test", [], "", destinations), RangeError);
});

test("stored preferences are sanitized and bounded", () => {
  const normalized = normalizeStoredState({
    favorites: ["assam-majuli", "fake"],
    tripStops: ["tripura-ujjayanta", "tripura-ujjayanta"],
    month: "2027-13",
    budget: 99999,
    sort: "untrusted-sort",
    travelMode: "run-any-code",
    daysPerStop: 99
  }, destinations);
  assert.deepEqual(normalized.favorites, ["assam-majuli"]);
  assert.deepEqual(normalized.tripStops, ["tripura-ujjayanta"]);
  assert.equal(normalized.month, "");
  assert.equal(normalized.budget, 5000);
  assert.equal(normalized.sort, "recommended");
  assert.equal(normalized.travelMode, "flexible");
  assert.equal(normalized.daysPerStop, 14);
  assert.equal(normalizeStoredState({ travelMode: "shared" }, destinations).travelMode, "shared");
  assert.equal(normalizeStoredState({}, destinations).daysPerStop, 1);
});

test("page uses semantic landmarks, keyboard skip link, and an external module", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /<main\b/);
  assert.match(html, /class="skip-link"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /<script type="module" src="\.\/src\/app\.js"><\/script>/);
  assert.match(html, /<label for="transportMode">Travel preference<\/label>/);
  assert.match(html, /<label for="searchInput">Search places<\/label>/);
  assert.match(html, /<label for="daysPerStop">Days at each stop<\/label>/);
});

test("destinations have bounded estimates and secure official links", () => {
  for (const item of destinations) {
    assert.ok(item.budget >= 800 && item.budget <= 5000, item.id);
    assert.equal(new URL(item.source).protocol, "https:", item.id);
    assert.ok(item.sourceLabel, item.id);
  }
});

test("application renders user-visible destination content without HTML injection", async () => {
  const app = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
  assert.doesNotMatch(app, /\.innerHTML\s*=/);
  assert.match(app, /image\.loading = "lazy"/);
  assert.match(app, /rel = "noopener noreferrer"/);
});

