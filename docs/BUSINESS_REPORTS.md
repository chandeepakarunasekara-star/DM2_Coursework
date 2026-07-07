# Business Reports

The coursework requires at least five business reports. CourseConnect implements them in `courseconnect_pkg`.

## 1. Most Popular Courses

Procedure:

```sql
courseconnect_pkg.report_popular_courses(:rc);
```

Purpose:

Ranks courses by enrollment count and revenue. This helps the platform identify high-demand courses.

## 2. Revenue by Period

Procedure:

```sql
courseconnect_pkg.report_revenue_by_period(DATE '2026-01-01', DATE '2026-03-31', :rc);
```

Purpose:

Calculates paid transactions and revenue between two dates. This supports finance reporting.

## 3. Student Progress Report

Procedure:

```sql
courseconnect_pkg.report_student_progress(1, :rc);
```

Purpose:

Shows a student's courses, status, completion percentage, and score. This supports progress tracking.

## 4. Pending Payments

Procedure:

```sql
courseconnect_pkg.report_pending_payments(:rc);
```

Purpose:

Lists students and courses with unpaid enrollments. This supports payment follow-up.

## 5. Lecturer Performance

Procedure:

```sql
courseconnect_pkg.report_lecturer_performance(:rc);
```

Purpose:

Compares lecturers by course count, enrollments, revenue, and average student score.

## PL/SQL Techniques Used

- Procedures for enrollment, payment, progress, and reporting
- Functions for revenue and completion calculation
- Ref cursors for report output
- Triggers for payment dates, completion status, and certificates
- Exception handling using `RAISE_APPLICATION_ERROR`
