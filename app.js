/* ============ STATE ============ */
let DATA = null;

/* ============ SESSION GENERATION ============ */
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

// Pick n unique items from arr without replacement
function pickN(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function generateSession() {
  const wod = DATA.categoryOrder.map(cat => ({
    category: cat,
    ...pick(DATA.library[cat])
  }));
  const strength = pick(DATA.strengthPool);
  const accessory = pickN(DATA.accessoryPool, 3);
  return { wod, strength, accessory };
}

function loadOrCreateSession() {
  const key = todayKey();
  const existing = localStorage.getItem(key);
  if (existing) {
    try {
      const parsed = JSON.parse(existing);
      // Support old format (plain array) — regenerate if missing strength/accessory
      if (Array.isArray(parsed)) throw new Error("legacy");
      return parsed;
    } catch (e) { /* fall through to generate fresh */ }
  }
  const fresh = generateSession();
  localStorage.setItem(key, JSON.stringify(fresh));
  return fresh;
}

function regenerateSession() {
  const key = todayKey();
  const fresh = generateSession();
  localStorage.setItem(key, JSON.stringify(fresh));
  renderWOD(fresh.wod);
  renderStrength(fresh.strength);
  renderAccessory(fresh.accessory);
}

/* ============ RENDERING ============ */
function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function fadeIn(el) {
  el.style.opacity = "0";
  el.style.transform = "translateY(6px)";
  requestAnimationFrame(() => {
    el.style.transition = "opacity 0.4s ease, transform 0.4s ease";
    el.style.opacity = "1";
    el.style.transform = "translateY(0)";
  });
}

function renderWOD(wod) {
  const list = document.getElementById("wodList");
  list.innerHTML = wod.map(ex => `
    <div class="exercise">
      <div class="ex-top">
        <div><span class="badge ${ex.category}">${ex.category.toUpperCase()}</span></div>
        <div class="ex-reps">${escapeHTML(ex.reps)}</div>
      </div>
      <div class="ex-name">${escapeHTML(ex.name)}</div>
      <div class="ex-cue">${escapeHTML(ex.cue)}</div>
    </div>
  `).join("");
  fadeIn(list);
}

function renderStrength(exercises) {
  const el = document.getElementById("strengthList");
  el.innerHTML = `
    <div class="section-badge"><span class="badge strength">STRENGTH</span></div>
  ` + exercises.map(e => `
    <div class="exercise">
      <div class="ex-top">
        <div class="ex-name">${escapeHTML(e.name)}</div>
        <div class="ex-reps">${escapeHTML(e.reps)}</div>
      </div>
      <div class="ex-cue">${escapeHTML(e.cue)}</div>
    </div>
  `).join("");
  fadeIn(el);
}

function renderAccessory(exercises) {
  const el = document.getElementById("accessoryList");
  el.innerHTML = `
    <div class="section-badge"><span class="badge accessory">ACCESSORY</span></div>
  ` + exercises.map(e => `
    <div class="simple-row">
      <div class="simple-name">${escapeHTML(e.name)}</div>
      <div class="simple-val">${escapeHTML(e.val)}</div>
    </div>
  `).join("");
  fadeIn(el);
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
  ["warmupList", "strengthList", "wodList", "accessoryList", "cooldownList"].forEach(id => {
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

  const session = loadOrCreateSession();
  renderWarmup();
  renderStrength(session.strength);
  renderWOD(session.wod);
  renderAccessory(session.accessory);
  renderCooldown();

  document.getElementById("rerollBtn").addEventListener("click", regenerateSession);
}

document.addEventListener("DOMContentLoaded", init);
