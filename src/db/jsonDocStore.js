// Embedded document store used when MONGODB_URI is not configured.
//
// This mirrors the exact three collections seeded and queried in
// database/mongodb/seed_and_queries.js (courseResources, courseReviews,
// discussionThreads) and supports the same four query patterns required by
// the assessment: feedback-by-course, top-rated courses (aggregation),
// keyword search across threads, and flexible per-course resources.
const crypto = require("crypto");
const seed = require("../seedData");

function newId() {
  return crypto.randomBytes(12).toString("hex");
}

class JsonDocStore {
  constructor(courseIdByTitle) {
    this.courseResources = [];
    this.courseReviews = [];
    this.discussionThreads = [];
    this._seed(courseIdByTitle);
  }

  _seed(courseIdByTitle) {
    for (const r of seed.courseResources) {
      this.courseResources.push({
        _id: newId(),
        courseId: courseIdByTitle[r.course],
        courseTitle: r.course,
        module: r.module,
        resources: r.resources,
        lastUpdated: new Date().toISOString()
      });
    }
    for (const r of seed.courseReviews) {
      this.courseReviews.push({
        _id: newId(),
        courseId: courseIdByTitle[r.course],
        courseTitle: r.course,
        studentEmail: r.student,
        rating: r.rating,
        feedback: r.feedback,
        createdAt: r.createdAt
      });
    }
    for (const t of seed.discussionThreads) {
      this.discussionThreads.push({
        _id: newId(),
        courseId: courseIdByTitle[t.course],
        courseTitle: t.course,
        title: t.title,
        tags: t.tags,
        posts: t.posts
      });
    }
  }

  // 1. Retrieve all feedback for a given course
  listReviews(courseId) {
    return this.courseReviews
      .filter((r) => (courseId ? r.courseId === Number(courseId) : true))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }

  addReview({ courseId, courseTitle, studentEmail, rating, feedback }) {
    const review = {
      _id: newId(),
      courseId: Number(courseId),
      courseTitle,
      studentEmail,
      rating: Number(rating),
      feedback,
      createdAt: new Date().toISOString().slice(0, 10)
    };
    this.courseReviews.push(review);
    return review;
  }

  // 2. Identify top-rated courses based on aggregated student reviews
  topRatedCourses() {
    const byCourse = new Map();
    for (const r of this.courseReviews) {
      if (!byCourse.has(r.courseId)) byCourse.set(r.courseId, { courseId: r.courseId, courseTitle: r.courseTitle, ratings: [] });
      byCourse.get(r.courseId).ratings.push(r.rating);
    }
    return Array.from(byCourse.values())
      .map((c) => ({
        courseId: c.courseId,
        courseTitle: c.courseTitle,
        averageRating: Math.round((c.ratings.reduce((a, b) => a + b, 0) / c.ratings.length) * 100) / 100,
        reviewCount: c.ratings.length
      }))
      .sort((a, b) => b.averageRating - a.averageRating || b.reviewCount - a.reviewCount);
  }

  // 3. Search discussion threads for specific keywords or topics
  searchThreads(keyword) {
    const q = (keyword || "").toLowerCase().trim();
    if (!q) return this.discussionThreads;
    return this.discussionThreads.filter((t) => {
      const haystack = `${t.title} ${t.tags.join(" ")} ${t.posts.map((p) => p.body).join(" ")}`.toLowerCase();
      return haystack.includes(q);
    });
  }

  listThreads(courseId) {
    return this.discussionThreads.filter((t) => (courseId ? t.courseId === Number(courseId) : true));
  }

  createThread({ courseId, courseTitle, title, tags, author, body }) {
    const thread = {
      _id: newId(),
      courseId: Number(courseId),
      courseTitle,
      title,
      tags: tags || [],
      posts: [{ author, body, postedAt: new Date().toISOString().slice(0, 10) }]
    };
    this.discussionThreads.push(thread);
    return thread;
  }

  addPost(threadId, { author, body }) {
    const thread = this.discussionThreads.find((t) => t._id === threadId);
    if (!thread) return null;
    thread.posts.push({ author, body, postedAt: new Date().toISOString().slice(0, 10) });
    return thread;
  }

  // 4. Retrieve flexible resources for a course
  listResources(courseId) {
    return this.courseResources.filter((r) => (courseId ? r.courseId === Number(courseId) : true));
  }
}

module.exports = { JsonDocStore };
