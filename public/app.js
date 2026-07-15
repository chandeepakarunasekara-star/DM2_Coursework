(() => {
  "use strict";

  // ---------------------------------------------------------------- state
  const state = {
    user: null,
    categories: [],
    courses: [],
    currentCourseId: null,
    communityCourseIndex: {},
  };

  // ---------------------------------------------------------------- api
  async function api(path, opts = {}) {
    const res = await fetch(`/api${path}`, {
      method: opts.method || "GET",
      headers: opts.body ? { "Content-Type": "application/json" } : undefined,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      credentials: "same-origin",
    });
    let data = null;
    const text = await res.text();
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (!res.ok) {
      const err = new Error((data && data.error) || `Request failed (${res.status})`);
      err.status = res.status;
      err.code = data && data.code;
      throw err;
    }
    return data;
  }

  // ---------------------------------------------------------------- toast
  function toast(message, kind = "") {
    const stack = document.getElementById("toast-stack");
    const el = document.createElement("div");
    el.className = `toast ${kind}`;
    el.textContent = message;
    stack.appendChild(el);
    setTimeout(() => el.remove(), 4200);
  }

  // ---------------------------------------------------------------- modal
  function openModal(title, bodyEl) {
    document.getElementById("modal-title").textContent = title;
    const body = document.getElementById("modal-body");
    body.innerHTML = "";
    body.appendChild(bodyEl);
    document.getElementById("modal-backdrop").classList.add("open");
  }
  function closeModal() {
    document.getElementById("modal-backdrop").classList.remove("open");
  }
  document.getElementById("modal-close").addEventListener("click", closeModal);
  document.getElementById("modal-backdrop").addEventListener("click", (e) => {
    if (e.target.id === "modal-backdrop") closeModal();
  });

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === "class") node.className = v;
      else if (k === "html") node.innerHTML = v;
      else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    });
    (Array.isArray(children) ? children : [children]).forEach((c) => {
      if (c == null) return;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return node;
  }

  function fmtMoney(n) {
    return `$${Number(n || 0).toFixed(2)}`;
  }
  function fmtDate(d) {
    return d ? String(d).slice(0, 10) : "&mdash;";
  }
  function stars(rating) {
    if (rating == null) return "&mdash;";
    const full = Math.round(rating);
    return `<span class="rating-stars">${"&#9733;".repeat(full)}${"&#9734;".repeat(5 - full)}</span> <span class="small-muted">${rating}</span>`;
  }

  // ---------------------------------------------------------------- table helper
  function renderTable(target, columns, rows, emptyMsg = "No records yet.") {
    const t = typeof target === "string" ? document.getElementById(target) : target;
    if (!rows || !rows.length) {
      t.innerHTML = "";
      const wrap = el("div", { class: "empty-state" }, emptyMsg);
      t.replaceWith(wrap);
      wrap.id = t.id;
      return;
    }
    const thead = `<thead><tr>${columns.map((c) => `<th class="${c.num ? "num" : ""}">${c.label}</th>`).join("")}</tr></thead>`;
    const tbody = `<tbody>${rows
      .map(
        (r) =>
          `<tr>${columns.map((c) => `<td class="${c.num ? "num" : ""}">${c.render ? c.render(r) : (r[c.key] ?? "")}</td>`).join("")}</tr>`
      )
      .join("")}</tbody>`;
    t.innerHTML = thead + tbody;
  }

  // ---------------------------------------------------------------- role visibility
  function applyRoleVisibility() {
    const role = state.user ? state.user.role : null;
    document.querySelectorAll("[data-role]").forEach((node) => {
      const allowed = node.getAttribute("data-role").split(",");
      node.style.display = role && allowed.includes(role) ? "" : "none";
    });
  }

  // ---------------------------------------------------------------- nav
  const VIEW_LABELS = {
    dashboard: "registrar / dashboard",
    catalogue: "registrar / catalogue",
    "course-detail": "registrar / catalogue / course",
    mylearning: "registrar / my learning",
    community: "registrar / community",
    enrollments: "registrar / enrollments",
    payments: "registrar / payments",
    people: "registrar / people",
    reports: "registrar / reports",
  };

  function showView(name) {
    document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
    const target = document.getElementById(`view-${name}`);
    if (target) target.classList.add("active");
    document.querySelectorAll(".nav-btn").forEach((b) => b.classList.toggle("active", b.dataset.view === name));
    document.getElementById("crumb").textContent = VIEW_LABELS[name] || "registrar";
    if (name === "dashboard") loadDashboard();
    if (name === "catalogue") loadCatalogue();
    if (name === "mylearning") loadMyLearning();
    if (name === "community") loadCommunity();
    if (name === "enrollments") loadEnrollments();
    if (name === "payments") loadPayments();
    if (name === "people") loadPeople();
    if (name === "reports") loadReport("popular-courses");
  }

  document.getElementById("primary-nav").addEventListener("click", (e) => {
    const btn = e.target.closest(".nav-btn");
    if (btn) showView(btn.dataset.view);
  });
  document.getElementById("back-to-catalogue").addEventListener("click", () => showView("catalogue"));

  // ---------------------------------------------------------------- auth
  function setSignedIn(user) {
    state.user = user;
    document.getElementById("auth-screen").style.display = "none";
    document.getElementById("app").classList.add("visible");
    document.getElementById("who-name").textContent = user.fullName;
    const roleBadge = document.getElementById("who-role");
    roleBadge.textContent = user.role;
    roleBadge.className = `role-badge ${user.role}`;
    applyRoleVisibility();
    showView("dashboard");
    loadSystemStatus();
    loadCategories();
  }

  function setSignedOut() {
    state.user = null;
    document.getElementById("app").classList.remove("visible");
    document.getElementById("auth-screen").style.display = "flex";
  }

  document.querySelectorAll("[data-authtab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-authtab]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const isLogin = btn.dataset.authtab === "login";
      document.getElementById("login-form").style.display = isLogin ? "" : "none";
      document.getElementById("register-form").style.display = isLogin ? "none" : "";
    });
  });

  document.querySelectorAll("[data-demo]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.getElementById("login-email").value = btn.dataset.demo;
      document.getElementById("login-password").value = "password123";
    });
  });

  document.getElementById("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errBox = document.getElementById("login-error");
    errBox.classList.remove("show");
    try {
      const { user } = await api("/auth/login", {
        method: "POST",
        body: {
          email: document.getElementById("login-email").value.trim(),
          password: document.getElementById("login-password").value,
        },
      });
      setSignedIn(user);
    } catch (err) {
      errBox.textContent = err.message;
      errBox.classList.add("show");
    }
  });

  document.getElementById("register-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errBox = document.getElementById("login-error");
    errBox.classList.remove("show");
    try {
      const { user } = await api("/auth/register", {
        method: "POST",
        body: {
          fullName: document.getElementById("reg-name").value.trim(),
          email: document.getElementById("reg-email").value.trim(),
          password: document.getElementById("reg-password").value,
        },
      });
      toast("Account created — welcome to CourseConnect!", "success");
      setSignedIn(user);
    } catch (err) {
      errBox.textContent = err.message;
      errBox.classList.add("show");
    }
  });

  document.getElementById("logout-btn").addEventListener("click", async () => {
    await api("/auth/logout", { method: "POST" });
    setSignedOut();
  });

  // ---------------------------------------------------------------- system status
  async function loadSystemStatus() {
    try {
      const s = await api("/system/status");
      const box = document.getElementById("db-modes");
      const pill = (label, mode) => {
        const live = mode === "oracle" || mode === "mongodb";
        return `<span class="mode-pill ${live ? "live" : ""}"><span class="dot"></span>${label}: ${mode}</span>`;
      };
      box.innerHTML = pill("SQL", s.relationalMode) + pill("Docs", s.documentMode);
    } catch { /* non-critical */ }
  }

  async function loadCategories() {
    state.categories = await api("/courses/meta/categories");
    const sel = document.getElementById("course-category-filter");
    sel.innerHTML = `<option value="">All categories</option>` + state.categories.map((c) => `<option>${c.category_name}</option>`).join("");
  }

  // ---------------------------------------------------------------- dashboard
  async function loadDashboard() {
    const data = await api("/dashboard");
    const s = data.summary;
    const kpis = [
      ["Students", s.student_count],
      ["Lecturers", s.lecturer_count],
      ["Published courses", s.published_course_count],
      ["Enrollments", s.enrollment_count],
      ["Revenue collected", fmtMoney(s.total_revenue)],
      ["Pending payments", s.pending_payment_count],
      ["Certificates issued", s.certificate_count],
    ];
    document.getElementById("kpi-grid").innerHTML = kpis
      .map(([label, value]) => `<div class="kpi"><div class="kpi-label">${label}</div><div class="kpi-value">${value}</div></div>`)
      .join("");

    renderTable(
      "dash-top-courses",
      [
        { label: "Course", render: (r) => r.course_title },
        { label: "Enrollments", key: "enrollment_count", num: true },
        { label: "Revenue", num: true, render: (r) => fmtMoney(r.revenue) },
      ],
      data.topCourses
    );
    renderTable(
      "dash-top-rated",
      [
        { label: "Course", render: (r) => r.courseTitle },
        { label: "Rating", render: (r) => stars(r.averageRating) },
        { label: "Reviews", key: "reviewCount", num: true },
      ],
      data.topRated,
      "No reviews yet."
    );
  }

  // ---------------------------------------------------------------- catalogue
  function courseStampLabel(status) {
    return status === "PUBLISHED" ? "OPEN\nENROLL" : status === "DRAFT" ? "DRAFT\nONLY" : "ARCHIVE";
  }

  function courseCard(c) {
    const card = el("div", { class: "course-card" });
    card.innerHTML = `
      <div class="stamp">${courseStampLabel(c.published_status).replace("\n", "<br/>")}</div>
      <div class="cat">${c.category_name} &middot; ${c.course_level}</div>
      <h3>${c.course_title}</h3>
      <div class="lecturer">with ${c.lecturer_name}</div>
      <div class="meta-row"><span>${c.duration_hours}h</span><span>${c.lesson_count} lessons</span><span>${c.enrollment_count} enrolled</span></div>
      <div class="price">${fmtMoney(c.price)}</div>
    `;
    const actions = el("div", { class: "actions" });
    actions.appendChild(el("button", { class: "btn ghost small", onclick: () => openCourseDetail(c.course_id) }, "View"));
    if (state.user && state.user.role === "ADMIN") {
      actions.appendChild(el("button", { class: "btn ghost small", onclick: () => openEditCourse(c) }, "Edit"));
      actions.appendChild(el("button", { class: "btn ghost small", onclick: () => deleteCourseConfirm(c) }, "Delete"));
    }
    card.appendChild(actions);
    return card;
  }

  function openEditCourse(c) {
    const form = el("form", { class: "form-grid single" });
    form.innerHTML = `
      <div class="field"><label>Title</label><input name="title" value="${escapeHtml(c.course_title)}" required /></div>
      <div class="field"><label>Level</label>
        <select name="level">
          <option ${c.course_level === "Beginner" ? "selected" : ""}>Beginner</option>
          <option ${c.course_level === "Intermediate" ? "selected" : ""}>Intermediate</option>
          <option ${c.course_level === "Advanced" ? "selected" : ""}>Advanced</option>
        </select>
      </div>
      <div class="field"><label>Price (USD)</label><input name="price" type="number" min="0" step="0.01" value="${c.price}" required /></div>
      <div class="field"><label>Duration (hours)</label><input name="durationHours" type="number" min="1" value="${c.duration_hours}" required /></div>
      <div class="field"><label>Status</label>
        <select name="status">
          <option ${c.published_status === "DRAFT" ? "selected" : ""}>DRAFT</option>
          <option ${c.published_status === "PUBLISHED" ? "selected" : ""}>PUBLISHED</option>
          <option ${c.published_status === "ARCHIVED" ? "selected" : ""}>ARCHIVED</option>
        </select>
      </div>
      <div><button class="btn teal" type="submit">Save changes</button></div>
    `;
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      try {
        await api(`/courses/${c.course_id}`, {
          method: "PUT",
          body: {
            title: fd.get("title"),
            level: fd.get("level"),
            price: Number(fd.get("price")),
            durationHours: Number(fd.get("durationHours")),
            status: fd.get("status"),
          },
        });
        toast("Course updated.", "success");
        closeModal();
        loadCatalogue();
      } catch (err) { toast(err.message, "error"); }
    });
    openModal(`Edit ${c.course_title}`, form);
  }

  async function deleteCourseConfirm(c) {
    if (!confirm(`Delete "${c.course_title}"? This only works if the course has no enrollments.`)) return;
    try {
      await api(`/courses/${c.course_id}`, { method: "DELETE" });
      toast("Course deleted.", "success");
      loadCatalogue();
    } catch (err) { toast(err.message, "error"); }
  }

  async function loadCatalogue() {
    const params = new URLSearchParams();
    const search = document.getElementById("course-search").value.trim();
    const category = document.getElementById("course-category-filter").value;
    const level = document.getElementById("course-level-filter").value;
    const status = document.getElementById("course-status-filter").value;
    if (search) params.set("search", search);
    if (category) params.set("category", category);
    if (level) params.set("level", level);
    if (status) params.set("status", status);
    // students/guests should only ever see published courses
    if (!state.user || state.user.role === "STUDENT") params.set("status", "PUBLISHED");

    const courses = await api(`/courses?${params.toString()}`);
    state.courses = courses;
    const grid = document.getElementById("course-grid");
    grid.innerHTML = "";
    if (!courses.length) {
      grid.appendChild(el("div", { class: "empty-state" }, "No courses match those filters."));
      return;
    }
    courses.forEach((c) => grid.appendChild(courseCard(c)));
  }

  ["course-search", "course-category-filter", "course-level-filter", "course-status-filter"].forEach((id) => {
    document.getElementById(id).addEventListener("input", debounce(loadCatalogue, 250));
  });

  function debounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }

  document.getElementById("new-course-btn").addEventListener("click", () => {
    const form = el("form", { class: "form-grid" });
    form.innerHTML = `
      <div class="field"><label>Title</label><input name="title" required /></div>
      <div class="field"><label>Level</label><select name="level"><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></div>
      <div class="field"><label>Category</label><select name="categoryId">${state.categories.map((c) => `<option value="${c.category_id}">${c.category_name}</option>`).join("")}</select></div>
      <div class="field"><label>Lecturer</label><select name="lecturerId" id="new-course-lecturer"></select></div>
      <div class="field"><label>Price (USD)</label><input name="price" type="number" min="0" step="0.01" required /></div>
      <div class="field"><label>Duration (hours)</label><input name="durationHours" type="number" min="1" required /></div>
      <div class="field" style="grid-column:1/-1"><label>Lessons (one per line)</label><textarea name="lessons">Introduction</textarea></div>
      <div style="grid-column:1/-1"><button class="btn teal" type="submit">Create course</button></div>
    `;
    api("/lecturers").then((ls) => {
      form.querySelector("#new-course-lecturer").innerHTML = ls.map((l) => `<option value="${l.lecturer_id}">${l.full_name}</option>`).join("");
    });
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      try {
        await api("/courses", {
          method: "POST",
          body: {
            title: fd.get("title"),
            level: fd.get("level"),
            categoryId: Number(fd.get("categoryId")),
            lecturerId: Number(fd.get("lecturerId")),
            price: Number(fd.get("price")),
            durationHours: Number(fd.get("durationHours")),
            status: "DRAFT",
            lessons: fd.get("lessons").split("\n").map((s) => s.trim()).filter(Boolean),
          },
        });
        toast("Course created as draft.", "success");
        closeModal();
        loadCatalogue();
      } catch (err) { toast(err.message, "error"); }
    });
    openModal("New course", form);
  });

  // ---------------------------------------------------------------- course detail
  async function openCourseDetail(courseId) {
    state.currentCourseId = courseId;
    showView("course-detail");
    const body = document.getElementById("course-detail-body");
    body.innerHTML = "<p class='small-muted'>Loading&hellip;</p>";
    const c = await api(`/courses/${courseId}`);

    const isEnrolled = state.user && state.user.role === "STUDENT" ? await isStudentEnrolled(courseId) : null;

    const wrap = el("div");
    wrap.innerHTML = `
      <span class="eyebrow">${c.category_name} &middot; ${c.course_level}</span>
      <h1>${c.course_title}</h1>
      <p class="lede">Taught by ${c.lecturer_name} &middot; ${c.duration_hours} hours &middot; <span class="status-chip ${c.published_status}">${c.published_status}</span></p>
      <div class="two-col" style="margin-top:18px">
        <div class="card card-pad">
          <div class="section-title"><h3>Lessons</h3><span class="hint">${c.lessons.length} total</span></div>
          <ol>${c.lessons.map((l) => `<li>${l.lesson_title} <span class="small-muted">(${l.estimated_minutes}m)</span></li>`).join("")}</ol>
          <div class="section-title"><h3>Resources</h3><span class="hint">MongoDB &middot; flexible content</span></div>
          ${
            c.resources.length
              ? c.resources
                  .map(
                    (r) => `<div style="margin-bottom:8px"><strong>${r.module}</strong><br/>${r.resources
                      .map((x) => `<span class="tag-pill">${x.type}</span> ${x.title}`)
                      .join("<br/>")}</div>`
                  )
                  .join("")
              : `<p class="small-muted">No supplementary resources uploaded yet.</p>`
          }
        </div>
        <div>
          <div class="card card-pad" style="margin-bottom:14px">
            <div class="kpi-label">Price</div>
            <div class="kpi-value">${fmtMoney(c.price)}</div>
            <div style="margin-top:6px">${c.rating ? stars(c.rating.averageRating) + ` <span class="small-muted">(${c.rating.reviewCount} reviews)</span>` : `<span class="small-muted">No ratings yet</span>`}</div>
            <div id="enroll-slot" style="margin-top:12px"></div>
          </div>
          <div class="card card-pad">
            <div class="section-title"><h3>Feedback</h3><span class="hint">${c.reviews.length}</span></div>
            <div id="review-list">${
              c.reviews.length
                ? c.reviews.map((r) => `<div class="review-item">${stars(r.rating)}<br/><span class="small-muted">${r.studentEmail} &middot; ${fmtDate(r.createdAt)}</span><p style="margin:4px 0 0">${escapeHtml(r.feedback)}</p></div>`).join("")
                : `<div class="empty-state">No feedback yet.</div>`
            }</div>
          </div>
        </div>
      </div>
    `;
    body.innerHTML = "";
    body.appendChild(wrap);

    const slot = wrap.querySelector("#enroll-slot");
    if (!state.user) {
      slot.innerHTML = `<span class="small-muted">Sign in to enroll.</span>`;
    } else if (state.user.role !== "STUDENT") {
      slot.innerHTML = `<span class="small-muted">Signed in as ${state.user.role.toLowerCase()}.</span>`;
    } else if (isEnrolled) {
      slot.innerHTML = `<span class="status-chip PUBLISHED">Already enrolled</span>`;
      const reviewBtn = el("button", { class: "btn ghost small", style: "margin-top:8px;display:block" }, "Leave a review");
      reviewBtn.addEventListener("click", () => openReviewModal(c));
      slot.appendChild(reviewBtn);
    } else {
      const btn = el("button", { class: "btn teal", style: "width:100%" }, c.published_status === "PUBLISHED" ? "Enroll now" : "Not open for enrollment");
      btn.disabled = c.published_status !== "PUBLISHED";
      btn.addEventListener("click", async () => {
        btn.disabled = true;
        try {
          await api("/enrollments", { method: "POST", body: { courseId } });
          toast("Enrolled! Find it under My learning.", "success");
          openCourseDetail(courseId);
        } catch (err) {
          toast(err.message, "error");
          btn.disabled = false;
        }
      });
      slot.appendChild(btn);
    }
  }

  async function isStudentEnrolled(courseId) {
    const rows = await api(`/enrollments?courseId=${courseId}`);
    return rows.length > 0;
  }

  function openReviewModal(course) {
    const form = el("form", { class: "form-grid single" });
    form.innerHTML = `
      <div class="field"><label>Rating (1&ndash;5)</label><input name="rating" type="number" min="1" max="5" value="5" required /></div>
      <div class="field"><label>Feedback</label><textarea name="feedback" placeholder="What stood out?"></textarea></div>
      <div><button class="btn teal" type="submit">Submit review</button></div>
    `;
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      try {
        await api("/reviews", { method: "POST", body: { courseId: course.course_id, rating: Number(fd.get("rating")), feedback: fd.get("feedback") } });
        toast("Thanks for the feedback!", "success");
        closeModal();
        openCourseDetail(course.course_id);
      } catch (err) { toast(err.message, "error"); }
    });
    openModal(`Review: ${course.course_title}`, form);
  }

  function escapeHtml(str) {
    const d = document.createElement("div");
    d.textContent = str || "";
    return d.innerHTML;
  }

  // ---------------------------------------------------------------- my learning
  async function loadMyLearning() {
    const enrollments = await api("/enrollments");
    const body = document.getElementById("mylearning-body");
    if (!enrollments.length) {
      body.innerHTML = `<div class="empty-state">You haven't enrolled in any courses yet — visit the catalogue to get started.</div>`;
    } else {
      body.innerHTML = "";
      for (const en of enrollments) {
        const [progress, course] = await Promise.all([
          api(`/enrollments/${en.enrollment_id}/progress`),
          api(`/courses/${en.course_id}`),
        ]);
        const doneIds = new Set(progress.filter((p) => p.completed_flag === "Y").map((p) => p.lesson_id));
        const nextLesson = course.lessons.find((l) => !doneIds.has(l.lesson_id));

        const card = el("div", { class: "card card-pad", style: "margin-bottom:14px" });
        card.innerHTML = `
          <div class="section-title">
            <h3>${en.course_title}</h3>
            <span class="status-chip ${en.enrollment_status}">${en.enrollment_status}</span>
          </div>
          <div class="progress-track" style="margin:6px 0 4px"><div class="progress-fill" style="width:${en.completion_percent}%"></div></div>
          <div class="small-muted">${en.completion_percent}% complete ${en.final_score != null ? `&middot; avg score ${en.final_score}` : ""}</div>
          <div class="small-muted" style="margin-top:4px">Payment: <span class="status-chip ${en.payment_status}">${en.payment_status || "N/A"}</span> ${en.payment_status === "PENDING" ? `&middot; ${fmtMoney(en.payment_amount)} due` : ""}</div>
        `;
        const actionRow = el("div", { style: "margin-top:10px;display:flex;gap:8px;flex-wrap:wrap" });

        if (en.payment_status === "PENDING") {
          const payBtn = el("button", { class: "btn small teal" }, `Pay ${fmtMoney(en.payment_amount)}`);
          payBtn.addEventListener("click", async () => {
            payBtn.disabled = true;
            try {
              await api(`/payments/${en.enrollment_id}/pay`, {
                method: "POST",
                body: { amount: en.payment_amount, method: "CARD", transactionRef: `TXN-${Date.now()}` },
              });
              toast("Payment recorded.", "success");
              loadMyLearning();
            } catch (err) { toast(err.message, "error"); payBtn.disabled = false; }
          });
          actionRow.appendChild(payBtn);
        }

        if (nextLesson) {
          const completeBtn = el("button", { class: "btn small teal" }, `Mark "${nextLesson.lesson_title}" complete`);
          completeBtn.addEventListener("click", async () => {
            completeBtn.disabled = true;
            try {
              const score = Math.floor(60 + Math.random() * 40);
              await api(`/progress/${en.enrollment_id}/complete-lesson`, { method: "POST", body: { lessonId: nextLesson.lesson_id, quizScore: score } });
              toast(`Lesson complete (quiz score ${score}).`, "success");
              loadMyLearning();
            } catch (err) { toast(err.message, "error"); completeBtn.disabled = false; }
          });
          actionRow.appendChild(completeBtn);
        }

        actionRow.appendChild((() => {
          const b = el("button", { class: "btn small ghost" }, "View course");
          b.addEventListener("click", () => openCourseDetail(en.course_id));
          return b;
        })());

        card.appendChild(actionRow);
        body.appendChild(card);
      }
    }

    const certs = await api(`/students/${state.user.studentId}/certificates`);
    const certBox = document.getElementById("mylearning-certs");
    certBox.innerHTML = certs.length
      ? certs.map((c) => `<div class="certificate-card"><div class="small-muted">Certificate of completion</div><h3>${c.course_title}</h3><div class="code">${c.certificate_code}</div><div class="small-muted">issued ${fmtDate(c.issued_date)}</div></div>`).join("")
      : `<div class="empty-state">Complete a course to earn your first certificate.</div>`;
  }

  // ---------------------------------------------------------------- community
  function switchCommunityTab(tab) {
    document.querySelectorAll("[data-ctab]").forEach((b) => b.classList.toggle("active", b.dataset.ctab === tab));
    document.getElementById("community-reviews").style.display = tab === "reviews" ? "" : "none";
    document.getElementById("community-forum").style.display = tab === "forum" ? "" : "none";
    document.getElementById("community-resources").style.display = tab === "resources" ? "" : "none";
  }
  document.querySelectorAll("[data-ctab]").forEach((btn) => btn.addEventListener("click", () => switchCommunityTab(btn.dataset.ctab)));

  async function loadCommunity() {
    switchCommunityTab("reviews");
    const [topRated, threads, courses] = await Promise.all([
      api("/reviews/top-rated"),
      api("/forums"),
      api("/courses?status=PUBLISHED"),
    ]);
    state.communityCourseIndex = Object.fromEntries(courses.map((c) => [c.course_id, c]));

    document.getElementById("community-reviews").innerHTML = `
      <div class="card card-pad">
        <div class="section-title"><h3>Top rated courses</h3><span class="hint">MongoDB aggregation, sorted by average rating</span></div>
        <table class="data" id="top-rated-table"></table>
      </div>`;
    renderTable("top-rated-table", [
      { label: "Course", render: (r) => r.courseTitle },
      { label: "Rating", render: (r) => stars(r.averageRating) },
      { label: "Reviews", key: "reviewCount", num: true },
    ], topRated, "No reviews yet.");

    renderForumList(threads);

    const courseSel = document.getElementById("resource-course-filter");
    courseSel.innerHTML = `<option value="">Choose a course&hellip;</option>` + courses.map((c) => `<option value="${c.course_id}">${c.course_title}</option>`).join("");
  }

  function renderForumList(threads) {
    const box = document.getElementById("forum-list");
    if (!threads.length) {
      box.innerHTML = `<div class="empty-state">No threads found.</div>`;
      return;
    }
    box.innerHTML = "";
    threads.forEach((t) => {
      const card = el("div", { class: "thread" });
      card.innerHTML = `
        <div class="thread-title">${t.title}</div>
        <div class="small-muted">${t.courseTitle} ${t.tags.map((tag) => `<span class="tag-pill">${tag}</span>`).join("")}</div>
        ${t.posts.map((p) => `<div class="post"><span class="author">${p.author}</span> &middot; ${fmtDate(p.postedAt)}<div>${escapeHtml(p.body)}</div></div>`).join("")}
      `;
      if (state.user) {
        const replyForm = el("form", { style: "margin-top:10px;display:flex;gap:6px" });
        replyForm.innerHTML = `<input name="body" placeholder="Write a reply&hellip;" style="flex:1;border:1px solid var(--line);border-radius:3px;padding:6px 8px" required /><button class="btn small ghost" type="submit">Reply</button>`;
        replyForm.addEventListener("submit", async (e) => {
          e.preventDefault();
          const input = replyForm.querySelector("input");
          try {
            await api(`/forums/${t._id}/reply`, { method: "POST", body: { body: input.value } });
            input.value = "";
            loadCommunity();
          } catch (err) { toast(err.message, "error"); }
        });
        card.appendChild(replyForm);
      }
      box.appendChild(card);
    });
  }

  document.getElementById("forum-search-btn").addEventListener("click", async () => {
    const q = document.getElementById("forum-search").value.trim();
    const threads = await api(`/forums/search?q=${encodeURIComponent(q)}`);
    renderForumList(threads);
  });
  document.getElementById("forum-search").addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); document.getElementById("forum-search-btn").click(); }
  });

  document.getElementById("new-thread-btn").addEventListener("click", () => {
    if (!state.user) { toast("Sign in to start a thread.", "error"); return; }
    const courses = Object.values(state.communityCourseIndex);
    const form = el("form", { class: "form-grid single" });
    form.innerHTML = `
      <div class="field"><label>Course</label><select name="courseId">${courses.map((c) => `<option value="${c.course_id}">${c.course_title}</option>`).join("")}</select></div>
      <div class="field"><label>Title</label><input name="title" required /></div>
      <div class="field"><label>Tags (comma separated)</label><input name="tags" placeholder="e.g. oracle, triggers" /></div>
      <div class="field"><label>Post</label><textarea name="body" required></textarea></div>
      <div><button class="btn teal" type="submit">Post thread</button></div>
    `;
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      try {
        await api("/forums", { method: "POST", body: { courseId: Number(fd.get("courseId")), title: fd.get("title"), tags: fd.get("tags"), body: fd.get("body") } });
        toast("Thread posted.", "success");
        closeModal();
        loadCommunity();
      } catch (err) { toast(err.message, "error"); }
    });
    openModal("Start a discussion thread", form);
  });

  document.getElementById("resource-course-filter").addEventListener("change", async (e) => {
    const courseId = e.target.value;
    const box = document.getElementById("resource-list");
    if (!courseId) { box.innerHTML = ""; return; }
    const resources = await api(`/forums/resources/${courseId}`);
    box.innerHTML = resources.length
      ? resources.map((r) => `<div class="card card-pad" style="margin-bottom:10px"><strong>${r.module}</strong><ul>${r.resources.map((x) => `<li><span class="tag-pill">${x.type}</span> ${x.title}${x.durationMinutes ? ` &middot; ${x.durationMinutes}m` : ""}</li>`).join("")}</ul></div>`).join("")
      : `<div class="empty-state">No resources uploaded for this course yet.</div>`;
  });

  // ---------------------------------------------------------------- enrollments (staff)
  async function loadEnrollments() {
    const rows = await api("/enrollments");
    renderTable("enrollments-table", [
      { label: "ID", key: "enrollment_id" },
      { label: "Student", key: "student_name" },
      { label: "Course", key: "course_title" },
      { label: "Enrolled", render: (r) => fmtDate(r.enrollment_date) },
      { label: "Status", render: (r) => `<span class="status-chip ${r.enrollment_status}">${r.enrollment_status}</span>` },
      { label: "Completion", num: true, render: (r) => `${r.completion_percent}%` },
    ], rows);
  }

  // ---------------------------------------------------------------- payments (admin)
  async function loadPayments() {
    const status = document.getElementById("payment-status-filter").value;
    const rows = await api(`/payments${status ? `?status=${status}` : ""}`);
    renderTable("payments-table", [
      { label: "ID", key: "payment_id" },
      { label: "Student", key: "student_name" },
      { label: "Course", key: "course_title" },
      { label: "Amount", num: true, render: (r) => fmtMoney(r.amount) },
      { label: "Status", render: (r) => `<span class="status-chip ${r.payment_status}">${r.payment_status}</span>` },
      { label: "Ref", render: (r) => `<span class="mono">${r.transaction_ref || "&mdash;"}</span>` },
      { label: "Paid", render: (r) => fmtDate(r.paid_date) },
    ], rows);
  }
  document.getElementById("payment-status-filter").addEventListener("change", loadPayments);

  // ---------------------------------------------------------------- people (admin)
  function switchPeopleTab(tab) {
    document.querySelectorAll("[data-ptab]").forEach((b) => b.classList.toggle("active", b.dataset.ptab === tab));
    document.getElementById("people-lecturers").style.display = tab === "lecturers" ? "" : "none";
    document.getElementById("people-students").style.display = tab === "students" ? "" : "none";
  }
  document.querySelectorAll("[data-ptab]").forEach((b) => b.addEventListener("click", () => switchPeopleTab(b.dataset.ptab)));

  async function loadPeople() {
    const [lecturers, students] = await Promise.all([
      api("/lecturers"),
      state.user.role === "ADMIN" ? api("/students") : Promise.resolve([]),
    ]);
    const isAdmin = state.user.role === "ADMIN";
    const lecturerCols = [
      { label: "Name", key: "full_name" },
      { label: "Email", key: "email" },
      { label: "Expertise", key: "expertise" },
      { label: "Courses", key: "course_count", num: true },
      { label: "Status", render: (r) => `<span class="status-chip ${r.status === "ACTIVE" ? "ACTIVE ok" : "SUSPENDED"}">${r.status}</span>` },
    ];
    if (isAdmin) {
      lecturerCols.push({
        label: "",
        render: (r) => `<button class="btn ghost small" data-edit-lecturer="${r.lecturer_id}">Edit</button> <button class="btn ghost small" data-delete-lecturer="${r.lecturer_id}">Delete</button>`,
      });
    }
    renderTable("lecturers-table", lecturerCols, lecturers);
    wireLecturerActions(lecturers);

    if (isAdmin) {
      const studentCols = [
        { label: "Name", key: "full_name" },
        { label: "Email", key: "email" },
        { label: "Registered", render: (r) => fmtDate(r.registered_date) },
        { label: "Status", render: (r) => `<span class="status-chip ${r.status === "ACTIVE" ? "ACTIVE ok" : "SUSPENDED"}">${r.status}</span>` },
        { label: "", render: (r) => `<button class="btn ghost small" data-edit-student="${r.student_id}">Edit</button> <button class="btn ghost small" data-delete-student="${r.student_id}">Delete</button>` },
      ];
      renderTable("students-table", studentCols, students);
      wireStudentActions(students);
    }
  }

  function wireLecturerActions(lecturers) {
    const table = document.getElementById("lecturers-table");
    table.querySelectorAll("[data-edit-lecturer]").forEach((btn) => {
      btn.addEventListener("click", () => openEditLecturer(lecturers.find((l) => l.lecturer_id === Number(btn.dataset.editLecturer))));
    });
    table.querySelectorAll("[data-delete-lecturer]").forEach((btn) => {
      btn.addEventListener("click", () => deleteLecturer(Number(btn.dataset.deleteLecturer)));
    });
  }

  function wireStudentActions(students) {
    const table = document.getElementById("students-table");
    table.querySelectorAll("[data-edit-student]").forEach((btn) => {
      btn.addEventListener("click", () => openEditStudent(students.find((s) => s.student_id === Number(btn.dataset.editStudent))));
    });
    table.querySelectorAll("[data-delete-student]").forEach((btn) => {
      btn.addEventListener("click", () => deleteStudent(Number(btn.dataset.deleteStudent)));
    });
  }

  function openEditLecturer(lecturer) {
    const form = el("form", { class: "form-grid single" });
    form.innerHTML = `
      <div class="field"><label>Full name</label><input name="fullName" value="${escapeHtml(lecturer.full_name)}" required /></div>
      <div class="field"><label>Expertise</label><input name="expertise" value="${escapeHtml(lecturer.expertise)}" required /></div>
      <div class="field"><label>Status</label><select name="status"><option ${lecturer.status === "ACTIVE" ? "selected" : ""}>ACTIVE</option><option ${lecturer.status === "INACTIVE" ? "selected" : ""}>INACTIVE</option></select></div>
      <div><button class="btn teal" type="submit">Save changes</button></div>
    `;
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      try {
        await api(`/lecturers/${lecturer.lecturer_id}`, { method: "PUT", body: Object.fromEntries(fd.entries()) });
        toast("Lecturer updated.", "success");
        closeModal();
        loadPeople();
      } catch (err) { toast(err.message, "error"); }
    });
    openModal(`Edit ${lecturer.full_name}`, form);
  }

  async function deleteLecturer(id) {
    if (!confirm("Delete this lecturer? This only works if they have no courses assigned.")) return;
    try {
      await api(`/lecturers/${id}`, { method: "DELETE" });
      toast("Lecturer deleted.", "success");
      loadPeople();
    } catch (err) { toast(err.message, "error"); }
  }

  function openEditStudent(student) {
    const form = el("form", { class: "form-grid single" });
    form.innerHTML = `
      <div class="field"><label>Full name</label><input name="fullName" value="${escapeHtml(student.full_name)}" required /></div>
      <div class="field"><label>Status</label>
        <select name="status">
          <option ${student.status === "ACTIVE" ? "selected" : ""}>ACTIVE</option>
          <option ${student.status === "SUSPENDED" ? "selected" : ""}>SUSPENDED</option>
          <option ${student.status === "GRADUATED" ? "selected" : ""}>GRADUATED</option>
        </select>
      </div>
      <div><button class="btn teal" type="submit">Save changes</button></div>
    `;
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      try {
        await api(`/students/${student.student_id}`, { method: "PUT", body: Object.fromEntries(fd.entries()) });
        toast("Student updated.", "success");
        closeModal();
        loadPeople();
      } catch (err) { toast(err.message, "error"); }
    });
    openModal(`Edit ${student.full_name}`, form);
  }

  async function deleteStudent(id) {
    if (!confirm("Delete this student? This only works if they have no enrollment history.")) return;
    try {
      await api(`/students/${id}`, { method: "DELETE" });
      toast("Student deleted.", "success");
      loadPeople();
    } catch (err) { toast(err.message, "error"); }
  }

  document.getElementById("new-lecturer-btn").addEventListener("click", () => {
    const form = el("form", { class: "form-grid single" });
    form.innerHTML = `
      <div class="field"><label>Full name</label><input name="fullName" required /></div>
      <div class="field"><label>Email</label><input name="email" type="email" required /></div>
      <div class="field"><label>Expertise</label><input name="expertise" required /></div>
      <div><button class="btn teal" type="submit">Add lecturer</button></div>
    `;
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      try {
        await api("/lecturers", { method: "POST", body: Object.fromEntries(fd.entries()) });
        toast("Lecturer added.", "success");
        closeModal();
        loadPeople();
      } catch (err) { toast(err.message, "error"); }
    });
    openModal("Add lecturer", form);
  });

  document.getElementById("new-student-btn").addEventListener("click", () => {
    const form = el("form", { class: "form-grid single" });
    form.innerHTML = `
      <div class="field"><label>Full name</label><input name="fullName" required /></div>
      <div class="field"><label>Email</label><input name="email" type="email" required /></div>
      <div><button class="btn teal" type="submit">Add student</button></div>
    `;
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      try {
        await api("/students", { method: "POST", body: Object.fromEntries(fd.entries()) });
        toast("Student added.", "success");
        closeModal();
        loadPeople();
      } catch (err) { toast(err.message, "error"); }
    });
    openModal("Add student", form);
  });

  // ---------------------------------------------------------------- reports
  const REPORT_TITLES = {
    "popular-courses": "Most popular courses by enrollment",
    revenue: "Revenue within a time period",
    "pending-payments": "Pending payments",
    "lecturer-performance": "Lecturer performance",
    "hybrid-course-health": "Course health — Oracle revenue \u00d7 MongoDB sentiment",
  };
  let currentReport = "popular-courses";

  document.getElementById("report-tabs").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-report]");
    if (btn) loadReport(btn.dataset.report);
  });

  function reportQuery() {
    if (currentReport === "revenue") {
      const start = document.getElementById("rep-start")?.value || "2000-01-01";
      const end = document.getElementById("rep-end")?.value || "2999-12-31";
      return `?start=${start}&end=${end}`;
    }
    if (currentReport === "student-progress") {
      const id = document.getElementById("rep-student")?.value;
      return id ? `` : ``;
    }
    return "";
  }

  async function loadReport(name) {
    currentReport = name;
    document.querySelectorAll("#report-tabs button").forEach((b) => b.classList.toggle("active", b.dataset.report === name));
    document.getElementById("report-title").textContent = REPORT_TITLES[name];

    const controls = document.getElementById("report-controls");
    controls.innerHTML = "";
    if (name === "revenue") {
      controls.innerHTML = `
        <input type="date" id="rep-start" value="2026-01-01" />
        <input type="date" id="rep-end" value="2026-12-31" />
        <button class="btn small ghost" id="rep-apply">Apply</button>
      `;
      document.getElementById("rep-apply").addEventListener("click", () => renderReport(name));
    }

    await renderReport(name);
  }

  async function renderReport(name) {
    const table = document.getElementById("report-table");
    if (name === "revenue") {
      const data = await api(`/reports/revenue${reportQuery()}`);
      table.parentElement.querySelector(".section-title .hint")?.remove();
      renderTable("report-table", [
        { label: "Course", key: "course_title" },
        { label: "Paid transactions", key: "paid_transactions", num: true },
        { label: "Total revenue", num: true, render: (r) => fmtMoney(r.total_revenue) },
      ], data.rows, "No paid transactions in this period.");
      const head = document.getElementById("report-title");
      head.textContent = `${REPORT_TITLES.revenue} — total ${fmtMoney(data.total)}`;
      return;
    }
    if (name === "popular-courses") {
      const rows = await api("/reports/popular-courses");
      renderTable("report-table", [
        { label: "Course", key: "course_title" },
        { label: "Enrollments", key: "enrollment_count", num: true },
        { label: "Revenue", num: true, render: (r) => fmtMoney(r.revenue) },
      ], rows);
      return;
    }
    if (name === "pending-payments") {
      const rows = await api("/reports/pending-payments");
      renderTable("report-table", [
        { label: "Student", key: "student_name" },
        { label: "Course", key: "course_title" },
        { label: "Amount", num: true, render: (r) => fmtMoney(r.amount) },
        { label: "Enrolled", render: (r) => fmtDate(r.enrollment_date) },
      ], rows, "No pending payments — nice and tidy.");
      return;
    }
    if (name === "lecturer-performance") {
      const rows = await api("/reports/lecturer-performance");
      renderTable("report-table", [
        { label: "Lecturer", key: "full_name" },
        { label: "Courses", key: "course_count", num: true },
        { label: "Enrollments", key: "enrollment_count", num: true },
        { label: "Revenue", num: true, render: (r) => fmtMoney(r.revenue) },
        { label: "Avg. score", key: "average_score", num: true },
      ], rows);
      return;
    }
    if (name === "hybrid-course-health") {
      const rows = await api("/reports/hybrid-course-health");
      renderTable("report-table", [
        { label: "Course", key: "course_title" },
        { label: "Enrollments", key: "enrollment_count", num: true },
        { label: "Revenue", num: true, render: (r) => fmtMoney(r.revenue) },
        { label: "Avg. rating", render: (r) => (r.average_rating == null ? "&mdash;" : stars(r.average_rating)) },
        { label: "Flag", render: (r) => `<span class="status-chip ${r.flag === "OK" ? "PUBLISHED" : "PENDING"}">${r.flag.replaceAll("_", " ")}</span>` },
      ], rows);
    }
  }

  document.getElementById("report-csv-btn").addEventListener("click", () => {
    const path = currentReport === "revenue" ? `revenue${reportQuery()}` : currentReport;
    const sep = path.includes("?") ? "&" : "?";
    window.open(`/api/reports/${path}${sep}format=csv`, "_blank");
  });

  // ---------------------------------------------------------------- boot
  (async function boot() {
    try {
      const { user } = await api("/auth/me");
      if (user) setSignedIn(user);
      else setSignedOut();
    } catch {
      setSignedOut();
    }
  })();
})();
