/* Synapse — medical student study dashboard (UI demo)
   Vanilla JS, no dependencies. All state in localStorage under "synapse.v1". */
(function () {
  "use strict";

  var STORE_KEY = "synapse.v1";

  var DEFAULT_STATE = {
    name: "",
    exam: "",
    examDate: "",
    onboarded: false,
    streak: 6,
    hoursToday: 3.5,
    casesSolved: 4,
    note: "",
    tasks: [
      { id: 1, text: "Revise cardiac cycle pressure changes", done: true },
      { id: 2, text: "20 Pharmacology MCQs - autonomic drugs", done: true },
      { id: 3, text: "Watch + summarise: nephrotic vs nephritic syndrome", done: false },
      { id: 4, text: "Draw brachial plexus from memory", done: false }
    ],
    revision: [
      { id: 1, topic: "Frank-Starling mechanism & cardiac output", subject: "Physiology", prio: "high", due: -1, done: false },
      { id: 2, topic: "Beta blockers - classes & adverse effects", subject: "Pharmacology", prio: "high", due: 0, done: false },
      { id: 3, topic: "Nephritic vs nephritic sediment patterns", subject: "Pathology", prio: "medium", due: 0, done: false },
      { id: 4, topic: "Brachial plexus - cords, branches, lesions", subject: "Anatomy", prio: "high", due: 1, done: false },
      { id: 5, topic: "RAAS & long-term BP regulation", subject: "Physiology", prio: "medium", due: 2, done: false },
      { id: 6, topic: "Antiemetics - ondansetron vs metoclopramide", subject: "Pharmacology", prio: "low", due: 3, done: false },
      { id: 7, topic: "Granulomatous inflammation - causes", subject: "Pathology", prio: "medium", due: 4, done: false },
      { id: 8, topic: "Rotator cuff muscles & movements", subject: "Anatomy", prio: "low", due: 5, done: false }
    ],
    week: [
      { day: "Mon", h: 2.5 }, { day: "Tue", h: 3 }, { day: "Wed", h: 1.5 },
      { day: "Thu", h: 4 }, { day: "Fri", h: 3 }, { day: "Sat", h: 5 }, { day: "Sun", h: 3.5, today: true }
    ],
    caseIndex: 0
  };

  var CASES = [
    {
      tag: "Cardiology",
      vignette: "A 58-year-old man comes in with 2 hours of crushing central chest pain radiating to his left arm, with sweating and nausea. He has smoked for 30 years. (Fictional case for UI demonstration.)",
      steps: [
        { label: "First move", text: "Order an ECG within 10 minutes and give chewable aspirin while you assess. Vitals: BP 150/95, HR 104, SpO2 97%." },
        { label: "ECG finding", text: "ST elevation in leads II, III and aVF - an inferior wall STEMI pattern." },
        { label: "Working diagnosis", text: "Acute inferior STEMI, most likely right coronary artery occlusion. The pathway: activate reperfusion (primary PCI where available), monitor for bradyarrhythmias.", answer: true },
        { label: "What would you change?", text: "Ask yourself: which findings would point you to a right ventricular infarct, and how would that change fluid and nitrate decisions? That is tomorrow's revision topic.", answer: true }
      ]
    },
    {
      tag: "Respiratory",
      vignette: "A 24-year-old woman with known asthma arrives breathless and unable to complete sentences. Peak flow is 45% of her best. (Fictional case for UI demonstration.)",
      steps: [
        { label: "First move", text: "Sit her upright, start high-flow oxygen and give repeated salbutamol nebulisation with ipratropium." },
        { label: "Key finding", text: "Silent chest on auscultation - a danger sign, not an improvement." },
        { label: "Working diagnosis", text: "Acute severe asthma edging toward life-threatening. Escalate: systemic steroids, consider magnesium sulfate, and involve senior help early.", answer: true },
        { label: "What would you change?", text: "Revise how you would distinguish this from anaphylaxis and from a pneumothorax - the three can look similar at the door.", answer: true }
      ]
    },
    {
      tag: "Endocrine",
      vignette: "A 19-year-old student is brought in drowsy, vomiting and breathing deeply and rapidly. His friends mention weight loss and constant thirst over the last month. (Fictional case for UI demonstration.)",
      steps: [
        { label: "First move", text: "Check capillary glucose and ketones at the bedside, then start an ABC assessment." },
        { label: "Lab picture", text: "Glucose 480 mg/dL, pH 7.18, ketones strongly positive, potassium pending." },
        { label: "Working diagnosis", text: "Diabetic ketoacidosis, likely first presentation of type 1 diabetes. Fixed-rate insulin infusion with careful fluid and potassium management is the backbone of care.", answer: true },
        { label: "What would you change?", text: "Know your potassium rule before touching insulin - revise the threshold values tonight.", answer: true }
      ]
    }
  ];

  var state = null;
  var els = {};
  var caseStep = 0;

  /* ---------- utils ---------- */
  function $(id) { return document.getElementById(id); }
  function debounce(fn, ms) {
    var t; return function () { var a = arguments, s = this; clearTimeout(t); t = setTimeout(function () { fn.apply(s, a); }, ms); };
  }
  function throttle(fn, ms) {
    var last = 0, t; return function () {
      var now = Date.now(), s = this, a = arguments;
      if (now - last >= ms) { last = now; fn.apply(s, a); }
      else { clearTimeout(t); t = setTimeout(function () { last = Date.now(); fn.apply(s, a); }, ms - (now - last)); }
    };
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function toast(msg, kind) {
    var t = document.createElement("div");
    t.className = "syn-toast " + (kind || "ok");
    t.textContent = msg;
    els.toastWrap.appendChild(t);
    setTimeout(function () { t.style.opacity = "0"; t.style.transition = "opacity .4s"; }, 2600);
    setTimeout(function () { t.remove(); }, 3100);
  }

  /* ---------- state ---------- */
  function loadState() {
    var raw = null;
    try { raw = localStorage.getItem(STORE_KEY); } catch (e) {
      /* Storage unavailable (sandboxed preview): run in memory silently */
      return JSON.parse(JSON.stringify(DEFAULT_STATE));
    }
    if (!raw) return JSON.parse(JSON.stringify(DEFAULT_STATE));
    try {
      var parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.tasks) || !Array.isArray(parsed.revision)) throw new Error("shape");
      sanitizeState(parsed);
      return Object.assign(JSON.parse(JSON.stringify(DEFAULT_STATE)), parsed);
    } catch (e) {
      /* Graceful error recovery: corrupted storage -> defaults + notice */
      setTimeout(function () { toast("Saved data was unreadable - recovered with sample data.", "warn"); }, 900);
      return JSON.parse(JSON.stringify(DEFAULT_STATE));
    }
  }
  /* Defense in depth: values that later land in class/data attributes or HTML
     are coerced to safe shapes even though storage is same-origin only. */
  function sanitizeState(p) {
    var PRIO = ["high", "medium", "low"];
    var cleanId = function (v) { var n = Number(v); if (!Number.isSafeInteger(n) || n < 0) throw new Error("id"); return n; };
    p.revision = p.revision.filter(function (r) { return r && typeof r.topic === "string"; }).map(function (r) {
      return {
        id: cleanId(r.id), topic: String(r.topic).slice(0, 200), subject: String(r.subject || "").slice(0, 60),
        prio: PRIO.indexOf(r.prio) >= 0 ? r.prio : "medium",
        due: (typeof r.due === "number" && isFinite(r.due)) ? Math.max(-30, Math.min(365, Math.round(r.due))) : 7,
        done: !!r.done
      };
    });
    p.tasks = p.tasks.filter(function (t) { return t && typeof t.text === "string"; }).map(function (t) {
      return { id: cleanId(t.id), text: String(t.text).slice(0, 160), done: !!t.done };
    });
    p.name = typeof p.name === "string" ? p.name.slice(0, 24) : "";
    p.note = typeof p.note === "string" ? p.note.slice(0, 2000) : "";
    p.caseIndex = Number.isInteger(p.caseIndex) && p.caseIndex >= 0 && p.caseIndex < CASES.length ? p.caseIndex : 0;
    p.week = JSON.parse(JSON.stringify(DEFAULT_STATE.week));
    ["streak", "hoursToday", "casesSolved"].forEach(function (k) { if (typeof p[k] !== "number" || !isFinite(p[k]) || p[k] < 0) p[k] = DEFAULT_STATE[k]; });
    if (typeof p.examDate === "string" && !/^\d{4}-\d{2}-\d{2}$/.test(p.examDate)) p.examDate = "";
  }
  var storageAvailable = true;
  var saveNow = function () {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); storageAvailable = true; } catch (e) { storageAvailable = false; }
    return storageAvailable;
  };
  var saveDebounced = debounce(saveNow, 400);

  /* ---------- onboarding ---------- */
  function openOnboarding() {
    $("obName").value = state.name || "";
    $("obExam").value = state.exam || "";
    $("obDate").value = state.examDate || "";
    els.onboardBackdrop.hidden = false;
    setTimeout(function () { $("obName").focus(); }, 60);
  }
  function closeOnboarding() { els.onboardBackdrop.hidden = true; }
  function bindOnboarding() {
    var submitonboardForm = function (e) {
      e.preventDefault();
      var name = $("obName").value.trim();
      var exam = $("obExam").value;
      var ok = true;
      $("obNameErr").textContent = ""; $("obExamErr").textContent = "";
      $("obName").classList.remove("invalid"); $("obExam").classList.remove("invalid");
      if (name.length < 2) { $("obNameErr").textContent = "Please enter at least 2 characters."; $("obName").classList.add("invalid"); ok = false; }
      if (!exam) { $("obExamErr").textContent = "Pick a target exam (or use Skip)."; $("obExam").classList.add("invalid"); ok = false; }
      if (!ok) return;
      state.name = name; state.exam = exam; state.examDate = $("obDate").value; state.onboarded = true;
      saveNow(); closeOnboarding(); renderHero(); toast("Welcome, " + name + ". Your dashboard is ready.");
    };
    $("onboardForm").addEventListener("submit", submitonboardForm);
    $("onboardForm").querySelector("button[type=submit]").addEventListener("click", submitonboardForm);
    $("onboardForm").addEventListener("keydown", function(e) { if(e.key === "Enter" && e.target.tagName !== "BUTTON") submitonboardForm(e); });;
    $("obSkip").addEventListener("click", function () {
      state.onboarded = true; saveNow(); closeOnboarding(); renderHero();
    });
    $("avatarBtn").addEventListener("click", openOnboarding);
  }

  /* ---------- hero ---------- */
  function greeting() {
    var h = new Date().getHours();
    if (h < 5) return "Up late"; if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon"; return "Good evening";
  }
  function renderHero() {
    $("greeting").textContent = greeting();
    $("userName").textContent = state.name || "scholar";
    $("avatarBtn").textContent = (state.name || "S").trim().charAt(0).toUpperCase() || "S";
    var days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var d = new Date();
    $("todayLine").textContent = days[d.getDay()] + ", " + d.getDate() + " " + months[d.getMonth()] + " " + d.getFullYear();
    $("examChip").textContent = state.exam ? ("Target: " + state.exam) : "No exam target set";
    var cd = $("countdownChip");
    if (state.examDate) {
      var diff = Math.ceil((new Date(state.examDate + "T00:00:00") - new Date(new Date().toDateString())) / 86400000);
      cd.textContent = diff >= 0 ? (diff + " days to exam") : "Exam date passed - update it";
    } else cd.textContent = "";
    var due = state.revision.filter(function (r) { return !r.done && r.due <= 0; }).length;
    $("heroSub").textContent = due > 0
      ? ("You have " + due + " high-yield topic" + (due === 1 ? "" : "s") + " due now, and one clinical case waiting.")
      : "Revision queue is clear. One clinical case is waiting for you.";
  }

  /* ---------- counters ---------- */
  function animateCounters() {
    var targets = { statHours: state.hoursToday, statDue: state.revision.filter(function (r) { return !r.done; }).length, statStreak: state.streak, statCases: state.casesSolved };
    Object.keys(targets).forEach(function (id) {
      var el = $(id), end = targets[id], isFloat = end % 1 !== 0, start = null;
      function frame(ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / 800, 1);
        var v = end * (1 - Math.pow(1 - p, 3));
        el.textContent = isFloat ? v.toFixed(1) : Math.round(v);
        if (p < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    });
    $("duePill").textContent = state.revision.filter(function (r) { return !r.done; }).length;
    $("statDueTrend").textContent = "spaced repetition queue";
  }

  /* ---------- revision table ---------- */
  var filters = { subject: "all", prio: "all" };
  var selected = {};

  function visibleRevision() {
    return state.revision.filter(function (r) {
      if (filters.subject !== "all" && r.subject !== filters.subject) return false;
      if (filters.prio !== "all" && r.prio !== filters.prio) return false;
      return true;
    }).sort(function (a, b) { return (a.done - b.done) || (a.due - b.due); });
  }
  function dueLabel(d) {
    if (d < 0) return { t: "Overdue", c: "overdue" };
    if (d === 0) return { t: "Due today", c: "" };
    if (d === 1) return { t: "Tomorrow", c: "" };
    return { t: "In " + d + " days", c: "" };
  }
  function renderRevision() {
    var rows = visibleRevision();
    var tb = els.revTbody;
    tb.innerHTML = "";
    els.revEmpty.hidden = rows.length !== 0;
    $("selAll").checked = false;
    rows.forEach(function (r) {
      var tr = document.createElement("tr");
      if (r.done) tr.className = "done";
      var dl = dueLabel(r.due);
      tr.innerHTML =
        '<td class="sel-col"><input type="checkbox" data-sel="' + r.id + '"' + (selected[r.id] ? " checked" : "") + (r.done ? " disabled" : "") + ' aria-label="Select topic"></td>' +
        '<td class="topic-name">' + escapeHtml(r.topic) + "</td>" +
        "<td>" + escapeHtml(r.subject) + "</td>" +
        '<td><span class="prio ' + r.prio + '">' + (r.prio === "high" ? "High yield" : r.prio) + "</span></td>" +
        '<td><span class="due-tag ' + dl.c + '">' + dl.t + "</span></td>" +
        '<td><button class="row-done-btn" data-done="' + r.id + '" title="Mark revised" ' + (r.done ? "disabled" : "") + '><svg viewBox="0 0 24 24"><path d="M5 12l5 5 9-10" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button></td>';
      tb.appendChild(tr);
    });
    updateBulkBar();
  }
  function updateBulkBar() {
    var n = Object.keys(selected).filter(function (k) { return selected[k]; }).length;
    $("selCount").textContent = n;
    $("bulkDoneBtn").disabled = n === 0;
  }
  function markRevised(ids) {
    /* Optimistic UI: strike through immediately, persist after */
    ids.forEach(function (id) {
      var r = state.revision.find(function (x) { return x.id === id; });
      if (r) r.done = true;
      selected[id] = false;
    });
    renderRevision(); animateCounters(); renderHero(); saveDebounced();
    toast(ids.length + (ids.length === 1 ? " topic" : " topics") + " marked revised.");
  }
  function bindRevision() {
    $("subjectChips").addEventListener("click", function (e) {
      var b = e.target.closest(".fchip"); if (!b) return;
      document.querySelectorAll("#subjectChips .fchip").forEach(function (x) { x.classList.toggle("active", x === b); });
      filters.subject = b.dataset.subject;
      showTableSkeleton();
    });
    $("priorityFilter").addEventListener("change", function () {
      filters.prio = this.value; showTableSkeleton();
    });
    $("clearFilters").addEventListener("click", function () {
      filters = { subject: "all", prio: "all" };
      document.querySelectorAll("#subjectChips .fchip").forEach(function (x) { x.classList.toggle("active", x.dataset.subject === "all"); });
      $("priorityFilter").value = "all"; showTableSkeleton();
    });
    els.revTbody.addEventListener("change", function (e) {
      var cb = e.target.closest("[data-sel]"); if (!cb) return;
      selected[cb.dataset.sel] = cb.checked; updateBulkBar();
    });
    els.revTbody.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-done]"); if (!btn) return;
      markRevised([Number(btn.dataset.done)]);
    });
    $("selAll").addEventListener("change", function () {
      visibleRevision().forEach(function (r) { if (!r.done) selected[r.id] = this.checked; }, this);
      renderRevision();
    });
    $("bulkDoneBtn").addEventListener("click", function () {
      var ids = Object.keys(selected).filter(function (k) { return selected[k]; }).map(Number);
      if (ids.length) markRevised(ids);
    });
  }
  function showTableSkeleton() {
    /* Skeleton loader between filter states */
    var tb = els.revTbody;
    tb.innerHTML = "";
    for (var i = 0; i < 4; i++) {
      var tr = document.createElement("tr");
      tr.className = "sk-row-anim";
      tr.innerHTML = '<td colspan="6"><div class="sk-line" style="width:' + (85 - i * 12) + '%"></div></td>';
      tb.appendChild(tr);
    }
    els.revEmpty.hidden = true;
    setTimeout(renderRevision, 350);
  }

  /* ---------- clinical case ---------- */
  function renderCase() {
    var c = CASES[state.caseIndex % CASES.length];
    $("caseTag").textContent = c.tag;
    $("caseVignette").textContent = c.vignette;
    var wrap = $("caseSteps");
    wrap.innerHTML = "";
    c.steps.slice(0, caseStep).forEach(function (s) {
      var div = document.createElement("div");
      div.className = "case-step" + (s.answer ? " answer" : "");
      div.innerHTML = "<b>" + escapeHtml(s.label) + "</b>" + escapeHtml(s.text);
      wrap.appendChild(div);
    });
    $("caseNext").textContent = caseStep >= c.steps.length ? "Case complete" : (caseStep === c.steps.length - 2 ? "Reveal diagnosis" : "Reveal next step");
    $("caseNext").disabled = caseStep >= c.steps.length;
  }
  function bindCase() {
    $("caseNext").addEventListener("click", function () {
      var c = CASES[state.caseIndex % CASES.length];
      if (caseStep < c.steps.length) {
        caseStep++;
        if (caseStep === c.steps.length) {
          state.casesSolved = Math.min(state.casesSolved + 1, 12);
          saveDebounced(); animateCounters();
          toast("Case solved. Nice work.");
        }
        renderCase();
      }
    });
    $("caseNew").addEventListener("click", function () {
      state.caseIndex = (state.caseIndex + 1) % CASES.length;
      caseStep = 0; saveDebounced(); renderCase();
    });
  }

  /* ---------- today's plan ---------- */
  function renderPlan() {
    var list = els.taskList;
    list.innerHTML = "";
    var done = state.tasks.filter(function (t) { return t.done; }).length;
    $("planCount").textContent = done + " of " + state.tasks.length + " done";
    var p = state.tasks.length ? Math.round((done / state.tasks.length) * 100) : 0;
    var ring = $("planRing");
    ring.style.setProperty("--p", p);
    ring.querySelector("b").textContent = p + "%";
    els.planEmpty.hidden = state.tasks.length !== 0;
    state.tasks.forEach(function (t) {
      var li = document.createElement("li");
      li.className = "task-item" + (t.done ? " done" : "");
      li.innerHTML =
        '<input type="checkbox" data-task="' + t.id + '"' + (t.done ? " checked" : "") + ' aria-label="Mark task done">' +
        '<span class="task-text">' + escapeHtml(t.text) + "</span>" +
        '<button class="task-del" data-del="' + t.id + '" title="Remove" aria-label="Remove task">&times;</button>';
      list.appendChild(li);
    });
  }
  function bindPlan() {
    var input = $("newTask");
    var validate = debounce(function () {
      var v = input.value.trim();
      if (v.length === 1) { $("taskErr").textContent = "A little too short - describe the study block."; input.classList.add("invalid"); }
      else { $("taskErr").textContent = ""; input.classList.remove("invalid"); }
    }, 250);
    input.addEventListener("input", validate);
    var submitaddTaskForm = function (e) {
      e.preventDefault();
      var v = input.value.trim();
      if (v.length < 2) { $("taskErr").textContent = "Type at least 2 characters."; input.classList.add("invalid"); return; }
      if (state.tasks.some(function (t) { return t.text.toLowerCase() === v.toLowerCase(); })) {
        $("taskErr").textContent = "That block is already on today's plan."; input.classList.add("invalid"); return;
      }
      /* Optimistic add */
      state.tasks.push({ id: Date.now(), text: v, done: false });
      input.value = ""; $("taskErr").textContent = ""; input.classList.remove("invalid");
      renderPlan(); saveDebounced(); toast("Added to today's plan.");
    };
    $("addTaskForm").addEventListener("submit", submitaddTaskForm);
    $("addTaskForm").querySelector("button[type=submit]").addEventListener("click", submitaddTaskForm);
    $("addTaskForm").addEventListener("keydown", function(e) { if(e.key === "Enter" && e.target.tagName !== "BUTTON") submitaddTaskForm(e); });;
    els.taskList.addEventListener("change", function (e) {
      var cb = e.target.closest("[data-task]"); if (!cb) return;
      var t = state.tasks.find(function (x) { return x.id === Number(cb.dataset.task); });
      if (t) { t.done = cb.checked; renderPlan(); saveDebounced(); }
    });
    els.taskList.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-del]"); if (!btn) return;
      state.tasks = state.tasks.filter(function (x) { return x.id !== Number(btn.dataset.del); });
      renderPlan(); saveDebounced();
    });
  }

  /* ---------- week chart ---------- */
  function renderChart() {
    var max = Math.max.apply(null, state.week.map(function (d) { return d.h; }).concat([1]));
    els.barChart.innerHTML = "";
    state.week.forEach(function (d) {
      var col = document.createElement("div");
      col.className = "bar-col";
      var bar = document.createElement("div");
      bar.className = "bar" + (d.today ? " today" : "");
      bar.setAttribute("data-h", d.h + "h");
      bar.style.height = "4px";
      col.appendChild(bar);
      var lab = document.createElement("span");
      lab.className = "bar-day"; lab.textContent = d.day;
      col.appendChild(lab);
      els.barChart.appendChild(col);
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { bar.style.height = Math.max(4, (d.h / max) * 100) + "%"; });
      });
    });
  }

  /* ---------- notes (autosave) ---------- */
  function bindNotes() {
    var area = $("noteArea");
    area.value = state.note || "";
    var persist = debounce(function () {
      state.note = area.value; var saved = saveNow();
      var s = $("saveState"); s.textContent = saved ? "Saved" : "This session only"; s.classList.remove("saving");
    }, 600);
    area.addEventListener("input", function () {
      var s = $("saveState"); s.textContent = "Saving..."; s.classList.add("saving");
      persist();
    });
  }

  /* ---------- command palette ---------- */
  var paletteIndex = 0;
  function paletteCommands() {
    var cmds = [
      { name: "Go to Revision priorities", hint: "section", run: function () { jump("revision"); } },
      { name: "Go to Clinical case", hint: "section", run: function () { jump("case"); } },
      { name: "Go to Today's plan", hint: "section", run: function () { jump("plan"); } },
      { name: "Go to Quick note", hint: "section", run: function () { jump("notes"); } },
      { name: "New study block", hint: "N", run: function () { jump("plan"); setTimeout(function () { $("newTask").focus(); }, 350); } },
      { name: "Reveal next case step", hint: "action", run: function () { $("caseNext").click(); jump("case"); } },
      { name: "Mark all due topics revised", hint: "bulk", run: function () {
          var ids = state.revision.filter(function (r) { return !r.done && r.due <= 0; }).map(function (r) { return r.id; });
          if (ids.length) markRevised(ids); else toast("Nothing due right now.");
        } },
      { name: "Keyboard shortcuts", hint: "?", run: function () { openModal("shortcutsBackdrop"); } },
      { name: "Edit profile & exam target", hint: "settings", run: openOnboarding },
      { name: "Reset demo data", hint: "danger", run: function () { openModal("confirmBackdrop"); } }
    ];
    state.revision.filter(function (r) { return !r.done; }).slice(0, 5).forEach(function (r) {
      cmds.push({ name: "Revise: " + r.topic, hint: r.subject, run: function () { markRevised([r.id]); } });
    });
    return cmds;
  }
  function renderPalette(q) {
    var list = $("paletteList");
    list.innerHTML = "";
    var ql = q.trim().toLowerCase();
    var cmds = paletteCommands().filter(function (c) { return !ql || c.name.toLowerCase().indexOf(ql) !== -1; });
    paletteIndex = 0;
    $("paletteEmpty").hidden = cmds.length !== 0;
    cmds.forEach(function (c, i) {
      var li = document.createElement("li");
      li.className = "palette-item" + (i === 0 ? " active" : "");
      li.innerHTML = escapeHtml(c.name) + '<span class="muted">' + escapeHtml(c.hint) + "</span>";
      li.addEventListener("click", function () { closePalette(); c.run(); });
      li._cmd = c;
      list.appendChild(li);
    });
    return cmds;
  }
  var paletteVisible = [];
  function openPalette() {
    els.paletteBackdrop.hidden = false;
    $("paletteInput").value = "";
    paletteVisible = renderPalette("");
    setTimeout(function () { $("paletteInput").focus(); }, 50);
  }
  function closePalette() { els.paletteBackdrop.hidden = true; }
  function bindPalette() {
    $("searchTrigger").addEventListener("click", openPalette);
    /* Debounced palette search */
    $("paletteInput").addEventListener("input", debounce(function () {
      paletteVisible = renderPalette($("paletteInput").value);
    }, 120));
    $("paletteInput").addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        var items = document.querySelectorAll(".palette-item");
        if (!items.length) return;
        paletteIndex = (paletteIndex + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
        items.forEach(function (it, i) { it.classList.toggle("active", i === paletteIndex); });
        items[paletteIndex].scrollIntoView({ block: "nearest" });
      } else if (e.key === "Enter") {
        var items = document.querySelectorAll(".palette-item");
        if (items[paletteIndex]) { closePalette(); items[paletteIndex]._cmd.run(); }
      }
    });
  }

  /* ---------- modals ---------- */
  function openModal(id) { $(id).hidden = false; }
  function closeModals() {
    ["onboardBackdrop", "paletteBackdrop", "confirmBackdrop", "shortcutsBackdrop"].forEach(function (id) { $(id).hidden = true; });
  }
  function bindModals() {
    document.querySelectorAll(".syn-modal-backdrop").forEach(function (bd) {
      bd.addEventListener("click", function (e) { if (e.target === bd && bd.id !== "onboardBackdrop") bd.hidden = true; });
    });
    $("confirmCancel").addEventListener("click", closeModals);
    $("confirmOk").addEventListener("click", function () {
      var keepOnboard = state.onboarded;
      state = JSON.parse(JSON.stringify(DEFAULT_STATE));
      state.onboarded = keepOnboard;
      selected = {}; caseStep = 0;
      saveNow(); closeModals();
      renderAll();
      toast("Demo data reset to the sample set.", "warn");
    });
    $("resetBtn").addEventListener("click", function () { openModal("confirmBackdrop"); });
    $("scClose").addEventListener("click", closeModals);
    $("shortcutsLink").addEventListener("click", function (e) { e.preventDefault(); openModal("shortcutsBackdrop"); });
  }

  /* ---------- nav + shortcuts ---------- */
  function jump(id) {
    var el = $(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function bindNav() {
    document.querySelectorAll("[data-nav]").forEach(function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        var nav = a.dataset.nav;
        document.querySelectorAll("[data-nav]").forEach(function (x) { x.classList.toggle("active", x.dataset.nav === nav); });
        jump(nav === "overview" ? "overview" : nav);
      });
    });
    /* Throttled scroll-spy */
    var onScroll = throttle(function () {
      var ids = ["overview", "revision", "case", "plan", "notes"], current = "overview";
      ids.forEach(function (id) {
        var el = $(id);
        if (el && el.getBoundingClientRect().top < 160) current = id;
      });
      document.querySelectorAll("[data-nav]").forEach(function (x) { x.classList.toggle("active", x.dataset.nav === current); });
    }, 150);
    window.addEventListener("scroll", onScroll, { passive: true });

    document.addEventListener("keydown", function (e) {
      var typing = /INPUT|TEXTAREA|SELECT/.test((e.target && e.target.tagName) || "");
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); openPalette(); return; }
      if (e.key === "Escape") { closeModals(); return; }
      if (typing) return;
      if (e.key === "?") { openModal("shortcutsBackdrop"); }
      else if (e.key.toLowerCase() === "n") { jump("plan"); setTimeout(function () { $("newTask").focus(); }, 350); }
    });
  }

  /* ---------- reveal on scroll ---------- */
  function bindReveal() {
    if (!("IntersectionObserver" in window)) {
      document.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { threshold: 0.08 });
    document.querySelectorAll(".reveal").forEach(function (el) { io.observe(el); });
  }

  /* ---------- render all ---------- */
  function renderAll() {
    renderHero(); animateCounters(); renderRevision(); renderCase(); renderPlan(); renderChart();
    $("noteArea").value = state.note || "";
  }

  /* ---------- init ---------- */
  window.initSynapse = function () {
    ["synBoot", "onboardBackdrop", "paletteBackdrop", "confirmBackdrop", "shortcutsBackdrop", "toastWrap",
     "revTbody", "revEmpty", "taskList", "planEmpty", "barChart", "searchTrigger"].forEach(function (id) {
      els[id] = $(id);
    });
    if (!els.revTbody) return; /* fragment not present */
    state = loadState();

    bindOnboarding(); bindRevision(); bindCase(); bindPlan(); bindNotes();
    bindPalette(); bindModals(); bindNav(); bindReveal();
    if (!saveNow()) { $("saveState").textContent = "This session only"; var hint = document.querySelector("#notes .muted"); if (hint) hint.textContent = "Storage unavailable. Notes last until refresh."; }

    /* Skeleton boot -> content (loading state pattern) */
    setTimeout(function () {
      renderAll();
      var boot = $("synBoot");
      if (boot) { boot.classList.add("hide"); setTimeout(function () { boot.remove(); }, 500); }
      if (!state.onboarded) openOnboarding();
    }, 700);
  };

  if (document.readyState !== "loading") window.initSynapse();
  else document.addEventListener("DOMContentLoaded", window.initSynapse);
})();
