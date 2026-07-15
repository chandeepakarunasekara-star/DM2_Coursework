const express = require("express");
const relational = require("../db/relational");
const { requireRole } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

router.get("/", requireRole("ADMIN", "LECTURER"), asyncHandler(async (req, res) => {
  res.json(await relational.listStudents());
}));

router.post(
  "/",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const student = await relational.createStudent(req.body || {});
    res.status(201).json(student);
  })
);

router.put(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const student = await relational.updateStudent(Number(req.params.id), req.body || {});
    res.json(student);
  })
);

router.delete(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    await relational.deleteStudent(Number(req.params.id));
    res.json({ deleted: true });
  })
);

router.get(
  "/:id/certificates",
  asyncHandler(async (req, res) => {
    res.json(await relational.listCertificates(Number(req.params.id)));
  })
);

module.exports = router;
