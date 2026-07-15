const http = require("http");
const path = require("path");
const fs = require("fs");
const { URL } = require("url");
const data = require("./sampleData");
const reports = require("./services/reports");

if (!data.certificates) {
  data.certificates = [
    { id: "C001", enrollmentId: "E002", issuedAt: "2026-01-29", code: "CC-2026-0002" },
    { id: "C002", enrollmentId: "E006", issuedAt: "2026-03-12", code: "CC-2026-0006" }
  ];
}

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

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(new Error("Request body is too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new Error("Invalid JSON body"));
      }
    });
  });
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

async function routeApi(req, res, url) {
  if (url.pathname === "/api/dashboard") {
    sendJson(res, 200, reports.dashboard(data));
    return;
  }

  if (url.pathname === "/api/students") {
    sendJson(res, 200, data.students);
    return;
  }

  if (url.pathname === "/api/lecturers") {
    sendJson(res, 200, data.lecturers);
    return;
  }

  if (url.pathname === "/api/courses") {
    sendJson(res, 200, reports.courseCatalogue(data));
    return;
  }

  if (url.pathname === "/api/enrollments" && req.method === "POST") {
    try {
      const body = await readJsonBody(req);
      const student = data.students.find((item) => item.id === body.studentId);
      const course = data.courses.find((item) => item.id === body.courseId);

      if (!student || !course) {
        sendJson(res, 400, { error: "Student and course are required." });
        return;
      }

      const alreadyEnrolled = data.enrollments.some(
        (item) => item.studentId === body.studentId && item.courseId === body.courseId
      );
      if (alreadyEnrolled) {
        sendJson(res, 409, { error: "This student is already enrolled in this course." });
        return;
      }

      const enrollment = {
        id: `E${String(data.enrollments.length + 1).padStart(3, "0")}`,
        studentId: body.studentId,
        courseId: body.courseId,
        status: "ACTIVE",
        enrolledAt: new Date().toISOString().slice(0, 10)
      };
      data.enrollments.push(enrollment);
      data.payments.push({
        id: `P${String(data.payments.length + 1).padStart(3, "0")}`,
        enrollmentId: enrollment.id,
        amount: course.price,
        status: "PENDING",
        paidAt: null
      });
      data.progress.push({
        enrollmentId: enrollment.id,
        completedLessons: 0,
        totalLessons: 10,
        score: 0
      });

      sendJson(res, 201, { enrollment, message: "Enrollment created in demo mode." });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
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

  if (url.pathname === "/api/reports/revenue-by-period") {
    const startDate = url.searchParams.get("startDate") || "2026-01-01";
    const endDate = url.searchParams.get("endDate") || "2026-12-31";
    sendJson(res, 200, reports.revenueByPeriod(data, startDate, endDate));
    return;
  }

  if (url.pathname === "/api/reports/progress") {
    sendJson(res, 200, reports.studentProgress(data));
    return;
  }

  if (url.pathname === "/api/reports/student-progress") {
    const studentId = url.searchParams.get("studentId") || "S001";
    sendJson(res, 200, reports.studentProgressReport(data, studentId));
    return;
  }

  if (url.pathname === "/api/reports/pending-payments") {
    sendJson(res, 200, reports.pendingPaymentsReport(data));
    return;
  }

  if (url.pathname === "/api/reports/lecturer-performance") {
    sendJson(res, 200, reports.lecturerPerformanceReport(data));
    return;
  }

  // Payment update action
  if (url.pathname === "/api/payments/pay" && req.method === "POST") {
    try {
      const body = await readJsonBody(req);
      const payment = data.payments.find((p) => p.enrollmentId === body.enrollmentId);
      if (!payment) {
        sendJson(res, 404, { error: "No payment record found for this enrollment." });
        return;
      }
      payment.status = "PAID";
      payment.paidAt = new Date().toISOString().slice(0, 10);
      payment.paymentMethod = body.paymentMethod || "CARD";
      payment.transactionRef = body.transactionRef || `TXN-CC-${Date.now()}`;
      sendJson(res, 200, { message: "Payment processed successfully.", payment });
    } catch (err) {
      sendJson(res, 400, { error: err.message });
    }
    return;
  }

  // Progress update action
  if (url.pathname === "/api/progress/update" && req.method === "POST") {
    try {
      const body = await readJsonBody(req);
      const enrollmentId = body.enrollmentId;
      const quizScore = Number(body.quizScore || 80);

      const prog = data.progress.find((p) => p.enrollmentId === enrollmentId);
      if (!prog) {
        sendJson(res, 404, { error: "No progress tracking found for this enrollment." });
        return;
      }

      if (prog.completedLessons < prog.totalLessons) {
        prog.completedLessons += 1;
        prog.score = Math.round(
          (prog.score * (prog.completedLessons - 1) + quizScore) / prog.completedLessons
        );
      }

      // Check for completion trigger
      let cert = null;
      if (prog.completedLessons === prog.totalLessons) {
        const enrollment = data.enrollments.find((e) => e.id === enrollmentId);
        if (enrollment && enrollment.status !== "COMPLETED") {
          enrollment.status = "COMPLETED";

          // Issue certificate
          if (!data.certificates) data.certificates = [];
          const exists = data.certificates.find((c) => c.enrollmentId === enrollmentId);
          if (!exists) {
            const certId = `C${String(data.certificates.length + 1).padStart(3, "0")}`;
            const certCode = `CC-${new Date().getFullYear()}-${String(enrollmentId).replace(/\D/g, "").padStart(4, "0")}`;
            cert = {
              id: certId,
              enrollmentId: enrollmentId,
              issuedAt: new Date().toISOString().slice(0, 10),
              code: certCode
            };
            data.certificates.push(cert);
          }
        }
      }

      sendJson(res, 200, { message: "Progress updated successfully.", progress: prog, certificate: cert });
    } catch (err) {
      sendJson(res, 400, { error: err.message });
    }
    return;
  }

  if (url.pathname === "/api/mongo/feedback") {
    const courseId = url.searchParams.get("courseId") || "C101";
    sendJson(res, 200, data.reviews.filter((review) => review.courseId === courseId));
    return;
  }

  if (url.pathname === "/api/mongo/reviews" && req.method === "POST") {
    try {
      const body = await readJsonBody(req);
      const review = {
        courseId: body.courseId,
        studentId: body.studentId || "S001",
        rating: Number(body.rating || 5),
        feedback: body.feedback || "",
        createdAt: new Date().toISOString().slice(0, 10)
      };
      if (!data.reviews) data.reviews = [];
      data.reviews.push(review);
      sendJson(res, 201, { message: "Review posted to MongoDB.", review });
    } catch (err) {
      sendJson(res, 400, { error: err.message });
    }
    return;
  }

  if (url.pathname === "/api/mongo/resources") {
    const courseId = url.searchParams.get("courseId") || "C101";
    const courseResources = data.resources.filter((res) => res.courseId === courseId);
    sendJson(res, 200, courseResources);
    return;
  }

  if (url.pathname === "/api/mongo/resources" && req.method === "POST") {
    try {
      const body = await readJsonBody(req);
      const resource = {
        courseId: body.courseId,
        type: body.type || "note",
        title: body.title,
        url: body.url || `/resources/custom-${Date.now()}`
      };
      if (!data.resources) data.resources = [];
      data.resources.push(resource);
      sendJson(res, 201, { message: "Resource added to MongoDB.", resource });
    } catch (err) {
      sendJson(res, 400, { error: err.message });
    }
    return;
  }

  if (url.pathname === "/api/mongo/forums/threads") {
    const courseId = url.searchParams.get("courseId");
    if (courseId) {
      sendJson(res, 200, data.forums.filter((t) => t.courseId === courseId));
    } else {
      sendJson(res, 200, data.forums);
    }
    return;
  }

  if (url.pathname === "/api/mongo/forums/thread" && req.method === "POST") {
    try {
      const body = await readJsonBody(req);
      const thread = {
        courseId: body.courseId,
        title: body.title,
        posts: [
          { author: body.author || "S001", body: body.body }
        ]
      };
      data.forums.push(thread);
      sendJson(res, 201, { message: "Forum thread created in MongoDB.", thread });
    } catch (err) {
      sendJson(res, 400, { error: err.message });
    }
    return;
  }

  if (url.pathname === "/api/mongo/forums/reply" && req.method === "POST") {
    try {
      const body = await readJsonBody(req);
      const thread = data.forums.find((t) => t.courseId === body.courseId && t.title === body.title);
      if (!thread) {
        sendJson(res, 404, { error: "Forum thread not found." });
        return;
      }
      const post = {
        author: body.author || "L001",
        body: body.body
      };
      thread.posts.push(post);
      sendJson(res, 201, { message: "Reply added to thread in MongoDB.", post });
    } catch (err) {
      sendJson(res, 400, { error: err.message });
    }
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

  if (url.pathname === "/api/certificates") {
    if (!data.certificates) data.certificates = [];
    sendJson(res, 200, data.certificates);
    return;
  }

  sendJson(res, 404, { error: "API endpoint not found" });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname.startsWith("/api/")) {
    routeApi(req, res, url).catch((error) => {
      sendJson(res, 500, { error: error.message });
    });
    return;
  }

  serveStatic(res, url.pathname);
});

server.listen(PORT, () => {
  console.log(`CourseConnect is running at http://localhost:${PORT}`);
});
