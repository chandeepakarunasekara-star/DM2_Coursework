const assert = require("assert");
const data = require("./sampleData");
const reports = require("./services/reports");

const dashboard = reports.dashboard(data);
assert.strictEqual(dashboard.courses, 4);
assert.strictEqual(dashboard.students, 4);
assert.strictEqual(dashboard.revenue, 655);

const popular = reports.popularCourses(data);
assert.strictEqual(popular[0].enrollments, 2);
assert.ok(popular[0].averageRating >= popular[1].averageRating);

const progress = reports.studentProgress(data);
assert.ok(progress.every((row) => row.completionPercent >= 0 && row.completionPercent <= 100));

console.log("All CourseConnect checks passed.");
