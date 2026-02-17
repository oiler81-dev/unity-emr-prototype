/* =========================================================
   UnityEMR Prototype - Frontend only
   NOTE: This version focuses on fixing the Today/Schedule screen.
   Providers updated: Dr. Kevin Pelton, Felipe Nunez, PA-C
   ========================================================= */

const state = {
  session: null,
  route: "login",
  chartSection: "summary",
  selectedPatientId: null,
  selectedVisitId: null,
  scheduleView: "list",
  filters: { status: "all", provider: "all" },
  density: "comfort",
  encounter: {
    locked: false,
    signedBy: null,
    version: 1,
    template: "knee_initial",
    fields: { hpi:"", exam:"", assessment:"", plan:"", dx:"" }
  }
};

/* ---------- Mock Data ---------- */
const providers = [
  { id: "p1", name: "Dr. Kevin Pelton", specialty: "General Ortho" },
  { id: "p2", name: "Felipe Nunez, PA-C", specialty: "Orthopedics" }
];

const patients = [
  { id:"pt1", mrn:"U-10021", name:"Maria Gonzal", dob:"1972-03-18", sex:"F", phone:"(323) 555-0122", allergies:["Penicillin"], meds:["Naproxen PRN"], problems:["Knee osteoarthritis", "Meniscus tear (suspected)"] },
  { id:"pt2", mrn:"U-10058", name:"James Carter", dob:"1986-11-02", sex:"M", phone:"(310) 555-0188", allergies:["None"], meds:["Ibuprofen PRN"], problems:["Shoulder impingement", "Rotator cuff tendinopathy"] },
  { id:"pt3", mrn:"U-10102", name:"Linh Tran", dob:"1991-07-09", sex:"F", phone:"(818) 555-0105", allergies:["Sulfa"], meds:["Acetaminophen PRN"], problems:["Low back pain", "Lumbar radiculopathy"] },
  { id:"pt4", mrn:"U-10133", name:"Robert Diaz", dob:"1964-01-27", sex:"M", phone:"(213) 555-0199", allergies:["Latex"], meds:["Meloxicam"], problems:["Cervical radiculopathy", "Cervical stenosis"] }
];

const visits = [
  { id:"v1", time:"08:10", patientId:"pt1", providerId:"p1", status:"checkedin", reason:"Knee pain follow-up", visitNo:"V-24011" },
  { id:"v2", time:"08:40", patientId:"pt2", providerId:"p1", status:"arrived", reason:"Shoulder pain initial", visitNo:"V-24012" },
  { id:"v3", time:"09:20", patientId:"pt3", providerId:"p2", status:"roomed", reason:"Back pain initial", visitNo:"V-24013" },
  { id:"v4", time:"10:10", patientId:"pt4", providerId:"p2", status:"complete", reason:"Neck pain follow-up", visitNo:"V-24014" },
  { id:"v5", time:"10:40", patientId:"pt1", providerId:"p2", status:"noshow", reason:"MRI review", visitNo:"V-24015" }
];

/* ---------- DOM ---------- */
const $ = (id) => document.getElementById(id);

const routeEls = {
  login: $("routeLogin"),
  schedule: $("routeSchedule"),
  chart: $("routeChart"),
  encounter: $("routeEncounter"),
  admin: $("routeAdmin")
};

const navButtons = Array.from(document.querySelectorAll(".nav-item"));
const subnavButtons = Array.from(document.querySelectorAll(".subnav-item"));

/* ---------- Utilities ---------- */
function toast(title, sub = "") {
  const host = $("toasts");
  const el = document.createElement("div");
  el.className = "toast";
  el.innerHTML = `<div class="toast-title">${escapeHtml(title)}</div>${sub ? `<div class="toast-sub">${escapeHtml(sub)}</div>` : ""}`;
  host.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, s => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  }[s]));
}

function initials(name){
  const parts = String(name).trim().split(/\s+/);
  const a = parts[0]?.[0] || "";
  const b = parts[parts.length-1]?.[0] || "";
  return (a + b).toUpperCase();
}

function getPatient(id){ return patients.find(p => p.id === id) || null; }
function getProvider(id){ return providers.find(p => p.id === id) || null; }
function getVisit(id){ return visits.find(v => v.id === id) || null; }

function calcAge(dobStr){
  const dob = new Date(dobStr);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

function badgeClass(status){
  return {
    checkedin: "b-checkedin",
    arrived: "b-arrived",
    roomed: "b-roomed",
    complete: "b-complete",
    noshow: "b-noshow"
  }[status] || "";
}

function statusLabel(status){
  return {
    checkedin: "Checked In",
    arrived: "Arrived",
    roomed: "Roomed",
    complete: "Complete",
    noshow: "No Show"
  }[status] || status;
}

/* ---------- Routing ---------- */
function setRoute(route){
  state.route = route;

  navButtons.forEach(btn => btn.classList.toggle("is-active", btn.dataset.route === route));
  Object.entries(routeEls).forEach(([k, el]) => el.classList.toggle("is-active", k === route));

  const chartNav = $("chartNav");
  const showChartNav = (route === "chart" || route === "encounter");
  chartNav.style.display = showChartNav ? "flex" : "none";

  const titleMap = { schedule:"Today", chart:"Chart", encounter:"Encounter", admin:"Imports", login:"" };
  $("contextTitle").textContent = titleMap[route] || "UnityEMR";
  $("contextSub").textContent = route === "schedule"
    ? "Schedule • Unity MSK"
    : route === "chart"
      ? "Problem-oriented charting"
      : route === "encounter"
        ? "Clinical documentation"
        : route === "admin"
          ? "Admin tools"
          : "Mock SSO";

  enforcePermissions();

  if (route === "schedule") renderSchedule();
}

function enforcePermissions(){
  const role = state.session?.role;

  const adminBtn = $("navAdmin");
  const adminTag = $("adminTag");
  const canAdmin = role === "admin";
  adminBtn.disabled = !canAdmin;
  adminTag.style.display = canAdmin ? "inline-block" : "none";
  adminBtn.style.opacity = canAdmin ? "1" : ".5";

  if (state.route === "admin" && role !== "admin"){
    toast("Access denied", "Admin role required");
    setRoute("schedule");
  }
}

/* ---------- Login ---------- */
function login(){
  const role = $("loginRole").value;
  const name = $("loginName").value.trim() || "User";
  state.session = { role, name };

  $("userName").textContent = name;
  $("userRole").textContent = role.toUpperCase();
  $("userAvatar").textContent = initials(name);

  toast("Signed in", `${role.toUpperCase()} session`);
  setRoute("schedule");
}

/* ---------- Schedule (FIXED) ---------- */
function populateProviderFilter(){
  const sel = $("providerFilter");
  sel.innerHTML = `<option value="all">All</option>` + providers.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join("");
}

function filteredVisits(){
  return visits.filter(v => {
    if (state.filters.status !== "all" && v.status !== state.filters.status) return false;
    if (state.filters.provider !== "all" && v.providerId !== state.filters.provider) return false;
    return true;
  }).sort((a,b) => a.time.localeCompare(b.time));
}

function renderSchedule(){
  populateProviderFilter();
  $("statusFilter").value = state.filters.status;
  $("providerFilter").value = state.filters.provider;

  document.querySelectorAll(".seg-item").forEach(btn => {
    btn.classList.toggle("is-active", btn.dataset.view === state.scheduleView);
  });

  const host = $("scheduleList");
  const list = filteredVisits();

  // header
  const title = state.scheduleView === "provider" ? "By Provider" : "All Providers";
  $("scheduleGroupTitle").textContent = title;
  $("scheduleGroupSub").textContent = `${list.length} visits`;

  // IMPORTANT: full-width rows always. No nested narrow columns.
  if (state.scheduleView === "provider"){
    const byProv = new Map();
    list.forEach(v => {
      const key = v.providerId;
      if (!byProv.has(key)) byProv.set(key, []);
      byProv.get(key).push(v);
    });

    host.innerHTML = Array.from(byProv.entries()).map(([provId, items]) => {
      const prov = getProvider(provId);
      const subHead = `
        <div class="schedule-group-head" style="border-top:1px solid var(--border);">
          <div class="group-title">${escapeHtml(prov?.name || "Provider")}</div>
          <div class="group-sub">${items.length} visits</div>
        </div>
      `;
      const rows = items.map(v => renderVisitRow(v)).join("");
      return `${subHead}${rows}`;
    }).join("");
  } else {
    host.innerHTML = list.map(v => renderVisitRow(v)).join("");
  }
}

function renderVisitRow(v){
  const p = getPatient(v.patientId);
  const age = p ? calcAge(p.dob) : "—";
  const sub = p ? `${p.sex} • ${age} • ${p.mrn}` : "—";

  return `
    <div class="visit-row" data-visit-id="${v.id}">
      <div class="visit-time">${escapeHtml(v.time)}</div>

      <div class="visit-patient">
        <div class="px-avatar">${escapeHtml(initials(p?.name || "—"))}</div>
        <div class="px-text">
          <div class="px-name">${escapeHtml(p?.name || "Unknown")}</div>
          <div class="px-sub">${escapeHtml(sub)}</div>
        </div>
      </div>

      <div class="visit-reason">${escapeHtml(v.reason)}</div>

      <span class="badge ${badgeClass(v.status)}">${escapeHtml(statusLabel(v.status))}</span>

      <div class="visit-actions">
        <button class="btn-mini" data-action="openChart">Chart</button>
        <button class="btn-mini" data-action="openEncounter">Note</button>
      </div>
    </div>
  `;
}

/* ---------- Events ---------- */
function bindEvents(){
  $("loginBtn").addEventListener("click", login);

  $("logoutBtn").addEventListener("click", () => {
    state.session = null;
    state.selectedPatientId = null;
    state.selectedVisitId = null;
    toast("Signed out");
    setRoute("login");
  });

  $("themeToggle").addEventListener("click", toggleTheme);

  navButtons.forEach(btn => btn.addEventListener("click", () => {
    const route = btn.dataset.route;
    if (route === "admin" && state.session?.role !== "admin") {
      toast("Access denied", "Admin role required");
      return;
    }
    setRoute(route);
  }));

  document.querySelectorAll(".seg-item").forEach(btn => {
    btn.addEventListener("click", () => {
      state.scheduleView = btn.dataset.view;
      renderSchedule();
    });
  });

  $("statusFilter").addEventListener("change", (e) => {
    state.filters.status = e.target.value;
    renderSchedule();
  });
  $("providerFilter").addEventListener("change", (e) => {
    state.filters.provider = e.target.value;
    renderSchedule();
  });

  $("scheduleList").addEventListener("click", (e) => {
    const row = e.target.closest(".visit-row");
    if (!row) return;

    const actionBtn = e.target.closest("button[data-action]");
    if (!actionBtn) return;

    const visitId = row.dataset.visitId;
    const v = getVisit(visitId);
    if (!v) return;

    // Prototype navigation
    if (actionBtn.dataset.action === "openChart"){
      toast("Prototype", `Open Chart for ${getPatient(v.patientId)?.name || "patient"}`);
    }
    if (actionBtn.dataset.action === "openEncounter"){
      toast("Prototype", `Open Note for ${getPatient(v.patientId)?.name || "patient"}`);
    }
  });

  $("densityToggle").addEventListener("click", () => {
    state.density = (state.density === "comfort") ? "compact" : "comfort";
    document.body.classList.toggle("density-compact", state.density === "compact");
    $("densityLabel").textContent = state.density === "compact" ? "Compact" : "Comfort";
  });

  $("mockSyncBtn").addEventListener("click", () => {
    $("syncText").textContent = "Syncing…";
    $("syncDot").style.background = "var(--primary)";
    setTimeout(() => {
      $("syncText").textContent = "Idle";
      $("syncDot").style.background = "var(--muted)";
      toast("CSV Sync complete", "Mock indicator only");
    }, 900);
  });

  // Keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    const isMac = navigator.platform.toLowerCase().includes("mac");
    const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

    if (ctrlOrCmd && e.key.toLowerCase() === "k"){
      e.preventDefault();
      toast("Prototype", "Search modal exists in full build; not wired here.");
      return;
    }

    if (e.altKey && e.key.toLowerCase() === "t"){
      toggleTheme();
      return;
    }
  });
}

function toggleTheme(){
  const body = document.body;
  const dark = body.classList.toggle("theme-dark");
  body.classList.toggle("theme-light", !dark);
}

/* ---------- Init ---------- */
function init(){
  setRoute("login");
  bindEvents();
}

init();
