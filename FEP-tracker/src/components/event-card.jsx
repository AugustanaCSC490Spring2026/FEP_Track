/* eslint-disable react-hooks/purity */
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Badge from "react-bootstrap/Badge";
import { useLocation } from "react-router-dom";
import Row from "react-bootstrap/esm/Row";
import Col from "react-bootstrap/esm/Col";
import Modal from "react-bootstrap/Modal";
import { useState } from "react";
import { database } from "../firebase-config";
import { doc, getDoc,deleteDoc } from "firebase/firestore";
import { timeFormat } from "../Utils/timeUtils";
export default function EventCard({
  event,
  onCallBack,
  onEdit,
  user,
  onApply,
  onManage,
  status,
  onConfirm,
  onViewCompletedDetails,
}) {
  const filled = event?.students?.length ?? 0;
  const location = useLocation();
  const path = location.pathname;
  const createdAt = event?.createdAt?.toDate?.() ?? event?.createdAt;
  const timeAgo = createdAt
    ? new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(
        Math.round((createdAt - Date.now()) / (1000 * 60 * 60 * 24)),
        "day",
      )
    : null;

  const isFull = filled >= event.student_cap;
  const hasApplied = event.students?.includes(user?.uid);
  const startTime = timeFormat(event.startTime) || null;
  const endTime = timeFormat(event.endTime) || "TBD";
  const isAdmin = user?.role === "admin";
  const eventDateTime = new Date(`${event.date}T${event.startTime}:00`);
  const now = new Date();
  const diffInMs = eventDateTime - now;
  const diffInHours = diffInMs / (1000 * 60 * 60);
  const tooLateToDrop = diffInHours < 1;

  const [showModal, setShowModal] = useState(false);
  const [supervisorInfo, setSupervisorInfo] = useState(null);

  const pendingCount = event.pending_students?.length || 0;
  const isPending = event.pending_students?.includes(user?.uid);
  const isAccepted = event.students?.includes(user?.uid);

  const handleClose = () => setShowModal(false);
  const handleShowContact = async () => {
    setShowModal(true);

    const supervisorUid = event.createdByID?.uid;
    console.log(supervisorUid);

    if (supervisorUid) {
      try {
        const userDocRef = doc(database, "users", supervisorUid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          setSupervisorInfo({
            phone: userData.phone ?? "No phone listed",
            email: userData.email ?? event.createdByID.email ?? "No email listed",
            name: userData.displayName ?? event.createdByID.displayName
          });
        } else {
          console.warn("No such user document found in database!");
        }
      } catch (error) {
        console.error("Error fetching supervisor details:", error);
      }
    }
  };
const deleteEvent = async (id) => {
    if (window.confirm("Are you sure you want to delete this job?")) {
      await deleteDoc(doc(database, "upcoming_events", id));
    }
  };
  
  return (
    <div style={{ maxWidth: 500, margin: "auto", padding: "0 16px" }}>
      <Card
        className="mb-3 shadow-sm overflow-hidden"
        style={{
          border: "none",
          borderRadius: 16,
          padding: 0,
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        }}
      >
        <div
          style={{
            padding: "14px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "linear-gradient(90deg, #2563eb, #60a5fa)",
          }}
        >
          <Badge
            bg="light"
            text="dark"
            className="px-3 py-2"
            style={{ fontSize: 12, borderRadius: 20 }}
          >
            📍 {event.location}
          </Badge>
          <span style={{ color: "rgba(255,255,255,0.85)", fontSize: 12 }}>
            Time: {startTime} - {endTime} <br />
            <strong>Date:</strong> {event.date}
          </span>
        </div>

        <Card.Body style={{ background: "#f8f9fa" }} className="px-4 pt-3 pb-2">
          <Card.Title
            className="mb-2"
            style={{ fontSize: 18, fontWeight: 700 }}
          >
            {event.title}
          </Card.Title>
          <Row className="mb-2">
            <Card.Text className="text-muted mb-1" style={{ fontSize: 13 }}>
              <strong>Department:</strong> {event.department}
            </Card.Text>
          </Row>
          <Row className="mb-2">
            <Col>
              <Card.Text className="text-muted mb-1" style={{ fontSize: 13 }}>
                <strong>Supervisor:</strong> {event.supervisor}
              </Card.Text>
            </Col>
            <Col>
              <Card.Text className="text-muted mb-1" style={{ fontSize: 13 }}>
                <strong>Location:</strong> {event.location}
              </Card.Text>
            </Col>
          </Row>
          <Row className="mb-2">
            <Col>
              <Card.Text className="text-muted mb-3" style={{ fontSize: 13 }}>
                <strong>Student Limit:</strong> {filled}/{event.student_cap}
                &nbsp;·&nbsp;
              </Card.Text>
            </Col>
            <Col>
              <Card.Text className="text-muted mb-1" style={{ fontSize: 13 }}>
                <strong>Current Applicants:</strong> {pendingCount}
              </Card.Text>
            </Col>
          </Row>

          <div className="mb-3">
            <div style={{ background: "#e9ecef", borderRadius: 99, height: 6 }}>
              <div
                style={{
                  width: `${Math.min((filled / event.student_cap) * 100, 100)}%`,
                  height: "100%",
                  borderRadius: 99,
                  background: "linear-gradient(90deg, #2563eb, #60a5fa)",
                  transition: "width .4s",
                }}
              />
            </div>
          </div>

          {event.extra_details && event.extra_details !== "TBD" && (
            <Card.Text className="text-muted" style={{ fontSize: 13 }}>
              {event.extra_details}
            </Card.Text>
          )}

          {(user?.role === "staff" || user?.role === "admin") && (
              <div className="d-flex gap-2">
                  {status === "Upcoming" && (
                      <>
                          <Button disabled={!isAdmin} variant="outline-primary" size="sm" onClick={() => onEdit(event)}>Edit</Button>
                          <Button disabled={!isAdmin} variant="danger" size="sm" onClick={() => deleteEvent(event.id)}>Delete</Button>
                          <Button
                              disabled={!isAdmin}
                              variant={pendingCount > 0 ? "warning" : "outline-primary"}
                              size="sm"
                              onClick={() => onManage(event)}
                          >
                            {pendingCount > 0 ? `Approvals (${pendingCount})` : "View Students"}
                          </Button>
                      </>
                  )}

                  {status === "Pending Approval" && (
                      <Button disabled={!isAdmin} variant="success" size="sm" className="w-100" onClick={() => onConfirm(event)}>
                          Confirm Hours
                      </Button>
                  )}

                {status === "Completed" && (
                    <div className="w-100 text-center">
                        <Badge bg="secondary" className="w-100 mb-2">Archived & Verified</Badge>
                        <Button disabled={!isAdmin}
                            variant="primary"
                            size="sm"
                            className="w-100 text-white"
                            onClick={() => onViewCompletedDetails(event)}
                        >
                            View Shift Details
                        </Button>
                    </div>
                )}
              </div>
          )}

          {user?.role === "student" && (
            <div className="d-flex align-items-center gap-2 mt-2">
              {(path === "/home" || path === "/") && (
                  <Button
                      variant={isAccepted ? "success" : isPending ? "warning" : "primary"}
                      disabled={isAccepted || isPending || isFull}
                      onClick={() => onApply(user.uid, event.id)}
                  >
                    {isAccepted ? "Accepted" : isPending ? "Pending Approval" : hasApplied ? "Applied" : "Apply Now"}
                  </Button>
              )}

              {(path === "/profile" || status === "MyJobs") && (
                <>
                  {!tooLateToDrop ? (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => onCallBack(user.uid, event.id)}
                    >
                      {status === "Pending" ? "Withdraw" : "Drop"}
                    </Button>
                  ) : (
                    <Button
                      variant="warning"
                      size="sm"
                      onClick={handleShowContact}
                    >
                      Contact Supervisor
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
        </Card.Body>

        {timeAgo && (
          <Card.Footer
            className="text-muted px-4 d-flex justify-content-between"
            style={{ fontSize: 12, border: "none" }}
          >
            <span>Created {timeAgo}</span>
            <span>Created by {event.createdBy}</span>
            {/* The name shows in firsore but not in here for osme reason */}
          </Card.Footer>
        )}
      </Card>

      <Modal show={showModal} onHide={handleClose} centered>
        <Modal.Header closeButton>
          <Modal.Title>Contact Supervisor</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            It is too close to the start time to drop this shift. Please contact <strong> {supervisorInfo?.name}</strong> directly with questions.
          </p>
          <hr />
          <div className="mt-3">
            <h6><strong>Supervisor Details:</strong></h6>
            <p className="mb-1"><strong>Name:</strong> {supervisorInfo?.name}</p>
            <p className="mb-1"><strong>Email:</strong> {supervisorInfo?.email || "No email provided"}</p>
            <p className="mb-0"><strong>Phone:</strong> {supervisorInfo?.phone || "No phone provided"}</p>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
