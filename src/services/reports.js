function byId(rows) {
  return Object.fromEntries(rows.map((row) => [row.id, row]));
}

function courseCatalogue(data) {
  const lecturers = byId(data.lecturers);
  return data.courses.map((course) => ({
    ...course,
    lecturer: lecturers[course.lecturerId]?.name || "Unassigned",
    enrollments: data.enrollments.filter((enrollment) => enrollment.courseId === course.id).length,
    averageRating: averageRating(data, course.id)
  }));
}

function dashboard(data) {
  const paidPayments = data.payments.filter((payment) => payment.status === "PAID");
  const revenue = paidPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const completed = data.enrollments.filter((enrollment) => enrollment.status === "COMPLETED").length;

  return {
    courses: data.courses.length,
    lecturers: data.lecturers.length,
    students: data.students.length,
    activeEnrollments: data.enrollments.filter((enrollment) => enrollment.status === "ACTIVE").length,
    completedEnrollments: completed,
    revenue,
    pendingPayments: data.payments.filter((payment) => payment.status === "PENDING").length,
    topCourses: popularCourses(data).slice(0, 3)
  };
}

function popularCourses(data) {
  return courseCatalogue(data)
    .map((course) => ({
      courseId: course.id,
      title: course.title,
      enrollments: course.enrollments,
      averageRating: course.averageRating
    }))
    .sort((a, b) => b.enrollments - a.enrollments || b.averageRating - a.averageRating);
}

function revenueByMonth(data) {
  const monthly = {};
  for (const payment of data.payments) {
    if (payment.status !== "PAID" || !payment.paidAt) continue;
    const month = payment.paidAt.slice(0, 7);
    monthly[month] = (monthly[month] || 0) + payment.amount;
  }
  return Object.entries(monthly)
    .map(([month, amount]) => ({ month, amount }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

function studentProgress(data) {
  const students = byId(data.students);
  const courses = byId(data.courses);
  return data.enrollments.map((enrollment) => {
    const progress = data.progress.find((item) => item.enrollmentId === enrollment.id);
    const percent = progress ? Math.round((progress.completedLessons / progress.totalLessons) * 100) : 0;
    return {
      enrollmentId: enrollment.id,
      student: students[enrollment.studentId]?.name,
      course: courses[enrollment.courseId]?.title,
      status: enrollment.status,
      completionPercent: percent,
      score: progress?.score || 0
    };
  });
}

function averageRating(data, courseId) {
  const reviews = data.reviews.filter((review) => review.courseId === courseId);
  if (!reviews.length) return 0;
  const total = reviews.reduce((sum, review) => sum + review.rating, 0);
  return Number((total / reviews.length).toFixed(1));
}

module.exports = {
  dashboard,
  courseCatalogue,
  popularCourses,
  revenueByMonth,
  studentProgress
};
