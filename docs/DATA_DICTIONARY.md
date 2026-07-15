# Data Dictionary

## Oracle Tables

| Table | Purpose | Important Fields |
|---|---|---|
| `categories` | Groups courses by domain. | `category_id`, `category_name` |
| `lecturers` | Stores instructor profile details. | `lecturer_id`, `full_name`, `email`, `expertise`, `status` |
| `students` | Stores learner accounts. | `student_id`, `full_name`, `email`, `registered_date`, `status` |
| `courses` | Stores course catalogue records. | `course_id`, `category_id`, `lecturer_id`, `course_title`, `price`, `published_status` |
| `lessons` | Stores ordered lessons for each course. | `lesson_id`, `course_id`, `lesson_title`, `lesson_order` |
| `enrollments` | Connects students to courses. | `enrollment_id`, `student_id`, `course_id`, `enrollment_status`, `completion_percent` |
| `payments` | Tracks payment records for enrollments. | `payment_id`, `enrollment_id`, `amount`, `payment_status`, `transaction_ref` |
| `lesson_progress` | Tracks lesson completion and quiz scores. | `progress_id`, `enrollment_id`, `lesson_id`, `completed_flag`, `quiz_score` |
| `certificates` | Stores issued completion certificates. | `certificate_id`, `enrollment_id`, `certificate_code` |

## MongoDB Collections

| Collection | Purpose | Example Flexible Fields |
|---|---|---|
| `courseResources` | Stores lecture notes, videos, quizzes, and links. | `resources.type`, `resources.url`, `resources.tags`, `durationMinutes`, `questionCount` |
| `courseReviews` | Stores ratings and open-ended feedback. | `courseId`, `studentId`, `rating`, `feedback`, `createdAt` |
| `discussionThreads` | Stores forum topics and Q&A posts. | `title`, `tags`, `posts.authorId`, `posts.body`, `postedAt` |

## Key Integrity Rules

- A course must belong to one category and one lecturer.
- A student cannot enroll in the same course twice.
- Payment amount cannot be negative.
- Completion percentage must stay between 0 and 100.
- Certificate code and transaction reference must be unique.
