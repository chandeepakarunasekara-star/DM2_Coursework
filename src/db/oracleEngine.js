// Real Oracle Database adapter.
//
// This is the production data-access path: it runs the exact schema in
// database/oracle/01_schema.sql and calls the exact procedures/functions in
// database/oracle/03_plsql_package.sql. It is only activated when
// ORACLE_USER and ORACLE_CONNECT_STRING are set (see src/config.js) and the
// optional `oracledb` driver is installed - see docs/SETUP_GUIDE.md.
//
// Run database/oracle/01_schema.sql, 02_sample_data.sql and
// 03_plsql_package.sql against your Oracle instance before starting the app
// in this mode.
const { ERRORS } = require("./errors");
const { hashPassword } = require("./passwords");

// Oracle returns unquoted column names in UPPERCASE by default (e.g.
// PASSWORD_HASH), but the rest of the app - and the SQLite demo engine -
// expects lowercase keys (e.g. password_hash). Normalize every row here in
// one place so both engines return identically-shaped objects.
function lowercaseKeys(row) {
  const out = {};
  for (const key of Object.keys(row)) {
    out[key.toLowerCase()] = row[key];
  }
  return out;
}

class OracleEngine {
  constructor(config) {
    let oracledb;
    try {
      // eslint-disable-next-line global-require, import/no-unresolved
      oracledb = require("oracledb");
    } catch (err) {
      throw new Error(
        "ORACLE_USER / ORACLE_CONNECT_STRING are set but the 'oracledb' driver is not installed. " +
          "Run `npm install oracledb` and ensure Oracle Instant Client is available, or unset the ORACLE_* env vars to use the embedded demo database."
      );
    }
    this.oracledb = oracledb;
    oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
    oracledb.autoCommit = true;
    this.poolPromise = oracledb.createPool({
      user: config.user,
      password: config.password,
      connectString: config.connectString,
      poolMin: 1,
      poolMax: 5
    });
  }

  async _withConn(fn) {
    const pool = await this.poolPromise;
    const conn = await pool.getConnection();
    try {
      return await fn(conn);
    } catch (err) {
      const match = /ORA-(\d{5}):\s*(.*)/.exec(err.message || "");
      if (match) {
        const err2 = new Error(match[2]);
        err2.code = `ORA-${match[1]}`;
        err2.httpStatus = 400;
        throw err2;
      }
      throw err;
    } finally {
      await conn.close();
    }
  }

  async _query(sql, binds = []) {
    return this._withConn(async (conn) => {
      const result = await conn.execute(sql, binds);
      return result.rows.map(lowercaseKeys);
    });
  }

  async _cursorCall(plsql, binds) {
    return this._withConn(async (conn) => {
      const result = await conn.execute(plsql, {
        ...binds,
        p_result: { type: this.oracledb.CURSOR, dir: this.oracledb.BIND_OUT }
      });
      const cursor = result.outBinds.p_result;
      const rows = await cursor.getRows();
      await cursor.close();
      return rows.map(lowercaseKeys);
    });
  }

  // ---------- lookups ----------
  listCategories() {
    return this._query("SELECT * FROM categories ORDER BY category_name");
  }

  listLecturers() {
    return this._query(
      `SELECT l.*, (SELECT COUNT(*) FROM courses c WHERE c.lecturer_id = l.lecturer_id) AS course_count
       FROM lecturers l ORDER BY l.full_name`
    );
  }

  async createLecturer({ fullName, email, expertise }) {
    if (!fullName || !email || !expertise) throw ERRORS.VALIDATION("Full name, email, and expertise are required.");
    await this._withConn((conn) =>
      conn.execute(
        `INSERT INTO lecturers (full_name, email, expertise) VALUES (:fullName, :email, :expertise)`,
        { fullName, email, expertise }
      )
    );
    const rows = await this._query("SELECT * FROM lecturers WHERE email = :email", { email });
    return rows[0];
  }

  async updateLecturer(id, { fullName, expertise, status }) {
    await this._withConn((conn) =>
      conn.execute(
        `BEGIN courseconnect_pkg.update_lecturer(:id, :fullName, :expertise, :status); END;`,
        { id, fullName: fullName ?? null, expertise: expertise ?? null, status: status ?? null }
      )
    );
    const rows = await this._query("SELECT * FROM lecturers WHERE lecturer_id = :id", { id });
    return rows[0];
  }

  async deleteLecturer(id) {
    await this._withConn((conn) =>
      conn.execute(`BEGIN courseconnect_pkg.delete_lecturer(:id); END;`, { id })
    );
    return { deleted: true };
  }

  listStudents() {
    return this._query("SELECT * FROM students ORDER BY full_name");
  }

  async createStudent({ fullName, email }) {
    if (!fullName || !email) throw ERRORS.VALIDATION("Full name and email are required.");
    await this._withConn((conn) =>
      conn.execute(`INSERT INTO students (full_name, email) VALUES (:fullName, :email)`, { fullName, email })
    );
    const rows = await this._query("SELECT * FROM students WHERE email = :email", { email });
    return rows[0];
  }

  async updateStudent(id, { fullName, status }) {
    await this._withConn((conn) =>
      conn.execute(
        `BEGIN courseconnect_pkg.update_student(:id, :fullName, :status); END;`,
        { id, fullName: fullName ?? null, status: status ?? null }
      )
    );
    const rows = await this._query("SELECT * FROM students WHERE student_id = :id", { id });
    return rows[0];
  }

  async deleteStudent(id) {
    await this._withConn((conn) =>
      conn.execute(`BEGIN courseconnect_pkg.delete_student(:id); END;`, { id })
    );
    return { deleted: true };
  }

  async listCourses({ category, level, status, search } = {}) {
    let sql = `
      SELECT c.*, cat.category_name, l.full_name AS lecturer_name,
        (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.course_id) AS enrollment_count,
        (SELECT COUNT(*) FROM lessons ls WHERE ls.course_id = c.course_id) AS lesson_count
      FROM courses c
      JOIN categories cat ON cat.category_id = c.category_id
      JOIN lecturers l ON l.lecturer_id = c.lecturer_id
      WHERE 1 = 1`;
    const binds = {};
    if (category) {
      sql += " AND cat.category_name = :category";
      binds.category = category;
    }
    if (level) {
      // NOTE: "LEVEL" is an Oracle reserved pseudo-column, so the bind
      // variable is named :courseLevel here, not :level (which throws
      // ORA-01745: invalid host/bind variable name).
      sql += " AND c.course_level = :courseLevel";
      binds.courseLevel = level;
    }
    if (status) {
      sql += " AND c.published_status = :status";
      binds.status = status;
    }
    if (search) {
      sql += " AND LOWER(c.course_title) LIKE :search";
      binds.search = `%${search.toLowerCase()}%`;
    }
    sql += " ORDER BY c.created_date DESC";
    return this._query(sql, binds);
  }

  async getCourse(id) {
    const rows = await this._query(
      `SELECT c.*, cat.category_name, l.full_name AS lecturer_name
       FROM courses c JOIN categories cat ON cat.category_id = c.category_id
       JOIN lecturers l ON l.lecturer_id = c.lecturer_id WHERE c.course_id = :id`,
      { id }
    );
    if (!rows.length) throw ERRORS.NOT_FOUND("Course not found.");
    const course = rows[0];
    course.lessons = await this._query(
      "SELECT * FROM lessons WHERE course_id = :id ORDER BY lesson_order",
      { id }
    );
    return course;
  }

  async createCourse({ categoryId, lecturerId, title, level, price, durationHours, status, lessons }) {
    if (!categoryId || !lecturerId || !title || !level || price == null || !durationHours) {
      throw ERRORS.VALIDATION("categoryId, lecturerId, title, level, price and durationHours are required.");
    }
    const courseId = await this._withConn(async (conn) => {
      const result = await conn.execute(
        `INSERT INTO courses (category_id, lecturer_id, course_title, course_level, price, duration_hours, published_status)
         VALUES (:categoryId, :lecturerId, :title, :courseLevel, :price, :durationHours, :status)
         RETURNING course_id INTO :outId`,
        {
          categoryId, lecturerId, title,
          courseLevel: level,
          price, durationHours,
          status: status || "DRAFT",
          outId: { type: this.oracledb.NUMBER, dir: this.oracledb.BIND_OUT }
        }
      );
      return result.outBinds.outId[0];
    });

    const lessonList = Array.isArray(lessons) && lessons.length ? lessons : ["Introduction"];
    await this._withConn(async (conn) => {
      let lessonOrder = 1;
      for (const lessonTitle of lessonList) {
        // NOTE: "ORDER" is also an Oracle reserved word, so the bind
        // variable is named :lessonOrder here, not :order.
        // eslint-disable-next-line no-await-in-loop
        await conn.execute(
          `INSERT INTO lessons (course_id, lesson_title, lesson_order, estimated_minutes) VALUES (:courseId, :lessonTitle, :lessonOrder, 30)`,
          { courseId, lessonTitle, lessonOrder }
        );
        lessonOrder += 1;
      }
    });

    return this.getCourse(courseId);
  }

  async updateCourse(id, { title, level, price, durationHours, status }) {
    await this._withConn((conn) =>
      conn.execute(
        `BEGIN courseconnect_pkg.update_course(:id, :title, :courseLevel, :price, :durationHours, :status); END;`,
        {
          id, title: title ?? null,
          courseLevel: level ?? null,
          price: price ?? null,
          durationHours: durationHours ?? null, status: status ?? null
        }
      )
    );
    return this.getCourse(id);
  }

  async deleteCourse(id) {
    await this._withConn((conn) => conn.execute(`BEGIN courseconnect_pkg.delete_course(:id); END;`, { id }));
    return { deleted: true };
  }

  // ---------- business operations - calls the real PL/SQL package ----------
  async enrollStudent(studentId, courseId) {
    await this._withConn((conn) =>
      conn.execute(
        `BEGIN courseconnect_pkg.enroll_student(:studentId, :courseId); END;`,
        { studentId, courseId }
      )
    );
    const rows = await this._query(
      `SELECT e.*, s.full_name AS student_name, c.course_title, c.price
       FROM enrollments e JOIN students s ON s.student_id = e.student_id
       JOIN courses c ON c.course_id = e.course_id
       WHERE e.student_id = :studentId AND e.course_id = :courseId`,
      { studentId, courseId }
    );
    return rows[0];
  }

  async recordPayment(enrollmentId, amount, method, transactionRef) {
    await this._withConn((conn) =>
      conn.execute(
        `BEGIN courseconnect_pkg.record_payment(:enrollmentId, :amount, :method, :ref); END;`,
        { enrollmentId, amount, method, ref: transactionRef }
      )
    );
    const rows = await this._query("SELECT * FROM payments WHERE enrollment_id = :enrollmentId", { enrollmentId });
    return rows[0];
  }

  async updateProgress(enrollmentId, lessonId, quizScore) {
    await this._withConn((conn) =>
      conn.execute(
        `BEGIN courseconnect_pkg.update_progress(:enrollmentId, :lessonId, :quizScore); END;`,
        { enrollmentId, lessonId, quizScore }
      )
    );
    const rows = await this._query(
      `SELECT e.*, s.full_name AS student_name, c.course_title
       FROM enrollments e JOIN students s ON s.student_id = e.student_id
       JOIN courses c ON c.course_id = e.course_id WHERE e.enrollment_id = :enrollmentId`,
      { enrollmentId }
    );
    return rows[0];
  }

  listEnrollments({ studentId, courseId, status } = {}) {
    let sql = `
      SELECT e.*, s.full_name AS student_name, c.course_title,
             p.payment_id, p.amount AS payment_amount, p.payment_status, p.transaction_ref
      FROM enrollments e JOIN students s ON s.student_id = e.student_id
      JOIN courses c ON c.course_id = e.course_id
      LEFT JOIN payments p ON p.enrollment_id = e.enrollment_id
      WHERE 1 = 1`;
    const binds = {};
    if (studentId) {
      sql += " AND e.student_id = :studentId";
      binds.studentId = studentId;
    }
    if (courseId) {
      sql += " AND e.course_id = :courseId";
      binds.courseId = courseId;
    }
    if (status) {
      sql += " AND e.enrollment_status = :status";
      binds.status = status;
    }
    sql += " ORDER BY e.enrollment_date DESC";
    return this._query(sql, binds);
  }

  listPayments({ status } = {}) {
    let sql = `
      SELECT p.*, s.full_name AS student_name, c.course_title
      FROM payments p JOIN enrollments e ON e.enrollment_id = p.enrollment_id
      JOIN students s ON s.student_id = e.student_id
      JOIN courses c ON c.course_id = e.course_id WHERE 1 = 1`;
    const binds = {};
    if (status) {
      sql += " AND p.payment_status = :status";
      binds.status = status;
    }
    sql += " ORDER BY p.payment_id DESC";
    return this._query(sql, binds);
  }

  listProgress(enrollmentId) {
    return this._query(
      `SELECT lp.*, ls.lesson_title, ls.lesson_order
       FROM lesson_progress lp JOIN lessons ls ON ls.lesson_id = lp.lesson_id
       WHERE lp.enrollment_id = :enrollmentId ORDER BY ls.lesson_order`,
      { enrollmentId }
    );
  }

  listCertificates(studentId) {
    if (studentId) {
      return this._query(
        `SELECT cert.*, c.course_title, s.full_name AS student_name
         FROM certificates cert JOIN enrollments e ON e.enrollment_id = cert.enrollment_id
         JOIN courses c ON c.course_id = e.course_id JOIN students s ON s.student_id = e.student_id
         WHERE e.student_id = :studentId ORDER BY cert.issued_date DESC`,
        { studentId }
      );
    }
    return this._query(
      `SELECT cert.*, c.course_title, s.full_name AS student_name
       FROM certificates cert JOIN enrollments e ON e.enrollment_id = cert.enrollment_id
       JOIN courses c ON c.course_id = e.course_id JOIN students s ON s.student_id = e.student_id
       ORDER BY cert.issued_date DESC`
    );
  }

  // ---------- the five PL/SQL business reports ----------
  reportPopularCourses() {
    return this._cursorCall(`BEGIN courseconnect_pkg.report_popular_courses(:p_result); END;`, {});
  }

  reportRevenueByPeriod(startDate, endDate) {
    return this._cursorCall(
      `BEGIN courseconnect_pkg.report_revenue_by_period(TO_DATE(:startDate,'YYYY-MM-DD'), TO_DATE(:endDate,'YYYY-MM-DD'), :p_result); END;`,
      { startDate, endDate }
    );
  }

  reportStudentProgress(studentId) {
    return this._cursorCall(
      `BEGIN courseconnect_pkg.report_student_progress(:studentId, :p_result); END;`,
      { studentId }
    );
  }

  reportPendingPayments() {
    return this._cursorCall(`BEGIN courseconnect_pkg.report_pending_payments(:p_result); END;`, {});
  }

  reportLecturerPerformance() {
    return this._cursorCall(`BEGIN courseconnect_pkg.report_lecturer_performance(:p_result); END;`, {});
  }

  async dashboardSummary() {
    const rows = await this._query(`
      SELECT
        (SELECT COUNT(*) FROM students) AS student_count,
        (SELECT COUNT(*) FROM lecturers) AS lecturer_count,
        (SELECT COUNT(*) FROM courses WHERE published_status = 'PUBLISHED') AS published_course_count,
        (SELECT COUNT(*) FROM enrollments) AS enrollment_count,
        (SELECT NVL(SUM(amount),0) FROM payments WHERE payment_status = 'PAID') AS total_revenue,
        (SELECT COUNT(*) FROM payments WHERE payment_status = 'PENDING') AS pending_payment_count,
        (SELECT COUNT(*) FROM certificates) AS certificate_count
      FROM dual`);
    return rows[0];
  }

  // ---------- auth ----------
  async findUserByEmail(email) {
    const rows = await this._query("SELECT * FROM users WHERE email = :email", { email });
    return rows[0];
  }

  async createUser({ email, fullName, role, hash, salt, linkedLecturerId, linkedStudentId }) {
    await this._withConn((conn) =>
      conn.execute(
        `INSERT INTO users (email, full_name, role, password_hash, password_salt, linked_lecturer_id, linked_student_id)
         VALUES (:email, :fullName, :role, :hash, :salt, :linkedLecturerId, :linkedStudentId)`,
        { email, fullName, role, hash, salt, linkedLecturerId: linkedLecturerId ?? null, linkedStudentId: linkedStudentId ?? null }
      )
    );
    return this.findUserByEmail(email);
  }
}

module.exports = { OracleEngine };