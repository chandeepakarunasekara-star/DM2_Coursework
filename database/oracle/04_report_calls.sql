-- Report execution examples for SQL Developer.

VARIABLE rc REFCURSOR;

EXEC courseconnect_pkg.report_popular_courses(:rc);
PRINT rc;

EXEC courseconnect_pkg.report_revenue_by_period(DATE '2026-01-01', DATE '2026-03-31', :rc);
PRINT rc;

EXEC courseconnect_pkg.report_student_progress(1, :rc);
PRINT rc;

EXEC courseconnect_pkg.report_pending_payments(:rc);
PRINT rc;

EXEC courseconnect_pkg.report_lecturer_performance(:rc);
PRINT rc;

-- Example business operations:
-- EXEC courseconnect_pkg.enroll_student(3, 4);
-- EXEC courseconnect_pkg.record_payment(8, 140, 'CARD', 'TXN-CC-1008');
-- EXEC courseconnect_pkg.update_progress(8, 9, 86);
