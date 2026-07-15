const seed = require("../seedData");

// The relational engines (SQLite demo + Oracle sample data) insert courses
// in this exact order with sequential identity/autoincrement ids starting
// at 1, so index+1 gives the same course_id the relational side will use.
// This is what lets MongoDB documents carry a courseId that joins cleanly
// against the Oracle/SQLite courses table for hybrid queries.
const courseIdByTitle = {};
seed.courses.forEach((c, idx) => {
  courseIdByTitle[c.title] = idx + 1;
});

module.exports = { courseIdByTitle };
