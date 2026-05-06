import React, {
  useImperativeHandle,
  useState,
  forwardRef,
  useEffect,
} from "react";
import { Modal, Form, Row, Col, Button } from "react-bootstrap";
import Select from "react-select";
import { database } from "../firebase-config";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";
const JobForms = forwardRef(function JobForms(
  { onOpenChange, editingEvent, setEditingEvent, fetchEvents, user },
  ref,
) {
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [supervisor, setSupervisor] = useState("");
  const [location, setLocation] = useState("");
  const [extraInfo, setExtraInfo] = useState("");
  const [studentCap, setStudentCap] = useState(999);
  const [date, setDate] = useState("");
  const [validated, setValidated] = useState(false);
  const [departmentList, setDepartmentList] = useState([]);
  const [selectedDept, setSelectedDept] = useState(null);
  const [students, setStudents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const setShowFormWithCallback = (val) => {
    setShowForm(val);
    onOpenChange?.(val);
  };
  useEffect(() => {
    const fetchDepartments = async () => {
      const querySnapshot = await getDocs(
        collection(database, "department_titles"),
      );
      const depts = querySnapshot.docs.map((doc) => ({
        value: doc.data().title,
        label: doc.data().title,
      }));
      setDepartmentList(depts.sort((a, b) => a.label.localeCompare(b.label)));
    };
    fetchDepartments();
  }, []);

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
        await updateDoc(
          doc(database, "upcoming_events", editingEvent.id),
          eventData,
        );
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
    setEditingEvent(null);
    setShowForm(false);
  };
  useImperativeHandle(ref, () => ({
    resetForm,
    handleEditEvent,
    openForm: () => setShowFormWithCallback(true),
    closeForm: () => setShowFormWithCallback(false),
  }));

  return (
    <Modal show={showForm} onHide={() => setShowFormWithCallback(false)} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>{editingEvent ? "Edit Event" : "New Event"}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form noValidate validated={validated} onSubmit={handleSubmit}>
          <Row className="mb-3">
            <Form.Group as={Col} md="6">
              <Form.Label>Job Title</Form.Label>
              <Form.Control
                required
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </Form.Group>
            <Form.Group as={Col} md="3">
              <Form.Label>Start Time</Form.Label>
              <Form.Control
                required
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </Form.Group>
            <Form.Group as={Col} md="3">
              <Form.Label>End Time</Form.Label>
              <Form.Control
                required
                type="time"
                min={startTime}
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </Form.Group>
          </Row>
          <Row className="mb-3">
            <Form.Group as={Col} md="6">
              <Form.Label>Supervisor</Form.Label>
              <Form.Control
                required
                type="text"
                value={supervisor}
                onChange={(e) => setSupervisor(e.target.value)}
              />
            </Form.Group>
            <Form.Group as={Col} md="6">
              <Form.Label>Location</Form.Label>
              <Form.Control
                required
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
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
                  borderColor:
                    validated && !selectedDept
                      ? "#dc3545"
                      : validated && selectedDept
                        ? "#198754"
                        : base.borderColor,
                  boxShadow: state.isFocused
                    ? validated && selectedDept
                      ? "0 0 0 0.25rem rgba(25, 135, 84, 0.25)"
                      : base.boxShadow
                    : "none",
                  "&:hover": {
                    borderColor:
                      validated && !selectedDept
                        ? "#dc3545"
                        : validated && selectedDept
                          ? "#198754"
                          : base.borderColor,
                  },
                }),
              }}
            />
          </Form.Group>
          <Row className="mb-3">
            <Form.Group as={Col} md="6">
              <Form.Label>Date</Form.Label>
              <Form.Control
                required
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </Form.Group>
            <Form.Group as={Col} md="6">
              <Form.Label>Student Capacity</Form.Label>
              <Form.Control
                required
                type="number"
                min={1}
                value={studentCap}
                onChange={(e) => setStudentCap(e.target.value)}
              />
            </Form.Group>
          </Row>
          <Form.Group className="mb-3">
            <Form.Label>Extra Information</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              value={extraInfo}
              onChange={(e) => setExtraInfo(e.target.value)}
            />
          </Form.Group>
          <Button type="submit" variant="success">
            {editingEvent ? "Update Job" : "Create Job"}
          </Button>
        </Form>
      </Modal.Body>
    </Modal>
  );
});
export default JobForms;
