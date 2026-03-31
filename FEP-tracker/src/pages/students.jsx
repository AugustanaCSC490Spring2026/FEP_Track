import { useEffect, useState } from "react";
import { database } from "../firebase-config";
import {
  collection,
  getDocs,
  updateDoc,
  doc
} from "firebase/firestore";

import Table from "react-bootstrap/Table";
import Button from "react-bootstrap/Button";
import Badge from "react-bootstrap/Badge";

function Students() {
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

    const newRole =
      student.role === "student" ? "pending" : "student";

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
      <h2 className="mb-4 text-center">Manage Students</h2>

      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
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
                <Badge bg={student.role === "student" ? "success" : "secondary"}>
                  {student.role === "student" ? "Approved" : "Pending"}
                </Badge>
              </td>

              <td>
                <Button
                  variant={student.role === "student" ? "danger" : "success"}
                  size="sm"
                  onClick={() => toggleApproval(student)}
                >
                  {student.role === "student" ? "Revoke Access" : "Approve"}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}

export default Students;