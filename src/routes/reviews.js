const express = require("express");
const documents = require("../db/documents");
const relational = require("../db/relational");
const { requireAuth } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");
const { ERRORS } = require("../db/errors");

const router = express.Router();

// 1. Retrieve all feedback for a given course
router.get(
  "/course/:courseId",
  asyncHandler(async (req, res) => {
    res.json(await documents.listReviews(Number(req.params.courseId)));
  })
);

// 2. Identify top-rated courses based on aggregated student reviews
router.get(
  "/top-rated",
  asyncHandler(async (req, res) => {
    res.json(await documents.topRatedCourses());
  })
);

router.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { courseId, rating, feedback } = req.body || {};
    if (!courseId || !rating) throw ERRORS.VALIDATION("courseId and rating are required.");
    const course = await relational.getCourse(Number(courseId));
    const review = await documents.addReview({
      courseId: Number(courseId),
      courseTitle: course.course_title,
      studentEmail: req.session.user.email,
      rating,
      feedback: feedback || ""
    });
    res.status(201).json(review);
  })
);

module.exports = router;
