const http = require("http");
const path = require("path");
const fs = require("fs");
const { URL } = require("url");
const data = require("./sampleData");
const reports = require("./services/reports");

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(__dirname, "..", "public");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

function sendJson(res, statusCode, body) {
  const payload = JSON.stringify(body, null, 2);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload)
  });
  res.end(payload);
}

function serveStatic(res, pathname) {
  const requestedPath = pathname === "/" ? "/index.html" : pathname;
  const safePath = path.normalize(requestedPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(PUBLIC_DIR, safePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
    res.end(content);
  });
}

function routeApi(req, res, url) {
  if (url.pathname === "/api/dashboard") {
    sendJson(res, 200, reports.dashboard(data));
    return;
  }

  if (url.pathname === "/api/courses") {
    sendJson(res, 200, reports.courseCatalogue(data));
    return;
  }

  if (url.pathname === "/api/reports/popular-courses") {
    sendJson(res, 200, reports.popularCourses(data));
    return;
  }

  if (url.pathname === "/api/reports/revenue") {
    sendJson(res, 200, reports.revenueByMonth(data));
    return;
  }

  if (url.pathname === "/api/reports/progress") {
    sendJson(res, 200, reports.studentProgress(data));
    return;
  }

  if (url.pathname === "/api/mongo/feedback") {
    const courseId = url.searchParams.get("courseId") || "C101";
    sendJson(res, 200, data.reviews.filter((review) => review.courseId === courseId));
    return;
  }

  if (url.pathname === "/api/mongo/forums/search") {
    const keyword = (url.searchParams.get("q") || "").toLowerCase();
    const results = data.forums.filter((thread) => {
      const haystack = `${thread.title} ${thread.posts.map((p) => p.body).join(" ")}`.toLowerCase();
      return haystack.includes(keyword);
    });
    sendJson(res, 200, results);
    return;
  }

  sendJson(res, 404, { error: "API endpoint not found" });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname.startsWith("/api/")) {
    routeApi(req, res, url);
    return;
  }

  serveStatic(res, url.pathname);
});

server.listen(PORT, () => {
  console.log(`CourseConnect is running at http://localhost:${PORT}`);
});
