const express = require("express");
const relational = require("../db/relational");
const { requireAuth } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");
const { ERRORS } = require("../db/errors");

const router = express.Router();

router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { studentId, courseId, status } = req.query;
    const user = req.session.user;
    // students may only see their own enrollments
    const effectiveStudentId =
      user.role === "STUDENT" ? user.studentId : studentId ? Number(studentId) : undefined;
    const rows = await relational.listEnrollments({
      studentId: effectiveStudentId,
      courseId: courseId ? Number(courseId) : undefined,
      status
    });
    res.json(rows);
  })
);

router.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = req.session.user;
    const courseId = Number(req.body.courseId);
    const studentId = user.role === "STUDENT" ? user.studentId : Number(req.body.studentId);
    if (!studentId) throw ERRORS.VALIDATION("studentId is required.");
    if (user.role === "STUDENT" && Number(req.body.studentId) && Number(req.body.studentId) !== user.studentId) {
      throw ERRORS.VALIDATION("Students can only enroll themselves.");
    }
    const enrollment = await relational.enrollStudent(studentId, courseId);
    res.status(201).json(enrollment);
  })
);

router.get(
  "/:id/progress",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await relational.listProgress(Number(req.params.id)));
  })
);

module.exports = router;
