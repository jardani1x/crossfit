/* ============ STATE ============ */
let DATA = null;
let selectedFormat = "amrap";

const WOD_FORMATS = ["amrap", "fortime", "emom", "chipper", "ladder"];
const FORMAT_LABELS = {
  amrap: "AMRAP",
  fortime: "FOR TIME",
  emom: "EMOM",
  chipper: "CHIPPER",
  ladder: "LADDER"
};

/* ============ HELPERS ============ */
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

function pickN(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function pickBaseExercises() {
  return DATA.categoryOrder.map(cat => ({
    category: cat,
    ...pick(DATA.library[cat])
  }));
}

function pickRepBased(cats, count) {
  const pool = [];
  for (const cat of cats) {
    const compatible = DATA.library[cat].filter(e =>
      !/side|steps|\bm\b|sec/i.test(e.reps)
    );
    if (compatible.length > 0) {
      pool.push({ category: cat, ...pick(compatible) });
    }
  }
  return pickN(pool, Math.min(count, pool.length));
}

/* ============ WOD FORMAT BUILDERS (20–30 min) ============ */
function buildAMRAP() {
  const mins = pick([20, 25]);
  const begRounds = mins === 20 ? "5+" : "6+";
  const intRounds = mins === 20 ? "8+" : "10+";
  return {
    format: "amrap",
    badge: `AMRAP ${mins}`,
    bigDisplay: `${mins}:00`,
    subtitle: `As Many Rounds As Possible in ${mins} minutes`,
    targets: [
      { label: "BEGINNER",     value: `${begRounds} ROUNDS` },
      { label: "INTERMEDIATE", value: `${intRounds} ROUNDS`, rx: true }
    ],
    exercises: pickBaseExercises()
  };
}

function buildForTime() {
  const style = pick(["rft3", "rft5", "21-15-9"]);

  if (style === "21-15-9") {
    const three = pickRepBased(["push", "pull", "squat", "hinge"], 3);
    return {
      format: "fortime",
      badge: "FOR TIME",
      bigDisplay: "21-15-9",
      subtitle: "Complete the rep scheme for time — 25 min cap",
      targets: [
        { label: "BEGINNER",     value: "< 25:00" },
        { label: "INTERMEDIATE", value: "< 15:00", rx: true }
      ],
      exercises: three.map(e => ({ ...e, reps: "21-15-9" }))
    };
  }

  const rounds = style === "rft3" ? 3 : 5;
  const cap = rounds === 3 ? 20 : 25;
  return {
    format: "fortime",
    badge: `${rounds} RFT`,
    bigDisplay: `${rounds} RDS`,
    subtitle: `${rounds} Rounds For Time — ${cap} min cap`,
    targets: [
      { label: "BEGINNER",     value: `< ${cap}:00` },
      { label: "INTERMEDIATE", value: `< ${rounds === 3 ? 14 : 18}:00`, rx: true }
    ],
    exercises: pickBaseExercises()
  };
}

function buildEMOM() {
  const numMoves = pick([4, 5]);
  const totalMin = pick([20, 24, 30]);
  const cats = pickN(["push", "pull", "squat", "hinge", "lunge"], numMoves);
  const exercises = cats.map((cat, i) => ({
    category: cat,
    ...pick(DATA.library[cat]),
    prefix: `MIN ${i + 1}`
  }));
  return {
    format: "emom",
    badge: `EMOM ${totalMin}`,
    bigDisplay: `${totalMin}:00`,
    subtitle: `Every Minute On the Minute for ${totalMin} min — rotate through`,
    targets: [
      { label: "ROTATION",   value: `${numMoves} MOVES` },
      { label: "TOTAL MIN",  value: `${totalMin}`, rx: true }
    ],
    exercises
  };
}

function buildChipper() {
  const base = pickBaseExercises();
  const repSchedule = [50, 40, 40, 30, 30, 20];
  const carryDistances = [60, 50, 40, 30];
  return {
    format: "chipper",
    badge: "CHIPPER",
    bigDisplay: "FOR TIME",
    subtitle: "Work through the list once — 30 min cap",
    targets: [
      { label: "BEGINNER",     value: "< 30:00" },
      { label: "INTERMEDIATE", value: "< 20:00", rx: true }
    ],
    exercises: base.map((e, i) => {
      if (e.category === "carry") {
        const dist = carryDistances[Math.min(i, carryDistances.length - 1)];
        return { ...e, reps: `${dist}m` };
      }
      const baseReps = repSchedule[i];
      if (e.reps.includes("side"))  return { ...e, reps: `${Math.ceil(baseReps / 2)}/side` };
      if (e.reps.includes("steps")) return { ...e, reps: `${baseReps} steps` };
      return { ...e, reps: `${baseReps} reps` };
    })
  };
}

function buildLadder() {
  const direction = pick(["down", "up"]);
  const numMoves = pick([2, 3]);
  const topRung = numMoves === 2 ? 15 : 12;
  const exercises = pickRepBased(["push", "pull", "squat", "hinge"], numMoves);
  const bigDisplay = direction === "down" ? `${topRung}→1` : `1→${topRung}`;
  const repsLabel = direction === "down" ? `${topRung}→1 reps` : `1→${topRung} reps`;
  return {
    format: "ladder",
    badge: "LADDER",
    bigDisplay,
    subtitle: direction === "down"
      ? `Descending ladder — ${topRung} down to 1`
      : `Ascending ladder — 1 up to ${topRung}`,
    targets: [
      { label: "BEGINNER",     value: "< 25:00" },
      { label: "INTERMEDIATE", value: "< 18:00", rx: true }
    ],
    exercises: exercises.map(e => ({ ...e, reps: repsLabel }))
  };
}

function generateWOD(format) {
  format = format || selectedFormat;
  switch (format) {
    case "amrap":   return buildAMRAP();
    case "fortime": return buildForTime();
    case "emom":    return buildEMOM();
    case "chipper": return buildChipper();
    case "ladder":  return buildLadder();
  }
}

/* ============ SESSION ============ */
function generateSession() {
  return {
    wod: generateWOD(selectedFormat),
    strength: pick(DATA.strengthPool),
    accessory: pickN(DATA.accessoryPool, 3)
  };
}

function isValidSession(s) {
  return s
    && typeof s === "object"
    && !Array.isArray(s)
    && s.wod && typeof s.wod === "object" && !Array.isArray(s.wod)
    && typeof s.wod.format === "string"
    && Array.isArray(s.wod.exercises)
    && Array.isArray(s.strength)
    && Array.isArray(s.accessory);
}

function loadOrCreateSession() {
  const key = todayKey();
  const existing = localStorage.getItem(key);
  if (existing) {
    try {
      const parsed = JSON.parse(existing);
      if (isValidSession(parsed)) return parsed;
    } catch (e) { /* fall through */ }
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
  updateStats(fresh);
}

/* ============ FORMAT PICKER ============ */
function renderFormatPicker() {
  const wrapper = document.createElement("div");
  wrapper.className = "format-picker-wrap";

  const label = document.createElement("div");
  label.className = "format-picker-label";
  label.textContent = "WOD FORMAT";
  wrapper.appendChild(label);

  const row = document.createElement("div");
  row.className = "format-picker";
  row.id = "formatPicker";

  WOD_FORMATS.forEach(fmt => {
    const chip = document.createElement("button");
    chip.className = "format-chip" + (fmt === selectedFormat ? " active" : "");
    chip.dataset.format = fmt;
    chip.textContent = FORMAT_LABELS[fmt];
    chip.addEventListener("click", () => selectFormat(fmt));
    row.appendChild(chip);
  });

  wrapper.appendChild(row);

  const btn = document.getElementById("rerollBtn");
  btn.parentNode.insertBefore(wrapper, btn);
}

function selectFormat(fmt) {
  selectedFormat = fmt;
  localStorage.setItem("wod-format", fmt);

  document.querySelectorAll(".format-chip").forEach(c => {
    c.classList.toggle("active", c.dataset.format === fmt);
  });

  const key = todayKey();
  let session;
  try {
    session = JSON.parse(localStorage.getItem(key));
  } catch (e) { return; }
  if (!session) return;

  session.wod = generateWOD(fmt);
  localStorage.setItem(key, JSON.stringify(session));
  renderWOD(session.wod);
  updateStats(session);
}

/* ============ RENDERING ============ */
function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function videoLink(name) {
  const q = encodeURIComponent(name + " exercise proper form");
  const url = `https://www.youtube.com/results?search_query=${q}`;
  return `<a class="ex-video" href="${url}" target="_blank" rel="noopener">▶ Watch form guide</a>`;
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
  const meta = document.getElementById("wodMeta");
  if (meta) meta.textContent = `${wod.badge} • RANDOMIZED`;

  const header = document.getElementById("wodHeader");
  header.innerHTML = `
    <div class="wod-header">
      <div class="wod-header-row">
        <div class="wod-format">
          <span class="amrap-badge">${escapeHTML(wod.badge)}</span>
          <span class="wod-time">${escapeHTML(wod.bigDisplay)}</span>
        </div>
        <div class="wod-targets">
          ${wod.targets.map(t => `
            <div class="target">
              <span class="target-label">${escapeHTML(t.label)}</span>
              <span class="target-val${t.rx ? " rx" : ""}">${escapeHTML(t.value)}</span>
            </div>
          `).join("")}
        </div>
      </div>
      <div class="wod-subtitle">${escapeHTML(wod.subtitle)}</div>
    </div>
  `;

  const list = document.getElementById("wodList");
  list.innerHTML = wod.exercises.map(ex => `
    <div class="exercise">
      <div class="ex-top">
        <div class="ex-left">
          <span class="badge ${ex.category}">${ex.category.toUpperCase()}</span>
          ${ex.prefix ? `<span class="ex-prefix">${escapeHTML(ex.prefix)}</span>` : ""}
        </div>
        <div class="ex-reps">${escapeHTML(ex.reps)}</div>
      </div>
      <div class="ex-name">${escapeHTML(ex.name)}</div>
      ${ex.equipment ? `<div class="ex-equipment">${escapeHTML(ex.equipment)}</div>` : ""}
      <div class="ex-cue">${escapeHTML(ex.cue)}</div>
      ${videoLink(ex.name)}
    </div>
  `).join("");

  fadeIn(header);
  fadeIn(list);
}

function simpleRowHTML(e) {
  return `
    <div class="simple-row">
      <div class="simple-left">
        <div class="simple-name">${escapeHTML(e.name)}</div>
        ${e.equipment ? `<div class="ex-equipment">${escapeHTML(e.equipment)}</div>` : ""}
      </div>
      <div class="simple-val">${escapeHTML(e.val)}</div>
    </div>
  `;
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
      ${e.equipment ? `<div class="ex-equipment">${escapeHTML(e.equipment)}</div>` : ""}
      <div class="ex-cue">${escapeHTML(e.cue)}</div>
      ${videoLink(e.name)}
    </div>
  `).join("");
  fadeIn(el);
}

function renderAccessory(exercises) {
  const el = document.getElementById("accessoryList");
  el.innerHTML = `
    <div class="section-badge"><span class="badge accessory">ACCESSORY</span></div>
  ` + exercises.map(e => `
    <div class="exercise">
      <div class="ex-top">
        <div class="ex-name">${escapeHTML(e.name)}</div>
        <div class="ex-reps">${escapeHTML(e.val)}</div>
      </div>
      ${e.equipment ? `<div class="ex-equipment">${escapeHTML(e.equipment)}</div>` : ""}
      ${e.cue ? `<div class="ex-cue">${escapeHTML(e.cue)}</div>` : ""}
      ${videoLink(e.name)}
    </div>
  `).join("");
  fadeIn(el);
}

function renderWarmup() {
  const el = document.getElementById("warmupList");
  el.innerHTML = `
    <div class="section-badge"><span class="badge warmup">PREP</span></div>
  ` + DATA.warmup.map(simpleRowHTML).join("");
}

function renderCooldown() {
  const el = document.getElementById("cooldownList");
  el.innerHTML = `
    <div class="section-badge"><span class="badge cooldown">MOBILITY</span></div>
  ` + DATA.cooldown.map(simpleRowHTML).join("");
}

function updateStats(session) {
  const el = document.getElementById("statExercises");
  if (!el) return;
  const total =
    DATA.warmup.length +
    session.strength.length +
    session.wod.exercises.length +
    session.accessory.length +
    DATA.cooldown.length;
  el.textContent = total;
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

  selectedFormat = session.wod.format || "amrap";
  localStorage.setItem("wod-format", selectedFormat);

  renderFormatPicker();
  renderWarmup();
  renderStrength(session.strength);
  renderWOD(session.wod);
  renderAccessory(session.accessory);
  renderCooldown();
  updateStats(session);

  document.getElementById("rerollBtn").addEventListener("click", regenerateSession);
}

document.addEventListener("DOMContentLoaded", init);
