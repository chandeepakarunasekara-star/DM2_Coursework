// Real MongoDB adapter.
//
// Uses the official `mongodb` driver against the three collections defined
// in database/mongodb/seed_and_queries.js: courseResources, courseReviews,
// discussionThreads. Activated automatically when MONGODB_URI is set (see
// src/config.js). Run `mongosh < database/mongodb/seed_and_queries.js`
// against your instance first, or let `seedIfEmpty()` populate it from the
// same dataset used everywhere else in the app.
const { MongoClient } = require("mongodb");
const seed = require("../seedData");

class MongoAdapter {
  constructor({ uri, dbName }) {
    this.client = new MongoClient(uri);
    this.dbName = dbName;
    this.ready = this._connect();
  }

  async _connect() {
    await this.client.connect();
    this.db = this.client.db(this.dbName);
    this.resources = this.db.collection("courseResources");
    this.reviews = this.db.collection("courseReviews");
    this.threads = this.db.collection("discussionThreads");

    await this.reviews.createIndex({ courseId: 1 });
    await this.reviews.createIndex({ rating: -1 });
    await this.threads.createIndex({ title: "text", "posts.body": "text", tags: "text" });
    await this.resources.createIndex({ courseId: 1, "resources.tags": 1 });
  }

  async seedIfEmpty(courseIdByTitle) {
    await this.ready;
    const count = await this.reviews.countDocuments();
    if (count > 0) return;

    await this.resources.insertMany(
      seed.courseResources.map((r) => ({
        courseId: courseIdByTitle[r.course],
        courseTitle: r.course,
        module: r.module,
        resources: r.resources,
        lastUpdated: new Date()
      }))
    );
    await this.reviews.insertMany(
      seed.courseReviews.map((r) => ({
        courseId: courseIdByTitle[r.course],
        courseTitle: r.course,
        studentEmail: r.student,
        rating: r.rating,
        feedback: r.feedback,
        createdAt: r.createdAt
      }))
    );
    await this.threads.insertMany(
      seed.discussionThreads.map((t) => ({
        courseId: courseIdByTitle[t.course],
        courseTitle: t.course,
        title: t.title,
        tags: t.tags,
        posts: t.posts
      }))
    );
  }

  // 1. Retrieve all feedback for a given course
  async listReviews(courseId) {
    await this.ready;
    const filter = courseId ? { courseId: Number(courseId) } : {};
    return this.reviews.find(filter).sort({ createdAt: -1 }).toArray();
  }

  async addReview({ courseId, courseTitle, studentEmail, rating, feedback }) {
    await this.ready;
    const doc = {
      courseId: Number(courseId),
      courseTitle,
      studentEmail,
      rating: Number(rating),
      feedback,
      createdAt: new Date().toISOString().slice(0, 10)
    };
    await this.reviews.insertOne(doc);
    return doc;
  }

  // 2. Identify top-rated courses based on aggregated student reviews
  async topRatedCourses() {
    await this.ready;
    return this.reviews
      .aggregate([
        {
          $group: {
            _id: "$courseId",
            courseTitle: { $first: "$courseTitle" },
            averageRating: { $avg: "$rating" },
            reviewCount: { $sum: 1 }
          }
        },
        { $sort: { averageRating: -1, reviewCount: -1 } },
        { $project: { _id: 0, courseId: "$_id", courseTitle: 1, averageRating: { $round: ["$averageRating", 2] }, reviewCount: 1 } }
      ])
      .toArray();
  }

  // 3. Search discussion threads for specific keywords or topics
  async searchThreads(keyword) {
    await this.ready;
    if (!keyword) return this.threads.find({}).toArray();
    try {
      const results = await this.threads.find({ $text: { $search: keyword } }).toArray();
      if (results.length) return results;
    } catch (err) {
      // fall through to regex search below (e.g. text index not ready yet)
    }
    const regex = new RegExp(keyword, "i");
    return this.threads
      .find({ $or: [{ title: regex }, { tags: regex }, { "posts.body": regex }] })
      .toArray();
  }

  async listThreads(courseId) {
    await this.ready;
    const filter = courseId ? { courseId: Number(courseId) } : {};
    return this.threads.find(filter).toArray();
  }

  async createThread({ courseId, courseTitle, title, tags, author, body }) {
    await this.ready;
    const doc = {
      courseId: Number(courseId),
      courseTitle,
      title,
      tags: tags || [],
      posts: [{ author, body, postedAt: new Date().toISOString().slice(0, 10) }]
    };
    const result = await this.threads.insertOne(doc);
    return { ...doc, _id: result.insertedId };
  }

  async addPost(threadId, { author, body }) {
    await this.ready;
    const { ObjectId } = require("mongodb");
    await this.threads.updateOne(
      { _id: new ObjectId(threadId) },
      { $push: { posts: { author, body, postedAt: new Date().toISOString().slice(0, 10) } } }
    );
    return this.threads.findOne({ _id: new ObjectId(threadId) });
  }

  // 4. Retrieve flexible resources for a course
  async listResources(courseId) {
    await this.ready;
    const filter = courseId ? { courseId: Number(courseId) } : {};
    return this.resources.find(filter).toArray();
  }
}

module.exports = { MongoAdapter };
