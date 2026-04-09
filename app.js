/* ============ STATE ============ */
let DATA = null;

/* ============ WOD GENERATION ============ */
function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `wod-${y}-${m}-${day}`;
}

function formattedDate() {
  const d = new Date();
  const opts = { weekday: "long", month: "short", day: "numeric", year: "numeric" };
  return d.toLocaleDateString(undefined, opts).toUpperCase();
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateWOD() {
  const wod = [];
  for (const cat of DATA.categoryOrder) {
    const ex = pick(DATA.library[cat]);
    wod.push({ category: cat, ...ex });
  }
  return wod;
}

function loadOrCreateWOD() {
  const key = todayKey();
  const existing = localStorage.getItem(key);
  if (existing) {
    try { return JSON.parse(existing); } catch (e) { /* fall through */ }
  }
  const fresh = generateWOD();
  localStorage.setItem(key, JSON.stringify(fresh));
  return fresh;
}

function regenerateWOD() {
  const key = todayKey();
  const fresh = generateWOD();
  localStorage.setItem(key, JSON.stringify(fresh));
  renderWOD(fresh);
}

/* ============ RENDERING ============ */
function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function renderWOD(wod) {
  const list = document.getElementById("wodList");
  list.innerHTML = wod.map(ex => `
    <div class="exercise">
      <div class="ex-top">
        <div>
          <span class="badge ${ex.category}">${ex.category.toUpperCase()}</span>
        </div>
        <div class="ex-reps">${escapeHTML(ex.reps)}</div>
      </div>
      <div class="ex-name">${escapeHTML(ex.name)}</div>
      <div class="ex-cue">${escapeHTML(ex.cue)}</div>
    </div>
  `).join("");

  // subtle fade-in on (re)generate
  list.style.opacity = "0";
  list.style.transform = "translateY(6px)";
  requestAnimationFrame(() => {
    list.style.transition = "opacity 0.4s ease, transform 0.4s ease";
    list.style.opacity = "1";
    list.style.transform = "translateY(0)";
  });
}

function renderWarmup() {
  const el = document.getElementById("warmupList");
  el.innerHTML = `
    <div class="section-badge"><span class="badge warmup">PREP</span></div>
  ` + DATA.warmup.map(e => `
    <div class="simple-row">
      <div class="simple-name">${escapeHTML(e.name)}</div>
      <div class="simple-val">${escapeHTML(e.val)}</div>
    </div>
  `).join("");
}

function renderStrength() {
  const el = document.getElementById("strengthList");
  el.innerHTML = `
    <div class="section-badge"><span class="badge strength">STRENGTH</span></div>
  ` + DATA.strength.map(e => `
    <div class="exercise">
      <div class="ex-top">
        <div class="ex-name">${escapeHTML(e.name)}</div>
        <div class="ex-reps">${escapeHTML(e.reps)}</div>
      </div>
      <div class="ex-cue">${escapeHTML(e.cue)}</div>
    </div>
  `).join("");
}

function renderAccessory() {
  const el = document.getElementById("accessoryList");
  el.innerHTML = `
    <div class="section-badge"><span class="badge accessory">ACCESSORY</span></div>
  ` + DATA.accessory.map(e => `
    <div class="simple-row">
      <div class="simple-name">${escapeHTML(e.name)}</div>
      <div class="simple-val">${escapeHTML(e.val)}</div>
    </div>
  `).join("");
}

function renderCooldown() {
  const el = document.getElementById("cooldownList");
  el.innerHTML = `
    <div class="section-badge"><span class="badge cooldown">MOBILITY</span></div>
  ` + DATA.cooldown.map(e => `
    <div class="simple-row">
      <div class="simple-name">${escapeHTML(e.name)}</div>
      <div class="simple-val">${escapeHTML(e.val)}</div>
    </div>
  `).join("");
}

function showError(message) {
  const ids = ["warmupList", "strengthList", "wodList", "accessoryList", "cooldownList"];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = `<div class="error">${escapeHTML(message)}</div>`;
  });
}

/* ============ INIT ============ */
async function init() {
  document.getElementById("dateLabel").textContent = formattedDate();

  try {
    const res = await fetch("exercises.json", { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    DATA = await res.json();
  } catch (err) {
    console.error("Failed to load exercises.json:", err);
    showError("Failed to load exercises. Serve this page over HTTP.");
    return;
  }

  renderWarmup();
  renderStrength();
  renderWOD(loadOrCreateWOD());
  renderAccessory();
  renderCooldown();

  document.getElementById("rerollBtn").addEventListener("click", regenerateWOD);
}

document.addEventListener("DOMContentLoaded", init);
