# CourseConnect

CourseConnect is a coursework-ready online course platform for Data Management 2. It demonstrates a relational Oracle database for structured operations and MongoDB for flexible course content, reviews, and forum discussions.

## What to Build First

Build the Oracle database core first. It carries the highest marks because it proves the system can handle students, lecturers, courses, enrollments, payments, progress tracking, certificates, and PL/SQL business reports.

After that, connect MongoDB for flexible content:

- Lecture notes, videos, resources, and supplementary material
- Student reviews and ratings
- Forum questions, answers, and discussions

The web app in this project runs in demo mode without installing packages. The database scripts are ready for Oracle SQL Developer and MongoDB Shell.

## Project Contents

- `src/` - Node.js web server and API
- `public/` - user interface files
- `database/oracle/` - schema, sample data, PL/SQL package, triggers, and report calls
- `database/mongodb/` - MongoDB seed data and aggregation queries
- `docs/` - ER diagram, setup guide, report guide, and project explanation
- `presentation/` - presentation outline for viva or slide creation

## Run the Demo Application

```bash
npm start
```

Open:

```text
http://localhost:3000
```

The application uses in-memory sample data by default so it can be demonstrated immediately.

## Oracle Setup

Run these files in Oracle SQL Developer in order:

1. `database/oracle/01_schema.sql`
2. `database/oracle/02_sample_data.sql`
3. `database/oracle/03_plsql_package.sql`
4. `database/oracle/04_report_calls.sql`

## MongoDB Setup

Run:

```bash
mongosh < database/mongodb/seed_and_queries.js
```

## Main Features

- Course catalogue dashboard
- Lecturer and student management model
- Enrollment and course registration logic
- Payment status tracking
- Student progress and completion tracking
- Oracle PL/SQL triggers, functions, procedures, cursors, and exceptions
- Five business reports
- MongoDB reviews, resources, and forum query examples

## Viva Talking Points

- Oracle stores transactional data because it needs strong consistency, relationships, constraints, and reporting.
- MongoDB stores flexible content because course resources, reviews, and forum discussions have different shapes and change frequently.
- The PL/SQL package centralizes business logic close to the relational data.
- The web application shows how one interface can use both structured and unstructured data.
