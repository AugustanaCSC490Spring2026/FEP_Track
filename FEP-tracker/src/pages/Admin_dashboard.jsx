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
  setDoc,
} from "firebase/firestore";
/* ------- */

import Button from "react-bootstrap/Button";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import InputGroup from "react-bootstrap/InputGroup";
import Row from "react-bootstrap/Row";

function Dashboard({ user }) {
   
  const [validated, setValidated] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [supervisor, setSupervisor] = useState("");
  const [location, setLocation] = useState("");
  const [extraInfo, setExtraInfo] = useState("");
  const [events, setEvents] = useState([]);

  const saveEvents = async (updatedEvents) => {
    const userRef = doc(database, "users", user.uid);
    await setDoc(userRef, { events: updatedEvents }, { merge: true });
  };

  const handleSubmit = (e) => {
    const form = e.currentTarget;
    if (form.checkValidity() === false) {
      e.preventDefault();
      e.stopPropagation();
      setValidated(true);
      return;
    }
    setValidated(true);
    addEvent({ title, time, supervisor, location, extra_details: extraInfo });
    setShowForm(false);
  };

  const addEvent = async (event) => {
    // Add to Firestore
    //this is the model am following to add an event to the database, you can modify the fields as needed
    await addDoc(collection(database, "events"), {
      title: event.title,
      time: event.time,
      supervisor: event.supervisor || "TBD",
      extra_details: event.extra_details || "TBD",
      createdBy: user.uid,
      location: event.location || "TBD",
    });
  };

  const deleteEvent = async (id) => {
    await deleteDoc(doc(database, "events", id));
    setEvents(events.filter((e) => e.id !== id));
  };

  useEffect(() => {
    const loadEvents = async () => {
      const q = query(
        collection(database, "events"),
        where("createdBy", "==", user.uid),
      );
      const snap = await getDocs(q);
      const loaded = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setEvents(loaded);
    };
    loadEvents();
  }, [user.uid]);

  return (
    <div
      style={{
        maxWidth: "600px",
        margin: "auto",
        textAlign: "center",
        fontFamily: "sans-serif",
        paddingTop: "30px",
      }}
    >
      <h1 style={{ marginBottom: "20px" }}>Welcome, {user.displayName}</h1>
      {events.map((event) => (
        <div
          key={event.id}
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            padding: "16px 20px",
            marginBottom: "14px",
            background: "#f8fafc",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}
        >
          <div
            style={{ fontWeight: "700", fontSize: "16px", marginBottom: "6px" }}
          >
            {event.title}
          </div>
          <div style={{ color: "#555", fontSize: "14px", marginBottom: "3px" }}>
            📍 {event.location}
          </div>
          <div style={{ color: "#555", fontSize: "14px", marginBottom: "3px" }}>
            🕒 {event.time}
          </div>
          <div style={{ color: "#555", fontSize: "14px" }}>
            👤 {event.supervisor}
          </div>
        </div>
      ))}
      <button onClick={() => setShowForm(!showForm)}>
        {showForm ? "Cancel" : "Add Event"}
      </button>

      {showForm && (
        <Form noValidate validated={validated} onSubmit={handleSubmit}>
          <Row className="mb-3">
            <Form.Group as={Col} md="6" controlId="validationCustom01">
              <Form.Label>Job Title</Form.Label>
              <Form.Control
                required
                type="text"
                placeholder="Job Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <Form.Control.Feedback>Looks good!</Form.Control.Feedback>
            </Form.Group>
            <Form.Group as={Col} md="6" controlId="validationCustom02">
              <Form.Label>Time</Form.Label>
              <Form.Control
                required
                type="text"
                placeholder="Time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
              <Form.Control.Feedback>Looks good!</Form.Control.Feedback>
            </Form.Group>
          </Row>
          <Row className="mb-3">
            <Form.Group as={Col} md="6" controlId="validationCustom03">
              <Form.Label>Supervisor</Form.Label>
              <Form.Control
                type="text"
                placeholder="Supervisor"
                required
                value={supervisor}
                onChange={(e) => setSupervisor(e.target.value)}
              />
              <Form.Control.Feedback type="invalid">
                Please enter a supervisor.
              </Form.Control.Feedback>
            </Form.Group>
            <Form.Group as={Col} md="6" controlId="validationCustom04">
              <Form.Label>Location</Form.Label>
              <Form.Control
                type="text"
                placeholder="Location"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
              <Form.Control.Feedback type="invalid">
                Please provide a valid location.
              </Form.Control.Feedback>
            </Form.Group>
          </Row>
          <Row className="mb-3">
            <Form.Group controlId="validationCustom05">
              <Form.Label>Extra Information</Form.Label>
              <Form.Control
                type="text"
                placeholder="Extra Information"
                required
                value={extraInfo}
                onChange={(e) => setExtraInfo(e.target.value)}
              />
              <Form.Control.Feedback type="invalid">
                Please enter any extra information.
              </Form.Control.Feedback>
            </Form.Group>
          </Row>
          <Button type="submit">Submit form</Button>
        </Form>
      )}
    </div>
  );
}

export default Dashboard;