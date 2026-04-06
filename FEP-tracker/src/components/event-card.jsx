/* eslint-disable react-hooks/purity */
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Badge from "react-bootstrap/Badge";
import { useLocation } from "react-router-dom";
import Row from "react-bootstrap/esm/Row";
import Col from "react-bootstrap/esm/Col";

export default function EventCard({
  event,
  onCallBack,
  onEdit,
  user,
  onApply,
  status,
  onConfirm,
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

  function timeFormat(time) {
    let hours = 0;
    let ampm = "";

    if (time) {
      const date = new Date(`1970-01-01T${time}:00`);
      hours = date.getHours();
      ampm = hours >= 12 ? "PM" : "AM";
    }
    return `${((hours + 11) % 12) + 1}:00 ${ampm}`;
  }
  return (
    <div style={{ maxWidth: 400, margin: "auto", padding: "0 16px" }}>
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
            <Col xs="auto">
              <Card.Text className="text-muted mb-3" style={{ fontSize: 13 }}>
                <strong>Student Limit:</strong> {filled}/{event.student_cap}
                &nbsp;·&nbsp;
              </Card.Text>
            </Col>
            <Col>
              <Card.Text className="text-muted mb-1" style={{ fontSize: 13 }}>
                <strong>Supervisor:</strong> {event.supervisor}
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

          {user?.role === "staff" && (
              <div className="d-flex gap-2">
                  {status === "Upcoming" && (
                      <>
                          <Button variant="outline-primary" size="sm" onClick={() => onEdit(event)}>Edit</Button>
                          <Button variant="danger" size="sm" onClick={() => onCallBack(event.id)}>Delete</Button>
                      </>
                  )}

                  {status === "Pending Approval" && (
                      <Button variant="success" size="sm" className="w-100" onClick={() => onConfirm(event)}>
                          Confirm Hours
                      </Button>
                  )}

                  {status === "Completed" && (
                      <Badge bg="secondary" className="w-100">Archived & Verified</Badge>
                  )}
              </div>
          )}

          {user?.role === "student" && (
            <div className="d-flex align-items-center gap-2 mt-2">
              {(path === "/home" || path === "/") && (
                <Button
                  variant={
                    hasApplied ? "success" : isFull ? "secondary" : "primary"
                  }
                  size="sm"
                  disabled={isFull || hasApplied}
                  onClick={() => {
                    if (!isFull && !hasApplied) {
                      onApply(user.uid, event.id);
                    }
                  }}
                >
                  {isFull ? "Full" : hasApplied ? "Applied!" : "Apply Now"}
                </Button>
              )}

              {(path === "/profile" || status === "MyJobs") && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => onCallBack(user.uid, event.id)}
                >
                  Drop
                </Button>
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
    </div>
  );
}
