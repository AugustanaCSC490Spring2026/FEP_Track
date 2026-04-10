class Period {
  constructor(firebaseObject) {
    this.id = firebaseObject.id || null;
    this.date = firebaseObject.date || null;
    this.startdate = firebaseObject.startdate || null;
    this.enddate = firebaseObject.enddate || null;

    // attendance is a map: { studentId: { job_id, total_time } }
    this.attendance = firebaseObject?.attendance || {};
  }

  // Get one student's data
  getStudent(studentId) {
    return this.attendance[studentId] || null;
  }

  setAttendance(eventID, studentsMap) {
    Object.entries(studentsMap).forEach(([studentId, studentData]) => {
      console.log(`Setting attendance for student ${studentId} on event ${eventID}: ${studentData?.hours ?? 0} hours, ${studentData?.minutes ?? 0} minutes`);
      if (!this.attendance[studentId]) {
        this.attendance[studentId] = [];
      }
      this.attendance[studentId].push({
        job_id: eventID,
        hours: studentData?.hours ?? 0,
        minutes: studentData?.minutes ?? 0,
      });
      // since we store ids as key we might overwrite existing data and since we want to store the total per event i am goin with this
      //{ studentId: [{eventID:totalTime}]
    });
  }


  // Convert back to plain object for Firestore
  toFirestore() {
    return {
      date: this.date,
      startdate: this.startdate,
      enddate: this.enddate,
      attendance: this.attendance,
    };
  }
}

module.exports = Period;
