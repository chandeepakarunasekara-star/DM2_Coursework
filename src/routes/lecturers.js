const express = require("express");
const relational = require("../db/relational");
const { requireRole } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.get("/", asyncHandler(async (req, res) => {
  res.json(await relational.listLecturers());
}));

router.post(
  "/",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const lecturer = await relational.createLecturer(req.body || {});
    res.status(201).json(lecturer);
  })
);

router.put(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const lecturer = await relational.updateLecturer(Number(req.params.id), req.body || {});
    res.json(lecturer);
  })
);

router.delete(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    await relational.deleteLecturer(Number(req.params.id));
    res.json({ deleted: true });
  })
);

module.exports = router;
