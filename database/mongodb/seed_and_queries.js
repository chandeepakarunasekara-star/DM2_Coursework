// CourseConnect MongoDB seed data and coursework query examples.
// Run with: mongosh < database/mongodb/seed_and_queries.js

use("courseconnect");

db.courseResources.drop();
db.courseReviews.drop();
db.discussionThreads.drop();

db.courseResources.insertMany([
  {
    courseId: "C101",
    courseTitle: "Oracle Database Masterclass",
    module: "PL/SQL",
    resources: [
      { type: "note", title: "Exception handling guide", url: "/content/oracle/exceptions.pdf", tags: ["plsql", "exceptions"] },
      { type: "video", title: "Trigger design walkthrough", url: "/content/oracle/triggers.mp4", durationMinutes: 18, tags: ["trigger"] }
    ],
    lastUpdated: ISODate("2026-03-15T10:00:00Z")
  },
  {
    courseId: "C104",
    courseTitle: "MongoDB for Modern Applications",
    module: "Document Modeling",
    resources: [
      { type: "note", title: "Embedding vs referencing", url: "/content/mongo/modeling.pdf", tags: ["schema", "modeling"] },
      { type: "quiz", title: "Aggregation pipeline practice", questionCount: 12, tags: ["aggregation"] }
    ],
    lastUpdated: ISODate("2026-03-18T10:00:00Z")
  }
]);

db.courseReviews.insertMany([
  { courseId: "C101", studentId: "S001", rating: 5, feedback: "Clear examples and useful database scripts.", createdAt: ISODate("2026-01-25T09:00:00Z") },
  { courseId: "C101", studentId: "S002", rating: 4, feedback: "The PL/SQL report section helped a lot.", createdAt: ISODate("2026-01-30T09:00:00Z") },
  { courseId: "C104", studentId: "S004", rating: 5, feedback: "Great explanation of flexible schemas.", createdAt: ISODate("2026-02-20T09:00:00Z") },
  { courseId: "C103", studentId: "S004", rating: 4, feedback: "Practical design tasks and helpful critique.", createdAt: ISODate("2026-03-11T09:00:00Z") }
]);

db.discussionThreads.insertMany([
  {
    courseId: "C101",
    title: "How do triggers update progress automatically?",
    tags: ["oracle", "trigger", "progress"],
    posts: [
      { authorId: "S001", body: "Can a trigger update certificate eligibility after lesson completion?", postedAt: ISODate("2026-01-18T11:00:00Z") },
      { authorId: "L001", body: "Yes, calculate completion after progress changes and issue certificates only at 100 percent.", postedAt: ISODate("2026-01-18T12:00:00Z") }
    ]
  },
  {
    courseId: "C104",
    title: "Embedding or referencing MongoDB resources",
    tags: ["mongodb", "modeling", "resources"],
    posts: [
      { authorId: "S004", body: "When should reviews be embedded inside courses?", postedAt: ISODate("2026-02-16T11:00:00Z") },
      { authorId: "L001", body: "Reference reviews when the collection grows quickly and needs separate aggregation.", postedAt: ISODate("2026-02-16T12:00:00Z") }
    ]
  }
]);

db.courseReviews.createIndex({ courseId: 1 });
db.courseReviews.createIndex({ rating: -1 });
db.discussionThreads.createIndex({ title: "text", "posts.body": "text", tags: "text" });
db.courseResources.createIndex({ courseId: 1, "resources.tags": 1 });

print("1. Retrieve all feedback for C101");
printjson(db.courseReviews.find({ courseId: "C101" }).toArray());

print("2. Identify top-rated courses");
printjson(
  db.courseReviews.aggregate([
    { $group: { _id: "$courseId", averageRating: { $avg: "$rating" }, reviewCount: { $sum: 1 } } },
    { $sort: { averageRating: -1, reviewCount: -1 } }
  ]).toArray()
);

print("3. Search discussion threads for trigger");
printjson(db.discussionThreads.find({ $text: { $search: "trigger" } }).toArray());

print("4. Retrieve flexible resources for a course");
printjson(db.courseResources.find({ courseId: "C104" }).toArray());
