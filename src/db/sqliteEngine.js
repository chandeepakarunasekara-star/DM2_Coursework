// Embedded relational engine used when Oracle credentials are not supplied.
//
// The table layout below is a direct, faithful translation of
// database/oracle/01_schema.sql (same tables, columns, constraints and
// relationships - only the Oracle-specific syntax changes). The business
// operations below (enrollStudent, recordPayment, updateProgress, and the
// five report queries) are a direct translation of the procedures/functions
// in database/oracle/03_plsql_package.sql, including the same exception
// codes, and the same BEFORE/AFTER trigger behaviour for payment dates,
// enrollment completion status, and certificate issuance.
const { DatabaseSync } = require("node:sqlite");
const { ERRORS } = require("./errors");
const seed = require("../seedData");
const { hashPassword } = require("./passwords");

const SCHEMA = `
CREATE TABLE categories (
  category_id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_name TEXT NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE lecturers (
  lecturer_id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  expertise TEXT NOT NULL,
  joined_date TEXT NOT NULL DEFAULT (date('now')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE'))
);

CREATE TABLE students (
  student_id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  registered_date TEXT NOT NULL DEFAULT (date('now')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','SUSPENDED','GRADUATED'))
);

CREATE TABLE courses (
  course_id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL REFERENCES categories(category_id),
  lecturer_id INTEGER NOT NULL REFERENCES lecturers(lecturer_id),
  course_title TEXT NOT NULL,
  course_level TEXT NOT NULL,
  price REAL NOT NULL CHECK (price >= 0),
  duration_hours REAL NOT NULL,
  published_status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (published_status IN ('DRAFT','PUBLISHED','ARCHIVED')),
  created_date TEXT NOT NULL DEFAULT (date('now'))
);

CREATE TABLE lessons (
  lesson_id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL REFERENCES courses(course_id),
  lesson_title TEXT NOT NULL,
  lesson_order INTEGER NOT NULL,
  estimated_minutes INTEGER NOT NULL DEFAULT 30,
  UNIQUE (course_id, lesson_order)
);

CREATE TABLE enrollments (
  enrollment_id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES students(student_id),
  course_id INTEGER NOT NULL REFERENCES courses(course_id),
  enrollment_date TEXT NOT NULL DEFAULT (date('now')),
  enrollment_status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (enrollment_status IN ('ACTIVE','COMPLETED','CANCELLED')),
  completion_percent REAL NOT NULL DEFAULT 0 CHECK (completion_percent BETWEEN 0 AND 100),
  final_score REAL,
  UNIQUE (student_id, course_id)
);

CREATE TABLE payments (
  payment_id INTEGER PRIMARY KEY AUTOINCREMENT,
  enrollment_id INTEGER NOT NULL REFERENCES enrollments(enrollment_id),
  amount REAL NOT NULL CHECK (amount >= 0),
  payment_method TEXT NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING','PAID','FAILED','REFUNDED')),
  paid_date TEXT,
  transaction_ref TEXT UNIQUE
);

CREATE TABLE lesson_progress (
  progress_id INTEGER PRIMARY KEY AUTOINCREMENT,
  enrollment_id INTEGER NOT NULL REFERENCES enrollments(enrollment_id),
  lesson_id INTEGER NOT NULL REFERENCES lessons(lesson_id),
  completed_flag TEXT NOT NULL DEFAULT 'N' CHECK (completed_flag IN ('Y','N')),
  completed_date TEXT,
  quiz_score REAL CHECK (quiz_score BETWEEN 0 AND 100),
  UNIQUE (enrollment_id, lesson_id)
);

CREATE TABLE certificates (
  certificate_id INTEGER PRIMARY KEY AUTOINCREMENT,
  enrollment_id INTEGER NOT NULL UNIQUE REFERENCES enrollments(enrollment_id),
  issued_date TEXT NOT NULL DEFAULT (date('now')),
  certificate_code TEXT NOT NULL UNIQUE
);

CREATE TABLE users (
  user_id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN','LECTURER','STUDENT')),
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  linked_lecturer_id INTEGER REFERENCES lecturers(lecturer_id),
  linked_student_id INTEGER REFERENCES students(student_id)
);

CREATE INDEX idx_courses_category ON courses(category_id);
CREATE INDEX idx_courses_lecturer ON courses(lecturer_id);
CREATE INDEX idx_enrollments_student ON enrollments(student_id);
CREATE INDEX idx_enrollments_course ON enrollments(course_id);
CREATE INDEX idx_payments_status ON payments(payment_status);
`;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

class SqliteEngine {
  constructor() {
    this.db = new DatabaseSync(":memory:");
    this.db.exec(SCHEMA);
    this._seed();
  }

  // ---------- seeding ----------
  _seed() {
    const db = this.db;
    const categoryId = {};
    const insCategory = db.prepare("INSERT INTO categories (category_name, description) VALUES (?, ?)");
    for (const c of seed.categories) {
      const info = insCategory.run(c.name, c.description);
      categoryId[c.name] = Number(info.lastInsertRowid);
    }

    const lecturerId = {};
    const insLecturer = db.prepare(
      "INSERT INTO lecturers (full_name, email, expertise, joined_date) VALUES (?, ?, ?, ?)"
    );
    for (const l of seed.lecturers) {
      const info = insLecturer.run(l.name, l.email, l.expertise, l.joined);
      lecturerId[l.email] = Number(info.lastInsertRowid);
    }

    const studentId = {};
    const insStudent = db.prepare(
      "INSERT INTO students (full_name, email, registered_date) VALUES (?, ?, ?)"
    );
    for (const s of seed.students) {
      const info = insStudent.run(s.name, s.email, s.registered);
      studentId[s.email] = Number(info.lastInsertRowid);
    }

    const courseId = {};
    const lessonId = {};
    const insCourse = db.prepare(
      `INSERT INTO courses (category_id, lecturer_id, course_title, course_level, price, duration_hours, published_status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    const insLesson = db.prepare(
      "INSERT INTO lessons (course_id, lesson_title, lesson_order, estimated_minutes) VALUES (?, ?, ?, ?)"
    );
    for (const c of seed.courses) {
      const info = insCourse.run(
        categoryId[c.category],
        lecturerId[c.lecturer],
        c.title,
        c.level,
        c.price,
        c.durationHours,
        c.status
      );
      const cid = Number(info.lastInsertRowid);
      courseId[c.title] = cid;
      lessonId[c.title] = [];
      c.lessons.forEach((title, idx) => {
        const li = insLesson.run(cid, title, idx + 1, 45);
        lessonId[c.title].push(Number(li.lastInsertRowid));
      });
    }

    for (const e of seed.enrollments) {
      const cid = courseId[e.course];
      const sid = studentId[e.student];
      this.enrollStudent(sid, cid, { enrollmentDate: e.date, skipPublishedCheck: true });
      const row = db
        .prepare("SELECT enrollment_id FROM enrollments WHERE student_id = ? AND course_id = ?")
        .get(sid, cid);
      const enrollmentId = Number(row.enrollment_id);

      if (e.paidMethod) {
        this.recordPayment(enrollmentId, this._coursePrice(cid), e.paidMethod, e.paidRef, { paidDate: e.date });
      }

      const lessons = lessonId[e.course];
      for (let i = 0; i < e.completedLessons && i < lessons.length; i += 1) {
        this.updateProgress(enrollmentId, lessons[i], 65 + ((i * 7) % 30));
      }
    }

    const insUser = db.prepare(
      `INSERT INTO users (email, full_name, role, password_hash, password_salt, linked_lecturer_id, linked_student_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    for (const u of seed.users) {
      const { hash, salt } = hashPassword(seed.DEMO_PASSWORD);
      const linkedLecturer = u.linkedType === "lecturer" ? lecturerId[u.linkedRef] : null;
      const linkedStudent = u.linkedType === "student" ? studentId[u.linkedRef] : null;
      insUser.run(u.email, u.name, u.role, hash, salt, linkedLecturer, linkedStudent);
    }

    this._ids = { categoryId, lecturerId, studentId, courseId, lessonId };
  }

  _coursePrice(courseId) {
    const row = this.db.prepare("SELECT price FROM courses WHERE course_id = ?").get(courseId);
    return row ? row.price : 0;
  }

  // ---------- lookups ----------
  listCategories() {
    return this.db.prepare("SELECT * FROM categories ORDER BY category_name").all();
  }

  listLecturers() {
    return this.db
      .prepare(
        `SELECT l.*, COUNT(c.course_id) AS course_count
         FROM lecturers l LEFT JOIN courses c ON c.lecturer_id = l.lecturer_id
         GROUP BY l.lecturer_id ORDER BY l.full_name`
      )
      .all();
  }

  createLecturer({ fullName, email, expertise }) {
    if (!fullName || !email || !expertise) throw ERRORS.VALIDATION("Full name, email, and expertise are required.");
    const dup = this.db.prepare("SELECT 1 FROM lecturers WHERE email = ?").get(email);
    if (dup) throw ERRORS.DUPLICATE_EMAIL("A lecturer with this email already exists.");
    const info = this.db
      .prepare("INSERT INTO lecturers (full_name, email, expertise, joined_date) VALUES (?, ?, ?, ?)")
      .run(fullName, email, expertise, todayIso());
    return this.getLecturer(Number(info.lastInsertRowid));
  }

  getLecturer(id) {
    const row = this.db.prepare("SELECT * FROM lecturers WHERE lecturer_id = ?").get(id);
    if (!row) throw ERRORS.NOT_FOUND("Lecturer not found.");
    return row;
  }

  updateLecturer(id, { fullName, expertise, status }) {
    this.getLecturer(id);
    this.db
      .prepare(
        "UPDATE lecturers SET full_name = COALESCE(?, full_name), expertise = COALESCE(?, expertise), status = COALESCE(?, status) WHERE lecturer_id = ?"
      )
      .run(fullName ?? null, expertise ?? null, status ?? null, id);
    return this.getLecturer(id);
  }

  deleteLecturer(id) {
    this.getLecturer(id);
    const courseCount = this.db.prepare("SELECT COUNT(*) AS n FROM courses WHERE lecturer_id = ?").get(id).n;
    if (courseCount > 0) throw ERRORS.LECTURER_HAS_COURSES();
    this.db.prepare("DELETE FROM users WHERE linked_lecturer_id = ?").run(id);
    this.db.prepare("DELETE FROM lecturers WHERE lecturer_id = ?").run(id);
    return { deleted: true };
  }

  listStudents() {
    return this.db.prepare("SELECT * FROM students ORDER BY full_name").all();
  }

  createStudent({ fullName, email }) {
    if (!fullName || !email) throw ERRORS.VALIDATION("Full name and email are required.");
    const dup = this.db.prepare("SELECT 1 FROM students WHERE email = ?").get(email);
    if (dup) throw ERRORS.DUPLICATE_EMAIL("A student with this email already exists.");
    const info = this.db
      .prepare("INSERT INTO students (full_name, email, registered_date) VALUES (?, ?, ?)")
      .run(fullName, email, todayIso());
    return this.getStudent(Number(info.lastInsertRowid));
  }

  getStudent(id) {
    const row = this.db.prepare("SELECT * FROM students WHERE student_id = ?").get(id);
    if (!row) throw ERRORS.NOT_FOUND("Student not found.");
    return row;
  }

  updateStudent(id, { fullName, status }) {
    this.getStudent(id);
    this.db
      .prepare("UPDATE students SET full_name = COALESCE(?, full_name), status = COALESCE(?, status) WHERE student_id = ?")
      .run(fullName ?? null, status ?? null, id);
    return this.getStudent(id);
  }

  deleteStudent(id) {
    this.getStudent(id);
    const enrollmentCount = this.db.prepare("SELECT COUNT(*) AS n FROM enrollments WHERE student_id = ?").get(id).n;
    if (enrollmentCount > 0) throw ERRORS.STUDENT_HAS_ENROLLMENTS();
    this.db.prepare("DELETE FROM users WHERE linked_student_id = ?").run(id);
    this.db.prepare("DELETE FROM students WHERE student_id = ?").run(id);
    return { deleted: true };
  }

  listCourses({ category, level, status, search } = {}) {
    let sql = `
      SELECT c.*, cat.category_name, l.full_name AS lecturer_name, l.lecturer_id AS lecturer_id,
        (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.course_id) AS enrollment_count,
        (SELECT COUNT(*) FROM lessons ls WHERE ls.course_id = c.course_id) AS lesson_count
      FROM courses c
      JOIN categories cat ON cat.category_id = c.category_id
      JOIN lecturers l ON l.lecturer_id = c.lecturer_id
      WHERE 1 = 1`;
    const params = [];
    if (category) {
      sql += " AND cat.category_name = ?";
      params.push(category);
    }
    if (level) {
      sql += " AND c.course_level = ?";
      params.push(level);
    }
    if (status) {
      sql += " AND c.published_status = ?";
      params.push(status);
    }
    if (search) {
      sql += " AND LOWER(c.course_title) LIKE ?";
      params.push(`%${search.toLowerCase()}%`);
    }
    sql += " ORDER BY c.created_date DESC, c.course_id DESC";
    return this.db.prepare(sql).all(...params);
  }

  getCourse(id) {
    const row = this.db
      .prepare(
        `SELECT c.*, cat.category_name, l.full_name AS lecturer_name
         FROM courses c
         JOIN categories cat ON cat.category_id = c.category_id
         JOIN lecturers l ON l.lecturer_id = c.lecturer_id
         WHERE c.course_id = ?`
      )
      .get(id);
    if (!row) throw ERRORS.NOT_FOUND("Course not found.");
    row.lessons = this.db
      .prepare("SELECT * FROM lessons WHERE course_id = ? ORDER BY lesson_order")
      .all(id);
    return row;
  }

  createCourse({ categoryId, lecturerId, title, level, price, durationHours, status, lessons }) {
    if (!categoryId || !lecturerId || !title || !level || price == null || !durationHours) {
      throw ERRORS.VALIDATION("categoryId, lecturerId, title, level, price and durationHours are required.");
    }
    const info = this.db
      .prepare(
        `INSERT INTO courses (category_id, lecturer_id, course_title, course_level, price, duration_hours, published_status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(categoryId, lecturerId, title, level, price, durationHours, status || "DRAFT");
    const courseId = Number(info.lastInsertRowid);
    const lessonList = Array.isArray(lessons) && lessons.length ? lessons : ["Introduction"];
    lessonList.forEach((lt, idx) => {
      this.db
        .prepare("INSERT INTO lessons (course_id, lesson_title, lesson_order, estimated_minutes) VALUES (?, ?, ?, 30)")
        .run(courseId, lt, idx + 1);
    });
    return this.getCourse(courseId);
  }

  updateCourse(id, { title, level, price, durationHours, status }) {
    this.getCourse(id);
    this.db
      .prepare(
        `UPDATE courses SET
          course_title = COALESCE(?, course_title),
          course_level = COALESCE(?, course_level),
          price = COALESCE(?, price),
          duration_hours = COALESCE(?, duration_hours),
          published_status = COALESCE(?, published_status)
         WHERE course_id = ?`
      )
      .run(title ?? null, level ?? null, price ?? null, durationHours ?? null, status ?? null, id);
    return this.getCourse(id);
  }

  deleteCourse(id) {
    this.getCourse(id);
    const enrollmentCount = this.db.prepare("SELECT COUNT(*) AS n FROM enrollments WHERE course_id = ?").get(id).n;
    if (enrollmentCount > 0) throw ERRORS.COURSE_HAS_ENROLLMENTS();
    this.db.prepare("DELETE FROM lessons WHERE course_id = ?").run(id);
    this.db.prepare("DELETE FROM courses WHERE course_id = ?").run(id);
    return { deleted: true };
  }

  // ---------- business operations (mirror courseconnect_pkg) ----------
  enrollStudent(studentId, courseId, opts = {}) {
    const course = this.db
      .prepare("SELECT * FROM courses WHERE course_id = ? AND published_status = 'PUBLISHED'")
      .get(courseId);
    if (!course && !opts.skipPublishedCheck) {
      throw ERRORS.COURSE_NOT_PUBLISHED();
    }
    const priceRow = opts.skipPublishedCheck
      ? this.db.prepare("SELECT * FROM courses WHERE course_id = ?").get(courseId)
      : course;
    if (!priceRow) throw ERRORS.COURSE_NOT_PUBLISHED();

    const dup = this.db
      .prepare("SELECT 1 FROM enrollments WHERE student_id = ? AND course_id = ?")
      .get(studentId, courseId);
    if (dup) throw ERRORS.DUPLICATE_ENROLLMENT();

    const enrollmentDate = opts.enrollmentDate || todayIso();
    const info = this.db
      .prepare(
        "INSERT INTO enrollments (student_id, course_id, enrollment_date, enrollment_status, completion_percent) VALUES (?, ?, ?, 'ACTIVE', 0)"
      )
      .run(studentId, courseId, enrollmentDate);
    const enrollmentId = Number(info.lastInsertRowid);

    this.db
      .prepare(
        "INSERT INTO payments (enrollment_id, amount, payment_method, payment_status) VALUES (?, ?, 'PENDING', 'PENDING')"
      )
      .run(enrollmentId, priceRow.price);

    return this.getEnrollment(enrollmentId);
  }

  getEnrollment(id) {
    const row = this.db
      .prepare(
        `SELECT e.*, s.full_name AS student_name, s.email AS student_email,
                c.course_title, c.price
         FROM enrollments e
         JOIN students s ON s.student_id = e.student_id
         JOIN courses c ON c.course_id = e.course_id
         WHERE e.enrollment_id = ?`
      )
      .get(id);
    if (!row) throw ERRORS.NOT_FOUND("Enrollment not found.");
    return row;
  }

  listEnrollments({ studentId, courseId, status } = {}) {
    let sql = `
      SELECT e.*, s.full_name AS student_name, c.course_title,
             p.payment_id, p.amount AS payment_amount, p.payment_status, p.transaction_ref
      FROM enrollments e
      JOIN students s ON s.student_id = e.student_id
      JOIN courses c ON c.course_id = e.course_id
      LEFT JOIN payments p ON p.enrollment_id = e.enrollment_id
      WHERE 1 = 1`;
    const params = [];
    if (studentId) {
      sql += " AND e.student_id = ?";
      params.push(studentId);
    }
    if (courseId) {
      sql += " AND e.course_id = ?";
      params.push(courseId);
    }
    if (status) {
      sql += " AND e.enrollment_status = ?";
      params.push(status);
    }
    sql += " ORDER BY e.enrollment_date DESC";
    return this.db.prepare(sql).all(...params);
  }

  recordPayment(enrollmentId, amount, method, transactionRef, opts = {}) {
    const existing = this.db.prepare("SELECT * FROM payments WHERE enrollment_id = ?").get(enrollmentId);
    if (!existing) throw ERRORS.PAYMENT_NOT_FOUND();

    if (transactionRef) {
      const dupRef = this.db
        .prepare("SELECT 1 FROM payments WHERE transaction_ref = ? AND payment_id != ?")
        .get(transactionRef, existing.payment_id);
      if (dupRef) throw ERRORS.DUPLICATE_TRANSACTION_REF();
    }

    const paidDate = opts.paidDate || todayIso();
    // trigger trg_payment_paid_date equivalent: paid_date auto-set when moving to PAID
    this.db
      .prepare(
        `UPDATE payments SET amount = ?, payment_method = ?, payment_status = 'PAID', paid_date = ?, transaction_ref = ?
         WHERE enrollment_id = ?`
      )
      .run(amount, method, paidDate, transactionRef || `TXN-${Date.now()}`, enrollmentId);

    return this.db.prepare("SELECT * FROM payments WHERE enrollment_id = ?").get(enrollmentId);
  }

  listPayments({ status } = {}) {
    let sql = `
      SELECT p.*, s.full_name AS student_name, c.course_title
      FROM payments p
      JOIN enrollments e ON e.enrollment_id = p.enrollment_id
      JOIN students s ON s.student_id = e.student_id
      JOIN courses c ON c.course_id = e.course_id
      WHERE 1 = 1`;
    const params = [];
    if (status) {
      sql += " AND p.payment_status = ?";
      params.push(status);
    }
    sql += " ORDER BY p.payment_id DESC";
    return this.db.prepare(sql).all(...params);
  }

  getCompletionPercent(enrollmentId) {
    const row = this.db
      .prepare(
        `SELECT
           (SELECT COUNT(*) FROM lessons ls
              JOIN enrollments e ON e.course_id = ls.course_id WHERE e.enrollment_id = ?) AS total,
           (SELECT COUNT(*) FROM lesson_progress lp WHERE lp.enrollment_id = ? AND lp.completed_flag = 'Y') AS done`
      )
      .get(enrollmentId, enrollmentId);
    if (!row || !row.total) return 0;
    return Math.round((row.done / row.total) * 10000) / 100;
  }

  updateProgress(enrollmentId, lessonId, quizScore) {
    const enrollment = this.db.prepare("SELECT * FROM enrollments WHERE enrollment_id = ?").get(enrollmentId);
    if (!enrollment) throw ERRORS.PROGRESS_UPDATE_FAILED("Enrollment does not exist.");

    const today = todayIso();
    const existing = this.db
      .prepare("SELECT * FROM lesson_progress WHERE enrollment_id = ? AND lesson_id = ?")
      .get(enrollmentId, lessonId);

    // MERGE equivalent
    if (existing) {
      this.db
        .prepare(
          "UPDATE lesson_progress SET completed_flag = 'Y', completed_date = ?, quiz_score = ? WHERE enrollment_id = ? AND lesson_id = ?"
        )
        .run(today, quizScore, enrollmentId, lessonId);
    } else {
      this.db
        .prepare(
          "INSERT INTO lesson_progress (enrollment_id, lesson_id, completed_flag, completed_date, quiz_score) VALUES (?, ?, 'Y', ?, ?)"
        )
        .run(enrollmentId, lessonId, today, quizScore);
    }

    const percent = this.getCompletionPercent(enrollmentId);
    const avgScoreRow = this.db
      .prepare(
        "SELECT ROUND(AVG(quiz_score), 2) AS avg_score FROM lesson_progress WHERE enrollment_id = ? AND completed_flag = 'Y'"
      )
      .get(enrollmentId);

    const wasBelow100 = enrollment.completion_percent < 100;
    this.db
      .prepare("UPDATE enrollments SET completion_percent = ?, final_score = ? WHERE enrollment_id = ?")
      .run(percent, avgScoreRow.avg_score, enrollmentId);

    // trg_enrollment_completion_status + trg_certificate_issue equivalent
    if (percent === 100 && wasBelow100) {
      this.db
        .prepare("UPDATE enrollments SET enrollment_status = 'COMPLETED' WHERE enrollment_id = ?")
        .run(enrollmentId);

      const hasCert = this.db.prepare("SELECT 1 FROM certificates WHERE enrollment_id = ?").get(enrollmentId);
      if (!hasCert) {
        const year = new Date().getFullYear();
        const code = `CC-${year}-${String(enrollmentId).padStart(4, "0")}`;
        this.db
          .prepare("INSERT INTO certificates (enrollment_id, certificate_code) VALUES (?, ?)")
          .run(enrollmentId, code);
      }
    }

    return this.getEnrollment(enrollmentId);
  }

  listProgress(enrollmentId) {
    return this.db
      .prepare(
        `SELECT lp.*, ls.lesson_title, ls.lesson_order
         FROM lesson_progress lp JOIN lessons ls ON ls.lesson_id = lp.lesson_id
         WHERE lp.enrollment_id = ? ORDER BY ls.lesson_order`
      )
      .all(enrollmentId);
  }

  listCertificates(studentId) {
    return this.db
      .prepare(
        `SELECT cert.*, c.course_title, s.full_name AS student_name
         FROM certificates cert
         JOIN enrollments e ON e.enrollment_id = cert.enrollment_id
         JOIN courses c ON c.course_id = e.course_id
         JOIN students s ON s.student_id = e.student_id
         WHERE (? IS NULL OR e.student_id = ?)
         ORDER BY cert.issued_date DESC`
      )
      .all(studentId ?? null, studentId ?? null);
  }

  // ---------- reports (mirror the 5 report procedures) ----------
  reportPopularCourses() {
    return this.db
      .prepare(
        `SELECT c.course_id, c.course_title,
                COUNT(e.enrollment_id) AS enrollment_count,
                COALESCE(SUM(CASE WHEN p.payment_status = 'PAID' THEN p.amount END), 0) AS revenue
         FROM courses c
         LEFT JOIN enrollments e ON e.course_id = c.course_id
         LEFT JOIN payments p ON p.enrollment_id = e.enrollment_id
         GROUP BY c.course_id, c.course_title
         ORDER BY enrollment_count DESC, revenue DESC`
      )
      .all();
  }

  reportRevenueByPeriod(startDate, endDate) {
    return this.db
      .prepare(
        `SELECT c.course_title,
                COUNT(p.payment_id) AS paid_transactions,
                SUM(p.amount) AS total_revenue
         FROM payments p
         JOIN enrollments e ON e.enrollment_id = p.enrollment_id
         JOIN courses c ON c.course_id = e.course_id
         WHERE p.payment_status = 'PAID' AND p.paid_date BETWEEN ? AND ?
         GROUP BY c.course_title
         ORDER BY total_revenue DESC`
      )
      .all(startDate, endDate);
  }

  reportStudentProgress(studentId) {
    return this.db
      .prepare(
        `SELECT s.full_name, c.course_title, e.enrollment_status, e.completion_percent, e.final_score
         FROM enrollments e
         JOIN students s ON s.student_id = e.student_id
         JOIN courses c ON c.course_id = e.course_id
         WHERE e.student_id = ?
         ORDER BY e.enrollment_date DESC`
      )
      .all(studentId);
  }

  reportPendingPayments() {
    return this.db
      .prepare(
        `SELECT p.payment_id, s.full_name AS student_name, c.course_title, p.amount, p.payment_status, e.enrollment_date
         FROM payments p
         JOIN enrollments e ON e.enrollment_id = p.enrollment_id
         JOIN students s ON s.student_id = e.student_id
         JOIN courses c ON c.course_id = e.course_id
         WHERE p.payment_status = 'PENDING'
         ORDER BY e.enrollment_date`
      )
      .all();
  }

  reportLecturerPerformance() {
    return this.db
      .prepare(
        `SELECT l.full_name,
                COUNT(DISTINCT c.course_id) AS course_count,
                COUNT(e.enrollment_id) AS enrollment_count,
                COALESCE(SUM(CASE WHEN p.payment_status = 'PAID' THEN p.amount END), 0) AS revenue,
                ROUND(AVG(e.final_score), 2) AS average_score
         FROM lecturers l
         LEFT JOIN courses c ON c.lecturer_id = l.lecturer_id
         LEFT JOIN enrollments e ON e.course_id = c.course_id
         LEFT JOIN payments p ON p.enrollment_id = e.enrollment_id
         GROUP BY l.lecturer_id, l.full_name
         ORDER BY revenue DESC`
      )
      .all();
  }

  dashboardSummary() {
    const totals = this.db
      .prepare(
        `SELECT
           (SELECT COUNT(*) FROM students) AS student_count,
           (SELECT COUNT(*) FROM lecturers) AS lecturer_count,
           (SELECT COUNT(*) FROM courses WHERE published_status = 'PUBLISHED') AS published_course_count,
           (SELECT COUNT(*) FROM enrollments) AS enrollment_count,
           (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE payment_status = 'PAID') AS total_revenue,
           (SELECT COUNT(*) FROM payments WHERE payment_status = 'PENDING') AS pending_payment_count,
           (SELECT COUNT(*) FROM certificates) AS certificate_count`
      )
      .get();
    return totals;
  }

  // ---------- auth ----------
  findUserByEmail(email) {
    return this.db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  }

  createUser({ email, fullName, role, hash, salt, linkedLecturerId, linkedStudentId }) {
    const dup = this.findUserByEmail(email);
    if (dup) throw ERRORS.DUPLICATE_EMAIL();
    const info = this.db
      .prepare(
        `INSERT INTO users (email, full_name, role, password_hash, password_salt, linked_lecturer_id, linked_student_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(email, fullName, role, hash, salt, linkedLecturerId ?? null, linkedStudentId ?? null);
    return this.db.prepare("SELECT * FROM users WHERE user_id = ?").get(Number(info.lastInsertRowid));
  }
}

module.exports = { SqliteEngine };
