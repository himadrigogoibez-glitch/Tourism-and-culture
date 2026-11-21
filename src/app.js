import { destinations, states } from "./destinations.js";
import {
  createShareUrl,
  estimateTrip,
  filterDestinations,
  normalizeStoredState,
  parseSharedTrip,
  STORAGE_KEY
} from "./planning.js";

const byId = (id) => document.getElementById(id);
const elements = {
  filterForm: byId("filterForm"),
  stateSelect: byId("stateSelect"),
  vibeSelect: byId("vibeSelect"),
  monthInput: byId("travelMonth"),
  planMonth: byId("planMonth"),
  transportMode: byId("transportMode"),
  tripPreference: byId("tripPreference"),
  budgetInput: byId("budgetRange"),
  budgetValue: byId("budgetValue"),
  sortSelect: byId("sortBy"),
  stateButtons: byId("stateButtons"),
  resultSummary: byId("resultSummary"),
  savedToggle: byId("savedToggle"),
  destinationGrid: byId("destinationGrid"),
  emptyState: byId("emptyState"),
  tripCount: byId("tripCount"),
  tripMonth: byId("tripMonthLabel"),
  tripStops: byId("tripStops"),
  tripCost: byId("tripCost"),
  tripCostTotal: byId("tripCostTotal"),
  tripCostCaption: byId("tripCostCaption"),
  tripBudgetStatus: byId("tripBudgetStatus"),
  sharePanel: byId("sharePanel"),
  shareUrl: byId("shareUrl"),
  status: byId("statusMessage")
};

function readStorage() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

const sharedTrip = parseSharedTrip(window.location.search, destinations);
const saved = normalizeStoredState(readStorage(), destinations);
const state = {
  ...saved,
  tripStops: sharedTrip ? sharedTrip.stopIds : saved.tripStops,
  month: sharedTrip ? sharedTrip.month : saved.month,
  transportMode: sharedTrip ? sharedTrip.travelMode : saved.travelMode,
  activeState: "all",
  activeVibe: "all",
  savedOnly: false
};

function announce(message) {
  elements.status.textContent = message;
  elements.status.classList.add("visible");
  window.clearTimeout(announce.timer);
  announce.timer = window.setTimeout(() => elements.status.classList.remove("visible"), 2600);
}

function persistState() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      favorites: state.favorites,
      tripStops: state.tripStops,
      month: state.month,
      budget: state.budget,
      sort: state.sort,
      travelMode: state.transportMode
    }));
    return true;
  } catch {
    announce("Your browser blocked local storage; changes may not persist.");
    return false;
  }
}

function money(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(amount);
}

function createNode(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function createStateButton(label, value) {
  const button = createNode("button", "state-chip", label);
  button.type = "button";
  button.setAttribute("aria-pressed", String(state.activeState === value));
  button.addEventListener("click", () => {
    state.activeState = value;
    elements.stateSelect.value = value;
    renderDestinations();
  });
  return button;
}

function renderStateButtons() {
  const buttons = [createStateButton("All states", "all"), ...states.map((name) => createStateButton(name, name))];
  elements.stateButtons.replaceChildren(...buttons);
}

function currentMatches() {
  return filterDestinations(destinations, {
    state: state.activeState,
    vibe: state.activeVibe,
    maxBudget: state.budget,
    favorites: state.favorites,
    savedOnly: state.savedOnly,
    sort: state.sort
  });
}

function toggleFavorite(id) {
  state.favorites = state.favorites.includes(id)
    ? state.favorites.filter((favoriteId) => favoriteId !== id)
    : [...state.favorites, id];
  persistState();
  renderDestinations();
  announce(state.favorites.includes(id) ? "Place saved on this device." : "Place removed from saved places.");
}

function toggleTripStop(id) {
  state.tripStops = state.tripStops.includes(id)
    ? state.tripStops.filter((stopId) => stopId !== id)
    : [...state.tripStops, id];
  persistState();
  renderTrip();
  renderDestinations();
  announce(state.tripStops.includes(id) ? "Destination added to trip." : "Destination removed from trip.");
}

function createCard(item) {
  const article = createNode("article", "destination-card");
  const media = createNode("div", "destination-media");
  const image = document.createElement("img");
  image.src = item.image;
  image.alt = "Illustrative landscape for " + item.name + "; it may not depict the destination.";
  image.loading = "lazy";
  image.decoding = "async";
  image.addEventListener("error", () => {
    image.remove();
    media.classList.add("image-fallback");
  }, { once: true });
  media.append(image);

  const badge = createNode("span", "destination-badge", item.vibes.slice(0, 2).join(" · "));
  media.append(badge);

  const isFavorite = state.favorites.includes(item.id);
  const favorite = createNode("button", "favorite-button", isFavorite ? "Saved ♥" : "Save ♡");
  favorite.type = "button";
  favorite.setAttribute("aria-pressed", String(isFavorite));
  favorite.setAttribute("aria-label", (isFavorite ? "Remove " : "Save ") + item.name);
  favorite.addEventListener("click", () => toggleFavorite(item.id));
  media.append(favorite);

  const body = createNode("div", "destination-body");
  const headingRow = createNode("div", "destination-heading");
  headingRow.append(
    createNode("h3", "", item.name),
    createNode("span", "destination-state", item.state)
  );

  const description = createNode("p", "destination-description", item.description);
  const meta = createNode("div", "destination-meta");
  meta.append(
    createNode("span", "", "📍 " + item.area),
    createNode("span", "price", "≈ " + money(item.budget) + "/day*")
  );
  body.append(headingRow, description, meta);
  if (item.notice) body.append(createNode("p", "travel-notice", "Travel note: " + item.notice));

  const actions = createNode("div", "destination-actions");
  const isInTrip = state.tripStops.includes(item.id);
  const addButton = createNode("button", "button button-secondary", isInTrip ? "Added ✓" : "Add to trip +");
  addButton.type = "button";
  addButton.setAttribute("aria-pressed", String(isInTrip));
  addButton.addEventListener("click", () => toggleTripStop(item.id));

  const sourceLink = createNode("a", "official-link", "Official info ↗");
  sourceLink.href = item.source;
  sourceLink.target = "_blank";
  sourceLink.rel = "noopener noreferrer";
  sourceLink.setAttribute("aria-label", "Official travel information for " + item.name + " from " + item.sourceLabel);
  actions.append(addButton, sourceLink);
  body.append(actions, createNode("small", "card-note", "Official destination source · Example spend only"));
  article.append(media, body);
  return article;
}

function renderDestinations() {
  renderStateButtons();
  const matches = currentMatches();
  elements.destinationGrid.replaceChildren(...matches.map(createCard));
  elements.destinationGrid.hidden = matches.length === 0;
  elements.emptyState.hidden = matches.length > 0;
  elements.resultSummary.textContent =
    matches.length + " of " + destinations.length + " starter places" +
    (state.savedOnly ? " · saved only" : "");
  elements.savedToggle.textContent = state.savedOnly
    ? "Show all places"
    : "Show saved places (" + state.favorites.length + ")";
  elements.savedToggle.setAttribute("aria-pressed", String(state.savedOnly));
  elements.budgetInput.value = String(state.budget);
  elements.budgetValue.value = money(state.budget);
  elements.budgetValue.textContent = money(state.budget);
}

function monthLabel(value) {
  if (!value) return "Choose a month";
  const [year, month] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" })
    .format(new Date(year, month - 1, 1));
}

function renderTrip() {
  elements.tripCount.textContent = String(state.tripStops.length);
  elements.tripMonth.textContent = monthLabel(state.month);
  elements.tripPreference.textContent = "Transport preference: " + elements.transportMode.options[elements.transportMode.selectedIndex].text + ". Confirm local availability and fares.";
  elements.tripStops.replaceChildren();

  const estimate = estimateTrip(state.tripStops, destinations, state.budget);
  if (estimate.stopCount === 0) {
    elements.tripStops.append(createNode("li", "trip-empty", "No stops yet. Add a destination from Explore to start a route."));
    elements.tripCost.hidden = true;
    return;
  }

  estimate.stops.forEach((item, index) => {
    const row = createNode("li", "trip-stop");
    const number = createNode("span", "stop-number", String(index + 1));
    number.setAttribute("aria-hidden", "true");
    const details = createNode("span", "trip-stop-details");
    details.append(
      createNode("strong", "", item.name),
      createNode("small", "", item.state + " · example spend " + money(item.budget) + "/day")
    );
    const remove = createNode("button", "remove-stop", "Remove");
    remove.type = "button";
    remove.setAttribute("aria-label", "Remove " + item.name + " from trip");
    remove.addEventListener("click", () => {
      state.tripStops = state.tripStops.filter((id) => id !== item.id);
      persistState();
      renderTrip();
      renderDestinations();
      announce(item.name + " removed from trip.");
    });
    row.append(number, details, remove);
    elements.tripStops.append(row);
  });

  elements.tripCost.hidden = false;
  elements.tripCost.classList.toggle("over-budget", estimate.overBudgetStopIds.length > 0);
  elements.tripCostTotal.textContent = "≈ " + money(estimate.exampleTotal) + " example total";
  elements.tripCostCaption.textContent = "One day per stop; excludes travel between places.";
  elements.tripBudgetStatus.textContent = estimate.overBudgetStopIds.length
    ? estimate.overBudgetStopIds.length + " stop estimate" + (estimate.overBudgetStopIds.length === 1 ? " is" : "s are") + " above your " + money(state.budget) + "/day target"
    : "All stops fit your " + money(state.budget) + "/day target";
}

function updateMonth(value) {
  state.month = value;
  elements.monthInput.value = value;
  elements.planMonth.value = value;
  persistState();
  renderTrip();
}

async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  elements.shareUrl.focus();
  elements.shareUrl.select();
  return document.execCommand("copy");
}

async function shareTrip() {
  try {
    const url = createShareUrl(window.location.href, state.tripStops, state.month, destinations, state.transportMode);
    elements.shareUrl.value = url;
    elements.sharePanel.hidden = false;
    const copied = await copyText(url);
    announce(copied ? "Share link copied to clipboard." : "Share link is ready below. Select and copy it.");
  } catch (error) {
    if (error instanceof RangeError) {
      announce(error.message);
      return;
    }
    elements.sharePanel.hidden = false;
    announce("Could not copy automatically; copy the link from the field below.");
  }
}

function initialize() {
  elements.stateSelect.value = state.activeState;
  elements.vibeSelect.value = state.activeVibe;
  elements.monthInput.value = state.month;
  elements.planMonth.value = state.month;
  elements.transportMode.value = state.transportMode;
  elements.sortSelect.value = state.sort;

  renderDestinations();
  renderTrip();
  if (sharedTrip) persistState();

  elements.stateSelect.addEventListener("change", () => {
    state.activeState = elements.stateSelect.value;
    renderDestinations();
  });
  elements.vibeSelect.addEventListener("change", () => {
    state.activeVibe = elements.vibeSelect.value;
    renderDestinations();
  });
  elements.monthInput.addEventListener("change", () => updateMonth(elements.monthInput.value));
  elements.planMonth.addEventListener("change", () => updateMonth(elements.planMonth.value));
  elements.transportMode.addEventListener("change", () => {
    state.transportMode = elements.transportMode.value;
    persistState();
    renderTrip();
    announce("Travel preference saved.");
  });
  elements.budgetInput.addEventListener("input", () => {
    state.budget = Number(elements.budgetInput.value);
    persistState();
    renderDestinations();
    renderTrip();
  });
  elements.sortSelect.addEventListener("change", () => {
    state.sort = elements.sortSelect.value;
    persistState();
    renderDestinations();
  });
  elements.filterForm.addEventListener("submit", (event) => {
    event.preventDefault();
    state.activeState = elements.stateSelect.value;
    state.activeVibe = elements.vibeSelect.value;
    updateMonth(elements.monthInput.value);
    renderDestinations();
    document.getElementById("explore").scrollIntoView({ behavior: "smooth", block: "start" });
    announce("Discovery updated for your trip.");
  });
  elements.savedToggle.addEventListener("click", () => {
    state.savedOnly = !state.savedOnly;
    renderDestinations();
  });
  byId("clearTrip").addEventListener("click", () => {
    state.tripStops = [];
    persistState();
    renderTrip();
    renderDestinations();
    announce("Trip stops cleared.");
  });
  byId("saveTrip").addEventListener("click", () => {
    persistState();
    announce("Trip plan saved on this device.");
  });
  byId("shareTrip").addEventListener("click", shareTrip);
  byId("copyShareUrl").addEventListener("click", async () => {
    try {
      const copied = await copyText(elements.shareUrl.value);
      announce(copied ? "Share link copied to clipboard." : "Select and copy the share link.");
    } catch {
      announce("Select and copy the share link.");
    }
  });
}

initialize();


