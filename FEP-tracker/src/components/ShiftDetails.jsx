import React, { useState,forwardRef,useImperativeHandle } from "react";
import { Modal, Card, Button } from "react-bootstrap";
import { formatTo12Hr } from "../Utils/timeUtils";
import StudentName from "./StudentName";
const ShiftDetails = forwardRef(function ShiftDetails({ completedEventDetails }, ref) {
  const [showCompletedModal, setShowCompletedModal] = useState(false);

  useImperativeHandle(ref, () => ({
    open: () => setShowCompletedModal(true),
  }));
  return (
    <Modal
      show={showCompletedModal}
      onHide={() => setShowCompletedModal(false)}
      centered
      size="md"
    >
      <Modal.Header closeButton>
        <Modal.Title>Completed Shift Details</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {completedEventDetails && completedEventDetails.attendance ? (
          Object.values(completedEventDetails.attendance).map(
            (student, idx) => {
              const breakMins = Math.floor((student.breakTime || 0) / 60);

              return (
                <Card key={idx} className="mb-3 shadow-sm border-secondary">
                  <Card.Body>
                    <h6 className="mb-2" style={{ fontWeight: "600" }}>
                      <StudentName studentId={student.id}  />
                    </h6>
                    <div style={{ fontSize: "0.9rem" }}>
                      <p className="mb-1">
                        <strong>Status:</strong> {student.status}
                      </p>
                      <p className="mb-1">
                        <strong>Time In:</strong> {formatTo12Hr(student.timeIn)}
                      </p>
                      <p className="mb-1">
                        <strong>Time Out:</strong>{" "}
                        {formatTo12Hr(student.timeOut)}
                      </p>
                      <p className="mb-1">
                        <strong>Break Taken:</strong> {breakMins} mins
                      </p>
                      <hr className="my-2" />
                      <p className="mb-0 text-success">
                        <strong>Confirmed Hours:</strong> {student.hours}h{" "}
                        {student.minutes}m
                      </p>
                    </div>
                  </Card.Body>
                </Card>
              );
            },
          )
        ) : (
          <p className="text-muted text-center py-3">
            No attendance data found for this event.
          </p>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button
          variant="secondary"
          onClick={() => setShowCompletedModal(false)}
        >
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
});

export default ShiftDetails;