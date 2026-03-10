import { useEffect, useState } from "react";
import { database } from "../firebase-config";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore";
/* ------- */
import EventCard from "../components/event-card";
import Button from "react-bootstrap/Button";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import Card from "react-bootstrap/Card";
import Row from "react-bootstrap/Row";

function Dashboard({ user }) {
  const [validated, setValidated] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

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
      const q = query(
        collection(database, "events"),
        where("createdBy", "==", user.uid),
      );
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
    setStudentCap(999);
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
    const newDoc = await addDoc(collection(database, "events"), {
      title,
      time: `${startTime} – ${endTime}`,
      supervisor: supervisor || "TBD",
      extra_details: extraInfo || "TBD",
      createdBy: user.uid,
      location: location || "TBD",
      student_cap: studentCap,
      date: date || "TBD",
      students: [],
      createdAt: new Date(),
    });
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
      },
    ]);
    resetForm();
    setShowForm(false);
  };

  const deleteEvent = async (id) => {
    await deleteDoc(doc(database, "events", id));
    setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <div
      style={{
        maxWidth: "680px",
        margin: "auto",
        padding: "30px 16px",
        fontFamily: "sans-serif",
      }}
    >
      <h1 className="mb-4 text-center">Welcome, {user.displayName}</h1>

      <div className="text-center mt-3 mb-4">
        <Button
          variant={showForm ? "outline-secondary" : "primary"}
          onClick={() => {
            setShowForm(!showForm);
            resetForm();
          }}
        >
          {showForm ? "Cancel" : "+ Add Event"}
        </Button>
      </div>
      {loading ? (
        <p className="text-center text-muted">Loading events...</p>
      ) : events.length === 0 && !showForm ? (
        <p className="text-center text-muted">No events yet. Add one below!</p>
      ) : (
        events.map((event) => (
          <EventCard key={event.id} event={event} onCallBack={deleteEvent} user={user} />
        ))
      )}

      {showForm && (
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
              Submit
            </Button>
          </Form>
        </Card>
      )}
    </div>
  );
}

export default Dashboard;
