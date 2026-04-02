import { useEffect, useState } from "react";
import { database } from "../firebase-config";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  addDoc
} from "firebase/firestore";
import Papa from "papaparse"
import Table from "react-bootstrap/Table";
import Button from "react-bootstrap/Button";
import Badge from "react-bootstrap/Badge";
import Form from "react-bootstrap/Form"

function Students() {
  const handleCSVUpload = (e) => {
    const file = e.target.files[0];

    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {

        console.log("Parsed CSV:", results.data);

        const newStudents = [];

        for (const row of results.data) {
          if (!row.email) continue;

          const newStudent = {
            name: row.name || "N/A",
            email: row.email,
            role: "pending"
          };

          try {
            const docRef = await addDoc(collection(database, "users"), newStudent);

            newStudents.push({
              id: docRef.id,
              ...newStudent
            });

          } catch (err) {
            console.error("Error adding student:", err);
          }
        }

        // update UI immediately
        setStudents(prev => [...prev, ...newStudents]);
      }
    });
  };
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStudents = async () => {
      const snap = await getDocs(collection(database, "users"));
      const data = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setStudents(data);
      setLoading(false);
    };
    loadStudents();
  }, []);

  const toggleApproval = async (student) => {
    const newRole = student.role === "student" ? "pending" : "student";
    await updateDoc(doc(database, "users", student.id), {
      role: newRole
    });
    setStudents(prev =>
      prev.map(s =>
        s.id === student.id ? { ...s, role: newRole } : s
      )
    );
  };

  if (loading) return <p className="text-center mt-4">Loading students...</p>;

  return (
    
    <div style={{ maxWidth: "900px", margin: "auto", padding: "20px" }}>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <Button variant="primary" onClick={handleCSVUpload} >Import Many Students (CSV)</Button>
        </div>
      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {students.map(student => (
            <tr key={student.id}>
              <td>{student.name || "N/A"}</td>
              <td>{student.email || "N/A"}</td>
              <td>
                <Badge bg={student.role === "staff" ? "primary" : "secondary"}>
                  {student.role === "staff" ? "Staff" : "Student"}
                </Badge>
              </td>
              <td>
                {student.role !== "staff" && (
                <Badge bg={student.role === "student" ? "success" : "secondary"}>
                  {student.role === "student" ? "Approved" : "Pending"}
                </Badge>
                )}
              </td>
              <td>
                {student.role !== "staff" && (
                  <Button
                    variant={student.role === "student" ? "danger" : "success"}
                    size="sm"
                    onClick={() => toggleApproval(student)}
                  >
                    {student.role === "student" ? "Revoke Access" : "Approve"}
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}

export default Students;