class Period {
  constructor(firebaseObject) {
    this.id        = firebaseObject.id        || null;
    this.date      = firebaseObject.date      || null;
    this.startdate = firebaseObject.startdate || null;
    this.enddate   = firebaseObject.enddate   || null;

    // attendance is a map: { studentId: { job_id, total_time } }
    this.attendance  = firebaseObject?.attendance  || {};
  }

  // Get one student's data
  getStudent(studentId) {
    return this.attendance[studentId] || null;
  }

  setAttendance(eventID, studentsMap) {
    Object.entries(studentsMap).forEach(([studentId, studentData]) => {
      const totalTime = this.findTotalTime(studentData.startTime, studentData.endTime);
      if (!this.attendance[studentId]) {
      this.attendance[studentId] = [];
    }
      this.attendance[studentId].push({ job_id: eventID, total_time: totalTime });
      // since we store ids as key we might overwrite existing data and since we want to store the total per event i am goin with this 
      //{ studentId: [{eventID:totalTime}]
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
      attendance:  this.attendance,
    };
  }
}

module.exports = Period;