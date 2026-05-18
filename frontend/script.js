const API_BASE = window.location.protocol === "file:" ? "http://localhost:5000/api" : "/api";
const API_ORIGIN = window.location.protocol === "file:" ? "http://localhost:5000" : "";

const STORAGE_KEYS = {
  token: "nyumba_token",
  user: "nyumba_user",
  saved: "nyumba_saved"
};

function getToken() {
  return localStorage.getItem(STORAGE_KEYS.token);
}

function getUser() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.user) || "null");
}

function setSession(data) {
  localStorage.setItem(STORAGE_KEYS.token, data.token);
  localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(data.user));
}

function clearSession() {
  localStorage.removeItem(STORAGE_KEYS.token);
  localStorage.removeItem(STORAGE_KEYS.user);
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...authHeaders(),
      ...(options.headers || {})
    }
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : null;

  if (!response.ok) {
    throw new Error(data?.message || "Something went wrong. Please try again.");
  }

  return data;
}

function money(value) {
  return `KSh ${Number(value).toLocaleString("en-KE")}`;
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getHouseId(house) {
  return house._id || house.id;
}

function getHouseImages(house) {
  return Array.isArray(house.images) ? house.images.filter(Boolean) : [];
}

function getImageSource(image) {
  if (!image) return "";
  if (image.startsWith("data:") || image.startsWith("http")) return image;
  return `${API_ORIGIN}${image}`;
}

function renderSelectedImagePreview(files) {
  const preview = document.getElementById("propertyImagePreview");
  if (!preview) return;

  preview.innerHTML = "";
  [...files].filter((file) => file.type.startsWith("image/")).slice(0, 8).forEach((file, index) => {
    const img = document.createElement("img");
    img.src = URL.createObjectURL(file);
    img.alt = `Selected house picture ${index + 1}`;
    img.addEventListener("load", () => URL.revokeObjectURL(img.src), { once: true });
    preview.appendChild(img);
  });
}

function getSavedIds() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.saved) || "[]");
}

function getBookingProperty(booking) {
  return booking.property || {};
}

function getBookingId(booking) {
  return booking._id || booking.id;
}

function setFormMessage(form, message, type = "error") {
  let messageBox = form.querySelector(".form-message");
  if (!messageBox) {
    messageBox = document.createElement("p");
    messageBox.className = "form-message";
    form.appendChild(messageBox);
  }

  messageBox.textContent = message;
  messageBox.dataset.type = type;
}

function createPropertyCard(house) {
  const id = getHouseId(house);
  const savedIds = getSavedIds();
  const user = getUser();
  const canBook = !user || user.role === "tenant";
  const article = document.createElement("article");
  article.className = "property-card";
  const images = getHouseImages(house);
  const imageMarkup = images.length
    ? `<img src="${escapeHtml(getImageSource(images[0]))}" alt="${escapeHtml(house.title)}">`
    : "";

  article.innerHTML = `
    <div class="property-image">${imageMarkup}<span>${escapeHtml(house.status || "Available")}</span></div>
    <div class="property-body">
      <h3>${escapeHtml(house.title)}</h3>
      <div class="property-meta">${escapeHtml(house.location)} &bull; ${escapeHtml(house.type)}</div>
      <div class="rent">${money(house.rent)} / month</div>
      <p class="muted">${escapeHtml(house.description || "No description provided.")}</p>
      ${
        canBook
          ? `<button class="button small" data-save-house="${escapeHtml(id)}" type="button">
              ${savedIds.includes(id) ? "Booked" : "Book house"}
            </button>`
          : ""
      }
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

async function loadProperties(params = {}) {
  const query = new URLSearchParams();
  if (params.location) query.set("location", params.location);
  if (params.type) query.set("type", params.type);
  if (params.maxRent) query.set("maxRent", params.maxRent);

  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiRequest(`/properties${suffix}`);
}

async function loadBookings() {
  return apiRequest("/bookings");
}

async function setupHome() {
  const featured = document.getElementById("featuredProperties");
  if (featured) {
    try {
      const houses = await loadProperties();
      renderPropertyGrid("featuredProperties", houses.slice(0, 3));
    } catch (error) {
      featured.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
    }
  }

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

async function setupSearch() {
  const form = document.getElementById("searchForm");
  if (!form) return;

  const params = new URLSearchParams(window.location.search);
  const locationInput = document.getElementById("searchLocation");
  const maxRentInput = document.getElementById("searchMaxRent");
  const typeInput = document.getElementById("searchType");
  const results = document.getElementById("searchResults");

  locationInput.value = params.get("location") || "";
  maxRentInput.value = params.get("budget") || "";

  const applyFilters = async () => {
    results.innerHTML = `<div class="empty-state">Loading houses...</div>`;
    try {
      const houses = await loadProperties({
        location: locationInput.value,
        type: typeInput.value,
        maxRent: maxRentInput.value
      });
      renderPropertyGrid("searchResults", houses);
    } catch (error) {
      results.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
    }
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    applyFilters();
  });

  document.getElementById("clearFilters").addEventListener("click", () => {
    form.reset();
    applyFilters();
  });

  applyFilters();
}

function setupAuth() {
  const registerForm = document.getElementById("registerForm");
  const loginForm = document.getElementById("loginForm");

  if (registerForm) {
    registerForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        const data = await apiRequest("/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: document.getElementById("registerName").value,
            email: document.getElementById("registerEmail").value,
            role: document.getElementById("registerRole").value,
            password: document.getElementById("registerPassword").value
          })
        });
        setSession(data);
        window.location.href = "dashboard.html";
      } catch (error) {
        setFormMessage(registerForm, error.message);
      }
    });
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        const data = await apiRequest("/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: document.getElementById("loginEmail").value,
            password: document.getElementById("loginPassword").value
          })
        });
        setSession(data);
        window.location.href = "dashboard.html";
      } catch (error) {
        setFormMessage(loginForm, error.message);
      }
    });
  }
}

async function updateDashboardStats(houses = null) {
  const total = document.getElementById("totalListings");
  const available = document.getElementById("availableListings");
  const saved = document.getElementById("savedListings");
  if (!total || !available || !saved) return;

  const user = getUser();
  const listings = houses || [];
  total.textContent = listings.length;

  if (user?.role === "tenant") {
    const bookings = await loadBookings().catch(() => []);
    available.textContent = listings.filter((house) => (house.status || "Available") === "Available").length;
    saved.textContent = bookings.length;
    document.getElementById("totalListingsLabel").textContent = "Available houses";
    document.getElementById("availableListingsLabel").textContent = "Ready to book";
    document.getElementById("savedListingsLabel").textContent = "Your bookings";
    return;
  }

  available.textContent = listings.filter((house) => (house.status || "Available") === "Available").length;
  saved.textContent = getSavedIds().length;
  document.getElementById("totalListingsLabel").textContent = "Your listings";
  document.getElementById("availableListingsLabel").textContent = "Available";
  document.getElementById("savedListingsLabel").textContent = "Tenant interest";
}

function renderDashboardListings(houses) {
  const container = document.getElementById("dashboardListings");
  if (!container) return;

  container.innerHTML = "";
  if (!houses.length) {
    container.innerHTML = `<div class="empty-state">No database listings yet. Add your first property.</div>`;
    return;
  }

  houses.forEach((house) => {
    const id = getHouseId(house);
    const item = document.createElement("article");
    item.className = "listing-item";
    const images = getHouseImages(house);
    const imageMarkup = images.length
      ? `<img src="${escapeHtml(getImageSource(images[0]))}" alt="${escapeHtml(house.title)}">`
      : `<span>No photo</span>`;
    item.innerHTML = `
      <div class="listing-photo">${imageMarkup}</div>
      <h3>${escapeHtml(house.title)}</h3>
      <span class="property-meta">${escapeHtml(house.location)} &bull; ${escapeHtml(house.type)}</span>
      <strong>${money(house.rent)} / month</strong>
      <p class="muted">${escapeHtml(house.description || "No description provided.")}</p>
      <div class="listing-actions">
        <button class="button small" data-toggle-status="${escapeHtml(id)}" type="button">${escapeHtml(house.status || "Available")}</button>
        <button class="text-button" data-delete-house="${escapeHtml(id)}" type="button">Delete</button>
      </div>
    `;
    container.appendChild(item);
  });
}

function renderBookings(containerId, bookings, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = "";
  if (!bookings.length) {
    container.innerHTML = `<div class="empty-state">${escapeHtml(options.emptyMessage || "No bookings yet.")}</div>`;
    return;
  }

  bookings.forEach((booking) => {
    const property = getBookingProperty(booking);
    const images = getHouseImages(property);
    const imageMarkup = images.length
      ? `<img src="${escapeHtml(getImageSource(images[0]))}" alt="${escapeHtml(property.title || "House")}">`
      : `<span>No photo</span>`;
    const tenant = booking.tenant || {};
    const item = document.createElement("article");
    item.className = "listing-item";
    item.innerHTML = `
      <div class="listing-photo">${imageMarkup}</div>
      <h3>${escapeHtml(property.title || "House booking")}</h3>
      <span class="property-meta">${escapeHtml(property.location || "")} &bull; ${escapeHtml(property.type || "Rental")}</span>
      <strong>${property.rent ? `${money(property.rent)} / month` : escapeHtml(booking.status)}</strong>
      <p class="muted">${escapeHtml(booking.message || "No message provided.")}</p>
      ${
        options.showTenant
          ? `<p class="muted">Tenant: ${escapeHtml(tenant.name || "Tenant")} ${tenant.email ? `(${escapeHtml(tenant.email)})` : ""}</p>`
          : ""
      }
      <div class="listing-actions">
        <span class="status-pill">${escapeHtml(booking.status || "Pending")}</span>
        ${
          options.canManage && booking.status === "Pending"
            ? `<button class="button small" data-booking-status="${escapeHtml(getBookingId(booking))}" data-status="Approved" type="button">Approve</button>
               <button class="text-button" data-booking-status="${escapeHtml(getBookingId(booking))}" data-status="Rejected" type="button">Reject</button>`
            : ""
        }
      </div>
    `;
    container.appendChild(item);
  });
}

async function loadMyListings() {
  const houses = await apiRequest("/properties/mine");
  const bookings = await loadBookings().catch(() => []);
  renderDashboardListings(houses);
  updateDashboardStats(houses);
  document.getElementById("savedListings").textContent = bookings.length;
  renderBookings("landlordBookings", bookings, {
    canManage: true,
    showTenant: true,
    emptyMessage: "No tenant booking requests yet."
  });
  return houses;
}

async function loadTenantDashboard() {
  const houses = await loadProperties();
  const availableHouses = houses.filter((house) => (house.status || "Available") === "Available");
  const bookings = await loadBookings();
  const bookedPropertyIds = bookings
    .map((booking) => getHouseId(getBookingProperty(booking)))
    .filter(Boolean);
  localStorage.setItem(STORAGE_KEYS.saved, JSON.stringify(bookedPropertyIds));

  renderPropertyGrid("tenantAvailableHouses", availableHouses);
  renderBookings("tenantBookings", bookings, {
    emptyMessage: "You have not booked a house yet."
  });
  await updateDashboardStats(availableHouses);
}

async function setupDashboard() {
  const form = document.getElementById("propertyForm");
  if (!form) return;

  const user = getUser();
  if (!getToken()) {
    window.location.href = "login.html";
    return;
  }

  const greeting = document.getElementById("dashboardGreeting");
  greeting.textContent = user ? `Hello, ${user.name}` : "Rental overview";

  const landlordDashboard = document.getElementById("landlordDashboard");
  const tenantDashboard = document.getElementById("tenantDashboard");
  const landlordRequestsSection = document.getElementById("landlordRequestsSection");

  if (user?.role === "tenant") {
    landlordDashboard.hidden = true;
    landlordRequestsSection.hidden = true;
    tenantDashboard.hidden = false;

    try {
      await loadTenantDashboard();
    } catch (error) {
      document.getElementById("tenantAvailableHouses").innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
    }

    document.getElementById("refreshTenantHouses").addEventListener("click", loadTenantDashboard);
    document.getElementById("refreshTenantBookings").addEventListener("click", loadTenantDashboard);
    document.getElementById("logoutButton").addEventListener("click", () => {
      clearSession();
      window.location.href = "login.html";
    });
    return;
  }

  landlordDashboard.hidden = false;
  landlordRequestsSection.hidden = false;
  tenantDashboard.hidden = true;

  document.getElementById("propertyImages").addEventListener("change", (event) => {
    renderSelectedImagePreview(event.target.files);
  });

  try {
    await loadMyListings();
  } catch (error) {
    document.getElementById("dashboardListings").innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData();
    formData.append("title", document.getElementById("propertyTitle").value);
    formData.append("location", document.getElementById("propertyLocation").value);
    formData.append("type", document.getElementById("propertyType").value);
    formData.append("rent", document.getElementById("propertyRent").value);
    formData.append("description", document.getElementById("propertyDescription").value);

    [...document.getElementById("propertyImages").files].forEach((file) => {
      formData.append("images", file);
    });

    try {
      await apiRequest("/properties", {
        method: "POST",
        body: formData
      });
      form.reset();
      renderSelectedImagePreview([]);
      await loadMyListings();
      setFormMessage(form, "Property saved to the database.", "success");
    } catch (error) {
      setFormMessage(form, error.message);
    }
  });

  document.getElementById("dashboardListings").addEventListener("click", async (event) => {
    const deleteButton = event.target.closest("[data-delete-house]");
    const statusButton = event.target.closest("[data-toggle-status]");

    try {
      if (deleteButton) {
        await apiRequest(`/properties/${deleteButton.dataset.deleteHouse}`, { method: "DELETE" });
      }

      if (statusButton) {
        const nextStatus = statusButton.textContent === "Available" ? "Occupied" : "Available";
        await apiRequest(`/properties/${statusButton.dataset.toggleStatus}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: nextStatus })
        });
      }

      await loadMyListings();
    } catch (error) {
      document.getElementById("dashboardListings").insertAdjacentHTML(
        "afterbegin",
        `<div class="empty-state">${escapeHtml(error.message)}</div>`
      );
    }
  });

  document.getElementById("landlordBookings").addEventListener("click", async (event) => {
    const statusButton = event.target.closest("[data-booking-status]");
    if (!statusButton) return;

    try {
      await apiRequest(`/bookings/${statusButton.dataset.bookingStatus}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: statusButton.dataset.status })
      });
      await loadMyListings();
    } catch (error) {
      document.getElementById("landlordBookings").insertAdjacentHTML(
        "afterbegin",
        `<div class="empty-state">${escapeHtml(error.message)}</div>`
      );
    }
  });

  document.getElementById("logoutButton").addEventListener("click", () => {
    clearSession();
    window.location.href = "login.html";
  });

  document.getElementById("resetDemo").textContent = "Refresh";
  document.getElementById("resetDemo").addEventListener("click", () => {
    loadMyListings();
  });

  document.getElementById("refreshLandlordBookings").addEventListener("click", () => {
    loadMyListings();
  });
}

async function handleSaveClick(event) {
  const button = event.target.closest("[data-save-house]");
  if (!button) return;

  if (!getToken()) {
    window.location.href = "login.html";
    return;
  }

  const id = button.dataset.saveHouse;
  const saved = new Set(getSavedIds());
  if (saved.has(id)) {
    button.textContent = "Booked";
    return;
  } else {
    button.disabled = true;
    button.textContent = "Booking...";
    try {
      await apiRequest("/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property: id,
          message: "I am interested in this rental."
        })
      });
      saved.add(id);
      button.textContent = "Booked";
      if (document.getElementById("tenantDashboard") && !document.getElementById("tenantDashboard").hidden) {
        await loadTenantDashboard();
      }
    } catch (error) {
      button.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  }
  localStorage.setItem(STORAGE_KEYS.saved, JSON.stringify([...saved]));
  updateDashboardStats();
}

document.addEventListener("click", handleSaveClick);
document.addEventListener("DOMContentLoaded", () => {
  setupHome();
  setupSearch();
  setupAuth();
  setupDashboard();
});
