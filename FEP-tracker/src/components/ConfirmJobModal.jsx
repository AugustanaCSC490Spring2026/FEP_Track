import React, { useState, forwardRef, useImperativeHandle } from "react";
import { Modal, Form, Button, Card } from "react-bootstrap";
import {
  timeFormat,
  calculateTimeDifference,
  formatTo12Hr,
  formatFirebaseTime,
} from "../utils/timeUtils";
import { database } from "../firebase-config";
import { collection, addDoc, deleteDoc, doc } from "firebase/firestore";
import StudentName from "./StudentName";

const ConfirmJobModal = forwardRef(function ConfirmJobModal({onConfirmed},ref) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmingEvent, setConfirmingEvent] = useState(null);
  const [confirmingStudents, setConfirmingStudents] = useState({});
  const [selectedStudentDetails, setSelectedStudentDetails] = useState(null);

  const handleStudentTimeChange = (studentId, field, value) => {
    let numValue = parseInt(value, 10);
    if (isNaN(numValue) || numValue < 0) numValue = 0;
    if (field === "minutes" && numValue > 59) numValue = 59;
    setConfirmingStudents((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], [field]: numValue },
    }));
  };
  const handleOpenConfirmModal = async (event) => {
    setConfirmingEvent(event);

    const defaultTime = calculateTimeDifference(event.startTime, event.endTime);

    const currentStudents = event.students || [];
    const initializedStudents = {};
    currentStudents.forEach((studentId) => {
      const studentAttendance = event.attendance
        ? event.attendance[studentId]
        : null;

      if (studentAttendance) {
        const studentTimeIn = formatFirebaseTime(studentAttendance.timeIn);
        const studentTimeOut = studentAttendance.timeOut
          ? formatFirebaseTime(studentAttendance.timeOut)
          : "--:--:--";
        const checkTimeOut =
          studentTimeOut !== "--:--:--" ? studentTimeOut : event.endTime;
        const timeDifference = calculateTimeDifference(
          studentTimeIn,
          checkTimeOut,
        );
        const breakSeconds = studentAttendance.breakSeconds || 0;
        const breakMinsRounded = Math.round(breakSeconds / 60);
        const clockedInTotalMins =
          timeDifference.hours * 60 + timeDifference.minutes;
        const totalWorkedMins = Math.max(
          0,
          clockedInTotalMins - breakMinsRounded,
        );
        const finalHours = Math.floor(totalWorkedMins / 60);
        const finalMinutes = totalWorkedMins % 60;

        initializedStudents[studentId] = {
          id: studentId,
          hours: finalHours,
          minutes: finalMinutes,
          status: "Present",
          timeIn: studentTimeIn,
          timeOut: studentTimeOut,
          breakTime: breakSeconds,
        };
      } else {
        initializedStudents[studentId] = {
          id: studentId,
          hours: defaultTime.hours,
          minutes: defaultTime.minutes,
          status: "No Record",
          timeIn: "--:--:--",
          timeOut: "--:--:--",
          breakTime: 0,
        };
      }
    });
    setConfirmingStudents(initializedStudents);
    setShowConfirmModal(true);
  };
  useImperativeHandle(ref, () => ({
    open: handleOpenConfirmModal,
  }));

  const executeConfirmJob = async () => {
    if (!confirmingEvent) return;

    try {
      const completedData = {
        ...confirmingEvent,
        attendance: confirmingStudents,
        status: "Verified",
        completedAt: new Date(),
      };

      delete completedData.id;

      await addDoc(collection(database, "completed_events"), completedData);
      await deleteDoc(doc(database, "pending_events", confirmingEvent.id));

      onConfirmed(confirmingEvent.id);

      setShowConfirmModal(false);
      setSelectedStudentDetails(null);
      setConfirmingEvent(null);
      alert("Job confirmed and moved to Completed!");
    } catch (error) {
      console.error("Error confirming job:", error);
    }
  };

  const handleClose = () => {
    setShowConfirmModal(false);
    setSelectedStudentDetails(null);
  };

  return (
    <Modal
      show={showConfirmModal}
      onHide={() => {
        handleClose();
      }}
      centered
    >
      <Modal.Header closeButton>
        <Modal.Title>Confirm Job & Adjust Hours</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {confirmingEvent && (
          <>
            <h5>{confirmingEvent.title}</h5>
            <p className="text-muted mb-4">
              {confirmingEvent.date} | {timeFormat(confirmingEvent.startTime)} -{" "}
              {timeFormat(confirmingEvent.endTime)}
            </p>

            <h6 className="mb-3">Student Time Worked</h6>
            {Object.keys(confirmingStudents).length === 0 ? (
              <p className="text-muted">No students registered for this job.</p>
            ) : (
              Object.values(confirmingStudents).map((student, index) => (
                <Form.Group
                  key={index}
                  className="mb-3 d-flex align-items-center"
                >
                  <Form.Label
                    className="mb-0 me-3"
                    style={{ minWidth: "150px", fontWeight: "500" }}
                  >
                    <StudentName studentId={student.id} />
                  </Form.Label>

                  <div className="d-flex align-items-center gap-2">
                    <Form.Control
                      type="number"
                      min="0"
                      placeholder="0"
                      value={student.hours}
                      onChange={(e) =>
                        handleStudentTimeChange(
                          student.id,
                          "hours",
                          e.target.value,
                        )
                      }
                      style={{ maxWidth: "80px" }}
                    />
                    <span className="text-muted small">hrs</span>

                    <Form.Control
                      type="number"
                      min="0"
                      max="59"
                      placeholder="0"
                      value={student.minutes}
                      onChange={(e) =>
                        handleStudentTimeChange(
                          student.id,
                          "minutes",
                          e.target.value,
                        )
                      }
                      style={{ maxWidth: "80px" }}
                    />
                    <span className="text-muted small">mins</span>
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      className="ms-3"
                      onClick={() => setSelectedStudentDetails(student.id)}
                    >
                      Details
                    </Button>
                  </div>
                </Form.Group>
              ))
            )}
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button
          variant="danger"
          onClick={() => {
            setShowConfirmModal(false);
            setSelectedStudentDetails(null);
          }}
        >
          Close
        </Button>
        <Button variant="success" onClick={executeConfirmJob}>
          Confirm & Complete Job
        </Button>
      </Modal.Footer>

      {/* Shift Details Side Pop-up */}
      {selectedStudentDetails &&
        confirmingStudents[selectedStudentDetails] &&
        (() => {
          const student = confirmingStudents[selectedStudentDetails];

          const clockedInDiff = calculateTimeDifference(
            student.timeIn,
            student.timeOut,
          );
          /*     const clockedInTotalMins =
            clockedInDiff.hours * 60 + clockedInDiff.minutes;
 */
          const breakSecs = student.breakTime || 0;
          const totalBreakSeconds = Math.round(breakSecs);
          const displayBreakMins = Math.floor(totalBreakSeconds / 60);
          const displayBreakSecs = totalBreakSeconds % 60;

          return (
            <div
              style={{
                position: "fixed",
                top: "50%",
                left: "calc(50% + 265px)",
                transform: "translateY(-50%)",
                zIndex: 1060,
                width: "280px",
              }}
            >
              <Card className="shadow-lg border-info">
                <Card.Header className="bg-secondary text-white d-flex flex-column justify-content-between">
                  <div className="d-flex justify-content-between align-items-center w-100">
                    <strong>Shift Details</strong>
                    <Button
                      variant="close"
                      className="btn-close-white"
                      onClick={() => setSelectedStudentDetails(null)}
                    />
                  </div>
                  <div
                    style={{
                      fontSize: "1rem",
                      opacity: 0.8,
                      marginTop: "2px",
                    }}
                  >
                    <StudentName studentId={student.id} />
                  </div>
                </Card.Header>
                <Card.Body style={{ fontSize: "0.9rem" }}>
                  <p className="mb-1">
                    <strong>Time In:</strong> {formatTo12Hr(student.timeIn)}
                  </p>
                  <p className="mb-1">
                    <strong>Time Out:</strong> {formatTo12Hr(student.timeOut)}
                  </p>
                  <hr className="my-2" />
                  <p className="mb-1">
                    <strong>Total Clocked In:</strong> {clockedInDiff.hours}h{" "}
                    {clockedInDiff.minutes}m
                  </p>
                  <p className="mb-1">
                    <strong>Break Taken:</strong> {displayBreakMins}m{" "}
                    {displayBreakSecs}s
                  </p>
                  <hr className="my-2" />
                  <p className="mb-0 text-success">
                    <strong>Total Worked:</strong> {student.hours}h{" "}
                    {student.minutes}m
                  </p>
                </Card.Body>
              </Card>
            </div>
          );
        })()}
    </Modal>
  );
});

export default ConfirmJobModal;
