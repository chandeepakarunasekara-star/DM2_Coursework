# Viva Answer Guide

## What is CourseConnect?

CourseConnect is an online learning platform where lecturers publish courses and students enroll, pay, complete lessons, track progress, and give feedback.

## Why did you use Oracle?

Oracle is used for structured transactional data. The system needs strong relationships, constraints, joins, transactions, PL/SQL business logic, and reporting. Examples include students, courses, enrollments, payments, and progress.

## Why did you use MongoDB?

MongoDB is used for flexible content that can vary between courses. Lecture resources, reviews, and forum posts do not always have the same fields, so a document database is suitable.

## What are the main Oracle relationships?

- One lecturer can teach many courses.
- One category can contain many courses.
- One student can enroll in many courses.
- One course can have many students through enrollments.
- One enrollment can have payments, lesson progress, and one certificate.

## What PL/SQL features did you implement?

The project includes procedures, functions, triggers, ref cursor reports, and exception handling. The main package is `courseconnect_pkg`.

## Name the five business reports.

1. Most popular courses
2. Revenue by period
3. Student progress
4. Pending payments
5. Lecturer performance

## What does the enrollment procedure do?

`enroll_student` checks whether the course is published, creates the enrollment, and creates a pending payment record. It also prevents duplicate enrollments.

## What do the triggers do?

- `trg_payment_paid_date` sets the paid date when a payment becomes paid.
- `trg_enrollment_completion_status` marks an enrollment as completed at 100 percent progress.
- `trg_certificate_issue` creates a certificate when a student completes a course.

## How does MongoDB support the application?

MongoDB stores course resources, student reviews, and discussion threads. The query examples retrieve course feedback, calculate top-rated courses, and search discussion threads by keyword.

## What improvement would you make next?

The next improvement would be connecting the Node.js app directly to Oracle and MongoDB using production drivers, then adding login roles for admin, lecturer, and student.
