# CourseConnect ER Diagram

```mermaid
erDiagram
    CATEGORIES ||--o{ COURSES : classifies
    LECTURERS ||--o{ COURSES : teaches
    STUDENTS ||--o{ ENROLLMENTS : registers
    COURSES ||--o{ ENROLLMENTS : receives
    COURSES ||--o{ LESSONS : contains
    ENROLLMENTS ||--o{ PAYMENTS : has
    ENROLLMENTS ||--o{ LESSON_PROGRESS : records
    LESSONS ||--o{ LESSON_PROGRESS : completed_in
    ENROLLMENTS ||--o| CERTIFICATES : earns

    CATEGORIES {
        number category_id PK
        varchar category_name
        varchar description
    }

    LECTURERS {
        number lecturer_id PK
        varchar full_name
        varchar email UK
        varchar expertise
        date joined_date
        varchar status
    }

    STUDENTS {
        number student_id PK
        varchar full_name
        varchar email UK
        date registered_date
        varchar status
    }

    COURSES {
        number course_id PK
        number category_id FK
        number lecturer_id FK
        varchar course_title
        varchar course_level
        number price
        number duration_hours
        varchar published_status
    }

    LESSONS {
        number lesson_id PK
        number course_id FK
        varchar lesson_title
        number lesson_order
        number estimated_minutes
    }

    ENROLLMENTS {
        number enrollment_id PK
        number student_id FK
        number course_id FK
        date enrollment_date
        varchar enrollment_status
        number completion_percent
        number final_score
    }

    PAYMENTS {
        number payment_id PK
        number enrollment_id FK
        number amount
        varchar payment_method
        varchar payment_status
        date paid_date
        varchar transaction_ref UK
    }

    LESSON_PROGRESS {
        number progress_id PK
        number enrollment_id FK
        number lesson_id FK
        char completed_flag
        date completed_date
        number quiz_score
    }

    CERTIFICATES {
        number certificate_id PK
        number enrollment_id FK
        date issued_date
        varchar certificate_code UK
    }
```

## Design Explanation

The Oracle database stores structured, transactional data. It uses primary keys, foreign keys, unique constraints, check constraints, and indexes to protect data quality. Students can enroll in many courses, and each course can have many students, so the relationship is resolved through `enrollments`.

Course progress is tracked per lesson in `lesson_progress`. This allows the system to calculate completion percentage and final score. Payments are linked to enrollments so revenue can be reported by course, period, and lecturer.

MongoDB complements this model by storing flexible content that changes shape often:

- `courseResources` for notes, videos, quizzes, and extra materials
- `courseReviews` for ratings and open-ended feedback
- `discussionThreads` for forum questions and answers
