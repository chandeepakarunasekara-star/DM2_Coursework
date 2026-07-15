const express = require("express");
const relational = require("../db/relational");
const documents = require("../db/documents");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const [summary, popular, topRated] = await Promise.all([
      relational.dashboardSummary(),
      relational.reportPopularCourses(),
      documents.topRatedCourses()
    ]);
    res.json({
      summary,
      topCourses: popular.slice(0, 5),
      topRated: topRated.slice(0, 5),
      dbMode: { relational: relational.mode, documents: documents.mode }
    });
  })
);

module.exports = router;
