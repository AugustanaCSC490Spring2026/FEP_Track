import { useEffect, useState } from "react";
import { database } from "../firebase-config";
import {
  collection,
  addDoc,
  query,
  // eslint-disable-next-line no-unused-vars
  where,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  orderBy,
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
import Select from 'react-select';

function Dashboard({ user }) {
  const [validated, setValidated] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingEvent, setEditingEvent] = useState(null);

  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [supervisor, setSupervisor] = useState("");
  const [location, setLocation] = useState("");
  const [extraInfo, setExtraInfo] = useState("");
  const [studentCap, setStudentCap] = useState(999);
  const [date, setDate] = useState("");
  const [students, setStudents] = useState([]);
  const [filter, setFilter] = useState("All");
  const [searchTitle, setSearchTitle] = useState("");
  const [filterBuilding, setFilterBuilding] = useState("All");
  const [filterSupervisor, setFilterSupervisor] = useState("All");
  const [filterAvailability, setFilterAvailability] = useState("All");

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmingEvent, setConfirmingEvent] = useState(null);
  const [confirmingStudents, setConfirmingStudents] = useState({});

  const [currentTab, setCurrentTab] = useState("Upcoming");

  const [showManageModal, setShowManageModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [departmentList, setDepartmentList] = useState([]);
  const [selectedDept, setSelectedDept] = useState(null);

  const collectionMap = {
    Upcoming: "upcoming_events",
    "Pending Approval": "pending_events",
    Completed: "completed_events",
  };
  const tabNames = Object.keys(collectionMap);

  const fetchEvents = async () => {
    setLoading(true);
    const collectionName = collectionMap[currentTab];
    const q = query(
        collection(database, collectionName),
        orderBy("createdAt", "desc")
    );

    try {
      const snap = await getDocs(q);
      const fetchedEvents = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setEvents(fetchedEvents);
    } catch (error) {
      console.error("Error fetching:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();

    const fetchDepartments = async () => {
      const querySnapshot = await getDocs(collection(database, "department_titles"));
      const depts = querySnapshot.docs.map(doc => ({
        value: doc.data().title,
        label: doc.data().title
      }));
      setDepartmentList(depts.sort((a, b) => a.label.localeCompare(b.label)));
    };
    fetchDepartments();
  }, [currentTab]);

  const resetForm = () => {
    setTitle("");
    setStartTime("");
    setEndTime("");
    setSupervisor(user.displayName);
    setLocation("");
    setSelectedDept(null);
    setExtraInfo("");
    setStudentCap(1);
    setDate("");
    setValidated(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.checkValidity() || !selectedDept) {
      e.stopPropagation();
      setValidated(true);

      return;
    }
    const eventData = {
      title,
      startTime,
      endTime,
      time: `${startTime} – ${endTime}`,
      supervisor: supervisor || user.displayName,
      extra_details: extraInfo || "TBD",
      createdBy: user.displayName,
      createdByID: user,
      location: location || "TBD",
      department: selectedDept.value,
      student_cap: studentCap,
      date: date || "TBD",
      students,
      createdAt: new Date(),
    };

    try {
      if (editingEvent) {
        await updateDoc(doc(database, "upcoming_events", editingEvent.id), eventData);
      } else {
        await addDoc(collection(database, "upcoming_events"), eventData);
      }

      await fetchEvents();

      resetForm();
      setEditingEvent(null);
      setShowForm(false);
    } catch (err) {
      console.error("Save failed", err);
    }

    resetForm();
    setEditingEvent(null);
    setShowForm(false);
  };

  const deleteEvent = async (id) => {
    if (window.confirm("Are you sure you want to delete this job?")) {
      await deleteDoc(doc(database, "upcoming_events", id));
      setEvents((prev) => prev.filter((e) => e.id !== id));
      setSelectedEvent(null);
    }
  };

  const handleEditEvent = (event) => {
    setEditingEvent(event);
    setStudents(event.students || []);
    setTitle(event.title);
    setLocation(event.location);
    setSupervisor(event.supervisor);
    setDate(event.date);
    setStudentCap(event.student_cap);
    setExtraInfo(event.extra_details);
    setStartTime(event.startTime);
    setEndTime(event.endTime);
    if (event.department) {
      setSelectedDept({ value: event.department, label: event.department });
    } else {
      setSelectedDept(null);
    }

    setShowForm(true);
  };

  const filteredEvents = events.filter((event) => {
    const matchesTitle = event.title
      .toLowerCase()
      .includes(searchTitle.toLowerCase());
    const matchesBuilding =
      filterBuilding === "All" || event.location === filterBuilding;
    const matchesSupervisor =
      filterSupervisor === "All" || event.supervisor === filterSupervisor;
    const studentCount = event.students?.length || 0;
    const isFull = studentCount >= event.student_cap;

    const matchesAvailability =
      filterAvailability === "All" ||
      (filterAvailability === "Full" && isFull) ||
      (filterAvailability === "Available" && !isFull);

    return (
      matchesTitle &&
      matchesBuilding &&
      matchesSupervisor &&
      matchesAvailability
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
        const studentTimeOut = formatFirebaseTime(studentAttendance.timeOut);
        const timeDifference = calculateTimeDifference(
          studentTimeIn,
          studentTimeOut,
        );

        initializedStudents[studentId] = {
          id: studentId,
          hours: timeDifference.hours ?? defaultTime.hours,
          minutes: timeDifference.minutes ?? defaultTime.minutes,
          status: "Present",
          timeIn: studentTimeIn,
          timeOut: studentTimeOut,
        };
      } else {
        initializedStudents[studentId] = {
          id: studentId,
          hours: defaultTime.hours,
          minutes: defaultTime.minutes,
          status: "No Record",
          timeIn: "--:--:--",
          timeOut: "--:--:--",
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

  const StudentName = ({ studentId, db }) => {
    const [name, setName] = useState("Loading...");
    console.log("StudentID:" + studentId);
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
              variant={showForm ? "outline-secondary" : "primary"}
              className="w-100 py-2 mb-3 shadow-sm"
              onClick={() => {
                setEditingEvent(null);
                setShowForm(!showForm);
                resetForm();
              }}
            >
              {showForm ? "✕ Cancel" : "+ Create New Job"}
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
                  Active Jobs: <strong>{events.length}</strong>
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

                {/* Building Filter */}
                <Form.Group className="mb-3">
                  <Form.Label
                    className="small text-uppercase"
                    style={{
                      color: "var(--color-text-secondary)",
                      fontSize: "0.7rem",
                    }}
                  >
                    Building
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
                    <option value="All">All Buildings</option>
                    {[...new Set(events.map((e) => e.location))].map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
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
                    onEdit={handleEditEvent}
                    onManage={handleOpenManage}
                    onRefresh={fetchEvents}
                    onCallBack={deleteEvent}
                    user={user}
                  />
                ))
              )}
            </div>
          )}
        </Col>
      </Row>

      <Modal
        show={showForm}
        onHide={() => setShowForm(false)}
        centered
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>{editingEvent ? "Edit Event" : "New Event"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form noValidate validated={validated} onSubmit={handleSubmit}>
            <Row className="mb-3">
              <Form.Group as={Col} md="6">
                <Form.Label>Job Title</Form.Label>
                <Form.Control required type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
              </Form.Group>
              <Form.Group as={Col} md="3">
                <Form.Label>Start Time</Form.Label>
                <Form.Control required type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </Form.Group>
              <Form.Group as={Col} md="3">
                <Form.Label>End Time</Form.Label>
                <Form.Control required type="time" min={startTime} value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </Form.Group>
            </Row>
            <Row className="mb-3">
              <Form.Group as={Col} md="6">
                <Form.Label>Supervisor</Form.Label>
                <Form.Control required type="text" value={supervisor} onChange={(e) => setSupervisor(e.target.value)} />
              </Form.Group>
              <Form.Group as={Col} md="6">
                <Form.Label>Location</Form.Label>
                <Form.Control required type="text" value={location} onChange={(e) => setLocation(e.target.value)} />
              </Form.Group>
            </Row>
            <Form.Group as={Col} md="12" className="mb-3">
              <Form.Label>Department</Form.Label>
              <Select
                  options={departmentList}
                  value={selectedDept}
                  onChange={(selectedOption) => setSelectedDept(selectedOption)}
                  placeholder="Select Department..."
                  isSearchable={true}
                  styles={{
                    control: (base, state) => ({
                      ...base,
                      borderColor: (validated && !selectedDept)
                          ? "#dc3545"
                          : (validated && selectedDept)
                              ? "#198754"
                              : base.borderColor,
                      boxShadow: state.isFocused
                          ? (validated && selectedDept ? "0 0 0 0.25rem rgba(25, 135, 84, 0.25)" : base.boxShadow)
                          : "none",
                      '&:hover': {
                        borderColor: (validated && !selectedDept)
                            ? "#dc3545"
                            : (validated && selectedDept)
                                ? "#198754"
                                : base.borderColor,
                      }
                    })
                  }}
              />
            </Form.Group>
            <Row className="mb-3">
              <Form.Group as={Col} md="6">
                <Form.Label>Date</Form.Label>
                <Form.Control required type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </Form.Group>
              <Form.Group as={Col} md="6">
                <Form.Label>Student Capacity</Form.Label>
                <Form.Control required type="number" min={1} value={studentCap} onChange={(e) => setStudentCap(e.target.value)} />
              </Form.Group>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Extra Information</Form.Label>
              <Form.Control as="textarea" rows={2} value={extraInfo} onChange={(e) => setExtraInfo(e.target.value)} />
            </Form.Group>
            <Button type="submit" variant="success">{editingEvent ? "Update Job" : "Create Job"}</Button>
          </Form>
        </Modal.Body>
      </Modal>

      <Modal
        show={showConfirmModal}
        onHide={() => setShowConfirmModal(false)}
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
                    </div>
                  </Form.Group>
                ))
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowConfirmModal(false)}
          >
            Cancel
          </Button>
          <Button variant="success" onClick={executeConfirmJob}>
            Confirm & Complete Job
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
