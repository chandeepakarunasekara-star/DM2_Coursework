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
    .map((course) => {
      const revenue = data.payments
        .filter((p) => {
          const enrollment = data.enrollments.find((e) => e.id === p.enrollmentId);
          return enrollment && enrollment.courseId === course.id && p.status === "PAID";
        })
        .reduce((sum, p) => sum + p.amount, 0);
      return {
        courseId: course.id,
        title: course.title,
        enrollments: course.enrollments,
        revenue,
        averageRating: course.averageRating
      };
    })
    .sort((a, b) => b.enrollments - a.enrollments || b.averageRating - a.averageRating || b.revenue - a.revenue);
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

function revenueByPeriod(data, startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const courseRevenue = {};
  for (const payment of data.payments) {
    if (payment.status !== "PAID" || !payment.paidAt) continue;
    const paidDate = new Date(payment.paidAt);
    if (paidDate >= start && paidDate <= end) {
      const enrollment = data.enrollments.find((e) => e.id === payment.enrollmentId);
      if (!enrollment) continue;
      const course = data.courses.find((c) => c.id === enrollment.courseId);
      if (!course) continue;
      
      if (!courseRevenue[course.title]) {
        courseRevenue[course.title] = { title: course.title, paidTransactions: 0, totalRevenue: 0 };
      }
      courseRevenue[course.title].paidTransactions += 1;
      courseRevenue[course.title].totalRevenue += payment.amount;
    }
  }
  return Object.values(courseRevenue).sort((a, b) => b.totalRevenue - a.totalRevenue);
}

function studentProgress(data) {
  const students = byId(data.students);
  const courses = byId(data.courses);
  return data.enrollments.map((enrollment) => {
    const progress = data.progress.find((item) => item.enrollmentId === enrollment.id);
    const percent = progress ? Math.round((progress.completedLessons / progress.totalLessons) * 100) : 0;
    return {
      enrollmentId: enrollment.id,
      studentId: enrollment.studentId,
      student: students[enrollment.studentId]?.name,
      course: courses[enrollment.courseId]?.title,
      status: enrollment.status,
      completionPercent: percent,
      score: progress?.score || 0
    };
  });
}

function studentProgressReport(data, studentId) {
  const student = data.students.find((s) => s.id === studentId);
  if (!student) return [];
  
  return data.enrollments
    .filter((e) => e.studentId === studentId)
    .map((e) => {
      const course = data.courses.find((c) => c.id === e.courseId);
      const progress = data.progress.find((p) => p.enrollmentId === e.id);
      const completionPercent = progress ? Math.round((progress.completedLessons / progress.totalLessons) * 100) : 0;
      return {
        studentName: student.name,
        courseTitle: course ? course.title : "Unknown",
        enrollmentStatus: e.status,
        completionPercent,
        finalScore: progress ? progress.score : 0
      };
    })
    .sort((a, b) => b.completionPercent - a.completionPercent);
}

function pendingPaymentsReport(data) {
  return data.payments
    .filter((p) => p.status === "PENDING")
    .map((p) => {
      const enrollment = data.enrollments.find((e) => e.id === p.enrollmentId);
      if (!enrollment) return null;
      const student = data.students.find((s) => s.id === enrollment.studentId);
      const course = data.courses.find((c) => c.id === enrollment.courseId);
      return {
        paymentId: p.id,
        studentName: student ? student.name : "Unknown",
        courseTitle: course ? course.title : "Unknown",
        amount: p.amount,
        status: p.status,
        enrollmentDate: enrollment.enrolledAt
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.enrollmentDate.localeCompare(b.enrollmentDate));
}

function lecturerPerformanceReport(data) {
  return data.lecturers.map((lecturer) => {
    const courses = data.courses.filter((c) => c.lecturerId === lecturer.id);
    const courseIds = courses.map((c) => c.id);
    const enrollments = data.enrollments.filter((e) => courseIds.includes(e.courseId));
    
    const enrollmentIds = enrollments.map((e) => e.id);
    const payments = data.payments.filter((p) => enrollmentIds.includes(p.enrollmentId) && p.status === "PAID");
    const revenue = payments.reduce((sum, p) => sum + p.amount, 0);
    
    const progresses = data.progress.filter((p) => enrollmentIds.includes(p.enrollmentId));
    const scores = progresses.map((p) => p.score).filter((s) => s > 0);
    const averageScore = scores.length ? Number((scores.reduce((sum, s) => sum + s, 0) / scores.length).toFixed(2)) : 0;
    
    return {
      lecturerName: lecturer.name,
      courseCount: courses.length,
      enrollmentCount: enrollments.length,
      revenue,
      averageScore
    };
  }).sort((a, b) => b.revenue - a.revenue);
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
  revenueByPeriod,
  studentProgress,
  studentProgressReport,
  pendingPaymentsReport,
  lecturerPerformanceReport
};
