-- CourseConnect PL/SQL package: procedures, functions, cursors, triggers, and exception handling.

CREATE OR REPLACE PACKAGE courseconnect_pkg AS
  PROCEDURE enroll_student(p_student_id IN NUMBER, p_course_id IN NUMBER);
  PROCEDURE record_payment(p_enrollment_id IN NUMBER, p_amount IN NUMBER, p_method IN VARCHAR2, p_transaction_ref IN VARCHAR2);
  PROCEDURE update_progress(p_enrollment_id IN NUMBER, p_lesson_id IN NUMBER, p_quiz_score IN NUMBER);

  FUNCTION get_course_revenue(p_course_id IN NUMBER) RETURN NUMBER;
  FUNCTION get_completion_percent(p_enrollment_id IN NUMBER) RETURN NUMBER;

  PROCEDURE report_popular_courses(p_result OUT SYS_REFCURSOR);
  PROCEDURE report_revenue_by_period(p_start_date IN DATE, p_end_date IN DATE, p_result OUT SYS_REFCURSOR);
  PROCEDURE report_student_progress(p_student_id IN NUMBER, p_result OUT SYS_REFCURSOR);
  PROCEDURE report_pending_payments(p_result OUT SYS_REFCURSOR);
  PROCEDURE report_lecturer_performance(p_result OUT SYS_REFCURSOR);
END courseconnect_pkg;
/

CREATE OR REPLACE PACKAGE BODY courseconnect_pkg AS
  PROCEDURE enroll_student(p_student_id IN NUMBER, p_course_id IN NUMBER) AS
    v_price courses.price%TYPE;
    v_enrollment_id enrollments.enrollment_id%TYPE;
  BEGIN
    SELECT price INTO v_price
    FROM courses
    WHERE course_id = p_course_id
      AND published_status = 'PUBLISHED';

    INSERT INTO enrollments (student_id, course_id, enrollment_status, completion_percent)
    VALUES (p_student_id, p_course_id, 'ACTIVE', 0)
    RETURNING enrollment_id INTO v_enrollment_id;

    INSERT INTO payments (enrollment_id, amount, payment_method, payment_status)
    VALUES (v_enrollment_id, v_price, 'PENDING', 'PENDING');
  EXCEPTION
    WHEN NO_DATA_FOUND THEN
      RAISE_APPLICATION_ERROR(-20001, 'Course is not published or does not exist.');
    WHEN DUP_VAL_ON_INDEX THEN
      RAISE_APPLICATION_ERROR(-20002, 'Student is already enrolled in this course.');
  END enroll_student;

  PROCEDURE record_payment(p_enrollment_id IN NUMBER, p_amount IN NUMBER, p_method IN VARCHAR2, p_transaction_ref IN VARCHAR2) AS
  BEGIN
    UPDATE payments
    SET amount = p_amount,
        payment_method = p_method,
        payment_status = 'PAID',
        paid_date = SYSDATE,
        transaction_ref = p_transaction_ref
    WHERE enrollment_id = p_enrollment_id;

    IF SQL%ROWCOUNT = 0 THEN
      RAISE_APPLICATION_ERROR(-20003, 'No payment record exists for this enrollment.');
    END IF;
  EXCEPTION
    WHEN DUP_VAL_ON_INDEX THEN
      RAISE_APPLICATION_ERROR(-20004, 'Transaction reference must be unique.');
  END record_payment;

  PROCEDURE update_progress(p_enrollment_id IN NUMBER, p_lesson_id IN NUMBER, p_quiz_score IN NUMBER) AS
  BEGIN
    MERGE INTO lesson_progress lp
    USING (SELECT p_enrollment_id enrollment_id, p_lesson_id lesson_id FROM dual) src
    ON (lp.enrollment_id = src.enrollment_id AND lp.lesson_id = src.lesson_id)
    WHEN MATCHED THEN
      UPDATE SET completed_flag = 'Y', completed_date = SYSDATE, quiz_score = p_quiz_score
    WHEN NOT MATCHED THEN
      INSERT (enrollment_id, lesson_id, completed_flag, completed_date, quiz_score)
      VALUES (p_enrollment_id, p_lesson_id, 'Y', SYSDATE, p_quiz_score);

    UPDATE enrollments
    SET completion_percent = get_completion_percent(p_enrollment_id),
        final_score = (
          SELECT ROUND(AVG(quiz_score), 2)
          FROM lesson_progress
          WHERE enrollment_id = p_enrollment_id AND completed_flag = 'Y'
        )
    WHERE enrollment_id = p_enrollment_id;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE_APPLICATION_ERROR(-20005, 'Progress update failed: ' || SQLERRM);
  END update_progress;

  FUNCTION get_course_revenue(p_course_id IN NUMBER) RETURN NUMBER AS
    v_revenue NUMBER;
  BEGIN
    SELECT NVL(SUM(p.amount), 0)
    INTO v_revenue
    FROM payments p
    JOIN enrollments e ON e.enrollment_id = p.enrollment_id
    WHERE e.course_id = p_course_id
      AND p.payment_status = 'PAID';

    RETURN v_revenue;
  END get_course_revenue;

  FUNCTION get_completion_percent(p_enrollment_id IN NUMBER) RETURN NUMBER AS
    v_percent NUMBER;
  BEGIN
    SELECT ROUND((COUNT(CASE WHEN lp.completed_flag = 'Y' THEN 1 END) / COUNT(l.lesson_id)) * 100, 2)
    INTO v_percent
    FROM enrollments e
    JOIN lessons l ON l.course_id = e.course_id
    LEFT JOIN lesson_progress lp
      ON lp.enrollment_id = e.enrollment_id
     AND lp.lesson_id = l.lesson_id
    WHERE e.enrollment_id = p_enrollment_id;

    RETURN NVL(v_percent, 0);
  END get_completion_percent;

  PROCEDURE report_popular_courses(p_result OUT SYS_REFCURSOR) AS
  BEGIN
    OPEN p_result FOR
      SELECT c.course_id,
             c.course_title,
             COUNT(e.enrollment_id) AS enrollment_count,
             courseconnect_pkg.get_course_revenue(c.course_id) AS revenue
      FROM courses c
      LEFT JOIN enrollments e ON e.course_id = c.course_id
      GROUP BY c.course_id, c.course_title
      ORDER BY enrollment_count DESC, revenue DESC;
  END report_popular_courses;

  PROCEDURE report_revenue_by_period(p_start_date IN DATE, p_end_date IN DATE, p_result OUT SYS_REFCURSOR) AS
  BEGIN
    OPEN p_result FOR
      SELECT c.course_title,
             COUNT(p.payment_id) AS paid_transactions,
             SUM(p.amount) AS total_revenue
      FROM payments p
      JOIN enrollments e ON e.enrollment_id = p.enrollment_id
      JOIN courses c ON c.course_id = e.course_id
      WHERE p.payment_status = 'PAID'
        AND p.paid_date BETWEEN p_start_date AND p_end_date
      GROUP BY c.course_title
      ORDER BY total_revenue DESC;
  END report_revenue_by_period;

  PROCEDURE report_student_progress(p_student_id IN NUMBER, p_result OUT SYS_REFCURSOR) AS
  BEGIN
    OPEN p_result FOR
      SELECT s.full_name,
             c.course_title,
             e.enrollment_status,
             e.completion_percent,
             e.final_score
      FROM enrollments e
      JOIN students s ON s.student_id = e.student_id
      JOIN courses c ON c.course_id = e.course_id
      WHERE e.student_id = p_student_id
      ORDER BY e.enrollment_date DESC;
  END report_student_progress;

  PROCEDURE report_pending_payments(p_result OUT SYS_REFCURSOR) AS
  BEGIN
    OPEN p_result FOR
      SELECT p.payment_id,
             s.full_name AS student_name,
             c.course_title,
             p.amount,
             p.payment_status,
             e.enrollment_date
      FROM payments p
      JOIN enrollments e ON e.enrollment_id = p.enrollment_id
      JOIN students s ON s.student_id = e.student_id
      JOIN courses c ON c.course_id = e.course_id
      WHERE p.payment_status = 'PENDING'
      ORDER BY e.enrollment_date;
  END report_pending_payments;

  PROCEDURE report_lecturer_performance(p_result OUT SYS_REFCURSOR) AS
  BEGIN
    OPEN p_result FOR
      SELECT l.full_name,
             COUNT(DISTINCT c.course_id) AS course_count,
             COUNT(e.enrollment_id) AS enrollment_count,
             NVL(SUM(CASE WHEN p.payment_status = 'PAID' THEN p.amount END), 0) AS revenue,
             ROUND(AVG(e.final_score), 2) AS average_score
      FROM lecturers l
      LEFT JOIN courses c ON c.lecturer_id = l.lecturer_id
      LEFT JOIN enrollments e ON e.course_id = c.course_id
      LEFT JOIN payments p ON p.enrollment_id = e.enrollment_id
      GROUP BY l.full_name
      ORDER BY revenue DESC;
  END report_lecturer_performance;
END courseconnect_pkg;
/

CREATE OR REPLACE TRIGGER trg_payment_paid_date
BEFORE INSERT OR UPDATE ON payments
FOR EACH ROW
BEGIN
  IF :NEW.payment_status = 'PAID' AND :NEW.paid_date IS NULL THEN
    :NEW.paid_date := SYSDATE;
  END IF;
END;
/

CREATE OR REPLACE TRIGGER trg_enrollment_completion_status
BEFORE UPDATE OF completion_percent ON enrollments
FOR EACH ROW
WHEN (NEW.completion_percent = 100 AND OLD.completion_percent < 100)
BEGIN
  :NEW.enrollment_status := 'COMPLETED';
END;
/

CREATE OR REPLACE TRIGGER trg_certificate_issue
AFTER UPDATE OF completion_percent ON enrollments
FOR EACH ROW
WHEN (NEW.completion_percent = 100 AND OLD.completion_percent < 100)
BEGIN
  INSERT INTO certificates (enrollment_id, certificate_code)
  SELECT :NEW.enrollment_id, 'CC-' || TO_CHAR(SYSDATE, 'YYYY') || '-' || LPAD(:NEW.enrollment_id, 4, '0')
  FROM dual
  WHERE NOT EXISTS (
    SELECT 1 FROM certificates WHERE enrollment_id = :NEW.enrollment_id
  );
END;
/
