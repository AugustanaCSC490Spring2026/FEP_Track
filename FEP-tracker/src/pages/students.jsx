import { useEffect, useState, useRef } from "react";
import { database } from "../firebase-config";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  addDoc,
  deleteDoc,
  serverTimestamp
} from "firebase/firestore";
import Papa from "papaparse";
import Table from "react-bootstrap/Table";
import Button from "react-bootstrap/Button";
import Badge from "react-bootstrap/Badge";
import Form from "react-bootstrap/Form";

function Students({ user }) {
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("pending");
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  const fileInputRef = useRef(null);

  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!email) return;

    const newUser = {
      createdAt: serverTimestamp(),
      name: name || "N/A",
      email,
      role
    };

    try {
      const docRef = await addDoc(collection(database, "users"), newUser);
      setStudents(prev => [...prev, { id: docRef.id, ...newUser }]);
      setName("");
      setEmail("");
      setRole("pending");
      setShowForm(false);
    } catch (err) {
      console.error("Error adding user:", err);
    }
  };

  const handleCSVUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const newStudents = [];
        for (const row of results.data) {
          if (!row.email) continue;
          const newStudent = {
            createdAt: serverTimestamp(),
            name: row.name || "N/A",
            email: row.email,
            role: "student",
          };
          try {
            const docRef = await addDoc(collection(database, "users"), newStudent);
            newStudents.push({ id: docRef.id, ...newStudent });
          } catch (err) {
            console.error("Error adding student:", err);
          }
        }
        setStudents(prev => [...prev, ...newStudents]);
        setToastMessage(`${newStudents.length} students added successfully!`);
        setShowToast(true);
      }
    });
  };

  useEffect(() => {
    const loadStudents = async () => {
      try {
        const snap = await getDocs(collection(database, "users"));
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setStudents(data);
      } catch (err) {
        console.error("Error loading students:", err);
      } finally {
        setLoading(false);
      }
    };
    loadStudents();
  }, []);

  const toggleApproval = async (student) => {
    const newRole = student.role === "student" ? "pending" : "student";
    await updateDoc(doc(database, "users", student.id), { role: newRole });
    setStudents(prev =>
      prev.map(s => s.id === student.id ? { ...s, role: newRole } : s)
    );
  };

  const handleDelete = async (student) => {
    if (!window.confirm(`Are you sure you want to delete ${student.name}?`)) return;
    try {
      await deleteDoc(doc(database, "users", student.id));
      setStudents(prev => prev.filter(s => s.id !== student.id));
    } catch (err) {
      console.error("Error deleting user:", err);
    }
  };

  if (loading) return <p className="text-center mt-4">Loading students...</p>;

  return (
    <div style={{ maxWidth: "900px", margin: "auto", padding: "20px" }}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <Button variant="primary" onClick={() => fileInputRef.current && fileInputRef.current.click()}>
          Import Many Students (CSV)
        </Button>
        <input
          type="file"
          accept=".csv"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handleCSVUpload}
        />
        <Button variant="primary" onClick={() => setShowForm(true)}>
          Create New Student
        </Button>
      </div>

      {showForm && (
        <div className="mb-4">
          <Form onSubmit={handleAddStudent}>
            <div className="d-flex gap-2 flex-wrap">
              <Form.Control
                type="text"
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <Form.Control
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Form.Select
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="pending">Pending (Student)</option>
                <option value="student">Approved Student</option>
                <option value="staff">Staff</option>
              </Form.Select>
              <Button type="submit" variant="success">Create</Button>
              <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </Form>
        </div>
      )}

      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Action</th>
            <th>Delete</th>
          </tr>
        </thead>
        <tbody>
          {students.map(student => (
            <tr key={student.id}>
              <td>{student.name || "N/A"}</td>
              <td>{student.email || "N/A"}</td>
              <td>
                <Badge bg={
                  student.role === "admin" ? "danger" :
                  student.role === "staff" ? "primary" : "secondary"
                }>
                  {student.role === "admin" ? "Admin" :
                   student.role === "staff" ? "Staff" : "Student"}
                </Badge>
              </td>
              <td>
                {student.role !== "staff" && student.role !== "admin" && (
                  <Badge bg={student.role === "student" ? "success" : "secondary"}>
                    {student.role === "student" ? "Approved" : "Pending"}
                  </Badge>
                )}
              </td>
              <td>
                {student.role !== "staff" && student.role !== "admin" && (
                  <Button
                    variant={student.role === "student" ? "danger" : "success"}
                    size="sm"
                    onClick={() => toggleApproval(student)}
                  >
                    {student.role === "student" ? "Revoke Access" : "Approve"}
                  </Button>
                )}
              </td>
              <td>
                {/* Prevent admin from deleting themselves */}
                {student.id !== user?.uid && (
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => handleDelete(student)}
                  >
                    Delete
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      {showToast && (
        <div style={{ position: "fixed", top: 65, left: 15 }}>
          <div
            className="toast show"
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
            style={{ minWidth: 100, maxWidth: 215 }}
          >
            <div className="toast-header">
              <strong className="me-auto">Upload Status</strong>
              <button
                type="button"
                className="btn-close"
                onClick={() => setShowToast(false)}
              />
            </div>
            <div className="toast-body" style={{ color: "black" }}>{toastMessage}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Students;