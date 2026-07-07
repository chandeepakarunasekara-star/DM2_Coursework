-- CourseConnect sample data

INSERT INTO categories (category_name, description) VALUES ('Technology', 'Programming, databases, cloud, and data platforms');
INSERT INTO categories (category_name, description) VALUES ('Business', 'Business analysis, management, finance, and operations');
INSERT INTO categories (category_name, description) VALUES ('Creative Arts', 'Design, media, creative production, and digital arts');

INSERT INTO lecturers (full_name, email, expertise, joined_date) VALUES ('Dr. Amara Perera', 'amara@courseconnect.edu', 'Cloud Databases', DATE '2025-08-15');
INSERT INTO lecturers (full_name, email, expertise, joined_date) VALUES ('Naveen Silva', 'naveen@courseconnect.edu', 'Business Analytics', DATE '2025-09-02');
INSERT INTO lecturers (full_name, email, expertise, joined_date) VALUES ('Maya Fernando', 'maya@courseconnect.edu', 'Digital Product Design', DATE '2025-10-20');

INSERT INTO students (full_name, email, registered_date) VALUES ('Kavindu Jayasuriya', 'kavindu@example.com', DATE '2026-01-02');
INSERT INTO students (full_name, email, registered_date) VALUES ('Tharushi Wijesinghe', 'tharushi@example.com', DATE '2026-01-05');
INSERT INTO students (full_name, email, registered_date) VALUES ('Akeel Rahman', 'akeel@example.com', DATE '2026-01-18');
INSERT INTO students (full_name, email, registered_date) VALUES ('Dinithi Senanayake', 'dinithi@example.com', DATE '2026-02-01');
INSERT INTO students (full_name, email, registered_date) VALUES ('Sahan Mendis', 'sahan@example.com', DATE '2026-02-12');

INSERT INTO courses (category_id, lecturer_id, course_title, course_level, price, duration_hours, published_status)
VALUES (1, 1, 'Oracle Database Masterclass', 'Intermediate', 150, 24, 'PUBLISHED');
INSERT INTO courses (category_id, lecturer_id, course_title, course_level, price, duration_hours, published_status)
VALUES (2, 2, 'Business Intelligence Essentials', 'Beginner', 120, 18, 'PUBLISHED');
INSERT INTO courses (category_id, lecturer_id, course_title, course_level, price, duration_hours, published_status)
VALUES (3, 3, 'UI Design for Digital Products', 'Beginner', 95, 15, 'PUBLISHED');
INSERT INTO courses (category_id, lecturer_id, course_title, course_level, price, duration_hours, published_status)
VALUES (1, 1, 'MongoDB for Modern Applications', 'Intermediate', 140, 20, 'PUBLISHED');

INSERT INTO lessons (course_id, lesson_title, lesson_order, estimated_minutes) VALUES (1, 'Relational modeling foundations', 1, 45);
INSERT INTO lessons (course_id, lesson_title, lesson_order, estimated_minutes) VALUES (1, 'Constraints and normalization', 2, 50);
INSERT INTO lessons (course_id, lesson_title, lesson_order, estimated_minutes) VALUES (1, 'PL/SQL procedures and functions', 3, 60);
INSERT INTO lessons (course_id, lesson_title, lesson_order, estimated_minutes) VALUES (1, 'Triggers and exception handling', 4, 55);
INSERT INTO lessons (course_id, lesson_title, lesson_order, estimated_minutes) VALUES (2, 'BI process overview', 1, 40);
INSERT INTO lessons (course_id, lesson_title, lesson_order, estimated_minutes) VALUES (2, 'Dashboard KPI design', 2, 45);
INSERT INTO lessons (course_id, lesson_title, lesson_order, estimated_minutes) VALUES (3, 'Interface layout principles', 1, 50);
INSERT INTO lessons (course_id, lesson_title, lesson_order, estimated_minutes) VALUES (3, 'Prototype critique', 2, 45);
INSERT INTO lessons (course_id, lesson_title, lesson_order, estimated_minutes) VALUES (4, 'Document modeling', 1, 55);
INSERT INTO lessons (course_id, lesson_title, lesson_order, estimated_minutes) VALUES (4, 'Aggregation pipelines', 2, 60);
INSERT INTO lessons (course_id, lesson_title, lesson_order, estimated_minutes) VALUES (4, 'Indexes and query design', 3, 50);

INSERT INTO enrollments (student_id, course_id, enrollment_date, enrollment_status, completion_percent, final_score)
VALUES (1, 1, DATE '2026-01-08', 'ACTIVE', 75, 82);
INSERT INTO enrollments (student_id, course_id, enrollment_date, enrollment_status, completion_percent, final_score)
VALUES (2, 1, DATE '2026-01-12', 'COMPLETED', 100, 91);
INSERT INTO enrollments (student_id, course_id, enrollment_date, enrollment_status, completion_percent, final_score)
VALUES (3, 2, DATE '2026-02-02', 'ACTIVE', 50, 74);
INSERT INTO enrollments (student_id, course_id, enrollment_date, enrollment_status, completion_percent, final_score)
VALUES (4, 4, DATE '2026-02-06', 'ACTIVE', 33, 67);
INSERT INTO enrollments (student_id, course_id, enrollment_date, enrollment_status, completion_percent, final_score)
VALUES (1, 4, DATE '2026-03-01', 'ACTIVE', 67, 80);
INSERT INTO enrollments (student_id, course_id, enrollment_date, enrollment_status, completion_percent, final_score)
VALUES (4, 3, DATE '2026-03-04', 'COMPLETED', 100, 88);
INSERT INTO enrollments (student_id, course_id, enrollment_date, enrollment_status, completion_percent, final_score)
VALUES (5, 1, DATE '2026-03-10', 'ACTIVE', 25, 65);

INSERT INTO payments (enrollment_id, amount, payment_method, payment_status, paid_date, transaction_ref)
VALUES (1, 150, 'CARD', 'PAID', DATE '2026-01-08', 'TXN-CC-1001');
INSERT INTO payments (enrollment_id, amount, payment_method, payment_status, paid_date, transaction_ref)
VALUES (2, 150, 'CARD', 'PAID', DATE '2026-01-12', 'TXN-CC-1002');
INSERT INTO payments (enrollment_id, amount, payment_method, payment_status, paid_date, transaction_ref)
VALUES (3, 120, 'BANK_TRANSFER', 'PAID', DATE '2026-02-02', 'TXN-CC-1003');
INSERT INTO payments (enrollment_id, amount, payment_method, payment_status, paid_date, transaction_ref)
VALUES (4, 140, 'CARD', 'PENDING', NULL, 'TXN-CC-1004');
INSERT INTO payments (enrollment_id, amount, payment_method, payment_status, paid_date, transaction_ref)
VALUES (5, 140, 'CARD', 'PAID', DATE '2026-03-01', 'TXN-CC-1005');
INSERT INTO payments (enrollment_id, amount, payment_method, payment_status, paid_date, transaction_ref)
VALUES (6, 95, 'CARD', 'PAID', DATE '2026-03-04', 'TXN-CC-1006');
INSERT INTO payments (enrollment_id, amount, payment_method, payment_status, paid_date, transaction_ref)
VALUES (7, 150, 'BANK_TRANSFER', 'PENDING', NULL, 'TXN-CC-1007');

INSERT INTO lesson_progress (enrollment_id, lesson_id, completed_flag, completed_date, quiz_score) VALUES (1, 1, 'Y', DATE '2026-01-10', 84);
INSERT INTO lesson_progress (enrollment_id, lesson_id, completed_flag, completed_date, quiz_score) VALUES (1, 2, 'Y', DATE '2026-01-15', 81);
INSERT INTO lesson_progress (enrollment_id, lesson_id, completed_flag, completed_date, quiz_score) VALUES (1, 3, 'Y', DATE '2026-01-20', 82);
INSERT INTO lesson_progress (enrollment_id, lesson_id, completed_flag, completed_date, quiz_score) VALUES (2, 1, 'Y', DATE '2026-01-14', 92);
INSERT INTO lesson_progress (enrollment_id, lesson_id, completed_flag, completed_date, quiz_score) VALUES (2, 2, 'Y', DATE '2026-01-19', 89);
INSERT INTO lesson_progress (enrollment_id, lesson_id, completed_flag, completed_date, quiz_score) VALUES (2, 3, 'Y', DATE '2026-01-24', 91);
INSERT INTO lesson_progress (enrollment_id, lesson_id, completed_flag, completed_date, quiz_score) VALUES (2, 4, 'Y', DATE '2026-01-28', 93);
INSERT INTO lesson_progress (enrollment_id, lesson_id, completed_flag, completed_date, quiz_score) VALUES (6, 7, 'Y', DATE '2026-03-07', 87);
INSERT INTO lesson_progress (enrollment_id, lesson_id, completed_flag, completed_date, quiz_score) VALUES (6, 8, 'Y', DATE '2026-03-11', 89);

INSERT INTO certificates (enrollment_id, issued_date, certificate_code)
VALUES (2, DATE '2026-01-29', 'CC-2026-0002');
INSERT INTO certificates (enrollment_id, issued_date, certificate_code)
VALUES (6, DATE '2026-03-12', 'CC-2026-0006');

COMMIT;
