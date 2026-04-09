/* ============ STATE ============ */
let DATA = null;

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

// Pick n unique items from arr without replacement
function pickN(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

// One random exercise per category (all 6 categories)
function pickBaseExercises() {
  return DATA.categoryOrder.map(cat => ({
    category: cat,
    ...pick(DATA.library[cat])
  }));
}

// Pick one rep-count-compatible exercise from each given category.
// Excludes exercises measured in distance, steps, per-side, or seconds.
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

/* ============ WOD FORMAT BUILDERS ============ */
const WOD_FORMATS = ["amrap", "fortime", "emom", "chipper", "ladder"];

function buildAMRAP() {
  const duration = pick([10, 12, 15, 20]);
  const beg = Math.max(2, Math.round(duration / 3.5));
  const int = Math.max(4, Math.round(duration / 2.2));
  return {
    format: "amrap",
    badge: `AMRAP ${duration}`,
    bigDisplay: `${duration}:00`,
    subtitle: "As Many Rounds As Possible",
    targets: [
      { label: "BEGINNER",     value: `${beg}+ ROUNDS` },
      { label: "INTERMEDIATE", value: `${int}+ ROUNDS`, rx: true }
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
      subtitle: "Complete the rep scheme for time",
      targets: [
        { label: "BEGINNER",     value: "< 14:00" },
        { label: "INTERMEDIATE", value: "< 8:00", rx: true }
      ],
      exercises: three.map(e => ({ ...e, reps: "21-15-9" }))
    };
  }

  const rounds = style === "rft3" ? 3 : 5;
  return {
    format: "fortime",
    badge: `${rounds} RFT`,
    bigDisplay: `${rounds} RDS`,
    subtitle: `${rounds} Rounds For Time`,
    targets: [
      { label: "BEGINNER",     value: `< ${rounds * 4}:00` },
      { label: "INTERMEDIATE", value: `< ${Math.round(rounds * 2.5)}:00`, rx: true }
    ],
    exercises: pickBaseExercises()
  };
}

function buildEMOM() {
  const duration = pick([10, 12, 14, 16]);
  const numMoves = pick([3, 4]);
  const cats = pickN(["push", "pull", "squat", "hinge", "lunge"], numMoves);
  const exercises = cats.map((cat, i) => ({
    category: cat,
    ...pick(DATA.library[cat]),
    prefix: `MIN ${i + 1}`
  }));
  return {
    format: "emom",
    badge: `EMOM ${duration}`,
    bigDisplay: `${duration}:00`,
    subtitle: "Every Minute On the Minute — rotate through",
    targets: [
      { label: "ROTATION",   value: `${numMoves} MOVES` },
      { label: "TOTAL MIN",  value: `${duration}`, rx: true }
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
    subtitle: "Work through the list once, top to bottom",
    targets: [
      { label: "BEGINNER",     value: "< 20:00" },
      { label: "INTERMEDIATE", value: "< 14:00", rx: true }
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
  const exercises = pickRepBased(["push", "pull", "squat", "hinge"], numMoves);
  const bigDisplay = direction === "down" ? "10→1" : "1→10";
  const repsLabel = direction === "down" ? "10→1 reps" : "1→10 reps";
  return {
    format: "ladder",
    badge: "LADDER",
    bigDisplay,
    subtitle: direction === "down"
      ? "Descending ladder — reps drop each round"
      : "Ascending ladder — reps grow each round",
    targets: [
      { label: "BEGINNER",     value: "< 15:00" },
      { label: "INTERMEDIATE", value: "< 9:00", rx: true }
    ],
    exercises: exercises.map(e => ({ ...e, reps: repsLabel }))
  };
}

function generateWOD() {
  const format = pick(WOD_FORMATS);
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
    wod: generateWOD(),
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
      <div class="ex-cue">${escapeHTML(ex.cue)}</div>
    </div>
  `).join("");

  fadeIn(header);
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
  renderWarmup();
  renderStrength(session.strength);
  renderWOD(session.wod);
  renderAccessory(session.accessory);
  renderCooldown();
  updateStats(session);

  document.getElementById("rerollBtn").addEventListener("click", regenerateSession);
}

document.addEventListener("DOMContentLoaded", init);
