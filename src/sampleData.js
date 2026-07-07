module.exports = {
  lecturers: [
    { id: "L001", name: "Dr. Amara Perera", expertise: "Cloud Databases", email: "amara@courseconnect.edu" },
    { id: "L002", name: "Naveen Silva", expertise: "Business Analytics", email: "naveen@courseconnect.edu" },
    { id: "L003", name: "Maya Fernando", expertise: "Creative Design", email: "maya@courseconnect.edu" }
  ],
  students: [
    { id: "S001", name: "Kavindu Jayasuriya", email: "kavindu@example.com" },
    { id: "S002", name: "Tharushi Wijesinghe", email: "tharushi@example.com" },
    { id: "S003", name: "Akeel Rahman", email: "akeel@example.com" },
    { id: "S004", name: "Dinithi Senanayake", email: "dinithi@example.com" }
  ],
  courses: [
    { id: "C101", title: "Oracle Database Masterclass", domain: "Technology", lecturerId: "L001", price: 150, level: "Intermediate" },
    { id: "C102", title: "Business Intelligence Essentials", domain: "Business", lecturerId: "L002", price: 120, level: "Beginner" },
    { id: "C103", title: "UI Design for Digital Products", domain: "Creative Arts", lecturerId: "L003", price: 95, level: "Beginner" },
    { id: "C104", title: "MongoDB for Modern Applications", domain: "Technology", lecturerId: "L001", price: 140, level: "Intermediate" }
  ],
  enrollments: [
    { id: "E001", studentId: "S001", courseId: "C101", status: "ACTIVE", enrolledAt: "2026-01-08" },
    { id: "E002", studentId: "S002", courseId: "C101", status: "COMPLETED", enrolledAt: "2026-01-12" },
    { id: "E003", studentId: "S003", courseId: "C102", status: "ACTIVE", enrolledAt: "2026-02-02" },
    { id: "E004", studentId: "S004", courseId: "C104", status: "ACTIVE", enrolledAt: "2026-02-06" },
    { id: "E005", studentId: "S001", courseId: "C104", status: "ACTIVE", enrolledAt: "2026-03-01" },
    { id: "E006", studentId: "S004", courseId: "C103", status: "COMPLETED", enrolledAt: "2026-03-04" }
  ],
  payments: [
    { id: "P001", enrollmentId: "E001", amount: 150, status: "PAID", paidAt: "2026-01-08" },
    { id: "P002", enrollmentId: "E002", amount: 150, status: "PAID", paidAt: "2026-01-12" },
    { id: "P003", enrollmentId: "E003", amount: 120, status: "PAID", paidAt: "2026-02-02" },
    { id: "P004", enrollmentId: "E004", amount: 140, status: "PENDING", paidAt: null },
    { id: "P005", enrollmentId: "E005", amount: 140, status: "PAID", paidAt: "2026-03-01" },
    { id: "P006", enrollmentId: "E006", amount: 95, status: "PAID", paidAt: "2026-03-04" }
  ],
  progress: [
    { enrollmentId: "E001", completedLessons: 8, totalLessons: 12, score: 82 },
    { enrollmentId: "E002", completedLessons: 12, totalLessons: 12, score: 91 },
    { enrollmentId: "E003", completedLessons: 5, totalLessons: 10, score: 74 },
    { enrollmentId: "E004", completedLessons: 3, totalLessons: 11, score: 67 },
    { enrollmentId: "E005", completedLessons: 7, totalLessons: 11, score: 80 },
    { enrollmentId: "E006", completedLessons: 9, totalLessons: 9, score: 88 }
  ],
  resources: [
    { courseId: "C101", type: "note", title: "PL/SQL exception patterns", url: "/resources/plsql-exceptions.pdf" },
    { courseId: "C104", type: "video", title: "Document modeling workshop", url: "/resources/mongodb-modeling.mp4" }
  ],
  reviews: [
    { courseId: "C101", studentId: "S001", rating: 5, feedback: "Clear examples and useful database scripts." },
    { courseId: "C101", studentId: "S002", rating: 4, feedback: "The PL/SQL report section helped a lot." },
    { courseId: "C104", studentId: "S004", rating: 5, feedback: "Great explanation of flexible schemas." },
    { courseId: "C103", studentId: "S004", rating: 4, feedback: "Practical UI assignments and good feedback." }
  ],
  forums: [
    {
      courseId: "C101",
      title: "How do triggers update progress automatically?",
      posts: [
        { author: "S001", body: "Can a trigger update certificate eligibility after lesson completion?" },
        { author: "L001", body: "Yes, use an after update trigger on progress and check completion percent." }
      ]
    },
    {
      courseId: "C104",
      title: "Embedding or referencing MongoDB resources",
      posts: [
        { author: "S004", body: "When should reviews be embedded inside courses?" },
        { author: "L001", body: "Use references when review volume grows independently." }
      ]
    }
  ]
};
