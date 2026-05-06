import { useEffect, useState, useRef } from "react";
import { database } from "../firebase-config";
import JobForms from "../components/Jobform";
import {
  collection,
  addDoc,
  query,
  getDocs,
  deleteDoc,
  doc,
  getDoc,
} from "firebase/firestore";
/* ------- */
import EventCard from "../components/event-card";
import Button from "react-bootstrap/Button";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import Card from "react-bootstrap/Card";
import Row from "react-bootstrap/Row";
import Modal from "react-bootstrap/Modal";
import ButtonGroup from "react-bootstrap/ButtonGroup";
import JobManagementModal from "../components/JobManagementModal";
import Select from "react-select";

function Dashboard({ user }) {
  const [isJobFormOpen, setisJobFormOpen] = useState(false);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  /* const [filter, setFilter] = useState("All"); */
  const [searchTitle, setSearchTitle] = useState("");
  const [filterBuilding, setFilterBuilding] = useState("All");
  const [filterSupervisor, setFilterSupervisor] = useState("All");
  const [filterAvailability, setFilterAvailability] = useState("All");
  const [filterDepartment, setFilterDepartment] = useState("All");
  const [filterPending, setFilterPending] = useState("All");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmingEvent, setConfirmingEvent] = useState(null);
  const [confirmingStudents, setConfirmingStudents] = useState({});
  const [selectedStudentDetails, setSelectedStudentDetails] = useState(null);
  const [currentTab, setCurrentTab] = useState("Upcoming");
  const [showManageModal, setShowManageModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [showCompletedModal, setShowCompletedModal] = useState(false);
  const [completedEventDetails, setCompletedEventDetails] = useState(null);
  const jobFormRef = useRef();
  const collectionMap = {
    Upcoming: "upcoming_events",
    "Pending Approval": "pending_events",
    Completed: "completed_events",
  };
  const tabNames = Object.keys(collectionMap);

  const fetchEvents = async () => {
    setLoading(true);
    const collectionName = collectionMap[currentTab];
    const q = query(collection(database, collectionName));

    try {
      const snap = await getDocs(q);
      let fetchedEvents = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      fetchedEvents.sort((a, b) => {
        if (!a.date || a.date === "TBD") return 1;
        if (!b.date || b.date === "TBD") return -1;

        const dateTimeA = new Date(`${a.date}T${a.startTime || "00:00"}`);
        const dateTimeB = new Date(`${b.date}T${b.startTime || "00:00"}`);
        let diff = 0;

        if (currentTab === "Upcoming") {
          diff = dateTimeA - dateTimeB;
        } else {
          diff = dateTimeB - dateTimeA;
        }

        if (diff === 0) {
          const endA = a.endTime || "00:00";
          const endB = b.endTime || "00:00";

          if (currentTab === "Upcoming") {
            return endA.localeCompare(endB);
          } else {
            return endB.localeCompare(endA);
          }
        }

        return diff;
      });

      setEvents(fetchedEvents);

      setSelectedEvent((prev) => {
        if (!prev) return null;
        const freshData = fetchedEvents.find((e) => e.id === prev.id);
        return freshData ? { ...freshData } : null;
      });
    } catch (error) {
      console.error("Error fetching/sorting events:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [currentTab]);

  const deleteEvent = async (id) => {
    if (window.confirm("Are you sure you want to delete this job?")) {
      await deleteDoc(doc(database, "upcoming_events", id));
      setEvents((prev) => prev.filter((e) => e.id !== id));
      setSelectedEvent(null);
    }
  };

  const filteredEvents = events.filter((event) => {
    const matchesTitle = event.title
      .toLowerCase()
      .includes(searchTitle.toLowerCase());
    const matchesBuilding =
      filterBuilding === "All" || event.location === filterBuilding;
    const matchesSupervisor =
      filterSupervisor === "All" || event.supervisor === filterSupervisor;
    const matchesDepartment =
      filterDepartment === "All" || event.department === filterDepartment;
    const studentCount = event.students?.length || 0;
    const isFull = studentCount >= event.student_cap;

    const matchesAvailability =
      filterAvailability === "All" ||
      (filterAvailability === "Full" && isFull) ||
      (filterAvailability === "Available" && !isFull);

    const hasPending =
      event.pending_students && event.pending_students.length > 0;
    const matchesPending =
      filterPending === "All" ||
      (filterPending === "Has Pending" && hasPending) ||
      (filterPending === "No Pending" && !hasPending);

    return (
      matchesTitle &&
      matchesBuilding &&
      matchesSupervisor &&
      matchesAvailability &&
      matchesDepartment &&
      matchesPending
    );
  });

  // Opens the modal and maps existing students to a local state with calculated time
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

  const handleStudentTimeChange = (studentId, field, value) => {
    let numValue = parseInt(value, 10);
    if (isNaN(numValue) || numValue < 0) numValue = 0;
    if (field === "minutes" && numValue > 59) numValue = 59;

    setConfirmingStudents((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: numValue,
      },
    }));
  };

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

      setEvents((prev) => prev.filter((e) => e.id !== confirmingEvent.id));

      setShowConfirmModal(false);
      setSelectedStudentDetails(null);
      setConfirmingEvent(null);
      alert("Job confirmed and moved to Completed!");
    } catch (error) {
      console.error("Error confirming job:", error);
    }
  };

  const calculateTimeDifference = (start, end) => {
    if (!start || !end || start === "--:--:--" || end === "--:--:--") {
      return { hours: 0, minutes: 0 };
    }

    const [startHour, startMin, startSec] = start.split(":").map(Number);
    const [endHour, endMin, endSec] = end.split(":").map(Number);

    let startInMins = startHour * 60 + startMin + (startSec || 0) / 60;
    let endInMins = endHour * 60 + endMin + (endSec || 0) / 60;

    if (endInMins < startInMins) {
      endInMins += 24 * 60;
    }

    const diffMins = endInMins - startInMins;

    const roundedTotalMins = Math.round(diffMins);

    const hours = Math.floor(roundedTotalMins / 60);
    const minutes = roundedTotalMins % 60;

    return { hours, minutes };
  };

  const formatFirebaseTime = (timestamp, use24Hour = true) => {
    if (!timestamp || typeof timestamp.toDate !== "function") {
      return "--:--:--";
    }

    const date = timestamp.toDate();

    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: !use24Hour,
    });
  };

  function timeFormat(time) {
    let hours = 0;
    let ampm = "";
    let minutes = 0;

    if (time) {
      const date = new Date(`1970-01-01T${time}:00`);
      hours = date.getHours();
      minutes = date.getMinutes();
      ampm = hours >= 12 ? "PM" : "AM";
    }
    return `${((hours + 11) % 12) + 1}:${minutes.toString().padStart(2, "0")} ${ampm}`;
  }

  const formatTo12Hr = (timeStr) => {
    if (!timeStr || timeStr === "--:--:--") return timeStr;
    const [h, m, s] = timeStr.split(":");
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = ((hour + 11) % 12) + 1;
    return `${displayHour}:${m}:${s} ${ampm}`;
  };

  const StudentName = ({ studentId, db }) => {
    const [name, setName] = useState("Loading...");
  
    useEffect(() => {
      const fetchName = async () => {
        if (!studentId) return;

        try {
          const docRef = doc(db, "users", studentId);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            setName(docSnap.data().name || "Unknown Student");
          } else {
            setName("Not Found");
          }
        } catch (e) {
          // This is the "catch" clause the error was looking for!
          console.error("Error fetching student name:", e);
          setName("Error");
        }
      };

      fetchName();
    }, [studentId, db]);

    return <>{name}</>;
  };

  const handleOpenManage = (event) => {
    setSelectedEvent(event);
    setShowManageModal(true);
  };

  const handleViewCompletedDetails = (event) => {
    setCompletedEventDetails(event);
    setShowCompletedModal(true);
  };

  return (
    <div
      style={{
        maxWidth: "1200px",
        margin: "auto",
        padding: "40px 20px",
        fontFamily: "sans-serif",
      }}
    >
      <Row className="g-4">
        {/* LEFT COLUMN: Controls & Branding */}
        <Col lg={4} md={5} className="d-flex flex-column align-items-start">
          <div className="sticky-top" style={{ top: "20px", width: "100%" }}>
            <div className="mb-4">
              <h2
                style={{
                  color: "var(--color-primary-blue-light)",
                  fontWeight: "700",
                  marginBottom: "5px",
                }}
              >
                Admin Dashboard
              </h2>
              <p
                style={{
                  color: "var(--color-text-secondary)",
                  fontSize: "0.95rem",
                  lineHeight: "1.4",
                }}
              >
                Welcome back, <strong>{user.displayName || "Admin"}</strong>.
                Manage, track, and schedule upcoming student jobs from this
                panel.
              </p>
            </div>

            <Button
              variant={isJobFormOpen ? "outline-secondary" : "primary"}
              onClick={() => {
                if (isJobFormOpen) {
                  jobFormRef.current.closeForm();
                } else {
                  setEditingEvent(null);
                  jobFormRef.current.resetForm();
                  jobFormRef.current.openForm();
                }
              }}
            >
              {isJobFormOpen ? "✕ Cancel" : "+ Create New Job"}
            </Button>

            {/* Filter Box */}
            <div
              className="p-3 rounded shadow-sm"
              style={{
                backgroundColor: "var(--color-bg-darker)",
                border: "1px solid #334155",
              }}
            >
              <div className="d-flex justify-content-between align-items-center mb-3">
                <small style={{ color: "var(--color-text-secondary)" }}>
                  {currentTab} Jobs: <strong>{events.length}</strong>
                </small>
                <Button
                  variant="link"
                  size="sm"
                  className="p-0 text-decoration-none"
                  style={{
                    color: "var(--color-accent-yellow)",
                    fontSize: "0.75rem",
                  }}
                  onClick={() => {
                    setSearchTitle("");
                    setFilterBuilding("All");
                    setFilterSupervisor("All");
                    setFilterAvailability("All");
                    setFilterDepartment("All");
                    setFilterPending("All");
                  }}
                >
                  Reset
                </Button>
              </div>

              <Form>
                {/* Search Title */}
                <Form.Group className="mb-3">
                  <Form.Label
                    className="small text-uppercase"
                    style={{
                      color: "var(--color-text-secondary)",
                      fontSize: "0.7rem",
                    }}
                  >
                    Search Title
                  </Form.Label>
                  <Form.Control
                    size="sm"
                    type="text"
                    placeholder="Type to search..."
                    value={searchTitle}
                    onChange={(e) => setSearchTitle(e.target.value)}
                    style={{
                      backgroundColor: "var(--color-bg-card)",
                      color: "white",
                      border: "1px solid #475569",
                    }}
                  />
                </Form.Group>

                {/* Filter Department */}
                <Form.Group className="mb-3">
                  <Form.Label
                    className="small text-uppercase"
                    style={{
                      color: "var(--color-text-secondary)",
                      fontSize: "0.7rem",
                    }}
                  >
                    Department
                  </Form.Label>
                  <Form.Select
                    size="sm"
                    value={filterDepartment}
                    onChange={(e) => setFilterDepartment(e.target.value)}
                    style={{
                      backgroundColor: "var(--color-bg-card)",
                      color: "white",
                      border: "1px solid #475569",
                    }}
                  >
                    <option value="All">All Departments</option>
                    {[
                      ...new Set(
                        events.map((e) => e.department).filter(Boolean),
                      ),
                    ].map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>

                {/* Supervisor Filter */}
                <Form.Group className="mb-3">
                  <Form.Label
                    className="small text-uppercase"
                    style={{
                      color: "var(--color-text-secondary)",
                      fontSize: "0.7rem",
                    }}
                  >
                    Supervisor
                  </Form.Label>
                  <Form.Select
                    size="sm"
                    value={filterSupervisor}
                    onChange={(e) => setFilterSupervisor(e.target.value)}
                    style={{
                      backgroundColor: "var(--color-bg-card)",
                      color: "white",
                      border: "1px solid #475569",
                    }}
                  >
                    <option value="All">All Supervisors</option>
                    {[...new Set(events.map((e) => e.supervisor))].map(
                      (sup) => (
                        <option key={sup} value={sup}>
                          {sup}
                        </option>
                      ),
                    )}
                  </Form.Select>
                </Form.Group>

                {/* Building Filter */}
                <Form.Group className="mb-3">
                  <Form.Label
                    className="small text-uppercase"
                    style={{
                      color: "var(--color-text-secondary)",
                      fontSize: "0.7rem",
                    }}
                  >
                    Location
                  </Form.Label>
                  <Form.Select
                    size="sm"
                    value={filterBuilding}
                    onChange={(e) => setFilterBuilding(e.target.value)}
                    style={{
                      backgroundColor: "var(--color-bg-card)",
                      color: "white",
                      border: "1px solid #475569",
                    }}
                  >
                    <option value="All">All Locations</option>
                    {[...new Set(events.map((e) => e.location))].map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>

                {/* Availability Toggle */}
                <Form.Group>
                  <Form.Label
                    className="small text-uppercase"
                    style={{
                      color: "var(--color-text-secondary)",
                      fontSize: "0.7rem",
                    }}
                  >
                    Availability
                  </Form.Label>
                  <div className="d-flex gap-2">
                    {["All", "Available", "Full"].map((status) => (
                      <Button
                        key={status}
                        size="sm"
                        variant={
                          filterAvailability === status
                            ? "primary"
                            : "outline-secondary"
                        }
                        onClick={() => setFilterAvailability(status)}
                        style={{ fontSize: "0.7rem", flex: 1 }}
                      >
                        {status}
                      </Button>
                    ))}
                  </div>
                </Form.Group>

                {/* Pending Applications Toggle */}
                <Form.Group className="mb-3">
                  <Form.Label
                    className="small text-uppercase"
                    style={{
                      color: "var(--color-text-secondary)",
                      fontSize: "0.7rem",
                    }}
                  >
                    Pending Applications
                  </Form.Label>
                  <div className="d-flex gap-2">
                    {["All", "Has Pending", "No Pending"].map((status) => (
                      <Button
                        key={status}
                        size="sm"
                        variant={
                          filterPending === status
                            ? "primary"
                            : "outline-secondary"
                        }
                        onClick={() => setFilterPending(status)}
                        style={{ fontSize: "0.7rem", flex: 1 }}
                      >
                        {status}
                      </Button>
                    ))}
                  </div>
                </Form.Group>
              </Form>
            </div>
          </div>
        </Col>

        {/* RIGHT COLUMN: The Scrollable List */}
        <Col lg={8} md={7} style={{ borderLeft: "1px solid #334155" }}>
          <div className="mb-4 d-flex justify-content-between align-items-center">
            <ButtonGroup>
              {tabNames.map((tab) => (
                <Button
                  key={tab}
                  variant={currentTab === tab ? "primary" : "outline-primary"}
                  onClick={() => setCurrentTab(tab)}
                  style={{ fontWeight: currentTab === tab ? "600" : "400" }}
                >
                  {tab} Jobs
                </Button>
              ))}
            </ButtonGroup>
          </div>

          {loading ? (
            <p className="text-center text-muted">
              Loading {currentTab.toLowerCase()} jobs...
            </p>
          ) : (
            <div className="event-scroll-container">
              {filteredEvents.length === 0 ? (
                <div
                  className="text-center py-5 rounded"
                  style={{
                    backgroundColor: "var(--color-bg-darker)",
                    border: "1px solid #334155",
                  }}
                >
                  <p style={{ color: "var(--color-text-secondary)" }}>
                    No {currentTab.toLowerCase()} jobs match your filters.
                  </p>
                </div>
              ) : (
                filteredEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    status={currentTab} // Pass "Upcoming", "Pending Approval", or "Completed"
                    onConfirm={handleOpenConfirmModal}
                    onEdit={() => jobFormRef.current.handleEditEvent(event)}
                    onManage={handleOpenManage}
                    onRefresh={fetchEvents}
                    onCallBack={deleteEvent}
                    onViewCompletedDetails={handleViewCompletedDetails}
                    user={user}
                  />
                ))
              )}
            </div>
          )}
        </Col>
      </Row>
      <JobForms
        ref={jobFormRef}
        onOpenChange={setisJobFormOpen}
        user={user}
        fetchEvents={fetchEvents}
        editingEvent={editingEvent}
        setEditingEvent={setEditingEvent}
      />

      <Modal
        show={showConfirmModal}
        onHide={() => {
          setShowConfirmModal(false);
          setSelectedStudentDetails(null);
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
                {confirmingEvent.date} | {timeFormat(confirmingEvent.startTime)}{" "}
                - {timeFormat(confirmingEvent.endTime)}
              </p>

              <h6 className="mb-3">Student Time Worked</h6>
              {Object.keys(confirmingStudents).length === 0 ? (
                <p className="text-muted">
                  No students registered for this job.
                </p>
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
                      <StudentName studentId={student.id} db={database} />
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
            const clockedInTotalMins =
              clockedInDiff.hours * 60 + clockedInDiff.minutes;

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
                      <StudentName studentId={student.id} db={database} />
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

      {/* Completed Shift Details Modal */}
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
              Object.values(completedEventDetails.attendance).map((student, idx) => {
                const breakMins = Math.floor((student.breakTime || 0) / 60);

                return (
                    <Card key={idx} className="mb-3 shadow-sm border-secondary">
                      <Card.Body>
                        <h6 className="mb-2" style={{ fontWeight: "600" }}>
                          <StudentName studentId={student.id} db={database} />
                        </h6>
                        <div style={{ fontSize: "0.9rem" }}>
                          <p className="mb-1"><strong>Status:</strong> {student.status}</p>
                          <p className="mb-1"><strong>Time In:</strong> {formatTo12Hr(student.timeIn)}</p>
                          <p className="mb-1"><strong>Time Out:</strong> {formatTo12Hr(student.timeOut)}</p>
                          <p className="mb-1"><strong>Break Taken:</strong> {breakMins} mins</p>
                          <hr className="my-2" />
                          <p className="mb-0 text-success">
                            <strong>Confirmed Hours:</strong> {student.hours}h {student.minutes}m
                          </p>
                        </div>
                      </Card.Body>
                    </Card>
                );
              })
          ) : (
              <p className="text-muted text-center py-3">No attendance data found for this event.</p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCompletedModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      <JobManagementModal
        show={showManageModal}
        onHide={() => setShowManageModal(false)}
        event={selectedEvent}
        onRefresh={fetchEvents}
      />
    </div>
  );
}

export default Dashboard;
