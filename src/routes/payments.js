const express = require("express");
const relational = require("../db/relational");
const { requireAuth, requireRole } = require("../middleware/auth");
const asyncHandler = require("../utils/asyncHandler");
const { ERRORS } = require("../db/errors");

const router = express.Router();

router.get(
  "/",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    res.json(await relational.listPayments({ status: req.query.status }));
  })
);

router.post(
  "/:enrollmentId/pay",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { amount, method, transactionRef } = req.body || {};
    if (!amount || !method) throw ERRORS.VALIDATION("amount and method are required.");
    const payment = await relational.recordPayment(
      Number(req.params.enrollmentId),
      Number(amount),
      method,
      transactionRef || `TXN-${Date.now()}`
    );
    res.json(payment);
  })
);

module.exports = router;
