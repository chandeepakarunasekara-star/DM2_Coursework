const express = require("express");
const relational = require("../db/relational");
const { hashPassword, verifyPassword } = require("../db/passwords");
const { ERRORS } = require("../db/errors");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

function toSessionUser(userRow) {
  return {
    id: userRow.user_id,
    email: userRow.email,
    fullName: userRow.full_name,
    role: userRow.role,
    lecturerId: userRow.linked_lecturer_id ?? null,
    studentId: userRow.linked_student_id ?? null
  };
}

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) throw ERRORS.VALIDATION("Email and password are required.");

    const user = await relational.findUserByEmail(email.toLowerCase().trim());
    if (!user || !verifyPassword(password, user.password_salt, user.password_hash)) {
      throw ERRORS.AUTH("Incorrect email or password.");
    }

    req.session.user = toSessionUser(user);
    res.json({ user: req.session.user });
  })
);

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("cc.sid");
    res.json({ ok: true });
  });
});

router.get("/me", (req, res) => {
  res.json({ user: (req.session && req.session.user) || null });
});

// Self-service student sign-up (extra feature beyond the brief: lets a
// prospective student create their own account instead of an admin having
// to add every row by hand).
router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const { fullName, email, password } = req.body || {};
    if (!fullName || !email || !password) {
      throw ERRORS.VALIDATION("Full name, email, and password are required.");
    }
    if (password.length < 6) throw ERRORS.VALIDATION("Password must be at least 6 characters.");

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await relational.findUserByEmail(normalizedEmail);
    if (existing) throw ERRORS.DUPLICATE_EMAIL();

    const student = await relational.createStudent({ fullName, email: normalizedEmail });
    const { hash, salt } = hashPassword(password);
    const user = await relational.createUser({
      email: normalizedEmail,
      fullName,
      role: "STUDENT",
      hash,
      salt,
      linkedStudentId: student.student_id
    });

    req.session.user = toSessionUser(user);
    res.status(201).json({ user: req.session.user });
  })
);

module.exports = router;
