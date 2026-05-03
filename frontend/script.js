const STORAGE_KEYS = {
  houses: "nyumba_houses",
  user: "nyumba_user",
  saved: "nyumba_saved"
};

const sampleHouses = [
  {
    id: "h1",
    title: "Two Bedroom Apartment",
    location: "Kilimani, Nairobi",
    type: "Apartment",
    rent: 45000,
    status: "Available",
    description: "Modern apartment near shopping centers and public transport."
  },
  {
    id: "h2",
    title: "Family Bungalow",
    location: "Ruiru, Kiambu",
    type: "Bungalow",
    rent: 32000,
    status: "Available",
    description: "Quiet compound with parking, water storage, and a small garden."
  },
  {
    id: "h3",
    title: "Affordable Bedsitter",
    location: "Kahawa Wendani",
    type: "Bedsitter",
    rent: 12000,
    status: "Available",
    description: "Compact unit close to the main road and local shops."
  },
  {
    id: "h4",
    title: "Four Bedroom Maisonette",
    location: "Nyali, Mombasa",
    type: "Maisonette",
    rent: 85000,
    status: "Available",
    description: "Spacious home with balcony, secure gate, and ocean breeze."
  }
];

function getHouses() {
  const stored = localStorage.getItem(STORAGE_KEYS.houses);
  if (!stored) {
    localStorage.setItem(STORAGE_KEYS.houses, JSON.stringify(sampleHouses));
    return sampleHouses;
  }
  return JSON.parse(stored);
}

function saveHouses(houses) {
  localStorage.setItem(STORAGE_KEYS.houses, JSON.stringify(houses));
}

function getSavedIds() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.saved) || "[]");
}

function money(value) {
  return `KSh ${Number(value).toLocaleString("en-KE")}`;
}

function createPropertyCard(house) {
  const savedIds = getSavedIds();
  const article = document.createElement("article");
  article.className = "property-card";
  article.innerHTML = `
    <div class="property-image"><span>${house.status}</span></div>
    <div class="property-body">
      <h3>${house.title}</h3>
      <div class="property-meta">${house.location} • ${house.type}</div>
      <div class="rent">${money(house.rent)} / month</div>
      <p class="muted">${house.description || "No description provided."}</p>
      <button class="button small" data-save-house="${house.id}" type="button">
        ${savedIds.includes(house.id) ? "Saved" : "Save interest"}
      </button>
    </div>
  `;
  return article;
}

function renderPropertyGrid(containerId, houses) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = "";
  if (!houses.length) {
    container.innerHTML = `<div class="empty-state">No houses match your search.</div>`;
    return;
  }

  houses.forEach((house) => container.appendChild(createPropertyCard(house)));
}

function filterHouses(houses, location = "", type = "", maxRent = "") {
  const query = location.trim().toLowerCase();
  const budget = Number(maxRent);
  return houses.filter((house) => {
    const matchesLocation = !query || house.location.toLowerCase().includes(query);
    const matchesType = !type || house.type === type;
    const matchesRent = !budget || Number(house.rent) <= budget;
    return matchesLocation && matchesType && matchesRent;
  });
}

function handleSaveClick(event) {
  const button = event.target.closest("[data-save-house]");
  if (!button) return;

  const id = button.dataset.saveHouse;
  const saved = new Set(getSavedIds());
  if (saved.has(id)) {
    saved.delete(id);
    button.textContent = "Save interest";
  } else {
    saved.add(id);
    button.textContent = "Saved";
  }
  localStorage.setItem(STORAGE_KEYS.saved, JSON.stringify([...saved]));
  updateDashboardStats();
}

function setupHome() {
  renderPropertyGrid("featuredProperties", getHouses().slice(0, 3));

  const quickSearchForm = document.getElementById("quickSearchForm");
  if (!quickSearchForm) return;

  quickSearchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const location = document.getElementById("homeLocation").value;
    const budget = document.getElementById("homeBudget").value;
    const params = new URLSearchParams({ location, budget });
    window.location.href = `search.html?${params.toString()}`;
  });
}

function setupSearch() {
  const form = document.getElementById("searchForm");
  if (!form) return;

  const params = new URLSearchParams(window.location.search);
  const locationInput = document.getElementById("searchLocation");
  const maxRentInput = document.getElementById("searchMaxRent");
  const typeInput = document.getElementById("searchType");

  locationInput.value = params.get("location") || "";
  maxRentInput.value = params.get("budget") || "";

  const applyFilters = () => {
    renderPropertyGrid(
      "searchResults",
      filterHouses(getHouses(), locationInput.value, typeInput.value, maxRentInput.value)
    );
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    applyFilters();
  });

  document.getElementById("clearFilters").addEventListener("click", () => {
    form.reset();
    renderPropertyGrid("searchResults", getHouses());
  });

  applyFilters();
}

function setupAuth() {
  const registerForm = document.getElementById("registerForm");
  const loginForm = document.getElementById("loginForm");

  if (registerForm) {
    registerForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const user = {
        name: document.getElementById("registerName").value,
        email: document.getElementById("registerEmail").value,
        role: document.getElementById("registerRole").value
      };
      localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
      window.location.href = "dashboard.html";
    });
  }

  if (loginForm) {
    loginForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const email = document.getElementById("loginEmail").value;
      localStorage.setItem(STORAGE_KEYS.user, JSON.stringify({ name: email.split("@")[0], email, role: "tenant" }));
      window.location.href = "dashboard.html";
    });
  }
}

function updateDashboardStats() {
  const houses = getHouses();
  const total = document.getElementById("totalListings");
  const available = document.getElementById("availableListings");
  const saved = document.getElementById("savedListings");
  if (!total || !available || !saved) return;

  total.textContent = houses.length;
  available.textContent = houses.filter((house) => house.status === "Available").length;
  saved.textContent = getSavedIds().length;
}

function renderDashboardListings() {
  const container = document.getElementById("dashboardListings");
  if (!container) return;

  const houses = getHouses();
  container.innerHTML = "";
  houses.forEach((house) => {
    const item = document.createElement("article");
    item.className = "listing-item";
    item.innerHTML = `
      <h3>${house.title}</h3>
      <span class="property-meta">${house.location} • ${house.type}</span>
      <strong>${money(house.rent)} / month</strong>
      <p class="muted">${house.description || "No description provided."}</p>
      <div class="listing-actions">
        <button class="button small" data-toggle-status="${house.id}" type="button">${house.status}</button>
        <button class="text-button" data-delete-house="${house.id}" type="button">Delete</button>
      </div>
    `;
    container.appendChild(item);
  });
}

function setupDashboard() {
  const form = document.getElementById("propertyForm");
  if (!form) return;

  const user = JSON.parse(localStorage.getItem(STORAGE_KEYS.user) || "null");
  const greeting = document.getElementById("dashboardGreeting");
  greeting.textContent = user ? `Hello, ${user.name}` : "Rental overview";

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const houses = getHouses();
    houses.unshift({
      id: `h${Date.now()}`,
      title: document.getElementById("propertyTitle").value,
      location: document.getElementById("propertyLocation").value,
      type: document.getElementById("propertyType").value,
      rent: Number(document.getElementById("propertyRent").value),
      status: "Available",
      description: document.getElementById("propertyDescription").value
    });
    saveHouses(houses);
    form.reset();
    renderDashboardListings();
    updateDashboardStats();
  });

  document.getElementById("dashboardListings").addEventListener("click", (event) => {
    const deleteButton = event.target.closest("[data-delete-house]");
    const statusButton = event.target.closest("[data-toggle-status]");
    let houses = getHouses();

    if (deleteButton) {
      houses = houses.filter((house) => house.id !== deleteButton.dataset.deleteHouse);
      saveHouses(houses);
    }

    if (statusButton) {
      houses = houses.map((house) => {
        if (house.id !== statusButton.dataset.toggleStatus) return house;
        return { ...house, status: house.status === "Available" ? "Occupied" : "Available" };
      });
      saveHouses(houses);
    }

    renderDashboardListings();
    updateDashboardStats();
  });

  document.getElementById("logoutButton").addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEYS.user);
    window.location.href = "login.html";
  });

  document.getElementById("resetDemo").addEventListener("click", () => {
    saveHouses(sampleHouses);
    localStorage.setItem(STORAGE_KEYS.saved, "[]");
    renderDashboardListings();
    updateDashboardStats();
  });

  renderDashboardListings();
  updateDashboardStats();
}

document.addEventListener("click", handleSaveClick);
document.addEventListener("DOMContentLoaded", () => {
  setupHome();
  setupSearch();
  setupAuth();
  setupDashboard();
});
