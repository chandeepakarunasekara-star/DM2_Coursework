async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Request failed: ${url}`);
  return response.json();
}

function money(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

async function loadDashboard() {
  const dashboard = await getJson("/api/dashboard");
  document.querySelector("#dashboard").innerHTML = [
    ["Courses", dashboard.courses],
    ["Students", dashboard.students],
    ["Active enrollments", dashboard.activeEnrollments],
    ["Revenue collected", money(dashboard.revenue)],
    ["Pending payments", dashboard.pendingPayments]
  ]
    .map(([label, value]) => `<div class="metric"><span>${label}</span><strong>${value}</strong></div>`)
    .join("");
}

async function loadCourses() {
  const courses = await getJson("/api/courses");
  document.querySelector("#courses").innerHTML = courses
    .map(
      (course) => `
        <article class="course-card">
          <div class="pill-row">
            <span class="pill">${course.domain}</span>
            <span class="pill gold">${course.level}</span>
          </div>
          <h3>${course.title}</h3>
          <p>${course.lecturer}</p>
          <p>${course.enrollments} enrollments | ${money(course.price)} | ${course.averageRating || "No"} rating</p>
        </article>
      `
    )
    .join("");
}

async function loadReports() {
  const [popular, revenue, progress] = await Promise.all([
    getJson("/api/reports/popular-courses"),
    getJson("/api/reports/revenue"),
    getJson("/api/reports/progress")
  ]);

  const reportItems = [
    ["Most popular course", popular[0].title, `${popular[0].enrollments} enrollments`],
    ["Latest monthly revenue", revenue.at(-1).month, money(revenue.at(-1).amount)],
    ["Highest progress", progress.sort((a, b) => b.completionPercent - a.completionPercent)[0].student, "100% completion"],
    ["Pending payment control", "1 enrollment", "Flagged for finance follow-up"],
    ["Lecturer performance", "Oracle and MongoDB tracks", "Strong enrollment demand"]
  ];

  document.querySelector("#reports-list").innerHTML = reportItems
    .map(
      ([label, title, value]) => `
        <div class="report-item">
          <div>
            <strong>${label}</strong>
            <div>${title}</div>
          </div>
          <b>${value}</b>
        </div>
      `
    )
    .join("");
}

async function searchForums() {
  const keyword = document.querySelector("#keyword").value.trim();
  const threads = await getJson(`/api/mongo/forums/search?q=${encodeURIComponent(keyword)}`);
  document.querySelector("#forum-results").innerHTML = threads.length
    ? threads
        .map(
          (thread) => `
            <div class="thread">
              <strong>${thread.title}</strong>
              <p>${thread.posts.map((post) => post.body).join(" ")}</p>
            </div>
          `
        )
        .join("")
    : `<div class="thread"><strong>No matching discussion found.</strong></div>`;
}

document.querySelector("#search").addEventListener("click", searchForums);

loadDashboard();
loadCourses();
loadReports();
searchForums();
