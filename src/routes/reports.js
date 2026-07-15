const express = require("express");
const relational = require("../db/relational");
const documents = require("../db/documents");
const { requireRole } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");
const { sendCsv } = require("../utils/csv");
const { ERRORS } = require("../db/errors");

const router = express.Router();

function respond(req, res, filename, rows) {
  if (req.query.format === "csv") return sendCsv(res, filename, rows);
  res.json(rows);
}

// Report 1: most popular courses by enrollment
router.get(
  "/popular-courses",
  requireRole("ADMIN", "LECTURER"),
  asyncHandler(async (req, res) => {
    respond(req, res, "popular-courses.csv", await relational.reportPopularCourses());
  })
);

// Report 2: total revenue within a given time period
router.get(
  "/revenue",
  requireRole("ADMIN", "LECTURER"),
  asyncHandler(async (req, res) => {
    const start = req.query.start || "2000-01-01";
    const end = req.query.end || "2999-12-31";
    const rows = await relational.reportRevenueByPeriod(start, end);
    const total = rows.reduce((sum, r) => sum + Number(r.total_revenue || r.TOTAL_REVENUE || 0), 0);
    if (req.query.format === "csv") return sendCsv(res, "revenue.csv", rows);
    res.json({ start, end, total, rows });
  })
);

// Report 3: student progress report
router.get(
  "/student-progress/:studentId",
  requireRole("ADMIN", "LECTURER", "STUDENT"),
  asyncHandler(async (req, res) => {
    const studentId = Number(req.params.studentId);
    if (req.session.user.role === "STUDENT" && req.session.user.studentId !== studentId) {
      throw ERRORS.AUTH("You may only view your own progress report.");
    }
    respond(req, res, `student-${studentId}-progress.csv`, await relational.reportStudentProgress(studentId));
  })
);

// Report 4: pending payments
router.get(
  "/pending-payments",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    respond(req, res, "pending-payments.csv", await relational.reportPendingPayments());
  })
);

// Report 5: lecturer performance
router.get(
  "/lecturer-performance",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    respond(req, res, "lecturer-performance.csv", await relational.reportLecturerPerformance());
  })
);

// Report 6 (extra / "Integration & Innovation"): hybrid Oracle + MongoDB
// report that joins relational revenue/enrollment figures with MongoDB
// review sentiment to flag courses that are popular but under-rated - or
// profitable but poorly reviewed - something neither database can answer
// alone.
router.get(
  "/hybrid-course-health",
  requireRole("ADMIN", "LECTURER"),
  asyncHandler(async (req, res) => {
    const [popular, ratings] = await Promise.all([relational.reportPopularCourses(), documents.topRatedCourses()]);
    const ratingByCourse = new Map(ratings.map((r) => [r.courseId, r]));
    const rows = popular.map((c) => {
      const courseId = c.course_id ?? c.COURSE_ID;
      const enrollmentCount = c.enrollment_count ?? c.ENROLLMENT_COUNT ?? 0;
      const revenue = c.revenue ?? c.REVENUE ?? 0;
      const rating = ratingByCourse.get(courseId);
      const averageRating = rating ? rating.averageRating : null;
      let flag = "OK";
      if (enrollmentCount >= 2 && averageRating != null && averageRating < 4) flag = "POPULAR_BUT_LOW_RATED";
      if (enrollmentCount === 0) flag = "NO_ENROLLMENTS";
      if (averageRating == null) flag = enrollmentCount > 0 ? "NO_REVIEWS_YET" : flag;
      return {
        course_id: courseId,
        course_title: c.course_title ?? c.COURSE_TITLE,
        enrollment_count: enrollmentCount,
        revenue,
        average_rating: averageRating,
        review_count: rating ? rating.reviewCount : 0,
        flag
      };
    });
    respond(req, res, "hybrid-course-health.csv", rows);
  })
);

module.exports = router;
