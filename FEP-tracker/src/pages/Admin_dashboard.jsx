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

  const [currentTab, setCurrentTab] = useState("Upcoming"); 
  
  const collectionMap = {
    "Upcoming": "upcoming_events",
    "Pending Approval": "pending_events",
    "Completed": "completed_events",
  };
  const tabNames = Object.keys(collectionMap);

  // Load events
  useEffect(() => {
    const load = async () => {
      setLoading(true); // Start loading when tab changes
      
      // 1. DYNAMICALLY GET THE COLLECTION NAME
      const collectionName = collectionMap[currentTab]; // Use the mapping defined above
      
      // 2. QUERY THAT SPECIFIC COLLECTION
      // Note: This requires an index on 'createdAt' (Descending) in Firestore for THIS collection.
      const q = query(
        collection(database, collectionName),
        orderBy("createdAt", "desc")
      );

      try {
        const snap = await getDocs(q);
        const fetchedEvents = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setEvents(fetchedEvents);
      } catch (error) {
        // It's good practice to add error handling here
        console.error("Error fetching events from collection:", collectionName, error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user.uid, currentTab]);

  const resetForm = () => {
    setTitle("");
    setStartTime("");
    setEndTime("");
    setSupervisor("");
    setLocation("");
    setExtraInfo("");
    setStudentCap(1);
    setDate("");
    setValidated(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.checkValidity()) {
      e.stopPropagation();
      setValidated(true);
      
      return;
    }
    const eventData = {
      title,
      startTime,
      endTime,
      time: `${startTime} – ${endTime}`,
      supervisor: supervisor || "TBD",
      extra_details: extraInfo || "TBD",
      createdBy: user.displayName,
      location: location || "TBD",
      student_cap: studentCap,
      date: date || "TBD",
      students,
      createdAt: new Date(),
    };

    if (editingEvent) {
      await updateDoc(
        doc(database, "upcoming_events", editingEvent.id),
        eventData
      );
  
      setEvents((prev) =>
        prev.map((ev) =>
          ev.id === editingEvent.id ? { ...ev, ...eventData } : ev
        )
      );
  
    } else { 
      const newDoc = await addDoc(collection(database, "upcoming_events"), eventData);

      setEvents((prev) => [
        ...prev,
        {
          id: newDoc.id,
          title,
          startTime,
          endTime,
          time: `${startTime} – ${endTime}`,
          supervisor: supervisor || "TBD",
          extra_details: extraInfo || "TBD",
          location: location || "TBD",
          student_cap: studentCap,
          date: date || "TBD",
          createdAt: new Date(),
          students: [],
        },
      ]);
    }

    resetForm();
    setEditingEvent(null);
    setShowForm(false);
  };

  
  const deleteEvent = async (id) => {
    await deleteDoc(doc(database, "upcoming_events", id));
    setEvents((prev) => prev.filter((e) => e.id !== id));
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
    setShowForm(true);
  };

  const filteredEvents = events.filter((event) => {
    const matchesTitle = event.title.toLowerCase().includes(searchTitle.toLowerCase());
    const matchesBuilding = filterBuilding === "All" || event.location === filterBuilding;
    const matchesSupervisor = filterSupervisor === "All" || event.supervisor === filterSupervisor;
    const studentCount = event.students?.length || 0;
    const isFull = studentCount >= event.student_cap;

    const matchesAvailability = 
      filterAvailability === "All" || 
      (filterAvailability === "Full" && isFull) || 
      (filterAvailability === "Available" && !isFull);
  
    return matchesTitle && matchesBuilding && matchesSupervisor && matchesAvailability;
  });

  const handleConfirmJob = async (event) => {
    try {
      const completedData = {
        ...event,
        status: "Verified",
        completedAt: new Date()
      };
      // Remove the ID so Firestore generates a new one in the new collection
      delete completedData.id;

      // 1. Add to completed_events
      await addDoc(collection(database, "completed_events"), completedData);
      // 2. Remove from pending_events
      await deleteDoc(doc(database, "pending_events", event.id));

      // 3. Update UI
      setEvents((prev) => prev.filter((e) => e.id !== event.id));
      alert("Job confirmed and moved to Completed!");
    } catch (error) {
      console.error("Error confirming job:", error);
    }
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
              <h2 style={{ color: "var(--color-primary-blue-light)", fontWeight: "700", marginBottom: "5px" }}>
                Admin Dashboard
              </h2>
              <p style={{ color: "var(--color-text-secondary)", fontSize: "0.95rem", lineHeight: "1.4" }}>
                Welcome back, <strong>{user.displayName || "Admin"}</strong>. 
                Manage, track, and schedule upcoming student jobs from this panel.
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
              {showForm ? "✕ Cancel" : "+ Create New Event"}
            </Button>

            {/* Filter Box */}
            <div className="p-3 rounded shadow-sm" style={{ backgroundColor: "var(--color-bg-darker)", border: "1px solid #334155" }}>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <small style={{ color: "var(--color-text-secondary)" }}>
                  Active Jobs: <strong>{events.length}</strong>
                </small>
                <Button 
                  variant="link" 
                  size="sm" 
                  className="p-0 text-decoration-none" 
                  style={{ color: "var(--color-accent-yellow)", fontSize: "0.75rem" }}
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
                  <Form.Label className="small text-uppercase" style={{ color: "var(--color-text-secondary)", fontSize: "0.7rem" }}>Search Title</Form.Label>
                  <Form.Control 
                    size="sm"
                    type="text" 
                    placeholder="Type to search..." 
                    value={searchTitle}
                    onChange={(e) => setSearchTitle(e.target.value)}
                    style={{ backgroundColor: "var(--color-bg-card)", color: "white", border: "1px solid #475569" }}
                  />
                </Form.Group>

                {/* Building Filter */}
                <Form.Group className="mb-3">
                  <Form.Label className="small text-uppercase" style={{ color: "var(--color-text-secondary)", fontSize: "0.7rem" }}>Building</Form.Label>
                  <Form.Select 
                    size="sm" 
                    value={filterBuilding}
                    onChange={(e) => setFilterBuilding(e.target.value)}
                    style={{ backgroundColor: "var(--color-bg-card)", color: "white", border: "1px solid #475569" }}
                  >
                    <option value="All">All Buildings</option>
                    {[...new Set(events.map(e => e.location))].map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </Form.Select>
                </Form.Group>

                {/* Supervisor Filter */}
                <Form.Group className="mb-3">
                  <Form.Label className="small text-uppercase" style={{ color: "var(--color-text-secondary)", fontSize: "0.7rem" }}>Supervisor</Form.Label>
                  <Form.Select 
                    size="sm" 
                    value={filterSupervisor}
                    onChange={(e) => setFilterSupervisor(e.target.value)}
                    style={{ backgroundColor: "var(--color-bg-card)", color: "white", border: "1px solid #475569" }}
                  >
                    <option value="All">All Supervisors</option>
                    {[...new Set(events.map(e => e.supervisor))].map(sup => (
                      <option key={sup} value={sup}>{sup}</option>
                    ))}
                  </Form.Select>
                </Form.Group>

                {/* Availability Toggle */}
                <Form.Group>
                  <Form.Label className="small text-uppercase" style={{ color: "var(--color-text-secondary)", fontSize: "0.7rem" }}>Availability</Form.Label>
                  <div className="d-flex gap-2">
                    {["All", "Available", "Full"].map((status) => (
                      <Button
                        key={status}
                        size="sm"
                        variant={filterAvailability === status ? "primary" : "outline-secondary"}
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
        <Col lg={8} md={7}>
          <div className="mb-4 d-flex justify-content-between align-items-center">
            <ButtonGroup>
              {tabNames.map((tab) => (
                <Button
                  key={tab}
                  // Highlight the active tab
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
            // Update loading text
            <p className="text-center text-muted">Loading {currentTab.toLowerCase()} jobs...</p>
          ) : (
            <div className="event-scroll-container">
              {filteredEvents.length === 0 ? (
                // Update empty state text
                <div className="text-center py-5 rounded" style={{ backgroundColor: "var(--color-bg-darker)", border: "1px solid #334155" }}>
                  <p style={{ color: "var(--color-text-secondary)" }}>No {currentTab.toLowerCase()} jobs match your filters.</p>
                </div>
              ) : (
                filteredEvents.map((event) => (
                    <EventCard
                        key={event.id}
                        event={event}
                        status={currentTab} // Pass "Upcoming", "Pending Approval", or "Completed"
                        onConfirm={handleConfirmJob}
                        onEdit={handleEditEvent}
                        onCallBack={async (id) => {
                          const collectionName = collectionMap[currentTab];
                          await deleteDoc(doc(database, collectionName, id));
                          setEvents((prev) => prev.filter((e) => e.id !== id));
                        }}
                        user={user}
                    />
                ))
              )}
            </div>
          )}
        </Col>
      </Row>


      <Modal show={showForm} onHide={() => setShowForm(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editingEvent ? "Edit Event" : "New Event"}</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Card className="p-3 shadow-sm">
            <Card.Title className="mb-3">New Event</Card.Title>
            <Form noValidate validated={validated} onSubmit={handleSubmit}>
              <Row className="mb-3">
                <Form.Group as={Col} md="6" controlId="fTitle">
                  <Form.Label>Job Title</Form.Label>
                  <Form.Control
                    required
                    type="text"
                    placeholder="Job Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                  <Form.Control.Feedback>Looks good!</Form.Control.Feedback>
                  <Form.Control.Feedback type="invalid">
                    Required.
                  </Form.Control.Feedback>
                </Form.Group>
                <Form.Group as={Col} md="3" controlId="fStartTime">
                  <Form.Label>Start Time</Form.Label>
                  <Form.Control
                    required
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                  <Form.Control.Feedback type="invalid">
                    Required.
                  </Form.Control.Feedback>
                </Form.Group>
                <Form.Group as={Col} md="3" controlId="fEndTime">
                  <Form.Label>End Time</Form.Label>
                  <Form.Control
                    required
                    type="time"
                    min={startTime}
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                  <Form.Control.Feedback type="invalid">
                    Required.
                  </Form.Control.Feedback>
                </Form.Group>
              </Row>
              <Row className="mb-3">
                <Form.Group as={Col} md="6" controlId="fSupervisor">
                  <Form.Label>Supervisor</Form.Label>
                  <Form.Control
                    required
                    type="text"
                    placeholder="Supervisor"
                    value={supervisor}
                    onChange={(e) => setSupervisor(e.target.value)}
                  />
                  <Form.Control.Feedback type="invalid">
                    Required.
                  </Form.Control.Feedback>
                </Form.Group>
                <Form.Group as={Col} md="6" controlId="fLocation">
                  <Form.Label>Location</Form.Label>
                  <Form.Control
                    required
                    type="text"
                    placeholder="Location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                  <Form.Control.Feedback type="invalid">
                    Required.
                  </Form.Control.Feedback>
                </Form.Group>
                <Form.Group as={Col} md="6" controlId="fDate">
                  <Form.Label>Date</Form.Label>
                  <Form.Control
                    required
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                  <Form.Control.Feedback type="invalid">
                    Required.
                  </Form.Control.Feedback>
                </Form.Group>
                <Form.Group as={Col} md="6" controlId="fCap">
                  <Form.Label>Student Capacity</Form.Label>
                  <Form.Control
                    required
                    type="number"
                    min={1}
                    placeholder="Student Capacity"
                    value={studentCap}
                    onChange={(e) => setStudentCap(e.target.value)}
                  />
                  <Form.Control.Feedback type="invalid">
                    Required.
                  </Form.Control.Feedback>
                </Form.Group>
              </Row>
              <Row className="mb-3">
                <Form.Group controlId="fExtra">
                  <Form.Label>Extra Information</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    placeholder="Any extra details..."
                    value={extraInfo}
                    onChange={(e) => setExtraInfo(e.target.value)}
                  />
                </Form.Group>
              </Row>
              <Button type="submit" variant="success">
                {editingEvent ? "Update Event" : "Create Event"}
              </Button>
            </Form>
          </Card>
        </Modal.Body>
      </Modal>
    </div>
  );
}

export default Dashboard;
