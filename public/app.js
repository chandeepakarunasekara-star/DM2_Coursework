/* CourseConnect App Frontend - Interactive Simulator Controller */

// Core Request Helper
async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `HTTP error ${response.status}`);
  }
  return response.json();
}

async function postJson(url, data) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  const resData = await response.json();
  if (!response.ok) {
    throw new Error(resData.error || `HTTP error ${response.status}`);
  }
  return resData;
}

// Currency Formatter
function money(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

// Format Date
function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-US", { year: 'numeric', month: 'short', day: 'numeric' });
}

// Active State Cache
let activeCourseId = null;
let activeStudentId = null;
let activeEnrollmentId = null;
let coursesCache = [];

// 1. Navigation & Theme Initialization
function initTheme() {
  const toggleBtn = document.querySelector("#theme-toggle");
  
  // Check local storage or system preference
  if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark-theme");
  }

  toggleBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark-theme");
    if (document.body.classList.contains("dark-theme")) {
      localStorage.setItem("theme", "dark");
    } else {
      localStorage.setItem("theme", "light");
    }
  });
}

function initTabs() {
  const navItems = document.querySelectorAll(".nav-item");
  const tabPanels = document.querySelectorAll(".tab-panel");

  navItems.forEach(item => {
    item.addEventListener("click", () => {
      const targetTab = item.getAttribute("data-tab");

      navItems.forEach(n => n.classList.remove("active"));
      tabPanels.forEach(p => p.classList.remove("active"));

      item.classList.add("active");
      document.getElementById(targetTab).classList.add("active");

      // Load specific tab data on switch
      if (targetTab === "dashboard-tab") loadDashboard();
      if (targetTab === "courses-tab") loadCourses();
      if (targetTab === "enrollments-tab") loadEnrollmentsTab();
      if (targetTab === "progress-tab") loadProgressTab();
      if (targetTab === "reports-tab") loadReportsTab();
    });
  });

  // Docs Inner Tabs
  const docBtns = document.querySelectorAll(".docs-tab-btn");
  const docPanels = document.querySelectorAll(".docs-panel");

  docBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const targetDoc = btn.getAttribute("data-doc");
      docBtns.forEach(b => b.classList.remove("active"));
      docPanels.forEach(p => p.classList.remove("active"));

      btn.classList.add("active");
      document.getElementById(`doc-${targetDoc}`).classList.add("active");
    });
  });
}

// Live Time Indicator
function updateTime() {
  const clock = document.getElementById("live-time");
  if (clock) {
    clock.textContent = new Date().toLocaleTimeString("en-US", { hour12: false });
  }
}
setInterval(updateTime, 1000);
updateTime();

// 2. Tab 1: Dashboard overview
async function loadDashboard() {
  try {
    const dashboard = await getJson("/api/dashboard");
    
    // KPI Cards
    const kpiContainer = document.querySelector("#kpi-dashboard");
    kpiContainer.innerHTML = [
      { label: "Active Courses", val: dashboard.courses, sub: "Oracle DDL published", isPending: false },
      { label: "Students Registered", val: dashboard.students, sub: "Active profiles", isPending: false },
      { label: "Active Enrollments", val: dashboard.activeEnrollments, sub: "In-progress lectures", isPending: false },
      { label: "Revenue Collected", val: money(dashboard.revenue), sub: "Oracle verified payments", isPending: false },
      { label: "Pending Payments", val: dashboard.pendingPayments, sub: "Outstanding invoices", isPending: true }
    ].map(kpi => `
      <div class="kpi-card">
        <div>
          <div class="kpi-label">${kpi.label}</div>
          <div class="kpi-val">${kpi.val}</div>
        </div>
        <div class="kpi-sub ${kpi.isPending && kpi.val > 0 ? 'pending' : ''}">
          <span>${kpi.sub}</span>
        </div>
      </div>
    `).join("");

    // Popular Courses List
    const popularCourses = await getJson("/api/reports/popular-courses");
    const popularContainer = document.querySelector("#popular-courses-list");
    popularContainer.innerHTML = popularCourses.slice(0, 3).map((course, idx) => `
      <div class="pop-item">
        <div class="pop-info">
          <strong>${idx + 1}. ${course.title}</strong>
          <p>Rating: ${course.averageRating ? `${course.averageRating} ★` : 'No reviews'}</p>
        </div>
        <div class="pop-metric">
          <strong>${course.enrollments} Students</strong>
          <p>Revenue: ${money(course.revenue)}</p>
        </div>
      </div>
    `).join("");

  } catch (error) {
    console.error("Dashboard failed to load", error);
  }
}

// 3. Tab 2: Course Catalogue
async function loadCourses() {
  try {
    coursesCache = await getJson("/api/courses");
    renderCoursesGrid("all");
    
    // Filter controls
    const filterBtns = document.querySelectorAll(".filter-btn");
    filterBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        filterBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        renderCoursesGrid(btn.getAttribute("data-level"));
      });
    });
  } catch (error) {
    console.error("Courses failed to load", error);
  }
}

function renderCoursesGrid(levelFilter) {
  const container = document.querySelector("#course-cards-container");
  const filtered = levelFilter === "all" 
    ? coursesCache 
    : coursesCache.filter(c => c.level === levelFilter);

  if (!filtered.length) {
    container.innerHTML = `<div class="empty-state"><p>No courses found for this level.</p></div>`;
    return;
  }

  container.innerHTML = filtered.map(course => `
    <article class="course-card-cc" onclick="openCourseDrawer('${course.id}')">
      <div class="badge-row">
        <span class="level-badge">${course.level}</span>
        <span class="domain-badge">${course.domain}</span>
      </div>
      <h3>${course.title}</h3>
      <p class="instructor-desc">Instructor: ${course.lecturer}</p>
      <div class="card-footer">
        <span class="price-text">${money(course.price)}</span>
        <span class="rating-block">
          <span class="star-icon">★</span>
          <strong>${course.averageRating ? course.averageRating : '0.0'}</strong>
          <span style="color:var(--text-muted); font-weight:normal;">(${course.enrollments} enr)</span>
        </span>
      </div>
    </article>
  `).join("");
}

// 4. Tab 3: Enrollments & Payments
async function loadEnrollmentsTab() {
  try {
    const [students, courses, pendingPayments] = await Promise.all([
      getJson("/api/students"),
      getJson("/api/courses"),
      getJson("/api/reports/pending-payments")
    ]);

    // Populate dropdown selections
    document.querySelector("#student-select").innerHTML = students
      .map(s => `<option value="${s.id}">${s.name} (${s.email})</option>`).join("");
    document.querySelector("#course-select").innerHTML = courses
      .map(c => `<option value="${c.id}">${c.title} - ${money(c.price)}</option>`).join("");

    // Populate payments ledger
    const ledgerBody = document.querySelector("#payments-ledger-body");
    if (!pendingPayments.length) {
      ledgerBody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);">No pending payments. All clear!</td></tr>`;
      return;
    }

    ledgerBody.innerHTML = pendingPayments.map(pay => `
      <tr>
        <td><strong>${pay.paymentId}</strong></td>
        <td>${pay.studentName}</td>
        <td>${pay.courseTitle}</td>
        <td><strong>${money(pay.amount)}</strong></td>
        <td><span class="badge pending">${pay.status}</span></td>
        <td>
          <button class="pay-btn" onclick="processPayment('${pay.enrollmentId}', ${pay.amount})">Record Payment</button>
        </td>
      </tr>
    `).join("");

  } catch (error) {
    console.error("Enrollments tab failed to load", error);
  }
}

// Process Payment simulation
async function processPayment(enrollmentId, amount) {
  try {
    const txnRef = `TXN-CC-${Math.floor(100000 + Math.random() * 900000)}`;
    const result = await postJson("/api/payments/pay", {
      enrollmentId,
      amount,
      paymentMethod: "CARD",
      transactionRef: txnRef
    });
    alert(result.message);
    loadEnrollmentsTab();
    loadDashboard();
  } catch (error) {
    alert("Payment failed: " + error.message);
  }
}

// Enroll student Form submit handler
document.querySelector("#enrollment-form-main").addEventListener("submit", async (e) => {
  e.preventDefault();
  const feedback = document.querySelector("#enrollment-status-msg");
  const studentId = document.querySelector("#student-select").value;
  const courseId = document.querySelector("#course-select").value;

  feedback.className = "form-feedback";
  feedback.textContent = "Processing enrollment...";

  try {
    const result = await postJson("/api/enrollments", { studentId, courseId });
    feedback.className = "form-feedback success";
    feedback.textContent = `Enrolled! Invoice ${result.enrollment.id} generated. Please complete payment below.`;
    loadEnrollmentsTab();
    loadDashboard();
  } catch (error) {
    feedback.className = "form-feedback error";
    feedback.textContent = error.message;
  }
});

// 5. Tab 4: Student Progress Tracker
async function loadProgressTab() {
  try {
    const students = await getJson("/api/students");
    const select = document.querySelector("#progress-student-select");
    
    // Bind change listener
    select.onchange = () => loadStudentProgress(select.value);
    
    select.innerHTML = `<option value="">-- Select Student Profile --</option>` + 
      students.map(s => `<option value="${s.id}">${s.name}</option>`).join("");

    // Reset panel
    document.querySelector("#progress-details-panel").innerHTML = `
      <div class="empty-state">
        <p>Select a student enrollment on the left to track progress, complete quizzes, and view earned certifications.</p>
      </div>
    `;
    document.querySelector("#progress-enrollments-list").innerHTML = "";

    if (activeStudentId) {
      select.value = activeStudentId;
      loadStudentProgress(activeStudentId);
    }
  } catch (error) {
    console.error("Progress tab failed to load", error);
  }
}

async function loadStudentProgress(studentId) {
  if (!studentId) {
    document.querySelector("#progress-enrollments-list").innerHTML = "";
    return;
  }
  activeStudentId = studentId;
  try {
    const allProgress = await getJson("/api/reports/progress");
    const studentProgress = allProgress.filter(p => p.studentId === studentId);
    
    const enrollmentsList = document.querySelector("#progress-enrollments-list");
    
    if (!studentProgress.length) {
      enrollmentsList.innerHTML = `<p style="font-size:12px;color:var(--text-muted);text-align:center;">Not enrolled in any courses.</p>`;
      document.querySelector("#progress-details-panel").innerHTML = `
        <div class="empty-state">
          <p>This student is not registered in any course tracks yet.</p>
        </div>
      `;
      return;
    }

    enrollmentsList.innerHTML = studentProgress.map(e => `
      <div class="enroll-item-card ${activeEnrollmentId === e.enrollmentId ? 'active' : ''}" onclick="selectEnrollmentProgress('${e.enrollmentId}')">
        <h4>${e.course}</h4>
        <div class="mini-bar">
          <div class="mini-progress" style="width: ${e.completionPercent}%"></div>
        </div>
        <div class="mini-desc">
          <span>${e.status}</span>
          <span>${e.completionPercent}%</span>
        </div>
      </div>
    `).join("");

    // Restore selected detail
    if (activeEnrollmentId && studentProgress.some(e => e.enrollmentId === activeEnrollmentId)) {
      renderEnrollmentDetail(activeEnrollmentId);
    } else {
      activeEnrollmentId = null;
    }

  } catch (error) {
    console.error("Failed to load student progress list", error);
  }
}

function selectEnrollmentProgress(enrollmentId) {
  activeEnrollmentId = enrollmentId;
  
  // Highlight active card
  document.querySelectorAll(".enroll-item-card").forEach(card => {
    card.classList.remove("active");
  });
  
  // Refresh list
  loadStudentProgress(activeStudentId);
  renderEnrollmentDetail(enrollmentId);
}

async function renderEnrollmentDetail(enrollmentId) {
  const panel = document.querySelector("#progress-details-panel");
  panel.innerHTML = `<p style="text-align:center;color:var(--text-muted);">Loading progress detail...</p>`;

  try {
    const [allProgress, payments, certificates] = await Promise.all([
      getJson("/api/reports/progress"),
      getJson("/api/reports/pending-payments"),
      getJson("/api/certificates")
    ]);

    const progInfo = allProgress.find(p => p.enrollmentId === enrollmentId);
    if (!progInfo) {
      panel.innerHTML = `<div class="empty-state"><p>Progress logs not found.</p></div>`;
      return;
    }

    // Check if unpaid
    const isUnpaid = payments.some(p => p.enrollmentId === enrollmentId);
    const cert = certificates.find(c => c.enrollmentId === enrollmentId);

    // Reconstruct course lessons based on lessons total (simulate 10 lessons)
    const totalLessons = 10;
    
    // Simulate lesson items
    const lessons = [];
    for(let i=1; i<=totalLessons; i++) {
      lessons.push({
        id: i,
        title: `Module lesson 0${i}: Structured content`,
        completed: i <= (progInfo.completionPercent / 10),
        score: i <= (progInfo.completionPercent / 10) ? progInfo.score : null
      });
    }

    panel.innerHTML = `
      <div class="progress-header">
        <div class="badge-row">
          <span class="badge ${progInfo.status === 'COMPLETED' ? 'completed' : 'active'}">${progInfo.status}</span>
          <span class="score-badge">Final Grade: ${progInfo.score ? `${progInfo.score}%` : 'N/A'}</span>
        </div>
        <h3 style="font-size: 22px; margin-top:8px;">${progInfo.course}</h3>
        <p class="panel-desc">Student Profile: ${progInfo.student}</p>
      </div>

      <!-- Progress Indicators -->
      <div class="progress-container-bar">
        <div class="bar-outer">
          <div class="bar-inner" style="width: ${progInfo.completionPercent}%"></div>
        </div>
        <span class="bar-text">${progInfo.completionPercent}%</span>
      </div>

      ${isUnpaid ? `
        <div class="alert-box note" style="border-left-color: var(--warning); background-color: var(--warning-bg); color: var(--warning); margin-bottom: 20px;">
          <strong>🔒 Progress Locked (Payment Pending)</strong>
          <p>Please clear the course enrollment fee on the "Enroll & Pay" tab to unlock lesson completions.</p>
        </div>
      ` : ''}

      <!-- Lessons Completions Grid -->
      <div class="mongo-section">
        <h4>📋 Course Lessons & Quizzes</h4>
        <div class="lessons-grid">
          ${lessons.map(lesson => `
            <div class="lesson-check-card ${lesson.completed ? 'completed' : ''}">
              <div class="lesson-txt">
                <h4>Lesson ${lesson.id}</h4>
                <p>${lesson.completed ? `Score: ${lesson.score}%` : 'Locked'}</p>
              </div>
              <div>
                ${lesson.completed ? `
                  <span class="complete-btn" style="background-color: var(--success); cursor: default;">✓</span>
                ` : `
                  <button class="complete-btn" ${isUnpaid ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''} onclick="triggerCompleteLesson('${enrollmentId}', ${lesson.id})">+</button>
                `}
              </div>
            </div>
          `).join("")}
        </div>
      </div>

      <!-- Certificate Issued Badge -->
      ${cert ? `
        <div class="certificate-panel">
          <div class="cert-icon">🎓</div>
          <h4>OFFICIAL COURSE CONNECT CERTIFICATE</h4>
          <p>This is to certify that <strong>${progInfo.student}</strong> has completed the course requirements for</p>
          <h4 style="margin: 8px 0; color:var(--text-main); font-weight:800;">${progInfo.course}</h4>
          <p>Issued on: ${formatDate(cert.issuedAt)}</p>
          <div class="cert-code">Verification Code: ${cert.code}</div>
        </div>
      ` : ''}
    `;

  } catch (error) {
    console.error("Failed to render enrollment details", error);
  }
}

async function triggerCompleteLesson(enrollmentId, lessonId) {
  const quizInput = prompt(`Enter student quiz grade for Lesson ${lessonId} (0 to 100):`, "85");
  if (quizInput === null) return;
  const score = parseInt(quizInput, 10);
  if (isNaN(score) || score < 0 || score > 100) {
    alert("Invalid score. Please enter a integer between 0 and 100.");
    return;
  }

  try {
    const result = await postJson("/api/progress/update", {
      enrollmentId,
      lessonId,
      quizScore: score
    });
    
    if (result.certificate) {
      alert(`Lesson completed! Student has graduated the course track! Certificate issued: ${result.certificate.code}`);
    } else {
      alert("Lesson marked complete!");
    }
    
    // Refresh panels
    loadStudentProgress(activeStudentId);
    loadDashboard();
  } catch (error) {
    alert("Failed to update progress: " + error.message);
  }
}

// 6. Tab 5: PL/SQL Reports Executor
let activeReport = "popular";

function loadReportsTab() {
  const menuItems = document.querySelectorAll(".report-menu-item");
  menuItems.forEach(item => {
    item.addEventListener("click", () => {
      menuItems.forEach(m => m.classList.remove("active"));
      item.classList.add("active");
      activeReport = item.getAttribute("data-report");
      renderReportParameters();
    });
  });

  renderReportParameters();
}

async function renderReportParameters() {
  const title = document.getElementById("selected-report-title");
  const paramsContainer = document.getElementById("report-params-container");
  const resultsContainer = document.getElementById("report-results-table-container");

  // Clear previous output
  resultsContainer.innerHTML = `<div class="empty-state"><p>Click "Execute Cursor" to query the database report.</p></div>`;

  if (activeReport === "popular") {
    title.textContent = "1. Most Popular Courses";
    paramsContainer.innerHTML = `<span style="font-size:13px; color:var(--text-muted);">No input parameters required</span>`;
  }
  else if (activeReport === "revenue") {
    title.textContent = "2. Revenue by Period";
    paramsContainer.innerHTML = `
      <div class="report-params-row">
        <label for="rep-start-date">Start Date</label>
        <input type="date" id="rep-start-date" value="2026-01-01">
        <label for="rep-end-date">End Date</label>
        <input type="date" id="rep-end-date" value="2026-03-31">
      </div>
    `;
  }
  else if (activeReport === "progress") {
    title.textContent = "3. Student Progress Report";
    try {
      const students = await getJson("/api/students");
      paramsContainer.innerHTML = `
        <div class="report-params-row">
          <label for="rep-student-id">Select Student</label>
          <select id="rep-student-id">
            ${students.map(s => `<option value="${s.id}">${s.name}</option>`).join("")}
          </select>
        </div>
      `;
    } catch (error) {
      paramsContainer.innerHTML = `<span class="badge pending">Failed to load students</span>`;
    }
  }
  else if (activeReport === "pending") {
    title.textContent = "4. Pending Payments Control";
    paramsContainer.innerHTML = `<span style="font-size:13px; color:var(--text-muted);">No input parameters required</span>`;
  }
  else if (activeReport === "lecturer") {
    title.textContent = "5. Lecturer Performance Matrix";
    paramsContainer.innerHTML = `<span style="font-size:13px; color:var(--text-muted);">No input parameters required</span>`;
  }
}

document.getElementById("run-report-btn").addEventListener("click", executeReport);

async function executeReport() {
  const container = document.getElementById("report-results-table-container");
  container.innerHTML = `<p style="text-align:center;color:var(--text-muted);">Running database query cursors...</p>`;

  try {
    let url = "";
    if (activeReport === "popular") {
      url = "/api/reports/popular-courses";
    }
    else if (activeReport === "revenue") {
      const start = document.getElementById("rep-start-date").value;
      const end = document.getElementById("rep-end-date").value;
      url = `/api/reports/revenue-by-period?startDate=${start}&endDate=${end}`;
    }
    else if (activeReport === "progress") {
      const studentId = document.getElementById("rep-student-id").value;
      url = `/api/reports/student-progress?studentId=${studentId}`;
    }
    else if (activeReport === "pending") {
      url = "/api/reports/pending-payments";
    }
    else if (activeReport === "lecturer") {
      url = "/api/reports/lecturer-performance";
    }

    const data = await getJson(url);
    renderReportTable(data);

  } catch (error) {
    container.innerHTML = `
      <div class="alert-box note" style="border-left-color: var(--danger); background-color: var(--danger-bg); color: var(--danger);">
        <strong>⚠️ PL/SQL Cursor Error</strong>
        <p>${error.message}</p>
      </div>
    `;
  }
}

function renderReportTable(data) {
  const container = document.getElementById("report-results-table-container");
  if (!data || !data.length) {
    container.innerHTML = `<div class="empty-state"><p>Query executed successfully: Cursors returned empty (0 rows).</p></div>`;
    return;
  }

  // Generate headers from object keys
  const keys = Object.keys(data[0]);
  
  // Format header name
  const formatHeader = (key) => {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  };

  container.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          ${keys.map(k => `<th>${formatHeader(k)}</th>`).join("")}
        </tr>
      </thead>
      <tbody>
        ${data.map(row => `
          <tr>
            ${keys.map(k => {
              const val = row[k];
              // Format display values
              if (k.toLowerCase().includes("price") || k.toLowerCase().includes("revenue") || k.toLowerCase().includes("amount")) {
                return `<td><strong>${money(val)}</strong></td>`;
              }
              if (k === "completionPercent") {
                return `<td>
                  <div style="display:flex; align-items:center; gap:8px;">
                    <div class="mini-bar" style="width:60px; margin-bottom:0;"><div class="mini-progress" style="width:${val}%"></div></div>
                    <strong>${val}%</strong>
                  </div>
                </td>`;
              }
              if (k === "enrollmentStatus" || k === "status") {
                return `<td><span class="badge ${val.toLowerCase() === 'paid' || val.toLowerCase() === 'completed' ? 'completed' : 'pending'}">${val}</span></td>`;
              }
              return `<td>${val}</td>`;
            }).join("")}
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

// 7. Course Slide-out drawer details (Showcasing MongoDB unstructured content)
const drawer = document.getElementById("details-drawer");
const overlay = document.getElementById("drawer-overlay");
const closeBtn = document.getElementById("close-drawer");

closeBtn.addEventListener("click", closeDrawer);
overlay.addEventListener("click", closeDrawer);

function closeDrawer() {
  drawer.classList.remove("open");
  activeCourseId = null;
}

async function openCourseDrawer(courseId) {
  activeCourseId = courseId;
  const body = document.getElementById("drawer-body");
  body.innerHTML = `<p style="text-align:center;color:var(--text-muted); margin-top:40px;">Fetching MongoDB collections...</p>`;
  drawer.classList.add("open");

  try {
    // Read course from cache
    const course = coursesCache.find(c => c.id === courseId);
    
    // Fetch MongoDB sub-documents concurrently
    const [resources, reviews, threads] = await Promise.all([
      getJson(`/api/mongo/resources?courseId=${courseId}`),
      getJson(`/api/mongo/feedback?courseId=${courseId}`),
      getJson(`/api/mongo/forums/threads?courseId=${courseId}`)
    ]);

    // Calculate rating counts
    const reviewCount = reviews.length;
    const avgRating = reviewCount 
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount).toFixed(1)
      : "0.0";

    body.innerHTML = `
      <div style="margin-bottom: 24px;">
        <span class="level-badge" style="margin-bottom:8px; display:inline-block;">${course.level}</span>
        <h2>${course.title}</h2>
        <div class="drawer-instructors">Ledger instructor: <strong>${course.lecturer}</strong> | Domain: ${course.domain}</div>
        <p style="font-size:14px; line-height:1.5; color:var(--text-muted);">
          This course dashboard integrates relational billing data with unstructured MongoDB content delivery models.
        </p>
      </div>

      <!-- MongoDB Resources section -->
      <div class="mongo-section">
        <h4>📦 lecture Resources (MongoDB)</h4>
        <p class="panel-desc">Semi-structured files list (Flexible resource content formats).</p>
        
        <div class="resource-list">
          ${resources.map(res => `
            <div class="resource-card-cc">
              <span class="resource-icon">${res.type === 'video' ? '🎥' : '📄'}</span>
              <div class="resource-info">
                <h5>${res.title}</h5>
                <a href="${res.url}" target="_blank">Download Resource (${res.type})</a>
              </div>
            </div>
          `).join("")}
          
          ${!resources.length ? '<p style="font-size:12px;color:var(--text-muted);">No materials uploaded yet.</p>' : ''}
        </div>

        <!-- Add Resource Form -->
        <form id="add-resource-form" class="reply-form" style="margin-top:12px;">
          <input type="text" id="res-title" placeholder="New resource title" required style="flex:1;">
          <select id="res-type" style="width:80px; padding:6px; margin-bottom:0;">
            <option value="note">Note</option>
            <option value="video">Video</option>
          </select>
          <button type="submit">Upload</button>
        </form>
      </div>

      <!-- MongoDB Feedback section -->
      <div class="mongo-section">
        <h4>⭐️ Student Reviews (MongoDB)</h4>
        <div class="ratings-summary">
          <div class="avg-rating-big">${avgRating}</div>
          <div class="star-rating-block">
            <div class="star-icon">★★★★★</div>
            <div style="font-size:11px;color:var(--text-muted);">${reviewCount} reviews verified</div>
          </div>
        </div>

        <div class="reviews-list">
          ${reviews.map(rev => `
            <div class="review-item">
              <div class="review-header">
                <span>Student (${rev.studentId})</span>
                <span class="star-icon">${'★'.repeat(rev.rating)}</span>
              </div>
              <p>${rev.feedback}</p>
            </div>
          `).join("")}
          
          ${!reviews.length ? '<p style="font-size:12px;color:var(--text-muted);">Be the first to review this course!</p>' : ''}
        </div>

        <!-- Submit review form -->
        <form id="add-review-form" style="margin-top:14px; background:var(--background); padding:12px; border-radius:6px;">
          <h5 style="margin-bottom:8px;">Submit Course Feedback</h5>
          <div style="display:flex; gap:10px; margin-bottom:8px;">
            <select id="rev-rating" style="width:70px; padding:4px; margin-bottom:0;" required>
              <option value="5">5 ★</option>
              <option value="4">4 ★</option>
              <option value="3">3 ★</option>
              <option value="2">2 ★</option>
              <option value="1">1 ★</option>
            </select>
            <input type="text" id="rev-feedback" placeholder="Write feedback details..." required style="flex:1; margin-bottom:0; padding:6px;">
          </div>
          <button type="submit" class="run-btn" style="padding:6px 12px; font-size:11px; width:100%;">Submit Review</button>
        </form>
      </div>

      <!-- MongoDB Discussion Forums section -->
      <div class="mongo-section">
        <h4>💬 Discussion Forums & Q&A</h4>
        <p class="panel-desc">Community threads stored in flexible document collections.</p>

        <div class="forum-threads">
          ${threads.map(thread => `
            <div class="thread-item">
              <div class="thread-title">📌 ${thread.title}</div>
              
              <div class="post-history">
                ${thread.posts.map(post => `
                  <div class="post-bubble ${post.author.startsWith('L') ? 'instructor-post' : ''}">
                    <div class="bubble-author">${post.author.startsWith('L') ? '👑 Instructor' : '🎓 Student'} (${post.author})</div>
                    <div>${post.body}</div>
                  </div>
                `).join("")}
              </div>

              <!-- Reply Form -->
              <form class="reply-form" onsubmit="submitForumReply(event, '${courseId}', '${thread.title.replace(/'/g, "\\'")}')">
                <input type="text" placeholder="Write reply to thread..." required style="flex:1;">
                <button type="submit">Reply</button>
              </form>
            </div>
          `).join("")}

          ${!threads.length ? '<p style="font-size:12px;color:var(--text-muted);">No discussions active for this course.</p>' : ''}
        </div>

        <!-- Add Thread Form -->
        <form id="add-thread-form" style="margin-top:14px; background:var(--background); padding:12px; border-radius:6px;">
          <h5 style="margin-bottom:8px;">Start New Forum Topic</h5>
          <input type="text" id="thread-title-input" placeholder="Thread Subject / Question..." required style="width:100%; padding:6px; margin-bottom:8px;">
          <textarea id="thread-body-input" placeholder="Describe your question or topic in detail..." required style="width:100%; padding:6px; height:60px; font-size:12px; border-radius:6px; border: 1px solid var(--border); outline:none; background:var(--surface-solid); color:var(--text-main); margin-bottom:8px;"></textarea>
          <button type="submit" class="run-btn" style="padding:6px 12px; font-size:11px; width:100%;">Create Thread</button>
        </form>
      </div>
    `;

    // Bind sub-forms
    document.getElementById("add-resource-form").onsubmit = submitNewResource;
    document.getElementById("add-review-form").onsubmit = submitNewReview;
    document.getElementById("add-thread-form").onsubmit = submitNewThread;

  } catch (error) {
    body.innerHTML = `<div class="alert-box error"><p>Error fetching details: ${error.message}</p></div>`;
  }
}

// Sub-form actions
async function submitNewResource(e) {
  e.preventDefault();
  const title = document.getElementById("res-title").value;
  const type = document.getElementById("res-type").value;

  try {
    await postJson("/api/mongo/resources", {
      courseId: activeCourseId,
      title,
      type
    });
    openCourseDrawer(activeCourseId); // Refresh drawer
  } catch (err) {
    alert("Failed to upload: " + err.message);
  }
}

async function submitNewReview(e) {
  e.preventDefault();
  const rating = document.getElementById("rev-rating").value;
  const feedback = document.getElementById("rev-feedback").value;

  try {
    await postJson("/api/mongo/reviews", {
      courseId: activeCourseId,
      rating,
      feedback,
      studentId: "S001" // Logged student mock
    });
    openCourseDrawer(activeCourseId);
    loadCourses(); // Refresh catalog ratings
  } catch (err) {
    alert("Failed to review: " + err.message);
  }
}

async function submitNewThread(e) {
  e.preventDefault();
  const title = document.getElementById("thread-title-input").value;
  const body = document.getElementById("thread-body-input").value;

  try {
    await postJson("/api/mongo/forums/thread", {
      courseId: activeCourseId,
      title,
      body,
      author: "S001"
    });
    openCourseDrawer(activeCourseId);
  } catch (err) {
    alert("Failed to create topic: " + err.message);
  }
}

async function submitForumReply(e, courseId, threadTitle) {
  e.preventDefault();
  const input = e.target.querySelector("input");
  const body = input.value;

  try {
    await postJson("/api/mongo/forums/reply", {
      courseId,
      title: threadTitle,
      body,
      author: "L001" // Mocking instructor reply
    });
    input.value = "";
    openCourseDrawer(activeCourseId);
  } catch (err) {
    alert("Failed to reply: " + err.message);
  }
}


// Initialization Hook
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initTabs();
  
  // Initial Loads
  loadDashboard();
  loadCourses();
});
