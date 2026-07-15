const express = require("express");
const relational = require("../db/relational");
const { requireAuth } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");
const { ERRORS } = require("../db/errors");

const router = express.Router();

router.post(
  "/:enrollmentId/complete-lesson",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { lessonId, quizScore } = req.body || {};
    if (!lessonId) throw ERRORS.VALIDATION("lessonId is required.");
    const score = quizScore == null ? 100 : Number(quizScore);
    const enrollment = await relational.updateProgress(Number(req.params.enrollmentId), Number(lessonId), score);
    res.json(enrollment);
  })
);

module.exports = router;
