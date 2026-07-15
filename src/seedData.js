// Canonical demo dataset for CourseConnect.
// The same records are used to seed the relational engine (Oracle in
// production, embedded SQLite for local/demo runs) and the document store
// (MongoDB in production, embedded JSON store for local/demo runs), so the
// two layers describe a single consistent scenario.

const categories = [
  { name: "Technology", description: "Programming, databases, cloud, and data platforms" },
  { name: "Business", description: "Business analysis, management, finance, and operations" },
  { name: "Creative Arts", description: "Design, media, creative production, and digital arts" }
];

const lecturers = [
  { name: "Dr. Amara Perera", email: "amara@courseconnect.edu", expertise: "Cloud Databases", joined: "2025-08-15" },
  { name: "Naveen Silva", email: "naveen@courseconnect.edu", expertise: "Business Analytics", joined: "2025-09-02" },
  { name: "Maya Fernando", email: "maya@courseconnect.edu", expertise: "Digital Product Design", joined: "2025-10-20" },
  { name: "Dr. Ruwan Gunasekara", email: "ruwan@courseconnect.edu", expertise: "Machine Learning", joined: "2026-01-05" }
];

const students = [
  { name: "Kavindu Jayasuriya", email: "kavindu@example.com", registered: "2026-01-02" },
  { name: "Tharushi Wijesinghe", email: "tharushi@example.com", registered: "2026-01-05" },
  { name: "Akeel Rahman", email: "akeel@example.com", registered: "2026-01-18" },
  { name: "Dinithi Senanayake", email: "dinithi@example.com", registered: "2026-02-01" },
  { name: "Sahan Mendis", email: "sahan@example.com", registered: "2026-02-12" },
  { name: "Nethmi Karunaratne", email: "nethmi@example.com", registered: "2026-03-01" }
];

// Demo login accounts. All demo accounts share the password "password123".
// Passwords are hashed at seed time (see src/db/authStore.js) - nothing is
// ever stored in plain text, including in this seed file.
const DEMO_PASSWORD = "password123";
const users = [
  { email: "admin@courseconnect.edu", role: "ADMIN", name: "Platform Admin", linkedType: null, linkedRef: null },
  { email: "amara@courseconnect.edu", role: "LECTURER", name: "Dr. Amara Perera", linkedType: "lecturer", linkedRef: "amara@courseconnect.edu" },
  { email: "naveen@courseconnect.edu", role: "LECTURER", name: "Naveen Silva", linkedType: "lecturer", linkedRef: "naveen@courseconnect.edu" },
  { email: "maya@courseconnect.edu", role: "LECTURER", name: "Maya Fernando", linkedType: "lecturer", linkedRef: "maya@courseconnect.edu" },
  { email: "kavindu@example.com", role: "STUDENT", name: "Kavindu Jayasuriya", linkedType: "student", linkedRef: "kavindu@example.com" },
  { email: "tharushi@example.com", role: "STUDENT", name: "Tharushi Wijesinghe", linkedType: "student", linkedRef: "tharushi@example.com" },
  { email: "dinithi@example.com", role: "STUDENT", name: "Dinithi Senanayake", linkedType: "student", linkedRef: "dinithi@example.com" }
];

// category and lecturer are referenced by name/email so the seeder can
// resolve the generated identity values regardless of which engine is used.
const courses = [
  {
    title: "Oracle Database Masterclass", category: "Technology", lecturer: "amara@courseconnect.edu",
    level: "Intermediate", price: 150, durationHours: 24, status: "PUBLISHED",
    lessons: [
      "Relational modeling foundations", "Constraints and normalization",
      "PL/SQL procedures and functions", "Triggers and exception handling"
    ]
  },
  {
    title: "Business Intelligence Essentials", category: "Business", lecturer: "naveen@courseconnect.edu",
    level: "Beginner", price: 120, durationHours: 18, status: "PUBLISHED",
    lessons: ["BI process overview", "Dashboard KPI design", "Forecasting basics"]
  },
  {
    title: "UI Design for Digital Products", category: "Creative Arts", lecturer: "maya@courseconnect.edu",
    level: "Beginner", price: 95, durationHours: 15, status: "PUBLISHED",
    lessons: ["Interface layout principles", "Prototype critique"]
  },
  {
    title: "MongoDB for Modern Applications", category: "Technology", lecturer: "amara@courseconnect.edu",
    level: "Intermediate", price: 140, durationHours: 20, status: "PUBLISHED",
    lessons: ["Document modeling", "Aggregation pipelines", "Indexes and query design"]
  },
  {
    title: "Applied Machine Learning", category: "Technology", lecturer: "ruwan@courseconnect.edu",
    level: "Advanced", price: 180, durationHours: 30, status: "PUBLISHED",
    lessons: ["Feature engineering", "Model evaluation", "Deployment basics", "Monitoring models"]
  },
  {
    title: "Financial Modelling in Practice", category: "Business", lecturer: "naveen@courseconnect.edu",
    level: "Intermediate", price: 130, durationHours: 16, status: "DRAFT",
    lessons: ["Building assumptions", "Sensitivity analysis"]
  }
];

// enrollments reference students/courses by email/title, and drive payments
// + lesson progress so every layer stays consistent.
const enrollments = [
  { student: "kavindu@example.com", course: "Oracle Database Masterclass", date: "2026-01-08", paidMethod: "CARD", paidRef: "TXN-CC-1001", completedLessons: 3 },
  { student: "tharushi@example.com", course: "Oracle Database Masterclass", date: "2026-01-12", paidMethod: "CARD", paidRef: "TXN-CC-1002", completedLessons: 4 },
  { student: "akeel@example.com", course: "Business Intelligence Essentials", date: "2026-02-02", paidMethod: "BANK_TRANSFER", paidRef: "TXN-CC-1003", completedLessons: 2 },
  { student: "dinithi@example.com", course: "MongoDB for Modern Applications", date: "2026-02-06", paidMethod: null, paidRef: null, completedLessons: 1 },
  { student: "kavindu@example.com", course: "MongoDB for Modern Applications", date: "2026-03-01", paidMethod: "CARD", paidRef: "TXN-CC-1005", completedLessons: 2 },
  { student: "dinithi@example.com", course: "UI Design for Digital Products", date: "2026-03-04", paidMethod: "CARD", paidRef: "TXN-CC-1006", completedLessons: 2 },
  { student: "sahan@example.com", course: "Oracle Database Masterclass", date: "2026-03-10", paidMethod: null, paidRef: null, completedLessons: 1 },
  { student: "nethmi@example.com", course: "Applied Machine Learning", date: "2026-03-14", paidMethod: "CARD", paidRef: "TXN-CC-1007", completedLessons: 1 },
  { student: "akeel@example.com", course: "Applied Machine Learning", date: "2026-03-20", paidMethod: null, paidRef: null, completedLessons: 0 }
];

// MongoDB-side seed data (flexible content) - mirrors database/mongodb/seed_and_queries.js
const courseResources = [
  {
    course: "Oracle Database Masterclass", module: "PL/SQL",
    resources: [
      { type: "note", title: "Exception handling guide", url: "/content/oracle/exceptions.pdf", tags: ["plsql", "exceptions"] },
      { type: "video", title: "Trigger design walkthrough", url: "/content/oracle/triggers.mp4", durationMinutes: 18, tags: ["trigger"] }
    ]
  },
  {
    course: "MongoDB for Modern Applications", module: "Document Modeling",
    resources: [
      { type: "note", title: "Embedding vs referencing", url: "/content/mongo/modeling.pdf", tags: ["schema", "modeling"] },
      { type: "quiz", title: "Aggregation pipeline practice", questionCount: 12, tags: ["aggregation"] }
    ]
  },
  {
    course: "Applied Machine Learning", module: "Model Evaluation",
    resources: [
      { type: "note", title: "Precision vs recall cheatsheet", url: "/content/ml/eval.pdf", tags: ["metrics"] },
      { type: "video", title: "Cross-validation walkthrough", url: "/content/ml/cv.mp4", durationMinutes: 22, tags: ["validation"] }
    ]
  }
];

const courseReviews = [
  { course: "Oracle Database Masterclass", student: "kavindu@example.com", rating: 5, feedback: "Clear examples and useful database scripts.", createdAt: "2026-01-25" },
  { course: "Oracle Database Masterclass", student: "tharushi@example.com", rating: 4, feedback: "The PL/SQL report section helped a lot.", createdAt: "2026-01-30" },
  { course: "MongoDB for Modern Applications", student: "dinithi@example.com", rating: 5, feedback: "Great explanation of flexible schemas.", createdAt: "2026-02-20" },
  { course: "UI Design for Digital Products", student: "dinithi@example.com", rating: 4, feedback: "Practical design tasks and helpful critique.", createdAt: "2026-03-11" },
  { course: "Applied Machine Learning", student: "nethmi@example.com", rating: 5, feedback: "Challenging but the deployment module made it click.", createdAt: "2026-03-18" },
  { course: "Business Intelligence Essentials", student: "akeel@example.com", rating: 3, feedback: "Good overview, could use more worked examples.", createdAt: "2026-02-10" }
];

const discussionThreads = [
  {
    course: "Oracle Database Masterclass",
    title: "How do triggers update progress automatically?",
    tags: ["oracle", "trigger", "progress"],
    posts: [
      { author: "kavindu@example.com", body: "Can a trigger update certificate eligibility after lesson completion?", postedAt: "2026-01-18" },
      { author: "amara@courseconnect.edu", body: "Yes - recalculate completion after progress changes and issue certificates only at 100 percent.", postedAt: "2026-01-18" }
    ]
  },
  {
    course: "MongoDB for Modern Applications",
    title: "Embedding or referencing MongoDB resources",
    tags: ["mongodb", "modeling", "resources"],
    posts: [
      { author: "dinithi@example.com", body: "When should reviews be embedded inside courses?", postedAt: "2026-02-16" },
      { author: "amara@courseconnect.edu", body: "Reference reviews when the collection grows quickly and needs separate aggregation.", postedAt: "2026-02-16" }
    ]
  },
  {
    course: "Applied Machine Learning",
    title: "Choosing a metric for imbalanced classes",
    tags: ["ml", "metrics", "evaluation"],
    posts: [
      { author: "nethmi@example.com", body: "Accuracy looks great but the model still misses most positives - what should I track instead?", postedAt: "2026-03-19" },
      { author: "ruwan@courseconnect.edu", body: "Track precision, recall and the PR-AUC curve for imbalanced classes, not raw accuracy.", postedAt: "2026-03-19" }
    ]
  }
];

module.exports = {
  DEMO_PASSWORD,
  categories,
  lecturers,
  students,
  users,
  courses,
  enrollments,
  courseResources,
  courseReviews,
  discussionThreads
};
