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
      const totalTime = this.findTotalTime(
        studentData.startTime,
        studentData.endTime,
      );
      if (!this.attendance[studentId]) {
        this.attendance[studentId] = [];
      }
      this.attendance[studentId].push({
        job_id: eventID,
        total_time: totalTime,
      });
      // since we store ids as key we might overwrite existing data and since we want to store the total per event i am goin with this
      //{ studentId: [{eventID:totalTime}]
    });
  }

  findTotalTime(startTime, endTime) {
    const [startHour, startMin] = startTime.split(":").map(Number);
    const [endHour, endMin] = endTime.split(":").map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;//since times are store as hh:mm

    return endMinutes - startMinutes; //there shouldnt be any issue of negs since there shouldnt be any events that go past midnight
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
