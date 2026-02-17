// UnityEMR Prototype — Split-pane Today layout fix
const $ = (sel) => document.querySelector(sel);

const state = {
  session: { signedIn: false, userName: "Not signed in", role: "—", initials: "NP" },
  ui: { theme: localStorage.getItem("uemr_theme") || "light", patientTab: "encounters" },
  selected: { visit: "V-104221", encounterStatus: "draft" },
  data: {
    schedule: [
      { visit: "V-104221", time: "8:00 AM", patientId: "P-88214", patient: "Jordan Reyes", dob: "1987-04-19", reason: "Knee pain", type: "New", status: "Arrived" },
      { visit: "V-104222", time: "8:30 AM", patientId: "P-77102", patient: "Maria Chen", dob: "1972-11-03", reason: "Shoulder pain", type: "FU", status: "Scheduled" },
      { visit: "V-104223", time: "9:00 AM", patientId: "P-54019", patient: "Anthony Smith", dob: "1994-02-11", reason: "Hip pain", type: "New", status: "Scheduled" },
      { visit: "V-104224", time: "9:30 AM", patientId: "P-66318", patient: "Elena Garcia", dob: "1961-08-25", reason: "Ankle pain", type: "FU", status: "Cancelled" },
    ],
    patients: {
      "P-88214": {
        name: "Jordan Reyes", dob: "1987-04-19", sex: "M", chart: "CH-104883",
        phone: "(323) 555-0199", email: "jordan.reyes@example.com",
        address: "123 Main St, Los Angeles, CA 90012",
        allergies: ["NKDA"], meds: ["Ibuprofen PRN"], problems: ["Right knee pain"],
        docs: [
          { type: "Imaging report", name: "XR Knee - 02/01/2026.pdf" },
          { type: "Outside records", name: "PT Notes - Jan 2026.pdf" },
        ],
        encounters: [
          { date: "02/16/2026", provider: "Dr. Pelton", status: "Draft", type: "Ortho - Knee" },
          { date: "01/18/2026", provider: "Dr. Pelton", status: "Signed", type: "Ortho - Knee" },
        ],
        intake: { painScore: 7, onset: "3 weeks", aggravating: "Stairs, squats", relieving: "Rest, NSAIDs", goal: "Return to basketball" }
      },
      "P-77102": {
        name: "Maria Chen", dob: "1972-11-03", sex: "F", chart: "CH-220114",
        phone: "(310) 555-0133", email: "maria.chen@example.com",
        address: "88 Wilshire Blvd, Los Angeles, CA 90017",
        allergies: ["Penicillin"], meds: ["Amlodipine"], problems: ["Left shoulder pain"],
        docs: [{ type: "Outside records", name: "MRI Shoulder - 01/28/2026.pdf" }],
        encounters: [{ date: "02/02/2026", provider: "Dr. Pelton", status: "Signed", type: "Ortho - Shoulder" }],
        intake: { painScore: 5, onset: "2 months", aggravating: "Overhead lifting", relieving: "Rest", goal: "Sleep through night" }
      },
      "P-54019": {
        name: "Anthony Smith", dob: "1994-02-11", sex: "M", chart: "CH-991702",
        phone: "(213) 555-0177", email: "anthony.smith@example.com",
        address: "420 Sunset Ave, Los Angeles, CA 90026",
        allergies: ["NKDA"], meds: ["Naproxen PRN"], problems: ["Right hip pain"],
        docs: [], encounters: [], intake: { painScore: 6, onset: "6 weeks", aggravating: "Running", relieving: "Rest", goal: "Back to jogging" }
      },
      "P-66318": {
        name: "Elena Garcia", dob: "1961-08-25", sex: "F", chart: "CH-118230",
        phone: "(562) 555-0122", email: "elena.garcia@example.com",
        address: "9 Pine St, Los Angeles, CA 90033",
        allergies: ["Sulfa"], meds: ["Metformin"], problems: ["Ankle pain"],
        docs: [{ type: "Imaging report", name: "XR Ankle - 02/10/2026.pdf" }],
        encounters: [{ date: "02/10/2026", provider: "Dr. Pelton", status: "Signed", type: "Ortho - Ankle" }],
        intake: { painScore: 4, onset: "1 month", aggravating: "Walking", relieving: "Brace", goal: "Walk comfortably" }
      },
    },
    note: {
      template: "Knee Pain • Initial",
      hpi: "Patient reports right knee pain for 3 weeks after increased activity. Worse with stairs and squats. Improves with rest and NSAIDs.",
      exam: "Gait antalgic. ROM 0-120. Mild effusion. Medial joint line tenderness. Lachman negative. McMurray mildly positive.",
      assessment: "Right knee pain; suspected meniscal pathology.",
      plan: "Order MRI right knee. Start PT focusing on quad/hip strengthening. NSAIDs as tolerated. Follow-up after imaging.",
      dx: ["M25.561 - Pain in right knee"],
    }
  }
};

function applyTheme(theme){
  state.ui.theme = theme;
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("uemr_theme", theme);
}

function toast(title, body){
  const host = $("#toastHost");
  const el = document.createElement("div");
  el.className = "toast";
  el.innerHTML = `<p class="toastTitle">${title}</p><p class="toastBody">${body}</p>`;
  host.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

function setSession(signedIn, userName, role, initials){
  state.session = { signedIn, userName, role, initials };
  $("#userName").textContent = userName;
  $("#userRole").textContent = role;
  $("#avatar").textContent = initials;
}

function setCrumbs(text){ $("#crumbs").textContent = text; }

function setActiveNav(route){
  document.querySelectorAll(".navItem").forEach(a => a.classList.toggle("active", a.dataset.route === route));
}

function badge(status){
  const s = status.toLowerCase();
  if (s.includes("arrived") || s.includes("signed")) return `<span class="badge good">${status}</span>`;
  if (s.includes("cancel")) return `<span class="badge bad">${status}</span>`;
  if (s.includes("draft")) return `<span class="badge warn">${status}</span>`;
  return `<span class="badge">${status}</span>`;
}

function requireSignIn(){
  if (!state.session.signedIn){
    location.hash = "#/login";
    toast("Sign-in required", "Use the mock login to access the prototype.");
    return false;
  }
  return true;
}

function patientPhotoDataUrl(name){
  const initials = name.split(" ").slice(0,2).map(n => n[0]).join("").toUpperCase();
  let h = 0;
  for (const c of name) h = (h + c.charCodeAt(0) * 7) % 360;
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="hsl(${h} 70% 55%)"/>
        <stop offset="1" stop-color="hsl(${(h+40)%360} 70% 45%)"/>
      </linearGradient>
    </defs>
    <rect width="120" height="120" rx="28" fill="url(#g)"/>
    <circle cx="60" cy="52" r="22" fill="rgba(255,255,255,.22)"/>
    <rect x="28" y="74" width="64" height="28" rx="14" fill="rgba(255,255,255,.18)"/>
    <text x="60" y="68" text-anchor="middle" font-family="system-ui,Segoe UI,Roboto" font-size="30" font-weight="800" fill="rgba(255,255,255,.92)">${initials}</text>
  </svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg.trim());
}

function escapeHtml(str){
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function currentAppointment(){
  return state.data.schedule.find(x => x.visit === state.selected.visit) || state.data.schedule[0];
}
function currentPatient(){
  const appt = currentAppointment();
  return state.data.patients[appt.patientId];
}

/* ===================== VIEWS ===================== */

const views = {
  login(){
    setCrumbs("Login");
    setActiveNav("login");

    $("#view").innerHTML = `
      <div class="card" style="max-width:760px">
        <h2 class="cardTitle">Sign in</h2>
        <p class="cardSub">Mock SSO login for role-based flows. No PHI. Click-through prototype only.</p>

        <label class="label">User</label>
        <select class="select" id="selUser">
          <option value="provider">Dr. Pelton (Provider)</option>
          <option value="ma">Medical Assistant (MA)</option>
          <option value="admin">Nestor Perez (Admin)</option>
        </select>

        <div class="row" style="margin-top:12px">
          <button class="btn btnPrimary" id="btnLogin" type="button">Continue</button>
          <span class="badge">Theme toggle for comfort</span>
        </div>
      </div>
    `;

    $("#btnLogin").onclick = () => {
      const val = $("#selUser").value;
      if (val === "provider") setSession(true, "Dr. Pelton", "Provider", "DP");
      if (val === "ma") setSession(true, "MA • Clinic", "MA", "MA");
      if (val === "admin") setSession(true, "Nestor Perez", "Admin", "NP");
      toast("Signed in", `Logged in as ${state.session.userName} (${state.session.role})`);
      location.hash = "#/schedule";
    };
  },

  /* ✅ FIXED TODAY PAGE */
  schedule(){
    if (!requireSignIn()) return;
    setCrumbs("Today");
    setActiveNav("schedule");

    const appt = currentAppointment();
    const p = currentPatient();
    const pImg = patientPhotoDataUrl(p.name);

    const rows = state.data.schedule.map(a => {
      const px = state.data.patients[a.patientId];
      const img = patientPhotoDataUrl(px.name);
      const isActive = a.visit === state.selected.visit;
      return `
        <tr ${isActive ? 'style="background: var(--softAccent)"' : ""}>
          <td><span class="kbd">${a.time}</span></td>
          <td>
            <div class="patientCell">
              <img class="photo" src="${img}" alt="${px.name}"/>
              <div class="patientMeta">
                <strong>${px.name}</strong>
                <div class="small">${a.reason} • ${a.type}</div>
              </div>
            </div>
          </td>
          <td>${badge(a.status)}</td>
          <td><button class="btn btnGhost" data-open="${a.visit}" type="button">Open</button></td>
        </tr>
      `;
    }).join("");

    $("#view").innerHTML = `
      <div class="splitPane">
        <!-- LEFT: schedule list -->
        <div class="card">
          <div class="spread">
            <div>
              <h2 class="cardTitle">Today’s Schedule</h2>
              <p class="cardSub">Select a visit to view details.</p>
            </div>
            <span class="badge good">Synced</span>
          </div>

          <div class="row" style="margin-bottom:10px">
            <div style="flex:1; min-width:160px">
              <label class="label">Status</label>
              <select class="select" id="filterStatus">
                <option value="All">All</option>
                <option value="Arrived">Arrived</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <table class="table" aria-label="Schedule list">
            <thead><tr><th style="width:92px">Time</th><th>Patient</th><th style="width:120px">Status</th><th style="width:88px"></th></tr></thead>
            <tbody id="scheduleBody">${rows}</tbody>
          </table>
        </div>

        <!-- RIGHT: details panel (fills the empty space) -->
        <div class="card detailShell">
          <div class="spread">
            <div class="patientCell">
              <img class="photo" style="width:46px;height:46px" src="${pImg}" alt="${p.name}"/>
              <div>
                <h2 class="cardTitle" style="margin:0">${p.name}</h2>
                <div class="cardSub" style="margin:4px 0 0 0">
                  Visit <span class="kbd">${appt.visit}</span> • DOB ${p.dob} • Chart <span class="kbd">${p.chart}</span>
                </div>
              </div>
            </div>
            <div class="row">
              <button class="btn" id="btnGoChart" type="button">Open Chart</button>
              <button class="btn btnPrimary" id="btnGoEncounter" type="button">Start Encounter</button>
            </div>
          </div>

          <div class="hr"></div>

          <div class="row">
            <span class="badge">Reason: ${appt.reason}</span>
            <span class="badge">Type: ${appt.type}</span>
            ${badge(appt.status)}
          </div>

          <div class="hr"></div>

          <h3 class="cardTitle" style="font-size:16px">Contact</h3>
          <div class="row">
            <span class="badge">Phone: ${p.phone}</span>
            <span class="badge">Email: ${p.email}</span>
          </div>
          <div class="tiny muted" style="margin-top:8px">${p.address}</div>

          <div class="hr"></div>

          <h3 class="cardTitle" style="font-size:16px">Clinical Snapshot</h3>
          <div class="tiny"><strong>Allergies:</strong> <span class="muted">${(p.allergies||[]).join(", ") || "—"}</span></div>
          <div class="tiny"><strong>Meds:</strong> <span class="muted">${(p.meds||[]).join(", ") || "—"}</span></div>
          <div class="tiny"><strong>Problems:</strong> <span class="muted">${(p.problems||[]).join(", ") || "—"}</span></div>

          <div class="hr"></div>

          <div class="tiny muted">
            This right panel exists specifically to prevent the “shrunk schedule column + huge empty space” issue.
          </div>
        </div>
      </div>
    `;

    // open visit buttons
    document.querySelectorAll("[data-open]").forEach(btn => {
      btn.addEventListener("click", () => {
        state.selected.visit = btn.getAttribute("data-open");
        state.selected.encounterStatus = "draft";
        toast("Visit opened", `Selected ${state.selected.visit}.`);
        views.schedule(); // re-render details pane
      });
    });

    $("#btnGoChart").onclick = () => location.hash = "#/patient";
    $("#btnGoEncounter").onclick = () => location.hash = "#/encounter";

    // simple status filter (prototype)
    $("#filterStatus").onchange = () => {
      const wanted = $("#filterStatus").value;
      const filtered = state.data.schedule.filter(a => wanted === "All" ? true : a.status === wanted);

      const tbody = $("#scheduleBody");
      tbody.innerHTML = filtered.map(a => {
        const px = state.data.patients[a.patientId];
        const img = patientPhotoDataUrl(px.name);
        const isActive = a.visit === state.selected.visit;
        return `
          <tr ${isActive ? 'style="background: var(--softAccent)"' : ""}>
            <td><span class="kbd">${a.time}</span></td>
            <td>
              <div class="patientCell">
                <img class="photo" src="${img}" alt="${px.name}"/>
                <div class="patientMeta">
                  <strong>${px.name}</strong>
                  <div class="small">${a.reason} • ${a.type}</div>
                </div>
              </div>
            </td>
            <td>${badge(a.status)}</td>
            <td><button class="btn btnGhost" data-open="${a.visit}" type="button">Open</button></td>
          </tr>
        `;
      }).join("");

      // rebind buttons
      document.querySelectorAll("[data-open]").forEach(btn => {
        btn.addEventListener("click", () => {
          state.selected.visit = btn.getAttribute("data-open");
          state.selected.encounterStatus = "draft";
          toast("Visit opened", `Selected ${state.selected.visit}.`);
          views.schedule();
        });
      });
    };
  },

  patient(){
    if (!requireSignIn()) return;
    setCrumbs("Patient Chart");
    setActiveNav("patient");

    const appt = currentAppointment();
    const p = currentPatient();
    const img = patientPhotoDataUrl(p.name);

    const docs = (p.docs || []).map(d =>
      `<tr><td>${d.type}</td><td>${d.name}</td><td><button class="btn btnGhost" type="button">View</button></td></tr>`
    ).join("") || `<tr><td colspan="3" class="muted">No documents</td></tr>`;

    const encs = (p.encounters || []).map(e =>
      `<tr><td>${e.date}</td><td>${e.provider}</td><td>${e.type}</td><td>${badge(e.status)}</td><td><button class="btn btnGhost" type="button">Open</button></td></tr>`
    ).join("") || `<tr><td colspan="5" class="muted">No encounters yet</td></tr>`;

    $("#view").innerHTML = `
      <div class="card">
        <div class="spread">
          <div class="patientCell">
            <img class="photo" style="width:46px;height:46px" src="${img}" alt="${p.name}"/>
            <div>
              <h2 class="cardTitle" style="margin:0">${p.name}</h2>
              <div class="cardSub" style="margin:4px 0 0 0">
                Visit <span class="kbd">${appt.visit}</span> • DOB ${p.dob} • Sex ${p.sex} • Chart <span class="kbd">${p.chart}</span>
              </div>
            </div>
          </div>
          <div class="row">
            <button class="btn btnPrimary" id="btnStartEncounter" type="button">Start / Continue Encounter</button>
          </div>
        </div>

        <div class="hr"></div>

        <h3 class="cardTitle" style="font-size:16px">Encounters</h3>
        <table class="table">
          <thead><tr><th>Date</th><th>Provider</th><th>Type</th><th>Status</th><th></th></tr></thead>
          <tbody>${encs}</tbody>
        </table>

        <div class="hr"></div>

        <h3 class="cardTitle" style="font-size:16px">Documents</h3>
        <table class="table">
          <thead><tr><th>Type</th><th>Name</th><th></th></tr></thead>
          <tbody>${docs}</tbody>
        </table>
      </div>
    `;

    $("#btnStartEncounter").onclick = () => location.hash = "#/encounter";
  },

  encounter(){
    if (!requireSignIn()) return;
    setCrumbs("Encounter");
    setActiveNav("encounter");

    const locked = state.selected.encounterStatus === "signed";
    const n = state.data.note;
    const appt = currentAppointment();
    const p = currentPatient();
    const img = patientPhotoDataUrl(p.name);

    $("#view").innerHTML = `
      <div class="card">
        <div class="spread">
          <div class="patientCell">
            <img class="photo" style="width:42px;height:42px" src="${img}" alt="${p.name}"/>
            <div>
              <h2 class="cardTitle" style="margin:0">Encounter • ${n.template}</h2>
              <div class="cardSub" style="margin:4px 0 0 0">
                ${p.name} • Visit <span class="kbd">${appt.visit}</span> • ${badge(locked ? "Signed" : "Draft")}
              </div>
            </div>
          </div>

          <div class="row">
            <button class="btn btnGhost" id="btnPreview" type="button">Preview</button>
            <button class="btn btnPrimary" id="btnSign" type="button">${locked ? "Signed" : "Sign note"}</button>
          </div>
        </div>

        <div class="hr"></div>

        <div class="row" style="align-items:flex-start">
          <div style="flex:1; min-width:280px">
            <label class="label">HPI</label>
            <textarea class="textarea" id="hpi" ${locked ? "disabled" : ""}>${escapeHtml(n.hpi)}</textarea>

            <label class="label" style="margin-top:12px">Exam</label>
            <textarea class="textarea" id="exam" ${locked ? "disabled" : ""}>${escapeHtml(n.exam)}</textarea>

            <label class="label" style="margin-top:12px">Assessment</label>
            <textarea class="textarea" id="assessment" ${locked ? "disabled" : ""}>${escapeHtml(n.assessment)}</textarea>

            <label class="label" style="margin-top:12px">Plan</label>
            <textarea class="textarea" id="plan" ${locked ? "disabled" : ""}>${escapeHtml(n.plan)}</textarea>
          </div>

          <div style="width:340px; min-width:300px">
            <label class="label">Primary Dx</label>
            <input class="input" id="dx" ${locked ? "disabled" : ""} value="${n.dx[0]}" />

            <div class="hr"></div>

            <div class="row">
              <button class="btn" id="btnSave" type="button" ${locked ? "disabled" : ""}>Save draft</button>
              <button class="btn btnDanger" id="btnNewVersion" type="button" ${locked ? "" : "disabled"}>New version</button>
            </div>

            <div class="hr"></div>

            <button class="btn btnPrimary" id="btnExport" type="button">Export signed PDF</button>

            <div class="hr"></div>
            <div class="tiny muted">Signed notes are immutable. Post-sign edits require a new version.</div>
          </div>
        </div>
      </div>
    `;

    const save = () => {
      if (locked) return;
      state.data.note.hpi = $("#hpi").value;
      state.data.note.exam = $("#exam").value;
      state.data.note.assessment = $("#assessment").value;
      state.data.note.plan = $("#plan").value;
      state.data.note.dx = [$("#dx").value];
      toast("Saved", "Draft updated (prototype memory only).");
    };

    $("#btnSave").onclick = save;

    $("#btnPreview").onclick = () => {
      toast("Preview", "Mock preview shown as a dialog.");
      window.alert(
        `NOTE PREVIEW (MOCK)\n\n${n.template}\nPatient: ${p.name}\nVisit: ${appt.visit}\n\nHPI:\n${state.data.note.hpi}\n\nEXAM:\n${state.data.note.exam}\n\nASSESSMENT:\n${state.data.note.assessment}\n\nPLAN:\n${state.data.note.plan}\n\nDX:\n${state.data.note.dx.join(", ")}`
      );
    };

    $("#btnSign").onclick = () => {
      if (locked) return;
      save();
      if (state.session.role !== "Provider"){
        toast("Permission denied", "Only Provider can sign notes.");
        return;
      }
      state.selected.encounterStatus = "signed";
      toast("Signed", "Encounter locked.");
      views.encounter();
    };

    $("#btnNewVersion").onclick = () => {
      state.selected.encounterStatus = "draft";
      toast("New version", "Unlocked as a new draft version (mock).");
      views.encounter();
    };

    $("#btnExport").onclick = () => {
      if (state.selected.encounterStatus !== "signed"){
        toast("Sign required", "Sign the note before exporting.");
        return;
      }
      toast("Export complete", "Mock exported to AdvancedMD workflow.");
    };
  },

  adminImport(){
    if (!requireSignIn()) return;
    setCrumbs("Admin • Imports");
    setActiveNav("admin-import");
    $("#view").innerHTML = `
      <div class="card">
        <h2 class="cardTitle">CSV Imports (Mock)</h2>
        <p class="cardSub">Simulated import only in this prototype.</p>
        <div class="row">
          <button class="btn btnPrimary" id="btnRunImport" type="button">Run import</button>
          <span class="badge">Admin only</span>
        </div>
      </div>
    `;
    $("#btnRunImport").onclick = () => {
      if (state.session.role !== "Admin"){
        toast("Permission denied", "Only Admin can run imports.");
        return;
      }
      toast("Import complete", "Patients + visits simulated.");
    };
  }
};

/* ===================== ROUTER + UI ===================== */

function route(){
  const hash = location.hash || "#/login";
  const base = hash.replace("#/","").split("?")[0];

  if (base.startsWith("admin-import")) return views.adminImport();

  switch(base){
    case "login": return views.login();
    case "schedule": return views.schedule();
    case "patient": return views.patient();
    case "encounter": return views.encounter();
    default:
      location.hash = "#/login";
      return;
  }
}

// Sidebar toggle (mobile)
$("#btnSidebar").addEventListener("click", () => $("#sidebar").classList.toggle("closed"));

// Theme
applyTheme(state.ui.theme);
$("#btnTheme").addEventListener("click", () => {
  const next = (state.ui.theme === "light") ? "dark" : "light";
  applyTheme(next);
  toast("Theme updated", `Now using ${next} theme.`);
});

// Sign out
$("#btnSignOut").addEventListener("click", () => {
  setSession(false, "Not signed in", "—", "NP");
  state.selected.encounterStatus = "draft";
  toast("Signed out", "Session cleared (prototype).");
  location.hash = "#/login";
});

// Keyboard nav: G then T/P/E
let chord = null;
window.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();
  if (key === "g") { chord = "g"; return; }
  if (!chord) return;
  if (chord === "g"){
    if (key === "t") location.hash = "#/schedule";
    if (key === "p") location.hash = "#/patient";
    if (key === "e") location.hash = "#/encounter";
  }
  chord = null;
});

// Init
window.addEventListener("hashchange", route);
setSession(false, "Not signed in", "—", "NP");
route();
