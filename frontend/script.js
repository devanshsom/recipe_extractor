/**
 * RecipeLens — Frontend JS
 * Communicates with the FastAPI backend at API_BASE.
 */

const API_BASE = "http://127.0.0.1:8080";

// ── Utility ──────────────────────────────────────────────────────────────────

const $ = (sel) => document.querySelector(sel);
const show = (el) => el.classList.remove("hidden");
const hide = (el) => el.classList.add("hidden");

function showError(msg) {
  const banner = $("#error-banner");
  banner.textContent = msg;
  show(banner);
}
function clearError() { hide($("#error-banner")); }

async function apiFetch(path, opts = {}) {
  const res = await fetch(API_BASE + path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

document.querySelectorAll(".tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => {
      p.classList.remove("active");
      p.classList.add("hidden");
    });
    btn.classList.add("active");
    const panel = $(`#tab-${btn.dataset.tab}`);
    panel.classList.remove("hidden");
    panel.classList.add("active");

    if (btn.dataset.tab === "history") loadHistory();
    if (btn.dataset.tab === "mealplan") loadPlannerRecipes();
  });
});

// ── TAB 1: Extract ────────────────────────────────────────────────────────────

$("#extract-btn").addEventListener("click", extractRecipe);
$("#url-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") extractRecipe();
});

async function extractRecipe() {
  const url = $("#url-input").value.trim();
  if (!url) return showError("Please enter a recipe URL.");
  if (!url.startsWith("http")) return showError("Please enter a valid URL starting with http(s)://.");

  clearError();
  hide($("#result-area"));

  const btn = $("#extract-btn");
  $(".btn-text").classList.add("hidden");
  $(".btn-loader").classList.remove("hidden");
  btn.disabled = true;

  try {
    const data = await apiFetch("/api/extract", {
      method: "POST",
      body: JSON.stringify({ url }),
    });
    renderRecipe(data);
    show($("#result-area"));
  } catch (err) {
    showError(`Error: ${err.message}`);
  } finally {
    $(".btn-text").classList.remove("hidden");
    $(".btn-loader").classList.add("hidden");
    btn.disabled = false;
  }
}

// ── Render Recipe ─────────────────────────────────────────────────────────────

function renderRecipe(d, container = null) {
  if (container) {
    // Render into modal
    container.innerHTML = buildRecipeHTML(d);
    return;
  }
  // Render into Tab 1
  $("#r-title").textContent = d.title || "—";
  $("#r-cuisine").textContent = d.cuisine || "Unknown";
  const diffEl = $("#r-difficulty");
  diffEl.textContent = (d.difficulty || "—").toUpperCase();
  diffEl.dataset.level = d.difficulty || "";

  $("#r-prep").textContent = d.prep_time || "—";
  $("#r-cook").textContent = d.cook_time || "—";
  $("#r-total").textContent = d.total_time || "—";
  $("#r-servings").textContent = d.servings || "—";

  // Ingredients
  const ingList = $("#r-ingredients");
  ingList.innerHTML = (d.ingredients || [])
    .map(
      (ing) =>
        `<li><span class="ing-qty">${ing.quantity || ""}</span>
         <span class="ing-unit">${ing.unit || ""}</span>
         <span class="ing-item">${ing.item || ""}</span></li>`
    )
    .join("");

  // Nutrition
  const nut = d.nutrition_estimate || {};
  $("#n-cal").textContent = nut.calories || "—";
  $("#n-protein").textContent = nut.protein || "—";
  $("#n-carbs").textContent = nut.carbs || "—";
  $("#n-fat").textContent = nut.fat || "—";

  // Substitutions
  const subList = $("#r-subs");
  subList.innerHTML = (d.substitutions || [])
    .map((s) => `<li>${s}</li>`)
    .join("");

  // Instructions
  const instrList = $("#r-instructions");
  instrList.innerHTML = (d.instructions || [])
    .map((step) => `<li>${step}</li>`)
    .join("");

  // Shopping list
  const shopContainer = $("#r-shopping");
  shopContainer.innerHTML = buildShoppingHTML(d.shopping_list);

  // Related
  const relatedContainer = $("#r-related");
  relatedContainer.innerHTML = (d.related_recipes || [])
    .map((r) => `<span class="related-chip">${r}</span>`)
    .join("");
}

function buildShoppingHTML(shopList) {
  if (!shopList) return "<p style='color:var(--muted);font-size:13px'>No shopping list available.</p>";
  return Object.entries(shopList)
    .filter(([, items]) => items && items.length > 0)
    .map(
      ([cat, items]) => `
      <div class="shop-category">
        <div class="shop-cat-name">${cat}</div>
        <ul class="shop-items">
          ${items.map((item) => `<li>${item}</li>`).join("")}
        </ul>
      </div>`
    )
    .join("");
}

function buildRecipeHTML(d) {
  const nut = d.nutrition_estimate || {};
  const diff = d.difficulty || "";

  return `
    <div class="recipe-header-card" style="border:none;padding:0 0 20px 0;background:none;">
      <div class="recipe-meta-top">
        <span class="badge">${d.cuisine || "Unknown"}</span>
        <span class="badge difficulty" data-level="${diff}">${diff.toUpperCase() || "—"}</span>
      </div>
      <h2>${d.title || "—"}</h2>
      <div class="time-chips">
        <div class="chip"><span class="chip-label">Prep</span><span>${d.prep_time || "—"}</span></div>
        <div class="chip"><span class="chip-label">Cook</span><span>${d.cook_time || "—"}</span></div>
        <div class="chip"><span class="chip-label">Total</span><span>${d.total_time || "—"}</span></div>
        <div class="chip"><span class="chip-label">Serves</span><span>${d.servings || "—"}</span></div>
      </div>
    </div>

    <div class="two-col" style="margin-top:20px">
      <div class="card">
        <h3 class="card-title">🧂 Ingredients</h3>
        <ul class="ingredient-list">
          ${(d.ingredients || []).map((ing) =>
            `<li><span class="ing-qty">${ing.quantity || ""}</span>
             <span class="ing-unit">${ing.unit || ""}</span>
             <span class="ing-item">${ing.item || ""}</span></li>`
          ).join("")}
        </ul>
      </div>
      <div class="card">
        <h3 class="card-title">📊 Nutrition <small>(per serving)</small></h3>
        <div class="nutrition-grid">
          <div class="nut-item"><span class="nut-val">${nut.calories || "—"}</span><span class="nut-label">kcal</span></div>
          <div class="nut-item"><span class="nut-val">${nut.protein || "—"}</span><span class="nut-label">Protein</span></div>
          <div class="nut-item"><span class="nut-val">${nut.carbs || "—"}</span><span class="nut-label">Carbs</span></div>
          <div class="nut-item"><span class="nut-val">${nut.fat || "—"}</span><span class="nut-label">Fat</span></div>
        </div>
        <h3 class="card-title mt">🔄 Substitutions</h3>
        <ul class="sub-list">
          ${(d.substitutions || []).map((s) => `<li>${s}</li>`).join("")}
        </ul>
      </div>
    </div>

    <div class="card full-width" style="margin-top:16px">
      <h3 class="card-title">📋 Instructions</h3>
      <ol class="instruction-list">
        ${(d.instructions || []).map((step) => `<li>${step}</li>`).join("")}
      </ol>
    </div>

    <div class="card full-width" style="margin-top:16px">
      <h3 class="card-title">🛒 Shopping List</h3>
      <div class="shopping-grid">${buildShoppingHTML(d.shopping_list)}</div>
    </div>

    <div class="card full-width" style="margin-top:16px">
      <h3 class="card-title">✨ Related Recipes</h3>
      <div class="related-chips">
        ${(d.related_recipes || []).map((r) => `<span class="related-chip">${r}</span>`).join("")}
      </div>
    </div>
  `;
}

// ── TAB 2: History ────────────────────────────────────────────────────────────

$("#refresh-btn").addEventListener("click", loadHistory);

async function loadHistory() {
  const tbody = $("#history-body");
  tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:32px">Loading…</td></tr>`;

  try {
    const recipes = await apiFetch("/api/recipes");
    renderHistory(recipes);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="color:#e74c3c;padding:16px">${err.message}</td></tr>`;
  }
}

function renderHistory(recipes) {
  const tbody = $("#history-body");
  const empty = $("#history-empty");

  if (!recipes.length) {
    tbody.innerHTML = "";
    show(empty);
    return;
  }
  hide(empty);

  tbody.innerHTML = recipes
    .map(
      (r) => `
      <tr>
        <td>${r.id}</td>
        <td><strong>${r.title}</strong><br><a href="${r.url}" target="_blank" rel="noopener">${truncate(r.url, 50)}</a></td>
        <td>${r.cuisine || "—"}</td>
        <td><span class="badge difficulty" data-level="${r.difficulty || ""}" style="display:inline-block">${(r.difficulty || "—").toUpperCase()}</span></td>
        <td>${formatDate(r.created_at)}</td>
        <td>
          <button class="btn-detail" onclick="openModal(${r.id})">Details</button>
          <button class="btn-del" onclick="deleteRecipe(${r.id}, this)" title="Delete">✕</button>
        </td>
      </tr>`
    )
    .join("");
}

async function deleteRecipe(id, btn) {
  if (!confirm("Delete this recipe?")) return;
  try {
    await apiFetch(`/api/recipes/${id}`, { method: "DELETE" });
    btn.closest("tr").remove();
    loadPlannerRecipes(); // refresh planner
  } catch (err) {
    alert(err.message);
  }
}

// ── Modal ─────────────────────────────────────────────────────────────────────

async function openModal(id) {
  const overlay = $("#modal-overlay");
  const body = $("#modal-body");
  body.innerHTML = `<p style="color:var(--muted);padding:40px;text-align:center">Loading…</p>`;
  show(overlay);

  try {
    const data = await apiFetch(`/api/recipes/${id}`);
    renderRecipe(data, body);
  } catch (err) {
    body.innerHTML = `<p style="color:#e74c3c">${err.message}</p>`;
  }
}

$("#modal-close").addEventListener("click", () => hide($("#modal-overlay")));
$("#modal-overlay").addEventListener("click", (e) => {
  if (e.target === $("#modal-overlay")) hide($("#modal-overlay"));
});

// ── TAB 3: Meal Planner ───────────────────────────────────────────────────────

let plannerSelected = new Set();

async function loadPlannerRecipes() {
  const grid = $("#planner-grid");
  grid.innerHTML = `<p style="color:var(--muted)">Loading recipes…</p>`;

  try {
    const recipes = await apiFetch("/api/recipes");
    if (!recipes.length) {
      grid.innerHTML = `<p style="color:var(--muted)">No saved recipes yet. Extract some first!</p>`;
      return;
    }
    plannerSelected.clear();
    updatePlannerUI();

    grid.innerHTML = recipes
      .map(
        (r) => `
        <div class="planner-card" data-id="${r.id}" onclick="togglePlannerCard(this)">
          <span class="planner-check">✓</span>
          <h4>${r.title}</h4>
          <p>${r.cuisine || "—"} · ${r.difficulty || "—"}</p>
        </div>`
      )
      .join("");
  } catch (err) {
    grid.innerHTML = `<p style="color:#e74c3c">${err.message}</p>`;
  }
}

function togglePlannerCard(card) {
  const id = parseInt(card.dataset.id);
  if (plannerSelected.has(id)) {
    plannerSelected.delete(id);
    card.classList.remove("selected");
  } else {
    if (plannerSelected.size >= 5) {
      alert("Maximum 5 recipes for meal planning.");
      return;
    }
    plannerSelected.add(id);
    card.classList.add("selected");
  }
  updatePlannerUI();
}

function updatePlannerUI() {
  const count = plannerSelected.size;
  $("#planner-count").textContent = `${count} selected`;
  const btn = $("#generate-plan-btn");
  btn.disabled = count < 3;
}

$("#generate-plan-btn").addEventListener("click", async () => {
  const btn = $("#generate-plan-btn");
  btn.disabled = true;
  btn.textContent = "Generating…";

  try {
    const data = await apiFetch("/api/meal-plan", {
      method: "POST",
      body: JSON.stringify({ recipe_ids: [...plannerSelected] }),
    });
    renderMealPlan(data);
  } catch (err) {
    alert(err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Generate Meal Plan";
  }
});

function renderMealPlan(data) {
  const el = $("#meal-plan-result");
  const shopHTML = buildShoppingHTML(data.combined_shopping_list);
  const tips = (data.tips || []).map((t) => `<li>${t}</li>`).join("");

  el.innerHTML = `
    <div class="meal-plan-result-card">
      <h3>${data.meal_plan_title || "Your Meal Plan"}</h3>
      <p class="recipes-included">Recipes: ${(data.recipes_included || []).join(" · ")}</p>

      <h4 class="card-title">🛒 Combined Shopping List</h4>
      <div class="shopping-grid">${shopHTML}</div>

      ${tips ? `<h4 class="card-title" style="margin-top:20px">💡 Tips</h4><ul class="sub-list">${tips}</ul>` : ""}
    </div>
  `;
  show(el);
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function truncate(str, max) {
  return str.length > max ? str.slice(0, max) + "…" : str;
}
function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
