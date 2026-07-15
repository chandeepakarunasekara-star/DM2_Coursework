// Mirrors the custom error codes raised by RAISE_APPLICATION_ERROR in
// database/oracle/03_plsql_package.sql so both the real Oracle path and the
// embedded SQLite fallback surface the exact same business errors.
class AppError extends Error {
  constructor(code, message, httpStatus = 400) {
    super(message);
    this.name = "AppError";
    this.code = code; // e.g. "ORA-20001"
    this.httpStatus = httpStatus;
  }
}

const ERRORS = {
  COURSE_NOT_PUBLISHED: (msg) => new AppError("ORA-20001", msg || "Course is not published or does not exist.", 400),
  DUPLICATE_ENROLLMENT: (msg) => new AppError("ORA-20002", msg || "Student is already enrolled in this course.", 409),
  PAYMENT_NOT_FOUND: (msg) => new AppError("ORA-20003", msg || "No payment record exists for this enrollment.", 404),
  DUPLICATE_TRANSACTION_REF: (msg) => new AppError("ORA-20004", msg || "Transaction reference must be unique.", 409),
  PROGRESS_UPDATE_FAILED: (msg) => new AppError("ORA-20005", msg || "Progress update failed.", 400),
  NOT_FOUND: (msg) => new AppError("ORA-20006", msg || "Record not found.", 404),
  VALIDATION: (msg) => new AppError("ORA-20007", msg || "Invalid request.", 400),
  DUPLICATE_EMAIL: (msg) => new AppError("ORA-20008", msg || "Email is already registered.", 409),
  AUTH: (msg) => new AppError("ORA-20009", msg || "Authentication failed.", 401),
  COURSE_HAS_ENROLLMENTS: (msg) => new AppError("ORA-20010", msg || "Cannot delete a course that already has enrollments - archive it instead.", 409),
  LECTURER_HAS_COURSES: (msg) => new AppError("ORA-20011", msg || "Cannot delete a lecturer who still has courses assigned - reassign or archive their courses first.", 409),
  STUDENT_HAS_ENROLLMENTS: (msg) => new AppError("ORA-20012", msg || "Cannot delete a student with enrollment history - suspend the account instead.", 409)
};

module.exports = { AppError, ERRORS };
