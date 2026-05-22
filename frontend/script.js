const API_BASE = window.location.protocol === "file:" ? "http://localhost:5000/api" : "/api";
const API_ORIGIN = window.location.protocol === "file:" ? "http://localhost:5000" : "";

const STORAGE_KEYS = {
  token: "nyumba_token",
  user: "nyumba_user"
};

const HOUSE_TYPES = ["Apartment", "Bungalow", "Bedsitter", "Maisonette"];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const STRONG_PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

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
  return `KSh ${Number(value || 0).toLocaleString("en-KE")}`;
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
  return house?._id || house?.id || "";
}

function getImageSource(image) {
  if (!image) return "assets/aquarium-garden.jpg";
  if (image.startsWith("assets/")) return image;
  if (image.startsWith("data:") || image.startsWith("http")) return image;
  return `${API_ORIGIN}${image}`;
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

function validateEmail(email) {
  return EMAIL_PATTERN.test(String(email || "").trim());
}

function validateStrongPassword(password) {
  return STRONG_PASSWORD_PATTERN.test(password || "");
}

function requireValidEmail(email) {
  if (!validateEmail(email)) {
    throw new Error("Enter a valid email address.");
  }
}

function requireStrongPassword(password) {
  if (!validateStrongPassword(password)) {
    throw new Error("Password must be at least 8 characters and include uppercase, lowercase, number, and symbol.");
  }
}

function renderHouseCard(house, favoriteIds = new Set()) {
  const id = getHouseId(house);
  const images = Array.isArray(house.images) ? house.images : [];
  const landlord = house.landlord || {};
  const user = getUser();
  const canFavorite = user?.role === "tenant";
  const isFavorite = favoriteIds.has(id);
  const article = document.createElement("article");
  article.className = "house-card";
  article.innerHTML = `
    <a class="house-image" href="house.html?id=${escapeHtml(id)}">
      <img src="${escapeHtml(getImageSource(images[0]))}" alt="${escapeHtml(house.title || "Rental house")}">
      <span>${escapeHtml(house.status || "Available")}</span>
    </a>
    <div class="house-body">
      <h3>${escapeHtml(house.title || "Rental house")}</h3>
      <p class="muted">${escapeHtml(house.location || "")} &bull; ${escapeHtml(house.type || "")}</p>
      <strong>${money(house.rent)} / month</strong>
      <p>${escapeHtml((house.description || "No description provided.").slice(0, 110))}</p>
      <div class="card-actions">
        <a class="button small" href="house.html?id=${escapeHtml(id)}">View details</a>
        ${
          canFavorite
            ? `<button class="text-button" data-favorite="${escapeHtml(id)}" data-saved="${isFavorite}" type="button">${isFavorite ? "Saved" : "Save"}</button>`
            : ""
        }
      </div>
      <small class="muted">${landlord.name ? `Landlord: ${escapeHtml(landlord.name)}` : ""}</small>
    </div>
  `;
  return article;
}

async function loadProperties(params = {}) {
  const query = new URLSearchParams();
  if (params.location) query.set("location", params.location);
  if (params.type) query.set("type", params.type);
  if (params.minRent) query.set("minRent", params.minRent);
  if (params.maxRent) query.set("maxRent", params.maxRent);
  if (params.featured) query.set("featured", "1");
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiRequest(`/properties${suffix}`);
}

async function loadFavoriteIds() {
  if (getUser()?.role !== "tenant") return new Set();
  try {
    const favorites = await apiRequest("/favorites");
    return new Set(favorites.map((favorite) => getHouseId(favorite.property)).filter(Boolean));
  } catch {
    return new Set();
  }
}

async function renderHouseGrid(containerId, houses) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = "";
  if (!houses.length) {
    container.innerHTML = `<div class="empty-state">No houses found.</div>`;
    return;
  }

  const favoriteIds = await loadFavoriteIds();
  houses.forEach((house) => container.appendChild(renderHouseCard(house, favoriteIds)));
}

function setupHome() {
  const featured = document.getElementById("featuredProperties");
  if (featured) {
    loadProperties({ featured: true })
      .then((houses) => renderHouseGrid("featuredProperties", houses))
      .catch((error) => {
        featured.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
      });
  }

  const form = document.getElementById("homeSearchForm");
  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const params = new URLSearchParams({
      location: document.getElementById("homeLocation").value,
      minRent: document.getElementById("homeMinRent").value,
      maxRent: document.getElementById("homeMaxRent").value,
      type: document.getElementById("homeType").value
    });
    window.location.href = `houses.html?${params.toString()}`;
  });
}

function setupHouses() {
  const form = document.getElementById("houseSearchForm");
  if (!form) return;

  const params = new URLSearchParams(window.location.search);
  const fields = {
    location: document.getElementById("searchLocation"),
    minRent: document.getElementById("searchMinRent"),
    maxRent: document.getElementById("searchMaxRent"),
    type: document.getElementById("searchType")
  };

  Object.entries(fields).forEach(([key, input]) => {
    input.value = params.get(key) || "";
  });

  const applyFilters = async () => {
    const results = document.getElementById("searchResults");
    results.innerHTML = `<div class="empty-state">Loading houses...</div>`;
    try {
      const houses = await loadProperties({
        location: fields.location.value,
        minRent: fields.minRent.value,
        maxRent: fields.maxRent.value,
        type: fields.type.value
      });
      await renderHouseGrid("searchResults", houses);
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

async function setupHouseDetails() {
  const container = document.getElementById("houseDetails");
  if (!container) return;

  const id = new URLSearchParams(window.location.search).get("id");
  if (!id) {
    container.innerHTML = `<div class="empty-state">House not found.</div>`;
    return;
  }

  try {
    const house = await apiRequest(`/properties/${id}`);
    const favoriteIds = await loadFavoriteIds();
    const images = Array.isArray(house.images) && house.images.length ? house.images : ["assets/aquarium-garden.jpg"];
    const landlord = house.landlord || {};
    container.innerHTML = `
      <div class="detail-layout">
        <div class="detail-gallery">
          ${images.map((image) => `<img src="${escapeHtml(getImageSource(image))}" alt="${escapeHtml(house.title || "House photo")}">`).join("")}
        </div>
        <article class="panel detail-panel">
          <p class="eyebrow">${escapeHtml(house.status || "Available")}</p>
          <h1>${escapeHtml(house.title || "Rental house")}</h1>
          <p class="lead">${escapeHtml(house.location || "")} &bull; ${escapeHtml(house.type || "")}</p>
          <strong class="price">${money(house.rent)} / month</strong>
          <p>${escapeHtml(house.description || "No description provided.")}</p>
          <div class="contact-card">
            <h2>Landlord contact</h2>
            <p><strong>${escapeHtml(landlord.name || "Landlord")}</strong></p>
            <p>Email: ${landlord.email ? `<a href="mailto:${escapeHtml(landlord.email)}">${escapeHtml(landlord.email)}</a>` : "Not provided"}</p>
            <p>Phone: ${landlord.phone ? `<a href="tel:${escapeHtml(landlord.phone)}">${escapeHtml(landlord.phone)}</a>` : "Not provided"}</p>
            <p>Location: ${escapeHtml(landlord.location || "Not provided")}</p>
          </div>
          ${
            getUser()?.role === "tenant"
              ? `<button class="button" data-favorite="${escapeHtml(id)}" data-saved="${favoriteIds.has(id)}" type="button">${favoriteIds.has(id) ? "Saved to favorites" : "Save favorite"}</button>`
              : getUser()
                ? `<p class="muted">Favorites are available for tenant accounts.</p>`
                : `<a class="button" href="login.html">Login to save favorite</a>`
          }
        </article>
      </div>
    `;
  } catch (error) {
    container.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
  }
}

function setupAuth() {
  const registerForm = document.getElementById("registerForm");
  const loginForm = document.getElementById("loginForm");
  const forgotPasswordForm = document.getElementById("forgotPasswordForm");
  const resetPasswordForm = document.getElementById("resetPasswordForm");

  if (registerForm) {
    registerForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        const email = document.getElementById("registerEmail").value;
        const password = document.getElementById("registerPassword").value;
        requireValidEmail(email);
        requireStrongPassword(password);

        const data = await apiRequest("/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: document.getElementById("registerName").value,
            email,
            phone: document.getElementById("registerPhone").value,
            location: document.getElementById("registerLocation").value,
            role: document.getElementById("registerRole").value,
            password
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
        const email = document.getElementById("loginEmail").value;
        requireValidEmail(email);

        const data = await apiRequest("/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
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

  if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        const email = document.getElementById("forgotEmail").value;
        requireValidEmail(email);

        const data = await apiRequest("/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email })
        });
        setFormMessage(forgotPasswordForm, data.message, "success");

        if (data.resetUrl) {
          const resetLink = document.createElement("a");
          resetLink.href = data.resetUrl;
          resetLink.textContent = "Open reset form";
          resetLink.className = "text-button";
          forgotPasswordForm.appendChild(resetLink);
        }
      } catch (error) {
        setFormMessage(forgotPasswordForm, error.message);
      }
    });
  }

  if (resetPasswordForm) {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) {
      setFormMessage(resetPasswordForm, "Password reset link is missing or invalid.");
    }

    resetPasswordForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        const password = document.getElementById("resetPassword").value;
        const confirmPassword = document.getElementById("resetPasswordConfirm").value;
        requireStrongPassword(password);
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match.");
        }

        const data = await apiRequest("/auth/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, password })
        });
        setFormMessage(resetPasswordForm, data.message, "success");
        resetPasswordForm.reset();
      } catch (error) {
        setFormMessage(resetPasswordForm, error.message);
      }
    });
  }
}

function statCard(label, value) {
  return `<article class="stat"><span>${escapeHtml(value)}</span><p>${escapeHtml(label)}</p></article>`;
}

function listingItem(house, options = {}) {
  const id = getHouseId(house);
  const landlord = house.landlord || {};
  return `
    <article class="listing-item">
      <img src="${escapeHtml(getImageSource((house.images || [])[0]))}" alt="${escapeHtml(house.title || "House")}">
      <div>
        <h3>${escapeHtml(house.title || "Rental house")}</h3>
        <p class="muted">${escapeHtml(house.location || "")} &bull; ${escapeHtml(house.type || "")} &bull; ${money(house.rent)}</p>
        ${landlord.name ? `<p class="muted">Landlord: ${escapeHtml(landlord.name)} ${landlord.email ? `(${escapeHtml(landlord.email)})` : ""}</p>` : ""}
        <div class="card-actions">
          <a class="button small" href="house.html?id=${escapeHtml(id)}">View</a>
          ${options.landlord ? `<button class="text-button" data-edit-listing="${escapeHtml(id)}" type="button">Edit</button><button class="text-button danger" data-delete-listing="${escapeHtml(id)}" type="button">Delete</button>` : ""}
          ${options.admin ? `<button class="text-button" data-approve-listing="${escapeHtml(id)}" type="button">Approve</button><button class="text-button danger" data-admin-delete-listing="${escapeHtml(id)}" type="button">Remove</button>` : ""}
          ${options.favorite ? `<button class="text-button danger" data-favorite="${escapeHtml(id)}" data-saved="true" type="button">Remove favorite</button>` : ""}
        </div>
      </div>
    </article>
  `;
}

function propertyFormTemplate(house = {}) {
  return `
    <form class="panel form-stack" id="listingForm">
      <h2>${house._id ? "Edit listing" : "Add house listing"}</h2>
      <input id="listingId" type="hidden" value="${escapeHtml(house._id || "")}">
      <label for="listingTitle">House title</label>
      <input id="listingTitle" type="text" required value="${escapeHtml(house.title || "")}" placeholder="Two bedroom apartment">
      <label for="listingLocation">Location</label>
      <input id="listingLocation" type="text" required value="${escapeHtml(house.location || "")}" placeholder="Kilimani">
      <label for="listingType">House type</label>
      <select id="listingType" required>
        ${HOUSE_TYPES.map((type) => `<option value="${type}" ${house.type === type ? "selected" : ""}>${type}</option>`).join("")}
      </select>
      <label for="listingRent">Monthly rent</label>
      <input id="listingRent" type="number" min="1" required value="${escapeHtml(house.rent || "")}" placeholder="35000">
      <label for="listingStatus">Availability</label>
      <select id="listingStatus">
        <option value="Available" ${house.status !== "Occupied" ? "selected" : ""}>Available</option>
        <option value="Occupied" ${house.status === "Occupied" ? "selected" : ""}>Occupied</option>
      </select>
      <label for="listingDescription">Description</label>
      <textarea id="listingDescription" rows="4" placeholder="Key details about the house">${escapeHtml(house.description || "")}</textarea>
      <label for="listingImages">Upload photos</label>
      <input id="listingImages" type="file" accept="image/*" multiple>
      <button class="button" type="submit">${house._id ? "Update listing" : "Save listing"}</button>
    </form>
  `;
}

async function renderTenantDashboard() {
  const stats = document.getElementById("dashboardStats");
  const workspace = document.getElementById("dashboardWorkspace");
  const [favorites, houses] = await Promise.all([
    apiRequest("/favorites"),
    loadProperties({ featured: true })
  ]);
  stats.innerHTML = [
    statCard("Saved favorites", favorites.length),
    statCard("Featured houses", houses.length),
    statCard("Account type", "Tenant")
  ].join("");
  workspace.innerHTML = `
    <section class="panel">
      <div class="result-bar">
        <h2>Your favorites</h2>
        <a class="button small" href="houses.html">Search houses</a>
      </div>
      <div class="listing-list">
        ${
          favorites.length
            ? favorites.map((favorite) => listingItem(favorite.property, { favorite: true })).join("")
            : `<div class="empty-state">You have not saved any favorites yet.</div>`
        }
      </div>
    </section>
  `;
}

async function renderLandlordDashboard(editHouse = null) {
  const stats = document.getElementById("dashboardStats");
  const workspace = document.getElementById("dashboardWorkspace");
  const houses = await apiRequest("/properties/mine");
  stats.innerHTML = [
    statCard("Your listings", houses.length),
    statCard("Available", houses.filter((house) => house.status === "Available").length),
    statCard("Occupied", houses.filter((house) => house.status === "Occupied").length)
  ].join("");
  workspace.innerHTML = `
    <div class="dashboard-grid">
      ${propertyFormTemplate(editHouse || {})}
      <section class="panel">
        <div class="result-bar">
          <h2>Your listings</h2>
          <button class="text-button" id="refreshListings" type="button">Refresh</button>
        </div>
        <div class="listing-list">
          ${
            houses.length
              ? houses.map((house) => listingItem(house, { landlord: true })).join("")
              : `<div class="empty-state">No listings yet. Add your first house.</div>`
          }
        </div>
      </section>
    </div>
  `;
}

function userItem(user) {
  return `
    <article class="listing-item">
      <div class="avatar">${escapeHtml((user.name || "U").slice(0, 1).toUpperCase())}</div>
      <div>
        <h3>${escapeHtml(user.name || "User")}</h3>
        <p class="muted">${escapeHtml(user.email || "")} &bull; ${escapeHtml(user.role || "")}</p>
        <p class="muted">${escapeHtml(user.phone || "No phone")} &bull; ${escapeHtml(user.location || "No location")}</p>
        <div class="card-actions">
          <button class="text-button danger" data-delete-user="${escapeHtml(user._id)}" type="button">Remove user</button>
        </div>
      </div>
    </article>
  `;
}

async function renderAdminDashboard() {
  const stats = document.getElementById("dashboardStats");
  const workspace = document.getElementById("dashboardWorkspace");
  const [reports, users, listings] = await Promise.all([
    apiRequest("/admin/reports"),
    apiRequest("/admin/users"),
    apiRequest("/admin/listings")
  ]);
  stats.innerHTML = [
    statCard("Users", reports.users),
    statCard("Tenants", reports.tenants),
    statCard("Landlords", reports.landlords),
    statCard("Listings", reports.listings),
    statCard("Available", reports.availableListings),
    statCard("Favorites", reports.favorites)
  ].join("");
  workspace.innerHTML = `
    <div class="dashboard-grid">
      <section class="panel">
        <h2>Manage users</h2>
        <div class="listing-list">${users.map(userItem).join("") || `<div class="empty-state">No users found.</div>`}</div>
      </section>
      <section class="panel">
        <h2>Manage listings</h2>
        <div class="listing-list">${listings.map((house) => listingItem(house, { admin: true })).join("") || `<div class="empty-state">No listings found.</div>`}</div>
      </section>
    </div>
  `;
}

async function setupDashboard() {
  const workspace = document.getElementById("dashboardWorkspace");
  if (!workspace) return;

  const user = getUser();
  if (!getToken() || !user) {
    window.location.href = "login.html";
    return;
  }

  document.getElementById("dashboardGreeting").textContent = `Hello, ${user.name}`;
  document.getElementById("dashboardRole").textContent = `${user.role} workspace`;

  try {
    if (user.role === "admin") await renderAdminDashboard();
    if (user.role === "landlord") await renderLandlordDashboard();
    if (user.role === "tenant") await renderTenantDashboard();
  } catch (error) {
    workspace.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
  }
}

async function handleFavoriteClick(button) {
  if (!getToken()) {
    window.location.href = "login.html";
    return;
  }
  if (getUser()?.role !== "tenant") return;

  const id = button.dataset.favorite;
  const saved = button.dataset.saved === "true";
  button.disabled = true;
  try {
    if (saved) {
      await apiRequest(`/favorites/${id}`, { method: "DELETE" });
      button.dataset.saved = "false";
      button.textContent = "Save";
    } else {
      await apiRequest(`/favorites/${id}`, { method: "POST" });
      button.dataset.saved = "true";
      button.textContent = "Saved";
    }
    if (document.getElementById("dashboardWorkspace")) await renderTenantDashboard();
  } catch (error) {
    button.textContent = error.message;
  } finally {
    button.disabled = false;
  }
}

async function handleDashboardClick(event) {
  const editButton = event.target.closest("[data-edit-listing]");
  const deleteButton = event.target.closest("[data-delete-listing]");
  const adminDeleteButton = event.target.closest("[data-admin-delete-listing]");
  const approveButton = event.target.closest("[data-approve-listing]");
  const deleteUserButton = event.target.closest("[data-delete-user]");

  try {
    if (editButton) {
      const house = await apiRequest(`/properties/${editButton.dataset.editListing}`);
      await renderLandlordDashboard(house);
    }
    if (deleteButton) {
      await apiRequest(`/properties/${deleteButton.dataset.deleteListing}`, { method: "DELETE" });
      await renderLandlordDashboard();
    }
    if (adminDeleteButton) {
      await apiRequest(`/admin/listings/${adminDeleteButton.dataset.adminDeleteListing}`, { method: "DELETE" });
      await renderAdminDashboard();
    }
    if (approveButton) {
      await apiRequest(`/admin/listings/${approveButton.dataset.approveListing}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalStatus: "Approved" })
      });
      await renderAdminDashboard();
    }
    if (deleteUserButton) {
      await apiRequest(`/admin/users/${deleteUserButton.dataset.deleteUser}`, { method: "DELETE" });
      await renderAdminDashboard();
    }
  } catch (error) {
    document.getElementById("dashboardWorkspace").insertAdjacentHTML("afterbegin", `<div class="empty-state">${escapeHtml(error.message)}</div>`);
  }
}

async function handleListingSubmit(form) {
  const id = document.getElementById("listingId").value;
  const formData = new FormData();
  formData.append("title", document.getElementById("listingTitle").value);
  formData.append("location", document.getElementById("listingLocation").value);
  formData.append("type", document.getElementById("listingType").value);
  formData.append("rent", document.getElementById("listingRent").value);
  formData.append("status", document.getElementById("listingStatus").value);
  formData.append("description", document.getElementById("listingDescription").value);
  [...document.getElementById("listingImages").files].forEach((file) => formData.append("images", file));

  try {
    await apiRequest(id ? `/properties/${id}` : "/properties", {
      method: id ? "PUT" : "POST",
      body: formData
    });
    await renderLandlordDashboard();
  } catch (error) {
    setFormMessage(form, error.message);
  }
}

document.addEventListener("click", (event) => {
  const favoriteButton = event.target.closest("[data-favorite]");
  if (favoriteButton) handleFavoriteClick(favoriteButton);
  if (event.target.closest("#dashboardWorkspace")) handleDashboardClick(event);
});

document.addEventListener("submit", (event) => {
  const listingForm = event.target.closest("#listingForm");
  if (!listingForm) return;
  event.preventDefault();
  handleListingSubmit(listingForm);
});

document.addEventListener("DOMContentLoaded", () => {
  setupHome();
  setupHouses();
  setupHouseDetails();
  setupAuth();
  setupDashboard();

  const logoutButton = document.getElementById("logoutButton");
  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      clearSession();
      window.location.href = "login.html";
    });
  }
});
