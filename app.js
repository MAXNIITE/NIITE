/* ============================================================
   NIITE — app logic (mobile app shell)
   Reads fundis from Supabase, submits client requests and fundi
   registrations, then opens WhatsApp directly to the matching fundi.
   Falls back to demo data until Supabase env vars are configured.
   ============================================================ */

const SUPABASE_URL = (window.NIITE_SUPABASE_URL || "").trim();
const SUPABASE_ANON_KEY = (window.NIITE_SUPABASE_ANON_KEY || "").trim();
const HAS_SUPABASE = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

const COUNTRY_CODE = "255"; // normalise local 0xxx numbers for wa.me

/* ---------- Service catalogue ---------- */

const HUDUMA = [
  { id: "umeme",     jina: "Umeme",              icon: "\u26A1" },
  { id: "maji",      jina: "Maji & Mabomba",     icon: "\uD83D\uDCA7" },
  { id: "simu",      jina: "Simu & Elektroniki", icon: "\uD83D\uDCF1" },
  { id: "useremala", jina: "Useremala",          icon: "\uD83E\uDE9A" },
  { id: "uashi",     jina: "Uashi & Ukuta",      icon: "\uD83E\uDDF1" },
  { id: "rangi",     jina: "Kupaka Rangi",       icon: "\uD83C\uDFA8" },
  { id: "vyombo",    jina: "Kutengeneza Vyombo", icon: "\uD83D\uDD27" },
  { id: "paa",       jina: "Paa & Kuezeka",      icon: "\uD83C\uDFE0" },
  { id: "fanicha",   jina: "Fanicha",            icon: "\uD83E\uDE91" },
  { id: "AC",        jina: "AC & Friji",         icon: "\u2744\uFE0F" },
  { id: "bustani",   jina: "Bustani",            icon: "\uD83C\uDF31" },
  { id: "usafi",     jina: "Usafi wa Nyumba",    icon: "\uD83E\uDDF9" }
];

const hudumaJina = (id) => {
  const h = HUDUMA.find((x) => x.id === id);
  return h ? h.jina : id;
};

/* ---------- Demo data (used only before Supabase is wired up) ---------- */

const DEMO_MAFUNDI = [
  { id: "d1", jina: "Ramadhani Mwakyusa", huduma: "umeme",     eneo: "Kariakoo, Dar",    simu: "0712345678", uzoefu: 9,  bei: 20000, maelezo: "Umeme wa nyumbani na viwandani. Nafanya dharura usiku kucha.", haraka: true,  kazi: 214 },
  { id: "d2", jina: "Salma Abdallah",     huduma: "maji",      eneo: "Kijitonyama, Dar", simu: "0765112233", uzoefu: 6,  bei: 15000, maelezo: "Mabomba yaliyovuja, kuweka tank, pampu na matengenezo yote.", haraka: true,  kazi: 132 },
  { id: "d3", jina: "Joseph Kimaro",      huduma: "simu",      eneo: "Kinondoni, Dar",   simu: "0754445566", uzoefu: 11, bei: 12000, maelezo: "Kurekebisha simu, laptop na TV. Screen na betri replacement.", haraka: false, kazi: 341 },
  { id: "d4", jina: "Mwijage Magesa",     huduma: "useremala", eneo: "Sinza, Dar",       simu: "0718778899", uzoefu: 14, bei: 18000, maelezo: "Milango, madirisha, jiko la mbao na kuweka kabati.", haraka: false, kazi: 189 },
  { id: "d5", jina: "Hamisi Juma",        huduma: "uashi",     eneo: "Tabata, Dar",      simu: "0788334455", uzoefu: 10, bei: 22000, maelezo: "Uashi, ukuta na kuweka tiles. Nina timu yangu.", haraka: false, kazi: 97 },
  { id: "d6", jina: "Neema Mushi",        huduma: "rangi",     eneo: "Mikocheni, Dar",   simu: "0741223344", uzoefu: 7,  bei: 16000, maelezo: "Kupaka rangi ya ndani na nje, plaster na wallpaper.", haraka: false, kazi: 143 },
  { id: "d7", jina: "Baraka Mwita",       huduma: "AC",        eneo: "Masaki, Dar",      simu: "0715998877", uzoefu: 8,  bei: 25000, maelezo: "Kuweka AC, friji na kusafisha service yote.", haraka: true,  kazi: 76 },
  { id: "d8", jina: "Zuhura Salum",       huduma: "vyombo",    eneo: "Ilala, Dar",       simu: "0752665544", uzoefu: 12, bei: 10000, maelezo: "Kutengeneza jiko la gesi, kofia na kona za chuma.", haraka: false, kazi: 210 }
];

/* ---------- Helpers ---------- */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function escapeHtml(str) {
  return String(str == null ? "" : str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function showToast(msg) {
  const t = $("#toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => t.classList.remove("show"), 3000);
}

function initials(name) {
  return String(name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function waNumber(simu) {
  let n = String(simu || "").replace(/[^\d+]/g, "");
  if (n.startsWith("+")) n = n.slice(1);
  if (n.startsWith("00")) n = n.slice(2);
  if (n.startsWith("0")) n = COUNTRY_CODE + n.slice(1);
  else if (n.length === 9) n = COUNTRY_CODE + n;
  return n;
}

/* ---------- Supabase REST ---------- */

async function sbRequest(path, { method = "GET", body, prefer } = {}) {
  const headers = {
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json"
  };
  if (prefer) headers["Prefer"] = prefer;

  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${text || res.statusText}`);
  return text ? JSON.parse(text) : null;
}

/* ---------- Navigation ---------- */

let currentScreen = "home";

function goTo(name) {
  if (!name) return;
  const target = $(`#screen-${name}`);
  if (!target) return;

  $$(".screen").forEach((s) => s.classList.toggle("active", s === target));

  $$(".tab").forEach((t) => t.classList.toggle("active", t.dataset.go === name));

  const subs = {
    home: "Fundi wa kila aina",
    mafundi: "Chagua fundi",
    ombi: "Omba au jiunge",
    huduma: "Aina za huduma",
    wasifu: "Wasifu wako"
  };
  const sub = $("#app-sub");
  if (sub) sub.textContent = subs[name] || "Fundi wa kila aina";

  const scroller = target.querySelector(".scroll");
  if (scroller) scroller.scrollTop = 0;

  currentScreen = name;
}

/* ---------- Data ---------- */

let MAFUNDI = [];
let activeHuduma = "";

async function loadMafundi() {
  const hali = $("#orodha-hali");
  if (HAS_SUPABASE) {
    try {
      const rows = await sbRequest("/mafundi?select=*&hai=eq.true&order=kazi.desc");
      MAFUNDI = Array.isArray(rows) ? rows : [];
    } catch (err) {
      console.error(err);
      MAFUNDI = DEMO_MAFUNDI;
      if (hali) hali.textContent = "Inaonyesha mafundi wa mfano — database haijawashwa bado.";
    }
  } else {
    MAFUNDI = DEMO_MAFUNDI;
  }
  renderMafundi();
  renderHomeMafundi();
  renderStats();
}

function renderStats() {
  const set = (id, val) => {
    const el = $(id);
    if (el) el.textContent = val;
  };
  set("#stat-mafundi", MAFUNDI.length);
  set("#stat-kazi", MAFUNDI.reduce((sum, f) => sum + (Number(f.kazi) || 0), 0));
  set("#stat-huduma", HUDUMA.length);
}

function fundiCard(f) {
  const tags = [
    `<span class="tag">${escapeHtml(hudumaJina(f.huduma))}</span>`,
    f.haraka ? `<span class="tag urgent">Dharura</span>` : "",
    f.uzoefu ? `<span class="tag">Miaka ${escapeHtml(f.uzoefu)}</span>` : ""
  ].join("");

  const bei = Number(f.bei) > 0
    ? `<span class="price">Kuanzia <strong>TSh ${Number(f.bei).toLocaleString("en-US")}</strong></span>`
    : `<span class="price muted">Bei kwa makubaliano</span>`;

  const msg = encodeURIComponent(
    `Habari ${f.jina}! Nimekupata kupitia NIITE. Nahitaji fundi wa ${hudumaJina(f.huduma)}.`
  );

  return `
    <article class="fundi-card">
      <div class="fundi-top">
        <div class="avatar">${escapeHtml(initials(f.jina))}</div>
        <div>
          <p class="fundi-name">${escapeHtml(f.jina)}</p>
          <p class="fundi-meta">${escapeHtml(f.eneo || "")}${f.simu ? " · " + escapeHtml(f.simu) : ""}</p>
        </div>
      </div>
      <div class="tags">${tags}</div>
      ${f.maelezo ? `<p class="fundi-desc">${escapeHtml(f.maelezo)}</p>` : ""}
      <div class="fundi-foot">
        ${bei}
        <a class="btn btn-primary btn-sm" target="_blank" rel="noopener"
           href="https://wa.me/${waNumber(f.simu)}?text=${msg}">Wasiliana</a>
      </div>
    </article>
  `;
}

function renderMafundi() {
  const box = $("#orodha-mafundi");
  const hali = $("#orodha-hali");
  if (!box) return;

  const q = ($("#tafuta")?.value || "").trim().toLowerCase();
  const filterH = $("#filter-huduma")?.value || activeHuduma;

  let list = MAFUNDI.slice();
  if (filterH) list = list.filter((f) => f.huduma === filterH);
  if (q) {
    list = list.filter((f) =>
      [f.jina, f.eneo, hudumaJina(f.huduma), f.maelezo]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }

  if (!list.length) {
    box.innerHTML = "";
    if (hali) hali.textContent = "Hakuna fundi anayelingana na utafutaji wako bado.";
    return;
  }

  box.innerHTML = list.map(fundiCard).join("");
  if (hali) hali.textContent = "";
}

function renderHomeMafundi() {
  const box = $("#home-mafundi");
  if (!box) return;
  box.innerHTML = MAFUNDI.slice(0, 3).map(fundiCard).join("");
}

/* ---------- Services UI ---------- */

function renderHudumaUI() {
  const selectOmb = $("#select-huduma");
  if (selectOmb) {
    selectOmb.innerHTML =
      `<option value="">Chagua huduma…</option>` +
      HUDUMA.map((h) => `<option value="${h.id}">${escapeHtml(h.jina)}</option>`).join("");
  }

  const selectFundi = $("#select-huduma-fundi");
  if (selectFundi) {
    selectFundi.innerHTML =
      `<option value="">Chagua ujuzi…</option>` +
      HUDUMA.map((h) => `<option value="${h.id}">${escapeHtml(h.jina)}</option>`).join("");
  }

  const filter = $("#filter-huduma");
  if (filter) {
    filter.innerHTML =
      `<option value="">Huduma zote</option>` +
      HUDUMA.map((h) => `<option value="${h.id}">${escapeHtml(h.jina)}</option>`).join("");
  }

  const grid = $("#orodha-huduma");
  if (grid) {
    grid.innerHTML = HUDUMA.map(
      (h) => `
        <div class="service-item" data-huduma="${h.id}">
          <span>${h.icon}</span>${escapeHtml(h.jina)}
        </div>`
    ).join("");
  }

  const gridAll = $("#orodha-huduma-zote");
  if (gridAll) {
    gridAll.innerHTML = HUDUMA.map(
      (h) => `
        <div class="service-item" data-huduma="${h.id}">
          <span>${h.icon}</span>${escapeHtml(h.jina)}
        </div>`
    ).join("");
  }
}

function showHudumaList(hudumaId) {
  activeHuduma = hudumaId;
  const filter = $("#filter-huduma");
  if (filter) filter.value = hudumaId;
  renderMafundi();
  goTo("mafundi");
}

/* ---------- Form submissions ---------- */

async function submitOmb(fd) {
  const ombi = {
    jina: (fd.get("jina") || "").trim(),
    simu: (fd.get("simu") || "").trim(),
    huduma: fd.get("huduma") || "",
    eneo: (fd.get("eneo") || "").trim(),
    maelezo: (fd.get("maelezo") || "").trim(),
    haraka: fd.get("haraka") === "on"
  };

  if (!ombi.jina || !ombi.simu || !ombi.huduma || !ombi.eneo || !ombi.maelezo) {
    throw new Error("Tafadhali jaza sehemu zote muhimu.");
  }

  if (HAS_SUPABASE) {
    await sbRequest("/maombi", { method: "POST", body: ombi, prefer: "return=minimal" });
  } else {
    console.info("Supabase haipo — ombi la mfano:", ombi);
  }

  const match = MAFUNDI
    .filter((f) => f.huduma === ombi.huduma)
    .sort((a, b) => (b.haraka === ombi.haraka ? 1 : 0) - (a.haraka === ombi.haraka ? 1 : 0))[0];

  if (match) {
    const text = encodeURIComponent(
      `Habari ${match.jina}, naitwa ${ombi.jina} kutoka ${ombi.eneo}. ` +
      `Nahitaji fundi wa ${hudumaJina(ombi.huduma)}. Tatizo: ${ombi.maelezo}` +
      (ombi.haraka ? " (DHARURA)" : "") +
      ` — namba yangu ni ${ombi.simu}. Nimekupata kupitia NIITE.`
    );
    window.open(`https://wa.me/${waNumber(match.simu)}?text=${text}`, "_blank", "noopener");
  }

  return match;
}

async function submitFundi(fd) {
  const fundi = {
    jina: (fd.get("jina") || "").trim(),
    simu: (fd.get("simu") || "").trim(),
    huduma: fd.get("huduma") || "",
    eneo: (fd.get("eneo") || "").trim(),
    uzoefu: Number(fd.get("uzoefu") || 0),
    bei: Number(fd.get("bei") || 0),
    maelezo: (fd.get("maelezo") || "").trim(),
    haraka: true,
    hai: true,
    kazi: 0
  };

  if (!fundi.jina || !fundi.simu || !fundi.huduma || !fundi.eneo) {
    throw new Error("Tafadhali jaza jina, simu, ujuzi na eneo.");
  }

  if (HAS_SUPABASE) {
    await sbRequest("/mafundi", { method: "POST", body: fundi, prefer: "return=minimal" });
  } else {
    console.info("Supabase haipo — fundi wa mfano:", fundi);
  }

  return fundi;
}

/* ---------- Wiring ---------- */

function init() {
  renderHudumaUI();

  document.addEventListener("click", (e) => {
    const goBtn = e.target.closest("[data-go]");
    if (goBtn) {
      goTo(goBtn.dataset.go);
      return;
    }

    const serv = e.target.closest(".service-item");
    if (serv) {
      showHudumaList(serv.dataset.huduma);
      return;
    }

    const quick = e.target.closest(".quick");
    if (quick && quick.dataset.huduma) {
      showHudumaList(quick.dataset.huduma);
      return;
    }

    const notify = e.target.closest("#btn-notify");
    if (notify) {
      showToast("Hakuna taarifa mpya kwa sasa.");
    }
  });

  const filter = $("#filter-huduma");
  if (filter) {
    filter.addEventListener("change", () => {
      activeHuduma = filter.value;
      renderMafundi();
    });
  }

  const search = $("#tafuta");
  if (search) search.addEventListener("input", renderMafundi);

  const formOmb = $("#form-ombi");
  if (formOmb) {
    formOmb.addEventListener("submit", async (e) => {
      e.preventDefault();
      const out = $("#ombi-feedback");
      const btn = formOmb.querySelector("button[type=submit]");
      btn.disabled = true;
      out.className = "feedback";
      out.textContent = "Inatuma…";
      try {
        const match = await submitOmb(new FormData(formOmb));
        out.className = "feedback ok";
        out.textContent = match
          ? `Asante! Ombi limetumwa. Tunakufungulia WhatsApp ya ${match.jina}…`
          : "Asante! Ombi lako limepokelewa. Fundi atakupigia hivi punde.";
        showToast(match ? "Ombi limetumwa — WhatsApp inafunguka" : "Ombi limepokelewa");
        formOmb.reset();
      } catch (err) {
        console.error(err);
        const known = err.message.includes("jaza");
        out.className = "feedback err";
        out.textContent = known ? err.message : "Samahani, ombi halikutumwa. Jaribu tena.";
      } finally {
        btn.disabled = false;
      }
    });
  }

  const formFundi = $("#form-fundi");
  if (formFundi) {
    formFundi.addEventListener("submit", async (e) => {
      e.preventDefault();
      const out = $("#fundi-feedback");
      const btn = formFundi.querySelector("button[type=submit]");
      btn.disabled = true;
      out.className = "feedback";
      out.textContent = "Inatuma…";
      try {
        const f = await submitFundi(new FormData(formFundi));
        out.className = "feedback ok";
        out.textContent = `Karibu NIITE, ${f.jina}! Wasifu wako umeingizwa.`;
        showToast("Umejiunga kama fundi 🎉");
        formFundi.reset();
        await loadMafundi();
      } catch (err) {
        console.error(err);
        const known = err.message.includes("jaza");
        out.className = "feedback err";
        out.textContent = known ? err.message : "Samahani, usajili haukufanikiwa. Jaribu tena.";
      } finally {
        btn.disabled = false;
      }
    });
  }

  goTo("home");
  loadMafundi();
}

document.addEventListener("DOMContentLoaded", init);
