/* app.js — UnityEMR Prototype (clean, responsive, no-framework)
   Assumes your existing index.html provides:
   #view, #crumbs, #btnSidebar, #sidebar, #backdrop, #btnTheme, #btnSignOut,
   #toastHost, #userName, #userRole, #avatar
*/

(() => {
  "use strict";

  /* ----------------------------- Utilities ----------------------------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const escapeHtml = (str) =>
    String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const nowId = () => Math.random().toString(16).slice(2) + Date.now().toString(16);

  /* ------------------------------ State -------------------------------- */
  const state = {
    session: {
      signedIn: false,
      userName: "Not signed in",
      role: "—",
      initials: "NP",
    },
    ui: {
      theme: localStorage.getItem("uemr_theme") || "light",
    },
    selected: {
      visitId: "V-104221",
      encounterStatus: "draft", // draft | signed
    },
    data: {
      schedule: [
        { id: "V-104221", time: "8:00 AM", patientId: "P-88214", reason: "Knee pain", type: "New", status: "Arrived" },
        { id: "V-104222", time: "8:30 AM", patientId: "P-77102", reason: "Shoulder pain", type: "FU", status: "Scheduled" },
        { id: "V-104223", time: "9:00 AM", patientId: "P-54019", reason: "Hip pain", type: "New", status: "Scheduled" },
        { id: "V-104224", time: "9:30 AM", patientId: "P-66318", reason: "Ankle pain", type: "FU", status: "Cancelled" },
      ],
      patients: {
        "P-88214": {
          name: "Jordan Reyes",
          dob: "1987-04-19",
          sex: "M",
          chart: "CH-104883",
          phone: "(323) 555-0199",
          email: "jordan.reyes@example.com",
          address: "123 Main St, Los Angeles, CA 90012",
          allergies: ["NKDA"],
          meds: ["Ibuprofen PRN"],
          problems: ["Right knee pain"],
          docs: [
            { type: "Imaging report", name: "XR Knee - 02/01/2026.pdf" },
            { type: "Outside records", name: "PT Notes - Jan 2026.pdf" },
          ],
          encounters: [
            { date: "02/16/2026", provider: "Dr. Pelton", status: "Draft", type: "Ortho - Knee" },
            { date: "01/18/2026", provider: "Dr. Pelton", status: "Signed", type: "Ortho - Knee" },
          ],
          intake: { painScore: 7, onset: "3 weeks", aggravating: "Stairs, squats", relieving: "Rest, NSAIDs", goal: "Return to basketball" },
        },
        "P-77102": {
          name: "Maria Chen",
          dob: "1972-11-03",
          sex: "F",
          chart: "CH-220114",
          phone: "(310) 555-0133",
          email: "maria.chen@example.com",
          address: "88 Wilshire Blvd, Los Angeles, CA 90017",
          allergies: ["Penicillin"],
          meds: ["Amlodipine"],
          problems: ["Left shoulder pain"],
          docs: [{ type: "Outside records", name: "MRI Shoulder - 01/28/2026.pdf" }],
          encounters: [{ date: "02/02/2026", provider: "Dr. Pelton", status: "Signed", type: "Ortho - Shoulder" }],
          intake: { painScore: 5, onset: "2 months", aggravating: "Overhead lifting", relieving: "Rest", goal: "Sleep through night" },
        },
        "P-54019": {
          name: "Anthony Smith",
          dob: "1994-02-11",
          sex: "M",
          chart: "CH-991702",
          phone: "(213) 555-0177",
          email: "anthony.smith@example.com",
          address: "420 Sunset Ave, Los Angeles, CA 90026",
          allergies: ["NKDA"],
          meds: ["Naproxen PRN"],
          problems: ["Right hip pain"],
          docs: [],
          encounters: [],
          intake: { painScore: 6, onset: "6 weeks", aggravating: "Running", relieving: "Rest", goal: "Back to jogging" },
        },
        "P-66318": {
          name: "Elena Garcia",
          dob: "1961-08-25",
          sex: "F",
          chart: "CH-118230",
          phone: "(562) 555-0122",
          email: "elena.garcia@example.com",
          address: "9 Pine St, Los Angeles, CA 90033",
          allergies: ["Sulfa"],
          meds: ["Metformin"],
          problems: ["Ankle pain"],
          docs: [{ type: "Imaging report", name: "XR Ankle - 02/10/2026.pdf" }],
          encounters: [{ date: "02/10/2026", provider: "Dr. Pelton", status: "Signed", type: "Ortho - Ankle" }],
          intake: { painScore: 4, onset: "1 month", aggravating: "Walking", relieving: "Brace", goal: "Walk comfortably" },
        },
      },
      note: {
        template: "Knee Pain • Initial",
        hpi: "Patient reports right knee pain for 3 weeks after increased activity. Worse with stairs and squats. Improves with rest and NSAIDs.",
        exam: "Gait antalgic. ROM 0-120. Mild effusion. Medial joint line tenderness. Lachman negative. McMurray mildly positive.",
        assessment: "Right knee pain; suspected meniscal pathology.",
        plan: "Order MRI right knee. Start PT focusing on quad/hip strengthening. NSAIDs as tolerated. Follow-up after imaging.",
        dx: ["M25.561 - Pain in right knee"],
      },
    },
  };

  /* ----------------------------- UI Glue ------------------------------ */
  const mqMobile = window.matchMedia("(max-width: 980px)");

  function applyTheme(theme) {
    state.ui.theme = theme;
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("uemr_theme", theme);
  }

  function toast(title, body) {
    const host = $("#toastHost");
    if (!host) return;

    const id = nowId();
    const el = document.createElement("div");
    el.className = "toast";
    el.dataset.toastId = id;
    el.innerHTML = `<p class="toastTitle">${escapeHtml(title)}</p><p class="toastBody">${escapeHtml(body)}</p>`;
    host.appendChild(el);

    window.setTimeout(() => {
      const node = host.querySelector(`[data-toast-id="${id}"]`);
      if (node) node.remove();
    }, 2800);
  }

  function setSession({ signedIn, userName, role, initials }) {
    state.session.signedIn = signedIn;
    state.session.userName = userName;
    state.session.role = role;
    state.session.initials = initials;

    const nameEl = $("#userName");
    const roleEl = $("#userRole");
    const avatarEl = $("#avatar");
    if (nameEl) nameEl.textContent = userName;
    if (roleEl) roleEl.textContent = role;
    if (avatarEl) avatarEl.textContent = initials;
  }

  function setCrumbs(text) {
    const c = $("#crumbs");
    if (c) c.textContent = text;
  }

  function setActiveNav(route) {
    $$(".navItem").forEach((a) => a.classList.toggle("active", a.dataset.route === route));
  }

  function openSidebar() {
    const s = $("#sidebar");
    const b = $("#backdrop");
    if (s) s.classList.add("open");
    if (b) b.classList.add("show");
  }

  function closeSidebar() {
    const s = $("#sidebar");
    const b = $("#backdrop");
    if (s) s.classList.remove("open");
    if (b) b.classList.remove("show");
  }

  function requireSignIn() {
    if (!state.session.signedIn) {
      location.hash = "#/login";
      toast("Sign-in required", "Use the mock login to access the prototype.");
      return false;
    }
    return true;
  }

  function statusBadge(status) {
    const s = status.toLowerCase();
    if (s.includes("arrived") || s.includes("signed")) return `<span class="badge good">${escapeHtml(status)}</span>`;
    if (s.includes("cancel")) return `<span class="badge bad">${escapeHtml(status)}</span>`;
    if (s.includes("draft")) return `<span class="badge warn">${escapeHtml(status)}</span>`;
    return `<span class="badge">${escapeHtml(status)}</span>`;
  }

  function patientPhotoDataUrl(name) {
    const initials = name
      .split(" ")
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase();

    let h = 0;
    for (const c of name) h = (h + c.charCodeAt(0) * 7) % 360;

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="hsl(${h} 70% 55%)"/>
            <stop offset="1" stop-color="hsl(${(h + 40) % 360} 70% 45%)"/>
          </linearGradient>
        </defs>
        <rect width="120" height="120" rx="28" fill="url(#g)"/>
        <text x="60" y="72" text-anchor="middle" font-family="system-ui,Segoe UI,Roboto" font-size="34" font-weight="900" fill="rgba(255,255,255,.95)">${initials}</text>
      </svg>
    `.trim();

    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }

  function getSelectedVisit() {
    return state.data.schedule.find((v) => v.id === state.selected.visitId) || state.data.schedule[0];
  }

  function getSelectedPatient() {
    const visit = getSelectedVisit();
    return state.data.patients[visit.patientId];
  }

  /* ------------------------------ Views -------------------------------- */
  const views = {
    login() {
      setCrumbs("Login");
      setActiveNav("login");

      $("#view").innerHTML = `
        <div class="card" style="max-width:760px">
          <div class="cardHeader">
            <div>
              <h1 class="h1">Sign in</h1>
              <div class="sub">Mock SSO. No PHI. Click-through prototype.</div>
            </div>
            <span class="badge">Prototype</span>
          </div>

          <div class="hr"></div>

          <label class="label" for="selUser">User</label>
          <select class="select" id="selUser">
            <option value="provider">Dr. Pelton (Provider)</option>
            <option value="ma">Medical Assistant (MA)</option>
            <option value="admin">Nestor Perez (Admin)</option>
          </select>

          <div class="row" style="margin-top:12px">
            <button class="btn btnPrimary" id="btnLogin" type="button">Continue</button>
            <span class="badge">Use Theme toggle</span>
          </div>
        </div>
      `;

      $("#btnLogin").addEventListener("click", () => {
        const val = $("#selUser").value;
        if (val === "provider") setSession({ signedIn: true, userName: "Dr. Pelton", role: "Provider", initials: "DP" });
        if (val === "ma") setSession({ signedIn: true, userName: "MA • Clinic", role: "MA", initials: "MA" });
        if (val === "admin") setSession({ signedIn: true, userName: "Nestor Perez", role: "Admin", initials: "NP" });

        toast("Signed in", `${state.session.userName} (${state.session.role})`);
        location.hash = "#/schedule";
      });
    },

    schedule() {
      if (!requireSignIn()) return;

      setCrumbs("Today");
      setActiveNav("schedule");

      const visit = getSelectedVisit();
      const patient = getSelectedPatient();

      const buildVisitCard = (v) => {
        const p = state.data.patients[v.patientId];
        const img = patientPhotoDataUrl(p.name);
        const active = v.id === state.selected.visitId;

        return `
          <div class="visitCard ${active ? "active" : ""}" data-open="${escapeHtml(v.id)}" role="button" tabindex="0">
            <div class="visitLeft">
              <span class="timePill">${escapeHtml(v.time)}</span>
              <div class="patientCell">
                <img class="photo" src="${img}" alt="${escapeHtml(p.name)}">
                <div class="patientMeta">
                  <div class="patientName">${escapeHtml(p.name)}</div>
                  <div class="patientLine">${escapeHtml(v.reason)} • ${escapeHtml(v.type)}</div>
                </div>
              </div>
            </div>
            <div>${statusBadge(v.status)}</div>
          </div>
        `;
      };

      const listHtml = state.data.schedule.map(buildVisitCard).join("");

      const pImg = patientPhotoDataUrl(patient.name);

      $("#view").innerHTML = `
        <div class="splitPane">
          <div class="card">
            <div class="cardHeader">
              <div>
                <h1 class="h1">Today’s Schedule</h1>
                <div class="sub">Tap a visit to view details.</div>
              </div>
              <span class="badge good">Synced</span>
            </div>

            <div class="hr"></div>

            <div class="row">
              <div style="flex:1; min-width: 180px">
                <label class="label" for="filterStatus">Status</label>
                <select class="select" id="filterStatus">
                  <option value="All">All</option>
                  <option value="Arrived">Arrived</option>
                  <option value="Scheduled">Scheduled</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div class="hr"></div>

            <div class="list" id="visitList">${listHtml}</div>
          </div>

          <div class="card">
            <div class="cardHeader">
              <div class="patientCell">
                <img class="photo" src="${pImg}" alt="${escapeHtml(patient.name)}"/>
                <div class="patientMeta">
                  <div class="patientName">${escapeHtml(patient.name)}</div>
                  <div class="patientLine">
                    Visit <span class="kbd">${escapeHtml(visit.id)}</span> • DOB ${escapeHtml(patient.dob)} • Chart <span class="kbd">${escapeHtml(patient.chart)}</span>
                  </div>
                </div>
              </div>

              <div class="row">
                <button class="btn" id="btnGoChart" type="button">Chart</button>
                <button class="btn btnPrimary" id="btnGoEncounter" type="button">Encounter</button>
              </div>
            </div>

            <div class="hr"></div>

            <div class="detailGrid">
              <div class="card" style="box-shadow:none">
                <h2 class="h2">Visit</h2>
                <div class="sub">Reason, status, and quick context.</div>
                <div class="hr"></div>

                <div class="row">
                  <span class="badge">Reason: ${escapeHtml(visit.reason)}</span>
                  <span class="badge">Type: ${escapeHtml(visit.type)}</span>
                  ${statusBadge(visit.status)}
                </div>

                <div class="hr"></div>

                <h2 class="h2">Clinical Snapshot</h2>
                <div class="sub">Fast view for clinicians.</div>
                <div class="hr"></div>

                <div class="sub"><strong>Allergies:</strong> ${(patient.allergies || []).map(escapeHtml).join(", ") || "—"}</div>
                <div class="sub"><strong>Meds:</strong> ${(patient.meds || []).map(escapeHtml).join(", ") || "—"}</div>
                <div class="sub"><strong>Problems:</strong> ${(patient.problems || []).map(escapeHtml).join(", ") || "—"}</div>
              </div>

              <div class="card" style="box-shadow:none">
                <h2 class="h2">Contact</h2>
                <div class="sub">Quick reference.</div>
                <div class="hr"></div>

                <div class="sub"><strong>Phone:</strong> ${escapeHtml(patient.phone)}</div>
                <div class="sub"><strong>Email:</strong> ${escapeHtml(patient.email)}</div>
                <div class="hr"></div>
                <div class="sub">${escapeHtml(patient.address)}</div>
              </div>
            </div>
          </div>
        </div>
      `;

      const bindVisitOpenHandlers = () => {
        $$("[data-open]").forEach((el) => {
          const open = () => {
            state.selected.visitId = el.getAttribute("data-open");
            state.selected.encounterStatus = "draft";
            toast("Visit selected", state.selected.visitId);
            views.schedule();
          };

          el.addEventListener("click", open);
          el.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              open();
            }
          });
        });
      };

      bindVisitOpenHandlers();

      $("#btnGoChart").addEventListener("click", () => (location.hash = "#/patient"));
      $("#btnGoEncounter").addEventListener("click", () => (location.hash = "#/encounter"));

      $("#filterStatus").addEventListener("change", () => {
        const wanted = $("#filterStatus").value;
        const filtered = state.data.schedule.filter((v) => (wanted === "All" ? true : v.status === wanted));
        $("#visitList").innerHTML = filtered.map(buildVisitCard).join("");
        bindVisitOpenHandlers();
      });
    },

    patient() {
      if (!requireSignIn()) return;

      setCrumbs("Chart");
      setActiveNav("patient");

      const visit = getSelectedVisit();
      const patient = getSelectedPatient();
      const img = patientPhotoDataUrl(patient.name);

      const encHtml =
        (patient.encounters || [])
          .map((e) => {
            return `
              <div class="visitCard" role="group">
                <div class="visitLeft">
                  <span class="timePill">${escapeHtml(e.date)}</span>
                  <div style="min-width:0">
                    <div class="patientName">${escapeHtml(e.type)}</div>
                    <div class="patientLine">${escapeHtml(e.provider)}</div>
                  </div>
                </div>
                ${statusBadge(e.status)}
              </div>
            `;
          })
          .join("") || `<div class="sub muted">No encounters yet</div>`;

      const docsHtml =
        (patient.docs || [])
          .map((d) => {
            return `
              <div class="visitCard" role="group">
                <div class="visitLeft">
                  <span class="timePill">DOC</span>
                  <div style="min-width:0">
                    <div class="patientName">${escapeHtml(d.type)}</div>
                    <div class="patientLine">${escapeHtml(d.name)}</div>
                  </div>
                </div>
                <button class="btn btnGhost" type="button">View</button>
              </div>
            `;
          })
          .join("") || `<div class="sub muted">No documents</div>`;

      $("#view").innerHTML = `
        <div class="card">
          <div class="cardHeader">
            <div class="patientCell">
              <img class="photo" src="${img}" alt="${escapeHtml(patient.name)}">
              <div class="patientMeta">
                <div class="patientName">${escapeHtml(patient.name)}</div>
                <div class="patientLine">
                  Visit <span class="kbd">${escapeHtml(visit.id)}</span> • DOB ${escapeHtml(patient.dob)} • Sex ${escapeHtml(patient.sex)} • Chart <span class="kbd">${escapeHtml(patient.chart)}</span>
                </div>
              </div>
            </div>
            <button class="btn btnPrimary" id="btnStartEncounter" type="button">Start Encounter</button>
          </div>

          <div class="hr"></div>

          <h2 class="h2">Snapshot</h2>
          <div class="sub"><strong>Allergies:</strong> ${(patient.allergies || []).map(escapeHtml).join(", ") || "—"}</div>
          <div class="sub"><strong>Meds:</strong> ${(patient.meds || []).map(escapeHtml).join(", ") || "—"}</div>
          <div class="sub"><strong>Problems:</strong> ${(patient.problems || []).map(escapeHtml).join(", ") || "—"}</div>

          <div class="hr"></div>

          <h2 class="h2">Encounters</h2>
          <div class="list">${encHtml}</div>

          <div class="hr"></div>

          <h2 class="h2">Documents</h2>
          <div class="list">${docsHtml}</div>
        </div>
      `;

      $("#btnStartEncounter").addEventListener("click", () => (location.hash = "#/encounter"));
    },

    encounter() {
      if (!requireSignIn()) return;

      setCrumbs("Encounter");
      setActiveNav("encounter");

      const visit = getSelectedVisit();
      const patient = getSelectedPatient();
      const locked = state.selected.encounterStatus === "signed";
      const note = state.data.note;
      const img = patientPhotoDataUrl(patient.name);

      $("#view").innerHTML = `
        <div class="card">
          <div class="cardHeader">
            <div class="patientCell">
              <img class="photo" src="${img}" alt="${escapeHtml(patient.name)}">
              <div class="patientMeta">
                <div class="patientName">${escapeHtml(patient.name)}</div>
                <div class="patientLine">Visit <span class="kbd">${escapeHtml(visit.id)}</span> • ${statusBadge(locked ? "Signed" : "Draft")}</div>
              </div>
            </div>

            <div class="row">
              <button class="btn btnGhost" id="btnPreview" type="button">Preview</button>
              <button class="btn btnPrimary" id="btnSign" type="button">${locked ? "Signed" : "Sign"}</button>
            </div>
          </div>

          <div class="hr"></div>

          <label class="label" for="hpi">HPI</label>
          <textarea class="textarea" id="hpi" ${locked ? "disabled" : ""}>${escapeHtml(note.hpi)}</textarea>

          <label class="label" for="exam" style="margin-top:12px">Exam</label>
          <textarea class="textarea" id="exam" ${locked ? "disabled" : ""}>${escapeHtml(note.exam)}</textarea>

          <label class="label" for="assessment" style="margin-top:12px">Assessment</label>
          <textarea class="textarea" id="assessment" ${locked ? "disabled" : ""}>${escapeHtml(note.assessment)}</textarea>

          <label class="label" for="plan" style="margin-top:12px">Plan</label>
          <textarea class="textarea" id="plan" ${locked ? "disabled" : ""}>${escapeHtml(note.plan)}</textarea>

          <div class="hr"></div>

          <div class="row">
            <div style="flex:1; min-width:220px">
              <label class="label" for="dx">Primary Dx</label>
              <input class="input" id="dx" ${locked ? "disabled" : ""} value="${escapeHtml(note.dx[0])}" />
            </div>
            <button class="btn" id="btnSave" type="button" ${locked ? "disabled" : ""}>Save draft</button>
            <button class="btn btnPrimary" id="btnExport" type="button">Export signed PDF</button>
          </div>

          <div class="sub muted" style="margin-top:10px">
            Rule: Signed notes are immutable. Post-sign edits require a new version.
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

        toast("Saved", "Draft updated (prototype only).");
      };

      $("#btnSave").addEventListener("click", save);

      $("#btnPreview").addEventListener("click", () => {
        window.alert(
          [
            "NOTE PREVIEW (MOCK)",
            "",
            note.template,
            `Patient: ${patient.name}`,
            `Visit: ${visit.id}`,
            "",
            "HPI:",
            state.data.note.hpi,
            "",
            "EXAM:",
            state.data.note.exam,
            "",
            "ASSESSMENT:",
            state.data.note.assessment,
            "",
            "PLAN:",
            state.data.note.plan,
            "",
            "DX:",
            state.data.note.dx.join(", "),
          ].join("\n")
        );
      });

      $("#btnSign").addEventListener("click", () => {
        if (locked) return;

        save();

        if (state.session.role !== "Provider") {
          toast("Permission denied", "Only Provider can sign notes.");
          return;
        }

        state.selected.encounterStatus = "signed";
        toast("Signed", "Encounter locked.");
        views.encounter();
      });

      $("#btnExport").addEventListener("click", () => {
        if (state.selected.encounterStatus !== "signed") {
          toast("Sign required", "Sign the note before exporting.");
          return;
        }
        toast("Export complete", "Mock exported to AdvancedMD workflow.");
      });
    },

    adminImport() {
      if (!requireSignIn()) return;

      setCrumbs("Imports");
      setActiveNav("admin-import");

      $("#view").innerHTML = `
        <div class="card" style="max-width:760px">
          <div class="cardHeader">
            <div>
              <h1 class="h1">CSV Imports</h1>
              <div class="sub">Prototype-only simulation.</div>
            </div>
            <span class="badge">Admin</span>
          </div>

          <div class="hr"></div>

          <div class="row">
            <button class="btn btnPrimary" id="btnRunImport" type="button">Run import (mock)</button>
            <span class="badge">Patients + Visits</span>
          </div>
        </div>
      `;

      $("#btnRunImport").addEventListener("click", () => {
        if (state.session.role !== "Admin") {
          toast("Permission denied", "Only Admin can run imports.");
          return;
        }
        toast("Import complete", "Patients + visits simulated.");
      });
    },
  };

  /* ------------------------------ Router ------------------------------- */
  function route() {
    const hash = location.hash || "#/login";
    const base = hash.replace("#/", "").split("?")[0];

    // close drawer after route change on mobile
    if (mqMobile.matches) closeSidebar();

    switch (base) {
      case "login":
        views.login();
        break;
      case "schedule":
        views.schedule();
        break;
      case "patient":
        views.patient();
        break;
      case "encounter":
        views.encounter();
        break;
      case "admin-import":
        views.adminImport();
        break;
      default:
        location.hash = "#/login";
        break;
    }
  }

  /* ------------------------- Global Event Bindings ---------------------- */
  function bindGlobal() {
    // theme
    applyTheme(state.ui.theme);
    const btnTheme = $("#btnTheme");
    if (btnTheme) {
      btnTheme.addEventListener("click", () => {
        const next = state.ui.theme === "light" ? "dark" : "light";
        applyTheme(next);
        toast("Theme", `Switched to ${next}`);
      });
    }

    // sidebar / backdrop
    const btnSidebar = $("#btnSidebar");
    if (btnSidebar) {
      btnSidebar.addEventListener("click", () => {
        const s = $("#sidebar");
        if (!s) return;
        s.classList.contains("open") ? closeSidebar() : openSidebar();
      });
    }

    const backdrop = $("#backdrop");
    if (backdrop) backdrop.addEventListener("click", closeSidebar);

    // auto-close sidebar on nav click (mobile)
    $$(".navItem").forEach((a) => {
      a.addEventListener("click", () => {
        if (mqMobile.matches) closeSidebar();
      });
    });

    // sign out
    const btnSignOut = $("#btnSignOut");
    if (btnSignOut) {
      btnSignOut.addEventListener("click", () => {
        setSession({ signedIn: false, userName: "Not signed in", role: "—", initials: "NP" });
        state.selected.encounterStatus = "draft";
        toast("Signed out", "Session cleared.");
        location.hash = "#/login";
      });
    }

    // keyboard: G then T/P/E
    let chord = null;
    window.addEventListener("keydown", (e) => {
      const key = e.key.toLowerCase();
      if (key === "g") {
        chord = "g";
        return;
      }
      if (!chord) return;
      if (chord === "g") {
        if (key === "t") location.hash = "#/schedule";
        if (key === "p") location.hash = "#/patient";
        if (key === "e") location.hash = "#/encounter";
      }
      chord = null;
    });

    // adapt when crossing breakpoint
    mqMobile.addEventListener?.("change", () => {
      closeSidebar();
      route();
    });

    // highlight active nav on hash change
    window.addEventListener("hashchange", route);
  }

  /* ------------------------------ Init --------------------------------- */
  function init() {
    setSession({ signedIn: false, userName: "Not signed in", role: "—", initials: "NP" });
    bindGlobal();
    route();
  }

  init();
})();