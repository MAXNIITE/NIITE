/* ============================================================
   NIITE — app logic (mobile app shell)

   Data lives in Supabase:
     mafundi(jina, ujuzi, eneo, simu, kiwango, uzoefu, kuhusu,
             inapatikana, alama, kazi)
     maombi(mteja_jina, mteja_simu, huduma, eneo, maelezo, fundi_id)

   Clients submit a request (no account needed) and are sent straight
   to the matching fundi's WhatsApp. Fundis register from the app.
   Falls back to demo data until the Supabase anon key is configured.
   ============================================================ */

const SUPABASE_URL = (window.NIITE_SUPABASE_URL || "").trim().replace(/\/+$/, "");
const SUPABASE_ANON_KEY = (window.NIITE_SUPABASE_ANON_KEY || "").trim();
const HAS_SUPABASE = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

const COUNTRY_CODE = "255"; // normalise local 0xxx numbers for wa.me

/* ---------- Service catalogue ----------
   Each entry maps a stable id to what we store in the database
   ("ujuzi" / "huduma" on a fundi, "huduma" on a request). */

const HUDUMA = [
  { id: "Umeme",            jina: "Umeme",              icon: "\u26A1" },
  { id: "Maji na Mabomba",  jina: "Maji & Mabomba",     icon: "\uD83D\uDCA7" },
  { id: "Simu na Kompyuta", jina: "Simu & Elektroniki", icon: "\uD83D\uDCF1" },
  { id: "Useremala",        jina: "Useremala",          icon: "\uD83E\uDE9A" },
  { id: "Ujenzi",           jina: "Ujenzi & Uashi",     icon: "\uD83E\uDDF1" },
  { id: "Rangi na Upakaji", jina: "Kupaka Rangi",       icon: "\uD83C\uDFA8" },
  { id: "Vyombo",           jina: "Kutengeneza Vyombo", icon: "\uD83D\uDD27" },
  { id: "Paa",              jina: "Paa & Kuezeka",      icon: "\uD83C\uDFE0" },
  { id: "Fanicha",          jina: "Fanicha",            icon: "\uD83E\uDE91" },
  { id: "AC na Friji",      jina: "AC & Friji",         icon: "\u2744\uFE0F" },
  { id: "Bustani",          jina: "Bustani",            icon: "\uD83C\uDF31" },
  { id: "Usafi wa Nyumbani",jina: "Usafi wa Nyumbani",  icon: "\uD83E\uDDF9" }
];

const hudumaMap = {};
HUDUMA.forEach((h) => { hudumaMap[h.id] = h; });

const hudumaJina = (id) => (hudumaMap[id] ? hudumaMap[id].jina : id);
const hudumaIcon = (id) => (hudumaMap[id] ? hudumaMap[id].icon : "\uD83D\uDD27");

/* A fundi's stored "ujuzi" text may not match a catalogue id exactly,
   so resolve it by substring before falling back to the raw value. */
function hudumaIdFromText(text) {
  const t = String(text || "").toLowerCase().trim();
  if (!t) return "";
  if (hudumaMap[text]) return text;
  const direct = HUDUMA.find((h) => h.id.toLowerCase() === t);
  if (direct) return direct.id;
  const partial = HUDUMA.find((h) => t.includes(h.id.toLowerCase()) || h.id.toLowerCase().includes(t));
  return partial ? partial.id : String(text || "").trim();
}

/* ---------- Demo data (used only until Supabase is wired up) ---------- */

const DEMO_MAFUNDI = [
  { id: "d1", jina: "Juma Mwangi",  ujuzi: "Umeme",            eneo: "Kariakoo, Dar es Salaam", simu: "0712345670", uzoefu: "Miaka 12", kuhusu: "Fundi wa umeme wa nyumbani na biashara. Nafunga waya, switchboard na solar.", alama: 4.9, kazi: 340 },
  { id: "d2", jina: "Halima Said",  ujuzi: "Maji na Mabomba",  eneo: "Kinondoni, Dar es Salaam", simu: "0713456781", uzoefu: "Miaka 9",  kuhusu: "Nafunga na kutengeneza mabomba, pampu na tanki la maji.", alama: 4.8, kazi: 218 },
  { id: "d3", jina: "Salim Baraka", ujuzi: "Simu na Kompyuta", eneo: "Zanzibar Mjini",           simu: "0774567892", uzoefu: "Miaka 7",  kuhusu: "Naboresha simu na laptop, nafunga kamera za usalama.", alama: 4.7, kazi: 165 },
  { id: "d4", jina: "Peter Michael",ujuzi: "Useremala",        eneo: "Arusha Mjini",             simu: "0755678903", uzoefu: "Miaka 6",  kuhusu: "Kazi za mbao, milango, kabati na samani za nyumbani.", alama: 4.6, kazi: 92 },
  { id: "d5", jina: "Fatuma Ally",  ujuzi: "Usafi wa Nyumbani",eneo: "Mbeya Mjini",              simu: "0766789014", uzoefu: "Miaka 10", kuhusu: "Usafi wa nyumbani na ofisi kwa ubora wa hali ya juu.", alama: 4.9, kazi: 410 },
  { id: "d6", jina: "Yusuf Hamisi", ujuzi: "Rangi na Upakaji", eneo: "Temeke, Dar es Salaam",    simu: "0717890125", uzoefu: "Miaka 5",  kuhusu: "Napaka rangi nyumba na ofisi, na kuweka plaster nzuri.", alama: 4.5, kazi: 76 },
  { id: "d7", jina: "Grace Mushi",  ujuzi: "AC na Friji",      eneo: "Moshi Mjini",              simu: "0788901236", uzoefu: "Miaka 8",  kuhusu: "Kuweka AC na friji, kusafisha service na matengenezo.", alama: 4.8, kazi: 301 },
  { id: "d8", jina: "Ally Mkwawa",  ujuzi: "Ujenzi",           eneo: "Dodoma Mjini",             simu: "0719012347", uzoefu: "Miaka 14", kuhusu: "Ujenzi wa msingi, ukuta na ufinyanzi wa jengo zima.", alama: 4.7, kazi: 188 }
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

function formatKazi(n) {
  const v = Number(n) || 0;
  if (v >= 1000) return (v / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(v);
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
      const rows = await sbRequest(
        "/mafundi?select=*&inapatikana=eq.true&order=kazi.desc"
      );
      MAFUNDI = Array.isArray(rows) ? rows : [];
      if (hali) hali.textContent = MAFUNDI.length ? "" : "Hakuna fundi aliyejisajili bado.";
    } catch (err) {
      console.error(err);
      MAFUNDI = DEMO_MAFUNDI;
      if (hali) hali.textContent = "Inaonyesha mafundi wa mfano — database haijawashwa bado.";
    }
  } else {
    MAFUNDI = DEMO_MAFUNDI;
    if (hali) hali.textContent = "Inaonyesha mafundi wa mfano — database haijawashwa bado.";
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
  const hid = hudumaIdFromText(f.ujuzi);
  const meta = [f.eneo, f.simu].filter(Boolean).map(escapeHtml).join(" \u00B7 ");

  const tags = [
    `<span class="tag">${escapeHtml(hudumaJina(hid))}</span>`,
    f.uzoefu ? `<span class="tag">${escapeHtml(String(f.uzoefu).match(/^\d/) ? "Miaka " + f.uzoefu : f.uzoefu)}</span>` : "",
    Number(f.kazi) > 0 ? `<span class="tag">Kazi ${escapeHtml(formatKazi(f.kazi))}</span>` : ""
  ].join("");

  const rating = Number(f.alama) > 0
    ? `<span class="price">\u2605 <strong>${escapeHtml(Number(f.alama).toFixed(1))}</strong></span>`
    : `<span class="price muted">Fundi mpya</span>`;

  const msg = encodeURIComponent(
    `Habari ${f.jina}! Nimekupata kupitia NIITE. Nahitaji fundi wa ${hudumaJina(hid)}.`
  );

  return `
    <article class="fundi-card">
      <div class="fundi-top">
        <div class="avatar">${escapeHtml(initials(f.jina))}</div>
        <div>
          <p class="fundi-name">${escapeHtml(f.jina)}</p>
          <p class="fundi-meta">${meta}</p>
        </div>
      </div>
      <div class="tags">${tags}</div>
      ${f.kuhusu ? `<p class="fundi-desc">${escapeHtml(f.kuhusu)}</p>` : ""}
      <div class="fundi-foot">
        ${rating}
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
  if (filterH) list = list.filter((f) => hudumaIdFromText(f.ujuzi) === filterH);
  if (q) {
    list = list.filter((f) =>
      [f.jina, f.eneo, f.ujuzi, f.kuhusu, hudumaJina(hudumaIdFromText(f.ujuzi))]
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
  const options = HUDUMA
    .map((h) => `<option value="${escapeHtml(h.id)}">${escapeHtml(h.jina)}</option>`)
    .join("");

  const selectOmb = $("#select-huduma");
  if (selectOmb) selectOmb.innerHTML = `<option value="">Chagua huduma\u2026</option>` + options;

  const selectFundi = $("#select-huduma-fundi");
  if (selectFundi) selectFundi.innerHTML = `<option value="">Chagua ujuzi\u2026</option>` + options;

  const filter = $("#filter-huduma");
  if (filter) filter.innerHTML = `<option value="">Huduma zote</option>` + options;

  const gridHtml = HUDUMA
    .map((h) => `
      <div class="service-item" data-huduma="${escapeHtml(h.id)}">
        <span>${h.icon}</span>${escapeHtml(h.jina)}
      </div>`)
    .join("");

  const grid = $("#orodha-huduma");
  if (grid) grid.innerHTML = gridHtml;

  const gridAll = $("#orodha-huduma-zote");
  if (gridAll) gridAll.innerHTML = gridHtml;
}

function showHudumaList(hudumaId) {
  activeHuduma = hudumaId;
  const filter = $("#filter-huduma");
  if (filter) filter.value = hudumaId;
  const search = $("#tafuta");
  if (search) search.value = "";
  renderMafundi();
  goTo("mafundi");
}

/* ---------- Form submissions ---------- */

async function submitOmb(fd) {
  const ombi = {
    mteja_jina: (fd.get("jina") || "").trim(),
    mteja_simu: (fd.get("simu") || "").trim(),
    huduma: fd.get("huduma") || "",
    eneo: (fd.get("eneo") || "").trim(),
    maelezo: (fd.get("maelezo") || "").trim(),
    hali: "Mpya"
  };

  if (!ombi.mteja_jina || !ombi.mteja_simu || !ombi.huduma || !ombi.eneo || !ombi.maelezo) {
    throw new Error("Tafadhali jaza sehemu zote muhimu.");
  }

  const haraka = fd.get("haraka") === "on";

  // Pick the best fundi for this service before writing the request,
  // so the request row can reference them.
  const matches = MAFUNDI
    .filter((f) => hudumaIdFromText(f.ujuzi) === ombi.huduma)
    .sort((a, b) => (Number(b.kazi) || 0) - (Number(a.kazi) || 0));
  const match = matches[0] || null;

  if (HAS_SUPABASE) {
    const payload = { ...ombi };
    if (match && typeof match.id === "number") payload.fundi_id = match.id;
    if (haraka) payload.maelezo = "[DHARURA] " + payload.maelezo;
    await sbRequest("/maombi", { method: "POST", body: payload, prefer: "return=minimal" });
  } else {
    console.info("Supabase haipo \u2014 ombi la mfano:", ombi);
  }

  if (match) {
    const text = encodeURIComponent(
      `Habari ${match.jina}, naitwa ${ombi.mteja_jina} kutoka ${ombi.eneo}. ` +
      `Nahitaji fundi wa ${hudumaJina(ombi.huduma)}. Tatizo: ${ombi.maelezo}` +
      (haraka ? " (DHARURA)" : "") +
      ` \u2014 namba yangu ni ${ombi.mteja_simu}. Nimekupata kupitia NIITE.`
    );
    window.open(`https://wa.me/${waNumber(match.simu)}?text=${text}`, "_blank", "noopener");
  }

  return match;
}

async function submitFundi(fd) {
  const fundi = {
    jina: (fd.get("jina") || "").trim(),
    simu: (fd.get("simu") || "").trim(),
    ujuzi: fd.get("huduma") || "",
    eneo: (fd.get("eneo") || "").trim(),
    uzoefu: (fd.get("uzoefu") || "").trim() ? "Miaka " + fd.get("uzoefu") : "",
    kuhusu: (fd.get("maelezo") || "").trim(),
    kiwango: "Kawaida",
    inapatikana: true,
    alama: 0,
    kazi: 0
  };

  if (!fundi.jina || !fundi.simu || !fundi.ujuzi || !fundi.eneo) {
    throw new Error("Tafadhali jaza jina, simu, ujuzi na eneo.");
  }

  if (HAS_SUPABASE) {
    await sbRequest("/mafundi", { method: "POST", body: fundi, prefer: "return=minimal" });
  } else {
    console.info("Supabase haipo \u2014 fundi wa mfano:", fundi);
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
      out.textContent = "Inatuma\u2026";
      try {
        const match = await submitOmb(new FormData(formOmb));
        out.className = "feedback ok";
        out.textContent = match
          ? `Asante! Ombi limetumwa. Tunakufungulia WhatsApp ya ${match.jina}\u2026`
          : "Asante! Ombi lako limepokelewa. Fundi atakupigia hivi punde.";
        showToast(match ? "Ombi limetumwa \u2014 WhatsApp inafunguka" : "Ombi limepokelewa");
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
      out.textContent = "Inatuma\u2026";
      try {
        const f = await submitFundi(new FormData(formFundi));
        out.className = "feedback ok";
        out.textContent = `Karibu NIITE, ${f.jina}! Wasifu wako umeingizwa.`;
        showToast("Umejiunga kama fundi \uD83C\uDF89");
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
