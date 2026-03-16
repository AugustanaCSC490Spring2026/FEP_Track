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
} from "firebase/firestore";
/* ------- */
import EventCard from "../components/event-card";
import Button from "react-bootstrap/Button";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import Card from "react-bootstrap/Card";
import Row from "react-bootstrap/Row";
import Modal from "react-bootstrap/Modal";


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

  // Load events
  useEffect(() => {
    const load = async () => {
      const q = query(collection(database, "upcoming_events"));
      const snap = await getDocs(q);
      setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    };
    load();
  }, [user.uid]);

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
      time: `${startTime} – ${endTime}`,
      supervisor: supervisor || "TBD",
      extra_details: extraInfo || "TBD",
      createdBy: user.displayName,
      location: location || "TBD",
      student_cap: studentCap,
      date: date || "TBD",
      students: [],
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
          time: `${startTime} – ${endTime}`,
          supervisor: supervisor || "TBD",
          extra_details: extraInfo || "TBD",
          location: location || "TBD",
          student_cap: studentCap,
          date: date || "TBD",
          createdAt: new Date(),
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
  
    setTitle(event.title);
    setLocation(event.location);
    setSupervisor(event.supervisor);
    setDate(event.date);
    setStudentCap(event.student_cap);
    setExtraInfo(event.extra_details);

    const [start, end] = event.time.split(" – ");
    setStartTime(start);
    setEndTime(end);
  
    setShowForm(true);
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
          <div className="sticky-top" style={{ top: "40px" }}>
            <h2 style={{ color: "var(--color-primary-blue-light)", fontWeight: "700" }}>
              Admin Dashboard
            </h2>
            <p style={{ color: "var(--color-text-secondary)", marginBottom: "2rem" }}>
              Welcome back, {user.displayName}. Use the button below to schedule new upcoming events.
            </p>
            
            <Button
              variant={showForm ? "outline-secondary" : "primary"}
              className="w-100 py-2 shadow-sm"
              onClick={() => {
                setEditingEvent(null);
                setShowForm(!showForm);
                resetForm();
              }}
              style={{
                backgroundColor: showForm ? "transparent" : "var(--color-primary-blue)",
                borderColor: "var(--color-primary-blue-light)"
              }}
            >
              {showForm ? "✕ Cancel" : "+ Create New Event"}
            </Button>
            
            <div className="mt-4 p-3 rounded" style={{ backgroundColor: "var(--color-bg-darker)", width: "100%" }}>
               <small style={{ color: "var(--color-text-secondary)" }}>
                 Active Events: <strong>{events.length}</strong>
               </small>
            </div>
          </div>
        </Col>

        {/* RIGHT COLUMN: The Scrollable List */}
        <Col lg={8} md={7}>
          <h4 className="mb-3" style={{ color: "var(--color-text-primary)" }}>Upcoming Jobs</h4>
          
          {loading ? (
            <p className="text-center text-muted">Loading events...</p>
          ) : (
            <div className="event-scroll-container">
              {events.length === 0 && !showForm ? (
                <div className="text-center py-5">
                   <p style={{ color: "var(--color-text-secondary)" }}>
                     No events found in the database.
                   </p>
                </div>
              ) : (
                events.map((event) => (
                  <EventCard 
                    key={event.id} 
                    event={event} 
                    onCallBack={deleteEvent} 
                    onEdit={handleEditEvent} 
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
