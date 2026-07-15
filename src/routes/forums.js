const express = require("express");
const documents = require("../db/documents");
const relational = require("../db/relational");
const { requireAuth } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");
const { ERRORS } = require("../db/errors");

const router = express.Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json(await documents.listThreads(req.query.courseId ? Number(req.query.courseId) : undefined));
  })
);

// 3. Search discussion threads for specific keywords or topics
router.get(
  "/search",
  asyncHandler(async (req, res) => {
    res.json(await documents.searchThreads(req.query.q || ""));
  })
);

router.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { courseId, title, tags, body } = req.body || {};
    if (!courseId || !title || !body) throw ERRORS.VALIDATION("courseId, title and body are required.");
    const course = await relational.getCourse(Number(courseId));
    const thread = await documents.createThread({
      courseId: Number(courseId),
      courseTitle: course.course_title,
      title,
      tags: Array.isArray(tags) ? tags : (tags || "").split(",").map((t) => t.trim()).filter(Boolean),
      author: req.session.user.email,
      body
    });
    res.status(201).json(thread);
  })
);

router.post(
  "/:threadId/reply",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { body } = req.body || {};
    if (!body) throw ERRORS.VALIDATION("body is required.");
    const thread = await documents.addPost(req.params.threadId, { author: req.session.user.email, body });
    if (!thread) throw ERRORS.NOT_FOUND("Thread not found.");
    res.json(thread);
  })
);

// 4. Retrieve flexible resources for a course
router.get(
  "/resources/:courseId",
  asyncHandler(async (req, res) => {
    res.json(await documents.listResources(Number(req.params.courseId)));
  })
);

module.exports = router;
