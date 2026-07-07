# Project Explanation

## Project Idea

CourseConnect is an online platform that connects lecturers and students across technology, business, and creative arts courses. Students can browse courses, enroll, make payments, complete lessons, track progress, and earn certificates.

## Why This Project Fits the Coursework

The brief asks for:

- ER or EER diagram
- Web or enterprise application
- Oracle relational database schema
- Sample data
- PL/SQL programs with reports
- MongoDB integration for unstructured content
- Queries for reviews, ratings, and forums

CourseConnect covers each requirement directly.

## Oracle Role

Oracle is used for the structured operational core:

- Course catalogue management
- Lecturer management
- Student management
- Enrollment and registration
- Payment processing
- Progress and completion tracking
- Certificate issuing

This data needs constraints, consistency, joins, and transaction safety.

## MongoDB Role

MongoDB is used for flexible, semi-structured content:

- Lecture notes and multimedia resources
- Student reviews and open-ended feedback
- Discussion forum threads and Q&A posts

This data can vary by course and does not always fit a fixed table structure.

## Application Role

The application provides a simple interface for demonstrating:

- Dashboard KPIs
- Course catalogue
- Business reports
- Feedback and discussion search

The current version runs in demo mode so it can be shown easily. The database scripts prove how the real Oracle and MongoDB implementation should work.

## Future Enhancements

- Add login roles for admin, lecturer, and student
- Connect the app directly to Oracle using `oracledb`
- Connect the app directly to MongoDB using the MongoDB Node driver
- Add course creation and enrollment forms
- Add lecturer analytics dashboard
