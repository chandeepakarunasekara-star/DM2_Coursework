const express = require("express");
const relational = require("../db/relational");
const documents = require("../db/documents");
const { requireRole } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");
const { ERRORS } = require("../db/errors");

const router = express.Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { category, level, status, search } = req.query;
    const courses = await relational.listCourses({ category, level, status, search });
    res.json(courses);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const course = await relational.getCourse(Number(req.params.id));
    const [reviews, resources, avgRatingRow] = await Promise.all([
      documents.listReviews(course.course_id),
      documents.listResources(course.course_id),
      documents.topRatedCourses()
    ]);
    const rating = avgRatingRow.find((r) => r.courseId === course.course_id) || null;
    res.json({ ...course, reviews, resources, rating });
  })
);

router.post(
  "/",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const course = await relational.createCourse(req.body || {});
    res.status(201).json(course);
  })
);

router.put(
  "/:id",
  requireRole("ADMIN", "LECTURER"),
  asyncHandler(async (req, res) => {
    const course = await relational.updateCourse(Number(req.params.id), req.body || {});
    res.json(course);
  })
);

router.delete(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    await relational.deleteCourse(Number(req.params.id));
    res.json({ deleted: true });
  })
);

router.get("/meta/categories", asyncHandler(async (req, res) => {
  res.json(await relational.listCategories());
}));

module.exports = router;
