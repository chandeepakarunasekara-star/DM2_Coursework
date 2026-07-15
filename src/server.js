const path = require("path");
const express = require("express");
const session = require("express-session");
const cookieParser = require("cookie-parser");

const config = require("./config");
const relational = require("./db/relational");
const documents = require("./db/documents");

const authRoutes = require("./routes/auth");
const courseRoutes = require("./routes/courses");
const lecturerRoutes = require("./routes/lecturers");
const studentRoutes = require("./routes/students");
const enrollmentRoutes = require("./routes/enrollments");
const paymentRoutes = require("./routes/payments");
const progressRoutes = require("./routes/progress");
const reviewRoutes = require("./routes/reviews");
const forumRoutes = require("./routes/forums");
const reportRoutes = require("./routes/reports");
const dashboardRoutes = require("./routes/dashboard");

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(
  session({
    name: "cc.sid",
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 8, sameSite: "lax" }
  })
);

app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/lecturers", lecturerRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/enrollments", enrollmentRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/forums", forumRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.get("/api/system/status", (req, res) => {
  res.json({
    relationalMode: relational.mode,
    documentMode: documents.mode,
    time: new Date().toISOString()
  });
});

app.use(express.static(path.join(__dirname, "..", "public")));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.httpStatus || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({
    error: err.message || "Something went wrong.",
    code: err.code || null
  });
});

app.listen(config.port, () => {
  console.log(`CourseConnect is running at http://localhost:${config.port}`);
  console.log(`  Relational engine : ${relational.mode}`);
  console.log(`  Document engine   : ${documents.mode}`);
  if (relational.mode === "sqlite-demo") {
    console.log("  (Set ORACLE_USER + ORACLE_CONNECT_STRING in .env to use a real Oracle database.)");
  }
  if (documents.mode === "json-demo") {
    console.log("  (Set MONGODB_URI in .env to use a real MongoDB database.)");
  }
});
