# Coursework Marking Checklist

Use this checklist before submitting.

| Requirement from Brief | Where It Is Covered |
|---|---|
| ER or EER diagram | `docs/ER_DIAGRAM.md` |
| Web or enterprise application | `src/`, `public/`, `README.md` |
| Oracle relational schema | `database/oracle/01_schema.sql` |
| Course catalogue management | `courses`, `categories`, web catalogue |
| Lecturer information | `lecturers` table and sample data |
| Student management | `students` table and sample data |
| Enrollment and registrations | `enrollments` table, `enroll_student` procedure, web workflow |
| Payment processing | `payments` table, `record_payment` procedure |
| Progress and completion tracking | `lesson_progress`, `update_progress`, certificate triggers |
| Sufficient sample data | `database/oracle/02_sample_data.sql` |
| PL/SQL procedures | `courseconnect_pkg.enroll_student`, `record_payment`, `update_progress` |
| PL/SQL functions | `get_course_revenue`, `get_completion_percent` |
| Cursor/report output | Ref cursor report procedures |
| Exception handling | `RAISE_APPLICATION_ERROR` blocks in package body |
| Triggers | Payment date, completion status, certificate issue triggers |
| Five business reports | `docs/BUSINESS_REPORTS.md`, `04_report_calls.sql` |
| MongoDB course content | `courseResources` collection |
| MongoDB reviews and ratings | `courseReviews` collection |
| MongoDB forums and Q&A | `discussionThreads` collection |
| MongoDB feedback query | `seed_and_queries.js` query 1 |
| MongoDB top-rated courses query | `seed_and_queries.js` query 2 |
| MongoDB keyword search | `seed_and_queries.js` query 3 |
| Presentation support | `presentation/presentation_outline.md` |

## Before Uploading to GitHub

- Confirm `README.md` is visible at the repository root.
- Do not upload `node_modules`.
- Include the `database`, `docs`, `public`, `src`, and `presentation` folders.
- Run `npm start` and check the home page.
- Run `node src/tests.js` and confirm the checks pass.
