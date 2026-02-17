// UnityEMR Prototype (static)
// Goal: Make the Today screen NOT broken and not squished.
// Providers: Dr. Kevin Pelton, Felipe Nunez, PA-C

const state = {
  session: null,
  route: "today",
  view: "list",
  filters: { status: "all", provider: "all" },
  density: "comfort"
};

const providers = [
  { id: "p1", name: "Dr. Kevin Pelton" },
  { id: "p2", name: "Felipe Nunez, PA-C" }
];

const patients = [
  { id:"pt1", mrn:"U-10021", name:"Maria Gonzal", dob:"1972-03-18", sex:"F" },
  { id:"pt2", mrn:"U-10058", name:"James Carter", dob:"1986-11-02", sex:"M" },
  { id:"pt3", mrn:"U-10102", name:"Linh Tran", dob:"1991-07-09", sex:"F" },
  { id:"pt4", mrn:"U-10133", name:"Robert Diaz", dob:"1964-01-27", sex:"M" }
];

const visits = [
  { id:"v1", time:"08:10", patientId:"pt1", providerId:"p1", status:"checkedin", reason:"Knee pain follow-up", visitNo:"V-24011" },
  { id:"v2", time:"08:40", patientId:"pt2", providerId:"p1", status:"arrived", reason:"Shoulder pain initial", visitNo:"V-24012" },
  { id:"v3", time:"09:20", patientId:"pt3", providerId:"p2", status:"roomed", reason:"Back pain initial", visitNo:"V-24013" },
  { id:"v4", time:"10:10", patientId:"pt4", providerId:"p2", status:"complete", reason:"Neck pain follow-up", visitNo:"V-24014" },
  { id:"v5", time:"10:40", patientId:"pt1", providerId:"p2", status:"noshow", reason:"MRI review", visitNo:"V-24015" }
];

const $ = (id) => document.getElementById(id);

function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, s => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[s]));
}

function initials(name){
  const parts = String(name).trim().split(/\s+/);
  const a = parts[0]?.[0] || "";
  const b = parts[parts.length - 1]?.[0] || "";
  return (a + b).toUpperCase();
}

function calcAge(dobStr){
  const dob = new Date(dobStr);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age;
}

function badgeClass(status){
  return {
    checkedin:"b-checkedin",
    arrived:"b-arrived",
    roomed:"b-roomed",
    complete:"b-complete",
    noshow:"b-noshow"
  }[status] || "";
}

function statusLabel(status){
  return {
    checkedin:"Checked In",
    arrived:"Arrived",
    roomed:"Roomed",
    complete:"Complete",
    noshow:"No Show"
  }[status] || status;
}

function toast(title, sub=""){
  const host = $("toasts");
  const el = document.createElement("div");
  el.className = "toast";
  el.innerHTML = `<div class="toastTitle">${escapeHtml(title)}</div>${sub ? `<div class="toastSub">${escapeHtml(sub)}</div>` : ""}`;
  host.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

function setRoute(route){
  state.route = route;

  const map = {
    today: $("routeToday"),
    chart: $("routeChart"),
    encounter: $("routeEncounter"),
    imports: $("routeImports")
  };

  Object.values(map).forEach(el => el.classList.remove("isActive"));
  map[route].classList.add("isActive");

  // Nav active state
  const navButtons = [
    $("navToday"), $("navChart"), $("navEncounter"), $("navImports")
  ];
  navButtons.forEach(b => b.classList.remove("isActive"));
  const activeBtn = {
    today: $("navToday"),
    chart: $("navChart"),
    encounter: $("navEncounter"),
    imports: $("navImports")
  }[route];
  activeBtn?.classList.add("isActive");

  // Page title
  const title = { today:"Today", chart:"Chart", encounter:"Encounter", imports:"Imports" }[route] || "UnityEMR";
  const sub = {
    today:"Schedule • Unity MSK",
    chart:"Prototype placeholder",
    encounter:"Prototype placeholder",
    imports:"Admin tools"
  }[route] || "Internal Prototype";
  $("pageTitle").textContent = title;
  $("pageSubtitle").textContent = sub;

  // Admin gate
  const isAdmin = state.session?.role === "admin";
  $("adminTag").style.display = isAdmin ? "inline-block" : "none";
  $("navImports").disabled = !isAdmin;
  $("navImports").style.opacity = isAdmin ? "1" : ".5";

  if (route === "imports" && !isAdmin){
    toast("Access denied", "Admin role required");
    setRoute("today");
    return;
  }

  if (route === "today") renderSchedule();
}

function populateProviderFilter(){
  const sel = $("providerFilter");
  sel.innerHTML = `<option value="all">All</option>` + providers.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join("");
}

function filteredVisits(){
  return visits
    .filter(v => state.filters.status === "all" || v.status === state.filters.status)
    .filter(v => state.filters.provider === "all" || v.providerId === state.filters.provider)
    .sort((a,b) => a.time.localeCompare(b.time));
}

function renderVisitRow(v){
  const p = patients.find(x => x.id === v.patientId);
  const age = p ? calcAge(p.dob) : "—";
  const sub = p ? `${p.sex} • ${age} • ${p.mrn} • ${v.visitNo}` : "—";

  return `
    <div class="visitRow" data-visit-id="${v.id}">
      <div class="time">${escapeHtml(v.time)}</div>

      <div class="patient">
        <div class="pAvatar">${escapeHtml(initials(p?.name || "—"))}</div>
        <div class="pText">
          <div class="pName">${escapeHtml(p?.name || "Unknown")}</div>
          <div class="pSub">${escapeHtml(sub)}</div>
        </div>
      </div>

      <div class="reason">${escapeHtml(v.reason)}</div>

      <span class="badge ${badgeClass(v.status)}">${escapeHtml(statusLabel(v.status))}</span>

      <div class="actions">
        <button class="mini" data-action="chart">Chart</button>
        <button class="mini" data-action="note">Note</button>
      </div>
    </div>
  `;
}

function renderSchedule(){
  populateProviderFilter();
  $("statusFilter").value = state.filters.status;
  $("providerFilter").value = state.filters.provider;

  const list = filteredVisits();
  $("groupSub").textContent = `${list.length} visits`;
  $("groupTitle").textContent = state.view === "provider" ? "By Provider" : "All Providers";

  const host = $("scheduleList");

  if (state.view === "provider"){
    const by = new Map();
    list.forEach(v => {
      if (!by.has(v.providerId)) by.set(v.providerId, []);
      by.get(v.providerId).push(v);
    });

    host.innerHTML = Array.from(by.entries()).map(([providerId, items]) => {
      const prov = providers.find(p => p.id === providerId);
      const head = `
        <div class="groupHead" style="border-top:1px solid var(--border);">
          <div class="groupTitle">${escapeHtml(prov?.name || "Provider")}</div>
          <div class="groupSub">${items.length} visits</div>
        </div>
      `;
      const rows = items.map(renderVisitRow).join("");
      return head + rows;
    }).join("");
  } else {
    host.innerHTML = list.map(renderVisitRow).join("");
  }
}

function openLogin(){
  $("loginOverlay").classList.add("isOpen");
}
function closeLogin(){
  $("loginOverlay").classList.remove("isOpen");
}

function signIn(){
  const role = $("loginRole").value;
  const name = $("loginName").value.trim() || "User";
  state.session = { role, name };

  $("userAvatar").textContent = initials(name);
  $("userName").textContent = name;
  $("userRole").textContent = role.toUpperCase();

  toast("Signed in", `${role.toUpperCase()} session`);
  closeLogin();
  setRoute("today");
}

function signOut(){
  state.session = null;
  $("userAvatar").textContent = "NP";
  $("userName").textContent = "Not signed in";
  $("userRole").textContent = "—";
  toast("Signed out");
  openLogin();
  setRoute("today");
}

function toggleTheme(){
  const body = document.body;
  const dark = body.classList.toggle("theme-dark");
  body.classList.toggle("theme-light", !dark);
}

function toggleDensity(){
  state.density = (state.density === "comfort") ? "compact" : "comfort";
  document.body.classList.toggle("densityCompact", state.density === "compact");
  $("densityLabel").textContent = (state.density === "compact") ? "Compact" : "Comfort";
}

function openSearch(){
  $("searchModal").classList.add("isOpen");
  $("searchModal").setAttribute("aria-hidden", "false");
  $("searchInput").value = "";
  renderSearchResults("");
  setTimeout(() => $("searchInput").focus(), 0);
}

function closeSearch(){
  $("searchModal").classList.remove("isOpen");
  $("searchModal").setAttribute("aria-hidden", "true");
}

function renderSearchResults(query){
  const q = query.trim().toLowerCase();
  const results = patients.filter(p => {
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      p.mrn.toLowerCase().includes(q)
    );
  });

  const host = $("searchResults");
  if (!results.length){
    host.innerHTML = `<div class="resultRow"><div class="resultLeft"><div class="resultName">No matches</div><div class="resultSub">Try a different name/MRN</div></div></div>`;
    return;
  }

  host.innerHTML = results.map(p => {
    const age = calcAge(p.dob);
    return `
      <div class="resultRow" data-patient-id="${p.id}">
        <div class="resultLeft">
          <div class="resultName">${escapeHtml(p.name)}</div>
          <div class="resultSub">${escapeHtml(`${p.sex} • ${age} • ${p.mrn}`)}</div>
        </div>
        <div class="resultRight">${escapeHtml(p.mrn)}</div>
      </div>
    `;
  }).join("");
}

function bindEvents(){
  // Login
  $("loginBtn").addEventListener("click", signIn);

  // Nav
  $("navToday").addEventListener("click", () => setRoute("today"));
  $("navChart").addEventListener("click", () => setRoute("chart"));
  $("navEncounter").addEventListener("click", () => setRoute("encounter"));
  $("navImports").addEventListener("click", () => setRoute("imports"));

  // Top actions
  $("themeBtn").addEventListener("click", toggleTheme);
  $("signOutBtn").addEventListener("click", signOut);

  $("syncBtn").addEventListener("click", () => {
    $("syncText").textContent = "Syncing…";
    $("syncDot").style.background = "var(--primary)";
    setTimeout(() => {
      $("syncText").textContent = "Idle";
      $("syncDot").style.background = "var(--muted)";
      toast("CSV Sync complete", "Mock indicator only");
    }, 850);
  });

  // Schedule controls
  $("densityBtn").addEventListener("click", toggleDensity);

  $("viewListBtn").addEventListener("click", () => {
    state.view = "list";
    $("viewListBtn").classList.add("isActive");
    $("viewProviderBtn").classList.remove("isActive");
    renderSchedule();
  });
  $("viewProviderBtn").addEventListener("click", () => {
    state.view = "provider";
    $("viewProviderBtn").classList.add("isActive");
    $("viewListBtn").classList.remove("isActive");
    renderSchedule();
  });

  $("statusFilter").addEventListener("change", (e) => {
    state.filters.status = e.target.value;
    renderSchedule();
  });

  $("providerFilter").addEventListener("change", (e) => {
    state.filters.provider = e.target.value;
    renderSchedule();
  });

  // Row actions
  $("scheduleList").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const row = e.target.closest(".visitRow");
    if (!row) return;

    const visitId = row.dataset.visitId;
    const v = visits.find(x => x.id === visitId);
    const p = patients.find(x => x.id === v.patientId);

    if (btn.dataset.action === "chart"){
      toast("Prototype", `Open chart: ${p.name}`);
      setRoute("chart");
    } else {
      toast("Prototype", `Open note: ${p.name}`);
      setRoute("encounter");
    }
  });

  // Search
  $("openSearchBtn").addEventListener("click", openSearch);
  $("closeSearchBtn").addEventListener("click", closeSearch);
  $("searchModal").addEventListener("click", (e) => {
    if (e.target === $("searchModal")) closeSearch();
  });

  $("searchInput").addEventListener("input", (e) => {
    renderSearchResults(e.target.value);
  });

  $("searchResults").addEventListener("click", (e) => {
    const row = e.target.closest(".resultRow");
    if (!row || !row.dataset.patientId) return;
    const p = patients.find(x => x.id === row.dataset.patientId);
    toast("Selected patient", p.name);
    closeSearch();
  });

  // Keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    const isMac = navigator.platform.toLowerCase().includes("mac");
    const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

    // Ctrl/Cmd+K -> search
    if (ctrlOrCmd && e.key.toLowerCase() === "k"){
      e.preventDefault();
      openSearch();
      return;
    }

    // Escape closes search
    if (e.key === "Escape"){
      closeSearch();
    }

    // G then T/C/E (simple)
    if (e.key.toLowerCase() === "g"){
      state._g = true;
      setTimeout(() => state._g = false, 900);
      return;
    }
    if (state._g){
      const k = e.key.toLowerCase();
      if (k === "t") setRoute("today");
      if (k === "c") setRoute("chart");
      if (k === "e") setRoute("encounter");
      state._g = false;
    }
  });
}

function init(){
  // Initial state: force login overlay on
  openLogin();

  // Pre-populate provider filter and schedule
  populateProviderFilter();
  renderSchedule();

  bindEvents();
}

init();
