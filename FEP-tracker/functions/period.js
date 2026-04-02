class Period {
  constructor(firebaseObject) {
    this.id        = firebaseObject.id        || null;
    this.date      = firebaseObject.date      || null;
    this.startdate = firebaseObject.startdate || null;
    this.enddate   = firebaseObject.enddate   || null;

    // students is a map: { studentId: { job_id, total_time } }
    this.students  = firebaseObject.students  || {};
  }

  // Get one student's data
  getStudent(studentId) {
    return this.students[studentId] || null;
  }

  setStudents(eventID, studentsMap) {
    Object.entries(studentsMap).forEach(([studentId, studentData]) => {
      const totalTime = this.findTotalTime(studentData.startTime, studentData.endTime);
      this.students[studentId] = { job_id: eventID, total_time: totalTime };
    });
  }

  findTotalTime(startTime, endTime) {
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    return (end - start) / 1000 / 60; // returns difference in minutes
  }

  // Convert back to plain object for Firestore
  toFirestore() {
    return {
      date:      this.date,
      startdate: this.startdate,
      enddate:   this.enddate,
      students:  this.students,
    };
  }
}

module.exports = Period;